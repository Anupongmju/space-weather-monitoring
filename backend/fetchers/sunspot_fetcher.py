import httpx
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

SILSO_URL = "https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.txt"

def fetch_sunspot_data():
    try:
        print("[Sunspot Fetcher] Fetching SILSO monthly dataset...")
        r = httpx.get(SILSO_URL, timeout=30)
        r.raise_for_status()
        lines = r.text.strip().splitlines()
    except Exception as e:
        print(f"[Sunspot Fetcher] Error fetching SILSO data: {e}")
        return {"status": "error", "message": str(e), "count": 0}

    records = []
    for line in lines:
        parts = line.split()
        if len(parts) < 4:
            continue
        try:
            year = int(parts[0])
            month = int(parts[1])
            frac_year = float(parts[2])
            ssn = float(parts[3])
            std_dev = float(parts[4]) if len(parts) > 4 else -1.0
            obs_count = int(parts[5]) if len(parts) > 5 else -1
            def_flag = int(parts[6]) if len(parts) > 6 else 1
            
            # Form time_tag YYYY-MM-01
            time_tag = f"{year:04d}-{month:02d}-01"
            
            records.append((
                time_tag,
                year,
                month,
                frac_year,
                max(0.0, ssn) if ssn >= 0 else 0.0,
                std_dev,
                obs_count,
                def_flag == 1
            ))
        except Exception as ex:
            continue

    if not records:
        return {"status": "error", "message": "No valid records parsed", "count": 0}

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(
            cur,
            """INSERT INTO sunspot_monthly (
                time_tag, year, month, fractional_year,
                sunspot_number, std_dev, obs_count, is_definitive
            ) VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                sunspot_number = EXCLUDED.sunspot_number,
                std_dev = EXCLUDED.std_dev,
                obs_count = EXCLUDED.obs_count,
                is_definitive = EXCLUDED.is_definitive""",
            records
        )
        conn.commit()
        print(f"[Sunspot Fetcher] Successfully inserted/updated {len(records)} monthly records.")
    finally:
        conn.close()

    return {"status": "success", "count": len(records)}
