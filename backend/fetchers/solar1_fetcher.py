import httpx
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

ACE_EPAM_REALTIME_URL = "https://services.swpc.noaa.gov/json/ace/epam/ace_epam_5m.json"
RTSW_PLASMA_URL = "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json"
RTSW_MAG_URL = "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json"

def fetch_solar1_stis_particles():
    """
    Fetches real-time SOLAR-1 STIS Suprathermal Ions & Electrons particle data.
    Inserts/updates all 8 Ion channels (p1..p8) and 4 Electron channels (de1..de4) into solar1_stis_particles DB table.
    """
    count = 0
    try:
        r = httpx.get(ACE_EPAM_REALTIME_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200:
            data = r.json()
            records = []
            for d in data:
                time_tag = d.get('time_tag')
                if not time_tag:
                    continue

                if 'Z' not in time_tag and '+' not in time_tag:
                    time_tag += 'Z'

                def clean_val(k):
                    val = d.get(k)
                    if val is not None and float(val) >= 0 and float(val) < 1e8:
                        return float(val)
                    return None

                p1 = clean_val('p1')
                p2 = clean_val('p2')
                p3 = clean_val('p3')
                p4 = clean_val('p4')
                p5 = clean_val('p5')
                p6 = clean_val('p6')
                p7 = clean_val('p7')
                p8 = clean_val('p8')

                de1 = clean_val('de1')
                de2 = clean_val('de2')
                de3 = clean_val('de3')
                de4 = clean_val('de4')

                records.append((time_tag, p1, p2, p3, p4, p5, p6, p7, p8, de1, de2, de3, de4, True))

            if records:
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
                    count = len(records)
                    print(f"[SOLAR-1 STIS Fetcher] Upserted {count} records into solar1_stis_particles.")
                finally:
                    conn.close()
    except Exception as e:
        print(f"[SOLAR-1 STIS Fetcher Error]: {e}")

    return count

PROPAGATED_SOLAR_WIND_URL = "https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind.json"

def fetch_solar1_swips_plasma():
    """
    Fetches real-time and 7-day SOLAR-1 / L1 SWiPS Solar Wind Plasma Data (Speed, Density, Temp).
    Inserts/updates into solar1_rtsw DB table.
    """
    count = 0
    records_dict = {}

    # 1. Fetch 7-day propagated solar wind data (fills historical gaps for 1D, 3D, 7D)
    try:
        r_prop = httpx.get(PROPAGATED_SOLAR_WIND_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        if r_prop.status_code == 200:
            prop_data = r_prop.json()
            if prop_data and len(prop_data) > 1:
                for row in prop_data[1:]:
                    try:
                        time_tag = row[0]
                        if not time_tag:
                            continue
                        if 'Z' not in time_tag and '+' not in time_tag:
                            time_tag += 'Z'
                        speed = float(row[1]) if row[1] is not None and 0 <= float(row[1]) < 1e8 else None
                        density = float(row[2]) if row[2] is not None and 0 <= float(row[2]) < 1e8 else None
                        temp = float(row[3]) if row[3] is not None and 0 <= float(row[3]) < 1e8 else None
                        if any(v is not None for v in [speed, density, temp]):
                            records_dict[time_tag] = (time_tag, density, speed, temp, True)
                    except Exception:
                        continue
    except Exception as e:
        print(f"[SOLAR-1 SWiPS Propagated Fetch Error]: {e}")

    # 2. Fetch latest real-time 1m data (up to the current minute)
    try:
        r = httpx.get(RTSW_PLASMA_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200:
            data = r.json()
            for d in data:
                # Only accept records specifically from SOLAR-1 (prevents mixing with IMAP or ACE)
                if d.get('source', '').upper() != 'SOLAR1':
                    continue

                time_tag = d.get('time_tag')
                if not time_tag:
                    continue

                if 'Z' not in time_tag and '+' not in time_tag:
                    time_tag += 'Z'

                def clean_val(k):
                    val = d.get(k)
                    if val is not None and float(val) >= 0 and float(val) < 1e8:
                        return float(val)
                    return None

                speed = clean_val('proton_speed')
                density = clean_val('proton_density')
                temp = clean_val('proton_temperature')

                if any(v is not None for v in [speed, density, temp]):
                    records_dict[time_tag] = (time_tag, density, speed, temp, True)
    except Exception as e:
        print(f"[SOLAR-1 SWiPS Fetcher Error]: {e}")

    records = list(records_dict.values())
    if records:
        conn = get_conn()
        try:
            cur = conn.cursor()
            execute_values(cur, """
                INSERT INTO solar1_rtsw
                (time_tag, proton_density, proton_speed, proton_temperature, active)
                VALUES %s
                ON CONFLICT (time_tag) DO UPDATE SET
                proton_density=COALESCE(EXCLUDED.proton_density, solar1_rtsw.proton_density),
                proton_speed=COALESCE(EXCLUDED.proton_speed, solar1_rtsw.proton_speed),
                proton_temperature=COALESCE(EXCLUDED.proton_temperature, solar1_rtsw.proton_temperature),
                active=EXCLUDED.active
            """, records)
            conn.commit()
            count = len(records)
            print(f"[SOLAR-1 SWiPS Fetcher] Upserted {count} records into solar1_rtsw.")
        finally:
            conn.close()

    return count

def fetch_solar1_mag():
    """
    Fetches real-time SOLAR-1 / L1 MAG Interplanetary Magnetic Field Data (Bt, Bx, By, Bz).
    Inserts/updates into solar1_mag DB table.
    """
    count = 0
    try:
        r = httpx.get(RTSW_MAG_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200:
            data = r.json()
            records_dict = {}
            for d in data:
                # Only accept records specifically from SOLAR-1 (prevents mixing with IMAP or ACE)
                if d.get('source', '').upper() != 'SOLAR1':
                    continue

                time_tag = d.get('time_tag')
                if not time_tag:
                    continue

                if 'Z' not in time_tag and '+' not in time_tag:
                    time_tag += 'Z'

                def clean_val(k):
                    val = d.get(k)
                    if val is not None and abs(float(val)) < 1000:
                        return float(val)
                    return None

                bt = clean_val('bt')
                bx = clean_val('bx_gse')
                by = clean_val('by_gse')
                bz = clean_val('bz_gse')

                if any(v is not None for v in [bt, bx, by, bz]):
                    records_dict[time_tag] = (time_tag, bt, bx, by, bz, True)

            records = list(records_dict.values())
            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO solar1_mag
                        (time_tag, bt, bx_gse, by_gse, bz_gse, active)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        bt=EXCLUDED.bt, bx_gse=EXCLUDED.bx_gse,
                        by_gse=EXCLUDED.by_gse, bz_gse=EXCLUDED.bz_gse,
                        active=EXCLUDED.active
                    """, records)
                    conn.commit()
                    count = len(records)
                    print(f"[SOLAR-1 MAG Fetcher] Upserted {count} records into solar1_mag.")
                finally:
                    conn.close()
    except Exception as e:
        print(f"[SOLAR-1 MAG Fetcher Error]: {e}")

    return count

def fetch_all_solar1():
    """Fetches all SOLAR-1 datasets: STIS particles, SWiPS plasma, and MAG magnetic field"""
    c1 = fetch_solar1_stis_particles()
    c2 = fetch_solar1_swips_plasma()
    c3 = fetch_solar1_mag()
    return c1 + c2 + c3

def fetch_solar1_rtsw():
    """Wrapper function maintaining compatibility with legacy scheduler calls"""
    return fetch_all_solar1()
