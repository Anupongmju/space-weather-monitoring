import httpx
import gzip
import io
from datetime import datetime, timedelta, timezone
from database import get_conn
from psycopg2.extras import execute_values # type: ignore

BASE = "https://downloads.sws.bom.gov.au/wdc/wdc_cosray/data/MAW"

def doy_to_date(year, doy):
    return datetime(year, 1, 1) + timedelta(days=doy - 1)

def parse_maw(text, year, doy):
    records = []
    base_date = doy_to_date(year, doy)
    for line in text.split('\n'):
        line = line.strip()
        if not line or line.startswith('#') or line.startswith(';'): continue
        cols = line.split()
        if len(cols) < 37: continue
        try:
            hr, mn = int(cols[2]), int(cols[3])
            nm_corr, nm_uncorr = float(cols[4]), float(cols[5])
            pressure = float(cols[6])
            bare_corr, bare_unc = float(cols[7]), float(cols[8])
            tubes = [float(cols[10 + i]) for i in range(18)]
            bares = [float(cols[28 + i]) for i in range(6)]
            corr_factor = float(cols[34])
            stat_error  = float(cols[35])
            status_flag = int(cols[36])
            dt = base_date.replace(hour=hr, minute=mn, second=0)
            time_tag = dt.strftime('%Y-%m-%d %H:%M:00')
            records.append((
                time_tag, year, doy, hr, mn,
                nm_corr, nm_uncorr, pressure, bare_corr, bare_unc,
                *tubes, *bares,
                corr_factor, stat_error, status_flag
            ))
        except: continue
    return records

def fetch_maw_day(year: int, doy: int):
    date  = doy_to_date(year, doy)
    month = str(date.month).zfill(2)
    day   = str(date.day).zfill(2)
    filename = f"MAW{year}{month}{day}.SSE.gz"
    url = f"{BASE}/{year}/{filename}"

    try:
        r = httpx.get(url, timeout=60, follow_redirects=True)
        r.raise_for_status()
    except Exception as e:
        return 0, str(e)

    try:
        with gzip.open(io.BytesIO(r.content), 'rt', encoding='utf-8', errors='ignore') as f:
            text = f.read()
    except Exception as e:
        return 0, f"gzip error: {e}"

    records = parse_maw(text, year, doy)
    if not records:
        return 0, "no records parsed"

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(
            cur,
            """INSERT INTO cosmic_maw VALUES %s
                ON CONFLICT (time_tag) DO UPDATE SET
                nm_corrected=EXCLUDED.nm_corrected,
                nm_uncorrected=EXCLUDED.nm_uncorrected,
                pressure=EXCLUDED.pressure""",
            records
        )
        conn.commit()
    finally:
        conn.close()
    return len(records), None

def fetch_maw_today():
    now = datetime.now(timezone.utc)
    doy = now.timetuple().tm_yday
    count, err = fetch_maw_day(now.year, doy)
    return {"date": now.strftime("%Y-%m-%d"), "doy": doy, "rows": count, "error": err}

def fetch_maw_range(days: int = 7):
    results = []
    for i in range(days):
        d = datetime.now(timezone.utc) - timedelta(days=i)
        doy = d.timetuple().tm_yday
        count, err = fetch_maw_day(d.year, doy)
        results.append({"date": d.strftime("%Y-%m-%d"), "doy": doy, "rows": count, "error": err})
    return results