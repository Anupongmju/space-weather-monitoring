import sys
import httpx
from datetime import datetime, timedelta, timezone
from database import get_conn
from psycopg2.extras import execute_values

def import_crater_period(year: int, doy: int):
    target_code = f"{year}{doy:03d}"
    url = f"https://crater-web.sr.unh.edu/data/craterProducts/doserates/data/{target_code}/doserates_standard_{target_code}_31days_allevents.txt"
    print(f"[CRaTER Importer] Fetching {target_code} ({url})...")

    try:
        r = httpx.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 404:
            print(f"[CRaTER Importer] {target_code} not found (404), skipping.")
            return 0
        r.raise_for_status()

        lines = [l.strip() for l in r.text.splitlines() if l.strip() and not l.startswith('#')]
        records = []

        for l in lines:
            parts = l.split('\t')
            if len(parts) >= 16:
                try:
                    jd = float(parts[0])
                    # Julian Date 2400000.5 corresponds to MJD 0 (1858-11-17)
                    dt_jd = datetime(1858, 11, 17, tzinfo=timezone.utc) + timedelta(days=jd - 2400000.5)
                    time_tag = dt_jd.strftime('%Y-%m-%dT%H:%M:%SZ')

                    d12 = float(parts[7])
                    d34 = float(parts[8])
                    d56 = float(parts[9])
                    d1  = float(parts[10])
                    d2  = float(parts[11])
                    d3  = float(parts[12])
                    d4  = float(parts[13])
                    d5  = float(parts[14])
                    d6  = float(parts[15])

                    records.append((time_tag, jd, d12, d34, d56, d1, d2, d3, d4, d5, d6))
                except Exception:
                    continue

        if not records:
            print(f"[CRaTER Importer] No records parsed for {target_code}")
            return 0

        conn = get_conn()
        try:
            cur = conn.cursor()
            execute_values(cur, """
                INSERT INTO crater_doserates (time_tag, julian_date, d12, d34, d56, d1, d2, d3, d4, d5, d6)
                VALUES %s
                ON CONFLICT (time_tag) DO UPDATE SET
                julian_date=EXCLUDED.julian_date,
                d12=EXCLUDED.d12, d34=EXCLUDED.d34, d56=EXCLUDED.d56,
                d1=EXCLUDED.d1, d2=EXCLUDED.d2, d3=EXCLUDED.d3,
                d4=EXCLUDED.d4, d5=EXCLUDED.d5, d6=EXCLUDED.d6
            """, records)
            conn.commit()
            print(f"[CRaTER Importer] Successfully stored {len(records)} records for {target_code}")
            return len(records)
        finally:
            conn.close()
    except Exception as e:
        print(f"[CRaTER Importer] Error fetching {target_code}: {e}")
        return 0

def main():
    periods = []
    # 2025 all 12 months
    for doy in [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]:
        periods.append((2025, doy))

    # 2026 up to latest available
    for doy in [31, 59, 90, 120, 151, 181, 212, 243, 266]:
        periods.append((2026, doy))

    total = 0
    print(f"Starting import of CRaTER data for {len(periods)} periods across 2025-2026...")
    for year, doy in periods:
        count = import_crater_period(year, doy)
        total += count

    print(f"\n==========================================")
    print(f"CRaTER Import Finished! Total records processed: {total}")
    print(f"==========================================")

    # Print final summary from database
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), MIN(time_tag), MAX(time_tag) FROM crater_doserates;")
        row = cur.fetchone()
        print(f"Database Current Status: {row[0]} rows, Range: {row[1]} to {row[2]}")
    finally:
        conn.close()

if __name__ == '__main__':
    main()
