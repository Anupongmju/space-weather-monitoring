import os
import sys
import argparse
from datetime import datetime, timedelta
import httpx
from psycopg2.extras import execute_values
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from database import get_conn

SOHO_BASE = "https://sohoftp.nascom.nasa.gov/sdb/goes/ace/daily"

def fetch_and_parse_swepam(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_swepam_1m.txt"
    try:
        r = client.get(url, timeout=25)
        if r.status_code != 200:
            return []
        lines = [l.split() for l in r.text.split('\n') if l.strip() and not l.startswith('#') and not l.startswith(':')]
        records = []
        for c in lines:
            if len(c) < 10:
                continue
            try:
                time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                status = int(c[6])
                density = float(c[7])
                speed = float(c[8])
                temp = float(c[9])
                if density < 0 or speed < 0:
                    continue
                records.append((time_tag, density, speed, temp, status))
            except Exception:
                continue
        return records
    except Exception as e:
        return []

def fetch_and_parse_mag(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_mag_1m.txt"
    try:
        r = client.get(url, timeout=25)
        if r.status_code != 200:
            return []
        lines = [l.split() for l in r.text.split('\n') if l.strip() and not l.startswith('#') and not l.startswith(':')]
        records = []
        for c in lines:
            if len(c) < 12:
                continue
            try:
                time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                status = int(c[6])
                bx, by, bz, bt = float(c[7]), float(c[8]), float(c[9]), float(c[10])
                lat = float(c[11])
                lon = float(c[12]) if len(c) > 12 else 0.0
                if bt <= -900:
                    continue
                records.append((time_tag, bx, by, bz, bt, lat, lon, status))
            except Exception:
                continue
        return records
    except Exception as e:
        return []

def fetch_and_parse_epam(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_epam_5m.txt"
    try:
        r = client.get(url, timeout=25)
        if r.status_code != 200:
            return []
        lines = [l.split() for l in r.text.split('\n') if l.strip() and not l.startswith('#') and not l.startswith(':')]
        records = []
        clean = lambda v: v if v is not None and v >= 0 else None
        for c in lines:
            if len(c) < 14:
                continue
            try:
                time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                status = int(c[6])
                e38, e175 = float(c[7]), float(c[8])
                p47, p112, p310 = float(c[10]), float(c[11]), float(c[12])
                p761 = float(c[13]) if len(c) > 13 else 0.0
                if e38 < 0 and p47 < 0:
                    continue
                records.append((time_tag, clean(e38), clean(e175), clean(p47), clean(p112), clean(p310), clean(p761), status))
            except Exception:
                continue
        return records
    except Exception as e:
        return []

def fetch_and_parse_sis(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_sis_5m.txt"
    try:
        r = client.get(url, timeout=25)
        if r.status_code != 200:
            return []
        lines = [l.split() for l in r.text.split('\n') if l.strip() and not l.startswith('#') and not l.startswith(':')]
        records = []
        clean = lambda v: v if v is not None and v >= 0 else None
        for c in lines:
            if len(c) < 10:
                continue
            try:
                time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                status = int(c[6])
                p10 = float(c[7])
                p30 = float(c[9])
                if p10 < 0 and p30 < 0:
                    continue
                records.append((time_tag, clean(p10), clean(p30), status))
            except Exception:
                continue
        return records
    except Exception as e:
        return []

def save_day_records(conn, swepam_recs, mag_recs, epam_recs, sis_recs):
    cur = conn.cursor()
    if swepam_recs:
        execute_values(cur, """
            INSERT INTO ace_swepam (time_tag, proton_density, bulk_speed, ion_temp, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                proton_density = EXCLUDED.proton_density,
                bulk_speed = EXCLUDED.bulk_speed,
                ion_temp = EXCLUDED.ion_temp,
                status = EXCLUDED.status
        """, swepam_recs)

    if mag_recs:
        execute_values(cur, """
            INSERT INTO ace_mag (time_tag, bx, by, bz, bt, lat, lon, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                bx = EXCLUDED.bx,
                by = EXCLUDED.by,
                bz = EXCLUDED.bz,
                bt = EXCLUDED.bt,
                lat = EXCLUDED.lat,
                lon = EXCLUDED.lon,
                status = EXCLUDED.status
        """, mag_recs)

    if epam_recs:
        execute_values(cur, """
            INSERT INTO ace_epam (time_tag, e38_53, e175_315, p47_65, p112_187, p310_580, p761_1220, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                e38_53 = EXCLUDED.e38_53,
                e175_315 = EXCLUDED.e175_315,
                p47_65 = EXCLUDED.p47_65,
                p112_187 = EXCLUDED.p112_187,
                p310_580 = EXCLUDED.p310_580,
                p761_1220 = EXCLUDED.p761_1220,
                status = EXCLUDED.status
        """, epam_recs)

    if sis_recs:
        execute_values(cur, """
            INSERT INTO ace_sis (time_tag, p10, p30, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                p10 = EXCLUDED.p10,
                p30 = EXCLUDED.p30,
                status = EXCLUDED.status
        """, sis_recs)

    conn.commit()

def process_single_date(d_str: str):
    client = httpx.Client(timeout=25)
    sw = fetch_and_parse_swepam(client, d_str)
    mag = fetch_and_parse_mag(client, d_str)
    epam = fetch_and_parse_epam(client, d_str)
    sis = fetch_and_parse_sis(client, d_str)
    client.close()
    return d_str, sw, mag, epam, sis

def backfill_full_year(start_date: datetime, end_date: datetime, workers: int = 8):
    # First, let's identify which dates need backfilling
    # Or simply fetch all dates to ensure complete coverage without gaps
    dates = []
    curr = start_date
    while curr <= end_date:
        dates.append(curr.strftime('%Y%m%d'))
        curr += timedelta(days=1)

    print(f"=== Starting Concurrent ACE Backfill for 2026 ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}) ===", flush=True)
    print(f"Total days to process: {len(dates)} days with {workers} worker threads", flush=True)

    conn = get_conn()
    total_sw = 0
    total_mag = 0
    total_epam = 0
    total_sis = 0
    saved_days = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_date = {executor.submit(process_single_date, d): d for d in dates}
        for idx, future in enumerate(as_completed(future_to_date), 1):
            d_str = future_to_date[future]
            try:
                d_str, sw, mag, epam, sis = future.result()
                if any([sw, mag, epam, sis]):
                    save_day_records(conn, sw, mag, epam, sis)
                    total_sw += len(sw)
                    total_mag += len(mag)
                    total_epam += len(epam)
                    total_sis += len(sis)
                    saved_days += 1
                if idx % 10 == 0 or idx == len(dates):
                    print(f"[{idx}/{len(dates)}] Processed {d_str} | Days saved: {saved_days} | MAG: {total_mag:,} | SWEPAM: {total_sw:,}", flush=True)
            except Exception as e:
                print(f"Error on {d_str}: {e}", flush=True)

    conn.close()
    print("\n=== Backfill 2026 Completed! ===", flush=True)
    print(f"Days with data saved: {saved_days}/{len(dates)}")
    print(f"Total SWEPAM rows: {total_sw:,}")
    print(f"Total MAG rows:    {total_mag:,}")
    print(f"Total EPAM rows:   {total_epam:,}")
    print(f"Total SIS rows:    {total_sis:,}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Backfill ACE 2026 data concurrently")
    parser.add_argument('--start', type=str, default='2026-01-01', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end', type=str, default='2026-10-01', help='End date (YYYY-MM-DD)')
    parser.add_argument('--workers', type=int, default=8, help='Number of threads')
    args = parser.parse_args()

    s_dt = datetime.strptime(args.start, '%Y-%m-%d')
    e_dt = datetime.strptime(args.end, '%Y-%m-%d')
    backfill_full_year(s_dt, e_dt, args.workers)
