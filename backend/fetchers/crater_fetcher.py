import httpx
from datetime import datetime, timedelta, timezone
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

CRATER_URL = "https://crater-web.sr.unh.edu/data/craterProducts/doserates/data/2026212/doserates_standard_2026212_31days_allevents.txt"

def fetch_crater_doserates():
    """
    Fetches lunar radiation dose rate data from UNH CRaTER ASCII product.
    Converts Julian Date to UTC timestamp and stores paired + individual detector dose rates in crater_doserates table.
    """
    try:
        r = httpx.get(CRATER_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
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
                except Exception: continue

        if not records:
            print("[CRaTER Fetcher] No valid doserate records parsed.")
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
            print(f"[CRaTER Fetcher] Successfully inserted/updated {len(records)} records.")
        finally:
            conn.close()
        return len(records)

    except Exception as e:
        print(f"[CRaTER Fetcher] Error: {e}")
        return 0
