import httpx
import time
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

BASE = "https://services.swpc.noaa.gov/json/goes/primary"

def safe_http_get(filename_7day, filename_3day, filename_6hr):
    """Tries to fetch the 7-day JSON file. If it fails, falls back to 3-day, then 6-hour, with retries."""
    urls = [
        (f"{BASE}/{filename_7day}", "7-day"),
        (f"{BASE}/{filename_3day}", "3-day"),
        (f"{BASE}/{filename_6hr}", "6-hour")
    ]
    
    last_error = None
    for url, desc in urls:
        for attempt in range(3):
            try:
                print(f"[GOES Fetcher] Fetching {desc} data (attempt {attempt+1}/3)...")
                r = httpx.get(url, timeout=30)
                r.raise_for_status()
                data = r.json()
                print(f"[GOES Fetcher] Successfully fetched {desc} data.")
                return data
            except Exception as e:
                last_error = e
                print(f"[GOES Fetcher] Failed to fetch {desc} data (attempt {attempt+1}/3): {e}")
                time.sleep(1)
        print(f"[GOES Fetcher] {desc} data failed. Falling back...")
        
    raise Exception(f"All fallbacks failed for GOES fetch. Last error: {last_error}")

def fetch_xray():
    try:
        data = safe_http_get("xrays-7-day.json", "xrays-3-day.json", "xrays-6-hour.json")
    except Exception as e:
        print(f"Error fetching GOES xray: {e}")
        return 0

    long_map, short_map = {}, {}
    for d in data:
        t = d['time_tag']
        e = d.get('energy', '')
        flux = float(d.get('flux', 0) or 0)
        sat  = d.get('satellite', 0)
        if '0.1-0.8' in e or '1-8' in e:
            long_map[t]  = (flux, sat)
        elif '0.05-0.4' in e or '0.5-4' in e:
            short_map[t] = (flux, sat)

    records = []
    for t in long_map:
        fl  = long_map[t][0]
        fs  = short_map.get(t, (0, 0))[0]
        sat = long_map[t][1]
        records.append((t, fl, fs, sat))

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(cur, """INSERT INTO goes_xray (time_tag,flux_long,flux_short,satellite)
               VALUES %s
               ON CONFLICT (time_tag) DO UPDATE SET
               flux_long=EXCLUDED.flux_long,
               flux_short=EXCLUDED.flux_short""", records)
        conn.commit()
    finally:
        conn.close()
    return len(records)

def fetch_proton():
    try:
        data = safe_http_get("integral-protons-7-day.json", "integral-protons-3-day.json", "integral-protons-6-hour.json")
    except Exception as e:
        print(f"Error fetching GOES proton: {e}")
        return 0

    records = [(d['time_tag'], d.get('energy',''), float(d.get('flux',0) or 0), d.get('satellite',0)) for d in data]

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(cur, """INSERT INTO goes_proton (time_tag,energy,flux,satellite)
               VALUES %s
               ON CONFLICT (time_tag,energy) DO UPDATE SET
               flux=EXCLUDED.flux""", records)
        conn.commit()
    finally:
        conn.close()
    return len(records)

def fetch_electron():
    try:
        data = safe_http_get("integral-electrons-7-day.json", "integral-electrons-3-day.json", "integral-electrons-6-hour.json")
    except Exception as e:
        print(f"Error fetching GOES electron: {e}")
        return 0

    records = [(d['time_tag'], d.get('energy',''), float(d.get('flux',0) or 0), d.get('satellite',0)) for d in data]

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(cur, """INSERT INTO goes_electron (time_tag,energy,flux,satellite)
               VALUES %s
               ON CONFLICT (time_tag,energy) DO UPDATE SET
               flux=EXCLUDED.flux""", records)
        conn.commit()
    finally:
        conn.close()
    return len(records)

def fetch_goes_mag():
    try:
        data = safe_http_get("magnetometers-7-day.json", "magnetometers-3-day.json", "magnetometers-6-hour.json")
    except Exception as e:
        print(f"Error fetching GOES mag: {e}")
        return 0

    records = [(
        d['time_tag'],
        float(d.get('Hp',0) or 0), float(d.get('He',0) or 0),
        float(d.get('Hn',0) or 0), float(d.get('Ht',0) or 0),
        d.get('satellite',0)
    ) for d in data]

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(cur, """INSERT INTO goes_mag (time_tag,hp,he,hn,ht,satellite)
               VALUES %s
               ON CONFLICT (time_tag) DO UPDATE SET
               hp=EXCLUDED.hp, he=EXCLUDED.he,
               hn=EXCLUDED.hn, ht=EXCLUDED.ht""", records)
        conn.commit()
    finally:
        conn.close()
    return len(records)

def fetch_goes_wind():
    try:
        r = httpx.get("https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json", timeout=30)
        if r.status_code == 404: return 0
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"Error fetching GOES wind: {e}")
        return 0

    if not data or len(data) < 2: return 0
    
    records = []
    for row in data[1:]:
        if len(row) < 4: continue
        try:
            time_tag = row[0].replace('.000', 'Z')
            density = float(row[1]) if row[1] is not None else 0.0
            speed = float(row[2]) if row[2] is not None else 0.0
            temp = float(row[3]) if row[3] is not None else 0.0
            records.append((time_tag, density, speed, temp, 0))
        except: continue

    if not records: return 0

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(
            cur,
            """INSERT INTO goes_wind (time_tag,density,speed,temperature,satellite)
               VALUES %s
               ON CONFLICT (time_tag) DO UPDATE SET
               density=EXCLUDED.density, speed=EXCLUDED.speed,
               temperature=EXCLUDED.temperature""",
            records
        )
        conn.commit()
    finally:
        conn.close()
    return len(records)

def fetch_all_goes():
    return {
        "xray":     fetch_xray(),
        "proton":   fetch_proton(),
        "electron": fetch_electron(),
        "mag":      fetch_goes_mag(),
        "wind":     fetch_goes_wind(),
    }