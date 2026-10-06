import os
import sys
import argparse
from datetime import datetime, timedelta
import httpx
from psycopg2.extras import execute_values

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from database import get_conn

SOHO_BASE = "https://sohoftp.nascom.nasa.gov/sdb/goes/ace/daily"

def fetch_and_parse_swepam(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_swepam_1m.txt"
    try:
        r = client.get(url, timeout=30)
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
        print(f"[{date_str}] SWEPAM fetch error: {e}")
        return []

def fetch_and_parse_mag(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_mag_1m.txt"
    try:
        r = client.get(url, timeout=30)
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
        print(f"[{date_str}] MAG fetch error: {e}")
        return []

def fetch_and_parse_epam(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_epam_5m.txt"
    try:
        r = client.get(url, timeout=30)
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
        print(f"[{date_str}] EPAM fetch error: {e}")
        return []

def fetch_and_parse_sis(client: httpx.Client, date_str: str):
    url = f"{SOHO_BASE}/{date_str}_ace_sis_5m.txt"
    try:
        r = client.get(url, timeout=30)
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
        print(f"[{date_str}] SIS fetch error: {e}")
        return []

def save_records(swepam_recs, mag_recs, epam_recs, sis_recs):
    conn = get_conn()
    try:
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
    finally:
        conn.close()

def backfill_date_range(start_date: datetime, end_date: datetime):
    current = start_date
    client = httpx.Client(timeout=30)
    total_sw = 0
    total_mag = 0
    total_epam = 0
    total_sis = 0

    print(f"=== Starting ACE Backfill from SOHOFTP: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} ===")
    while current <= end_date:
        d_str = current.strftime('%Y%m%d')
        print(f"\nProcessing date {current.strftime('%Y-%m-%d')} ({d_str})...")

        sw = fetch_and_parse_swepam(client, d_str)
        mag = fetch_and_parse_mag(client, d_str)
        epam = fetch_and_parse_epam(client, d_str)
        sis = fetch_and_parse_sis(client, d_str)

        print(f"  -> Fetched: SWEPAM={len(sw)}, MAG={len(mag)}, EPAM={len(epam)}, SIS={len(sis)}")

        if any([sw, mag, epam, sis]):
            save_records(sw, mag, epam, sis)
            total_sw += len(sw)
            total_mag += len(mag)
            total_epam += len(epam)
            total_sis += len(sis)
            print(f"  [OK] Saved into database successfully.")
        else:
            print(f"  [SKIP] No data found for {d_str}")

        current += timedelta(days=1)

    print("\n=== Backfill Finished Summary ===")
    print(f"Total SWEPAM: {total_sw:,} rows (1-min)")
    print(f"Total MAG:    {total_mag:,} rows (1-min)")
    print(f"Total EPAM:   {total_epam:,} rows (5-min)")
    print(f"Total SIS:    {total_sis:,} rows (5-min)")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Backfill ACE data from NASA SOHOFTP")
    parser.add_argument('--start', type=str, default='2026-09-07', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end', type=str, default='2026-09-14', help='End date (YYYY-MM-DD)')
    args = parser.parse_args()

    s_dt = datetime.strptime(args.start, '%Y-%m-%d')
    e_dt = datetime.strptime(args.end, '%Y-%m-%d')
    backfill_date_range(s_dt, e_dt)
