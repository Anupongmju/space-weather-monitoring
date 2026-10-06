import httpx
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

NOAA_KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"

def fetch_kp_index():
    """
    Fetches NOAA Planetary K-index (Kp) real-time product
    URL: https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
    Saves records into `noaa_kp_index` table.
    """
    try:
        print("[Kp Fetcher] Fetching NOAA Planetary K-index...")
        r = httpx.get(NOAA_KP_URL, timeout=30)
        r.raise_for_status()
        raw_data = r.json()
    except Exception as e:
        print(f"[Kp Fetcher] Network Error fetching NOAA Kp: {e}")
        return {"status": "error", "message": str(e), "count": 0}

    if not raw_data or not isinstance(raw_data, list):
        return {"status": "error", "message": "Empty or invalid JSON payload", "count": 0}

    records = []
    
    # Check if first element is header row (list) or dictionary
    start_idx = 0
    first_item = raw_data[0]
    if isinstance(first_item, list):
        # Header row like ["time_tag", "Kp", "a_running", "station_count"]
        start_idx = 1

    for row in raw_data[start_idx:]:
        try:
            if isinstance(row, dict):
                time_tag = row.get("time_tag")
                kp_val = row.get("Kp")
                a_running = row.get("a_running")
                station_count = row.get("station_count")
            elif isinstance(row, list) and len(row) >= 2:
                time_tag = row[0]
                kp_val = row[1]
                a_running = row[2] if len(row) > 2 else None
                station_count = row[3] if len(row) > 3 else None
            else:
                continue

            if not time_tag:
                continue

            kp_float = float(kp_val) if kp_val is not None and str(kp_val).strip() != "" else None
            a_float = float(a_running) if a_running is not None and str(a_running).strip() != "" else None
            cnt_int = int(station_count) if station_count is not None and str(station_count).strip() != "" else None

            records.append((
                str(time_tag).strip(),
                kp_float,
                a_float,
                cnt_int
            ))
        except Exception:
            continue

    if not records:
        return {"status": "error", "message": "No valid records parsed", "count": 0}

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(
            cur,
            """
            INSERT INTO noaa_kp_index (time_tag, kp, a_running, station_count)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                kp = EXCLUDED.kp,
                a_running = EXCLUDED.a_running,
                station_count = EXCLUDED.station_count
            """,
            records
        )
        conn.commit()
        print(f"[Kp Fetcher] Successfully saved {len(records)} Kp records.")
        return {"status": "success", "count": len(records)}
    except Exception as e:
        conn.rollback()
        print(f"[Kp Fetcher] Database Error: {e}")
        return {"status": "error", "message": str(e), "count": 0}
    finally:
        conn.close()
