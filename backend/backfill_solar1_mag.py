import os
import sys
import gzip
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import httpx
import netCDF4 as nc  # type: ignore
from psycopg2.extras import execute_values  # type: ignore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from database import get_conn

NOAA_ARCHIVE_BASE = "https://archive.data.noaa.gov/satellite-spaceweather"

def list_archive_mag_files(year: int, month: int):
    """
    List all MAG Level-3 NetCDF files available in NOAA NCEI archive.
    """
    prefix = f"SWFO/SOLAR-1/MAG/mag-l3/{year}/{month:02d}/"
    url = f"{NOAA_ARCHIVE_BASE}/?list-type=2&prefix={prefix}&delimiter=/"
    try:
        r = httpx.get(url, timeout=20)
        if r.status_code != 200:
            print(f"[MAG Archive] Failed to list S3 prefix: {r.status_code}")
            return {}
        root = ET.fromstring(r.text)
        ns = {'s3': 'http://s3.amazonaws.com/doc/2006-03-01/'}
        keys = [elem.text for elem in root.findall('.//s3:Key', ns) if elem.text and elem.text.endswith('.nc.gz')]
        
        # Sort keys so newer processing timestamps overwrite older ones
        keys.sort()
        file_map = {}
        for k in keys:
            parts = k.split('/')[-1].split('_')
            for p in parts:
                if p.startswith('s') and len(p) >= 9 and p[1:9].isdigit():
                    d_str = p[1:9]
                    file_map[d_str] = k
                    break
        return file_map
    except Exception as e:
        print(f"[MAG Archive] Error listing archive: {e}")
        return {}

def download_and_parse_mag_nc(client: httpx.Client, key: str):
    """
    Downloads .nc.gz, decompresses, and parses time_min, b_gse_min, b_gse_sphr_min.
    Returns list of tuples: (time_tag, bt, bx_gse, by_gse, bz_gse, active)
    """
    url = f"{NOAA_ARCHIVE_BASE}/{key}"
    print(f"  -> Downloading {key.split('/')[-1]}...")
    r = client.get(url, timeout=45)
    if r.status_code != 200:
        print(f"  [ERROR] HTTP status {r.status_code}")
        return []

    decomp = gzip.decompress(r.content)
    with tempfile.NamedTemporaryFile(suffix='.nc', delete=False) as tf:
        tf.write(decomp)
        tf_path = tf.name

    try:
        ds = nc.Dataset(tf_path)
        time_min = ds.variables['time_min'][:]
        b_gse = ds.variables['b_gse_min'][:]
        b_sphr = ds.variables['b_gse_sphr_min'][:]
        ds.close()
    finally:
        if os.path.exists(tf_path):
            os.remove(tf_path)

    epoch_base = datetime(1958, 1, 1)
    records = []
    fill_val = -99999.0

    for i in range(len(time_min)):
        t_micro = time_min[i]
        if t_micro < 0 or t_micro > 1e16:
            continue
        t_dt = epoch_base + timedelta(microseconds=float(t_micro))
        time_tag = t_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

        bx = float(b_gse[i, 0])
        by = float(b_gse[i, 1])
        bz = float(b_gse[i, 2])
        bt = float(b_sphr[i, 0])

        # Check fills / NaNs
        if any(abs(v) > 90000 for v in [bx, by, bz, bt]) or any(v != v for v in [bx, by, bz, bt]):
            continue

        records.append((time_tag, bt, bx, by, bz, True))

    return records

def backfill_solar1_mag(start_date: datetime, end_date: datetime):
    current = start_date
    client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'})
    
    # Cache archive file map per (year, month)
    monthly_maps = {}

    total_inserted = 0
    while current <= end_date:
        ym = (current.year, current.month)
        if ym not in monthly_maps:
            print(f"[MAG Archive] Querying NOAA NCEI index for {current.strftime('%Y-%m')}...")
            monthly_maps[ym] = list_archive_mag_files(current.year, current.month)
        
        file_map = monthly_maps[ym]
        d_str = current.strftime('%Y%m%d')
        if d_str not in file_map:
            print(f"[MAG Archive] No file found for {current.strftime('%Y-%m-%d')}")
            current += timedelta(days=1)
            continue
        
        key = file_map[d_str]
        try:
            records = download_and_parse_mag_nc(client, key)
            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    insert_sql = """
                        INSERT INTO solar1_mag (time_tag, bt, bx_gse, by_gse, bz_gse, active)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                            bt = EXCLUDED.bt,
                            bx_gse = EXCLUDED.bx_gse,
                            by_gse = EXCLUDED.by_gse,
                            bz_gse = EXCLUDED.bz_gse,
                            active = EXCLUDED.active
                    """
                    execute_values(cur, insert_sql, records, page_size=2000)
                    conn.commit()
                    print(f"  [OK] Inserted/Updated {len(records)} rows for {current.strftime('%Y-%m-%d')}")
                    total_inserted += len(records)
                finally:
                    conn.close()
            else:
                print(f"  [WARN] 0 valid rows parsed for {current.strftime('%Y-%m-%d')}")
        except Exception as e:
            print(f"  [ERROR] Failed to process {current.strftime('%Y-%m-%d')}: {e}")

        current += timedelta(days=1)

    print(f"\n[Finished] Total Solar-1 MAG records inserted/updated: {total_inserted}")

if __name__ == '__main__':
    s_date = datetime(2026, 9, 10)
    e_date = datetime(2026, 9, 14)
    backfill_solar1_mag(s_date, e_date)
