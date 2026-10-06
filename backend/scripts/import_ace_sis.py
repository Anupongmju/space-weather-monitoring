import os
import sys
import httpx
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, '.env'))

from database import get_conn
from psycopg2.extras import execute_values

SOHO_DAILY_BASE = "https://sohoftp.nascom.nasa.gov/sdb/goes/ace/daily"

def fetch_and_import_sis_day(date_str: str):
    """
    date_str: 'YYYYMMDD', e.g. '20260905'
    """
    filename = f"{date_str}_ace_sis_5m.txt"
    url = f"{SOHO_DAILY_BASE}/{filename}"
    local_path = os.path.join(BASE_DIR, 'data', filename)

    print(f"Fetching {url}...")
    try:
        resp = httpx.get(url, timeout=30)
        resp.raise_for_status()
        content = resp.text
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return 0

    # Save local copy in backend/data/
    try:
        with open(local_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Saved local copy to {local_path}")
    except Exception as e:
        print(f"Warning: Could not save local copy: {e}")

    # Parse records
    lines = [l for l in content.split('\n') if l.strip() and not l.startswith(('#', ':'))]
    records = []
    for l in lines:
        c = l.split()
        if len(c) < 10:
            continue
        try:
            # Columns: YR MO DA HHMM Julian Seconds S >10MeV S >30MeV
            time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
            status = int(c[6])
            p10 = float(c[7])
            p30 = float(c[9])

            # Filter out missing value sentinel (-1.00e+05 or negative)
            if p10 < 0 or p10 <= -90000:
                continue
            if p30 < 0 or p30 <= -90000:
                p30 = 0.0

            records.append((time_tag, p10, p30, status))
        except Exception:
            continue

    if not records:
        print(f"No valid records parsed from {filename}")
        return 0

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(cur, """
            INSERT INTO ace_sis (time_tag, p10, p30, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            p10 = EXCLUDED.p10,
            p30 = EXCLUDED.p30,
            status = EXCLUDED.status
        """, records)
        conn.commit()
        print(f"[OK] Successfully imported/upserted {len(records)} records for {date_str} into ace_sis.")
    finally:
        conn.close()

    return len(records)

if __name__ == "__main__":
    dates = sys.argv[1:] if len(sys.argv) > 1 else ["20260905", "20260906"]
    for d in dates:
        fetch_and_import_sis_day(d)
