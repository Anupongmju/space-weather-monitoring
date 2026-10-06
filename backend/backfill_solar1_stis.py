import os
import sys
import argparse
import gzip
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
import httpx
import netCDF4 as nc  # type: ignore
from psycopg2.extras import execute_values  # type: ignore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from database import get_conn

NOAA_ARCHIVE_BASE = "https://archive.data.noaa.gov/satellite-spaceweather"

def list_archive_files(year: int, month: int):
    """
    List all STIS NetCDF files available in NOAA NCEI archive for a given year and month.
    """
    prefix = f"SWFO/SOLAR-1/STIS/stis-l2/{year}/{month:02d}/"
    url = f"{NOAA_ARCHIVE_BASE}/?list-type=2&prefix={prefix}&delimiter=/"
    try:
        r = httpx.get(url, timeout=20)
        if r.status_code != 200:
            print(f"[STIS Archive] Failed to list S3 prefix: {r.status_code}")
            return {}
        root = ET.fromstring(r.text)
        ns = {'s3': 'http://s3.amazonaws.com/doc/2006-03-01/'}
        keys = [elem.text for elem in root.findall('.//s3:Key', ns) if elem.text and elem.text.endswith('.nc.gz')]
        
        keys.sort()
        # Map date YYYYMMDD -> key
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
        print(f"[STIS Archive] Error listing archive: {e}")
        return {}

def download_and_parse_stis_nc(client: httpx.Client, key: str, minute_interval: int = 1):
    """
    Downloads .nc.gz, decompresses, and averages values into minute bins without requiring pandas.
    Returns list of tuples ready for database insertion.
    """
    url = f"{NOAA_ARCHIVE_BASE}/{key}"
    print(f"  -> Downloading {key.split('/')[-1]}...")
    r = client.get(url, timeout=45)
    if r.status_code != 200:
        print(f"  [ERROR] HTTP status {r.status_code}")
        return []

    decomp = gzip.decompress(r.content)
    ds = nc.Dataset('memory', memory=decomp)

    t_unix = ds.variables['time_unix'][:]
    ion_flux = ds.variables['ion_flux_epam_weighted_GdE'][:]
    ele_flux = ds.variables['electron_flux_epam_weighted_GdE'][:]

    step_sec = max(1, minute_interval) * 60
    # Group into minute bins: bin_timestamp -> (p_sums, p_counts, de_sums, de_counts)
    bins = {}
    n_points = len(t_unix)

    for idx in range(n_points):
        ts = float(t_unix[idx])
        if ts <= 0:
            continue

        bin_ts = int(ts // step_sec) * step_sec
        if bin_ts not in bins:
            bins[bin_ts] = {
                'p_sum': [0.0] * 8,
                'p_count': [0] * 8,
                'de_sum': [0.0] * 4,
                'de_count': [0] * 4,
            }

        cur_bin = bins[bin_ts]
        for ch in range(8):
            val = float(ion_flux[idx, ch])
            if val >= 0 and val < 1e12:
                cur_bin['p_sum'][ch] += val
                cur_bin['p_count'][ch] += 1

        for ch in range(4):
            val = float(ele_flux[idx, ch])
            if val >= 0 and val < 1e12:
                cur_bin['de_sum'][ch] += val
                cur_bin['de_count'][ch] += 1

    records = []
    for bin_ts in sorted(bins.keys()):
        cur_bin = bins[bin_ts]
        dt = datetime.fromtimestamp(bin_ts, tz=timezone.utc)
        time_tag = dt.strftime('%Y-%m-%dT%H:%M:00Z')

        p_vals = [
            (cur_bin['p_sum'][ch] / cur_bin['p_count'][ch]) if cur_bin['p_count'][ch] > 0 else None
            for ch in range(8)
        ]
        de_vals = [
            (cur_bin['de_sum'][ch] / cur_bin['de_count'][ch]) if cur_bin['de_count'][ch] > 0 else None
            for ch in range(4)
        ]

        if any(v is not None for v in p_vals + de_vals):
            records.append((time_tag, *p_vals, *de_vals, True))

    return records

def save_stis_records(records):
    if not records:
        return 0
    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(cur, """
            INSERT INTO solar1_stis_particles
            (time_tag, p1, p2, p3, p4, p5, p6, p7, p8, de1, de2, de3, de4, active)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            p1=EXCLUDED.p1, p2=EXCLUDED.p2, p3=EXCLUDED.p3, p4=EXCLUDED.p4,
            p5=EXCLUDED.p5, p6=EXCLUDED.p6, p7=EXCLUDED.p7, p8=EXCLUDED.p8,
            de1=EXCLUDED.de1, de2=EXCLUDED.de2, de3=EXCLUDED.de3, de4=EXCLUDED.de4,
            active=EXCLUDED.active
        """, records)
        conn.commit()
        return len(records)
    finally:
        conn.close()

def backfill_solar1_stis(start_date: datetime, end_date: datetime, minute_interval: int = 1):
    print(f"=== Starting SOLAR-1 STIS Backfill from NOAA Archive ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}) ===")
    client = httpx.Client(timeout=45)
    
    # Pre-fetch file listings for unique year-months
    current = start_date
    months_seen = set()
    all_files = {}
    while current <= end_date:
        ym = (current.year, current.month)
        if ym not in months_seen:
            months_seen.add(ym)
            files = list_archive_files(current.year, current.month)
            all_files.update(files)
        current += timedelta(days=1)

    total_inserted = 0
    current = start_date
    while current <= end_date:
        d_str = current.strftime('%Y%m%d')
        date_display = current.strftime('%Y-%m-%d')
        print(f"\nProcessing {date_display}...")

        if d_str not in all_files:
            print(f"  [SKIP] No STIS archive file found for {d_str}")
            current += timedelta(days=1)
            continue

        key = all_files[d_str]
        try:
            records = download_and_parse_stis_nc(client, key, minute_interval=minute_interval)
            if records:
                saved = save_stis_records(records)
                total_inserted += saved
                print(f"  [OK] Successfully upserted {saved:,} STIS records into solar1_stis_particles ({minute_interval}m res).")
            else:
                print(f"  [WARN] No records parsed from {key}")
        except Exception as e:
            print(f"  [ERROR] Failed to process {key}: {e}")

        current += timedelta(days=1)

    print(f"\n=== SOLAR-1 STIS Backfill Finished ===")
    print(f"Total inserted/updated records: {total_inserted:,}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Backfill SOLAR-1 STIS L2 data from NOAA NCEI Archive")
    parser.add_argument('--start', type=str, default='2026-09-10', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end', type=str, default='2026-09-12', help='End date (YYYY-MM-DD)')
    parser.add_argument('--interval', type=int, default=1, help='Minute interval (default: 1)')
    args = parser.parse_args()

    s_dt = datetime.strptime(args.start, '%Y-%m-%d')
    e_dt = datetime.strptime(args.end, '%Y-%m-%d')
    backfill_solar1_stis(s_dt, e_dt, minute_interval=args.interval)
