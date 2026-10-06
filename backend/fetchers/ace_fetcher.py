import httpx
import time
from datetime import datetime, timezone, timedelta
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

BASE_JSON = "https://services.swpc.noaa.gov/json/ace"
BASE_TXT = "https://services.swpc.noaa.gov/text"

def parse_ace_text(text):
    lines = [l for l in text.split('\n') if l.strip() and not l.startswith('#') and not l.startswith(':')]
    return [l.split() for l in lines]

def fetch_swepam():
    inserted_txt = 0
    # Attempt 1: Fetch from TXT (Live 1-minute data for latest 2 hours)
    for attempt in range(3):
        try:
            print(f"[ACE Fetcher] Fetching SWEPAM TXT (Live 1-min, attempt {attempt+1}/3)...")
            r = httpx.get(f"{BASE_TXT}/ace-swepam.txt", timeout=30)
            r.raise_for_status()
            rows = parse_ace_text(r.text)
            records = []
            for c in rows:
                if len(c) < 10: continue
                try:
                    time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                    density, speed, temp = float(c[7]), float(c[8]), float(c[9])
                    status = int(c[6])
                    if density < 0 or speed < 0: continue
                    records.append((time_tag, density, speed, temp, status))
                except: continue

            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO ace_swepam (time_tag,proton_density,bulk_speed,ion_temp,status)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        proton_density=EXCLUDED.proton_density,
                        bulk_speed=EXCLUDED.bulk_speed,
                        ion_temp=EXCLUDED.ion_temp,
                        status=EXCLUDED.status
                    """, records)
                    conn.commit()
                finally:
                    conn.close()
                print(f"[ACE Fetcher] Successfully fetched and inserted {len(records)} SWEPAM records from TXT (1-min).")
                inserted_txt = len(records)
                break
        except Exception as e:
            print(f"[ACE Fetcher] SWEPAM TXT error (attempt {attempt+1}/3): {e}")
            time.sleep(1)

    inserted_json = 0
    # Attempt 2: Fallback to JSON (only insert records that don't already exist, never overwrite 1-min data)
    if inserted_txt == 0:
        for attempt in range(3):
            try:
                print(f"[ACE Fetcher] Fetching SWEPAM JSON fallback (attempt {attempt+1}/3)...")
                r = httpx.get(f"{BASE_JSON}/swepam/ace_swepam_1h.json", timeout=30)
                r.raise_for_status()
                data = r.json()
                
                records = []
                for d in data:
                    try:
                        time_tag = d['time_tag'].replace('T', ' ') + 'Z'
                        density = float(d.get('dens', -1.0) or -1.0)
                        speed = float(d.get('speed', -1.0) or -1.0)
                        temp = float(d.get('temperature', -1.0) or -1.0)
                        status = int(d.get('dsflag', 0) or 0)
                        if density < 0 or speed < 0: continue
                        records.append((time_tag, density, speed, temp, status))
                    except: continue
                    
                if records:
                    conn = get_conn()
                    try:
                        cur = conn.cursor()
                        # DO NOTHING on conflict to prevent 1-hour data from overwriting 1-min data
                        execute_values(cur, """
                            INSERT INTO ace_swepam (time_tag,proton_density,bulk_speed,ion_temp,status)
                            VALUES %s
                            ON CONFLICT (time_tag) DO NOTHING
                        """, records)
                        conn.commit()
                    finally:
                        conn.close()
                    print(f"[ACE Fetcher] Successfully fetched {len(records)} SWEPAM records from JSON.")
                    inserted_json = len(records)
                    break
            except Exception as e:
                print(f"[ACE Fetcher] SWEPAM JSON error: {e}")
                time.sleep(1)
            
    return max(inserted_json, inserted_txt)

def fetch_mag():
    inserted_txt = 0
    # Attempt 1: Fetch from TXT (Live 1-minute data for latest 2 hours)
    for attempt in range(3):
        try:
            print(f"[ACE Fetcher] Fetching MAG TXT (Live 1-min, attempt {attempt+1}/3)...")
            r = httpx.get(f"{BASE_TXT}/ace-magnetometer.txt", timeout=30)
            r.raise_for_status()
            rows = parse_ace_text(r.text)
            records = []
            for c in rows:
                if len(c) < 12: continue
                try:
                    time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                    bx,by,bz,bt = float(c[7]),float(c[8]),float(c[9]),float(c[10])
                    lat = float(c[11])
                    lon = float(c[12]) if len(c) > 12 else 0.0
                    status = int(c[6])
                    if bt == -999.9: continue
                    records.append((time_tag, bx, by, bz, bt, lat, lon, status))
                except: continue

            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO ace_mag (time_tag,bx,by,bz,bt,lat,lon,status)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        bx=EXCLUDED.bx, by=EXCLUDED.by,
                        bz=EXCLUDED.bz, bt=EXCLUDED.bt,
                        status=EXCLUDED.status
                    """, records)
                    conn.commit()
                finally:
                    conn.close()
                print(f"[ACE Fetcher] Successfully fetched and inserted {len(records)} MAG records from TXT (1-min).")
                inserted_txt = len(records)
                break
        except Exception as e:
            print(f"[ACE Fetcher] MAG TXT error (attempt {attempt+1}/3): {e}")
            time.sleep(1)

    inserted_json = 0
    # Attempt 2: Fallback to JSON (only insert records that don't already exist, never overwrite 1-min data)
    if inserted_txt == 0:
        for attempt in range(3):
            try:
                print(f"[ACE Fetcher] Fetching MAG JSON fallback (attempt {attempt+1}/3)...")
                r = httpx.get(f"{BASE_JSON}/mag/ace_mag_1h.json", timeout=30)
                r.raise_for_status()
                data = r.json()
                
                records = []
                for d in data:
                    try:
                        time_tag = d['time_tag'].replace('T', ' ') + 'Z'
                        bx = float(d.get('gse_bx', -999.0) or -999.0)
                        by = float(d.get('gse_by', -999.0) or -999.0)
                        bz = float(d.get('gse_bz', -999.0) or -999.0)
                        bt = float(d.get('bt', -999.0) or -999.0)
                        lat = float(d.get('gse_lat', 0.0) or 0.0)
                        lon = float(d.get('gse_lon', 0.0) or 0.0)
                        status = int(d.get('dsflag', 0) or 0)
                        if bt < -900: continue
                        records.append((time_tag, bx, by, bz, bt, lat, lon, status))
                    except: continue
                    
                if records:
                    conn = get_conn()
                    try:
                        cur = conn.cursor()
                        execute_values(cur, """
                            INSERT INTO ace_mag (time_tag,bx,by,bz,bt,lat,lon,status)
                            VALUES %s
                            ON CONFLICT (time_tag) DO NOTHING
                        """, records)
                        conn.commit()
                    finally:
                        conn.close()
                    print(f"[ACE Fetcher] Successfully fetched {len(records)} MAG records from JSON.")
                    inserted_json = len(records)
                    break
            except Exception as e:
                print(f"[ACE Fetcher] MAG JSON error: {e}")
                time.sleep(1)
            
    return max(inserted_json, inserted_txt)

def fetch_epam():
    inserted_json = 0
    # Attempt 1: Fetch from JSON (up to 24 hours of 5-minute data)
    for attempt in range(3):
        try:
            print(f"[ACE Fetcher] Fetching EPAM JSON (attempt {attempt+1}/3)...")
            r = httpx.get(f"{BASE_JSON}/epam/ace_epam_5m.json", timeout=30)
            r.raise_for_status()
            data = r.json()
            
            records = []
            for d in data:
                try:
                    time_tag = d['time_tag'].replace('T', ' ') + 'Z'
                    status = 0
                    e38 = float(d.get('de1', -1.0) or -1.0)
                    e175 = float(d.get('de4', -1.0) or -1.0)
                    p47 = float(d.get('p1', -1.0) or -1.0)
                    p112 = float(d.get('p3', -1.0) or -1.0)
                    p310 = float(d.get('p5', -1.0) or -1.0)
                    p761 = float(d.get('p7', -1.0) or -1.0)
                    if e38 < 0: continue
                    records.append((time_tag, e38, e175, p47, p112, p310, p761, status))
                except: continue
                
            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO ace_epam (time_tag,e38_53,e175_315,p47_65,p112_187,p310_580,p761_1220,status)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        e38_53=EXCLUDED.e38_53, e175_315=EXCLUDED.e175_315
                    """, records)
                    conn.commit()
                finally:
                    conn.close()
                print(f"[ACE Fetcher] Successfully fetched and inserted {len(records)} EPAM records from JSON.")
                inserted_json = len(records)
                break
        except Exception as e:
            print(f"[ACE Fetcher] EPAM JSON error: {e}")
            time.sleep(1)
            
    inserted_txt = 0
    # Attempt 2: Fetch from TXT
    for attempt in range(3):
        try:
            print(f"[ACE Fetcher] Fetching EPAM TXT (attempt {attempt+1}/3)...")
            r = httpx.get(f"{BASE_TXT}/ace-epam.txt", timeout=30)
            r.raise_for_status()
            rows = parse_ace_text(r.text)
            records = []
            for c in rows:
                if len(c) < 12: continue
                try:
                    time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                    status = int(c[6])
                    e38,e175 = float(c[7]),float(c[8])
                    p47,p112,p310 = float(c[9]),float(c[10]),float(c[11])
                    p761 = float(c[12]) if len(c) > 12 else 0.0
                    if e38 < 0: continue
                    records.append((time_tag, e38, e175, p47, p112, p310, p761, status))
                except: continue

            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO ace_epam (time_tag,e38_53,e175_315,p47_65,p112_187,p310_580,p761_1220,status)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        e38_53=EXCLUDED.e38_53, e175_315=EXCLUDED.e175_315
                    """, records)
                    conn.commit()
                finally:
                    conn.close()
                print(f"[ACE Fetcher] Successfully fetched and inserted {len(records)} EPAM records from TXT.")
                inserted_txt = len(records)
                break
        except Exception as e:
            print(f"[ACE Fetcher] EPAM TXT error (attempt {attempt+1}/3): {e}")
            time.sleep(1)
            
    return max(inserted_json, inserted_txt)

def fetch_sis():
    inserted_json = 0
    # Attempt 1: Fetch from JSON (up to 24 hours of 5-minute data)
    for attempt in range(3):
        try:
            print(f"[ACE Fetcher] Fetching SIS JSON (attempt {attempt+1}/3)...")
            r = httpx.get(f"{BASE_JSON}/sis/ace_sis_5m.json", timeout=30)
            r.raise_for_status()
            data = r.json()
            
            records = []
            for d in data:
                try:
                    time_tag = d['time_tag'].replace('T', ' ') + 'Z'
                    status = int(d.get('dsflag_p10', 0) or 0)
                    p10 = float(d.get('p_gt_10', -1.0) or -1.0)
                    p30 = float(d.get('p_gt_30', -1.0) or -1.0)
                    if p10 < 0: continue
                    records.append((time_tag, p10, p30, status))
                except: continue
                
            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO ace_sis (time_tag,p10,p30,status)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        p10=EXCLUDED.p10, p30=EXCLUDED.p30
                    """, records)
                    conn.commit()
                finally:
                    conn.close()
                print(f"[ACE Fetcher] Successfully fetched and inserted {len(records)} SIS records from JSON.")
                inserted_json = len(records)
                break
        except Exception as e:
            print(f"[ACE Fetcher] SIS JSON error: {e}")
            time.sleep(1)
            
    inserted_txt = 0
    # Attempt 2: Fetch from TXT
    for attempt in range(3):
        try:
            print(f"[ACE Fetcher] Fetching SIS TXT (attempt {attempt+1}/3)...")
            r = httpx.get(f"{BASE_TXT}/ace-sis.txt", timeout=30)
            r.raise_for_status()
            rows = parse_ace_text(r.text)
            records = []
            for c in rows:
                if len(c) < 10: continue
                try:
                    time_tag = f"{c[0]}-{c[1]}-{c[2]} {c[3][:2]}:{c[3][2:]}:00Z"
                    status = int(c[6])
                    p10 = float(c[7])
                    p30 = float(c[9])
                    if p10 < 0: continue
                    records.append((time_tag, p10, p30, status))
                except: continue

            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO ace_sis (time_tag,p10,p30,status)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        p10=EXCLUDED.p10, p30=EXCLUDED.p30
                    """, records)
                    conn.commit()
                finally:
                    conn.close()
                print(f"[ACE Fetcher] Successfully fetched and inserted {len(records)} SIS records from TXT.")
                inserted_txt = len(records)
                break
        except Exception as e:
            print(f"[ACE Fetcher] SIS TXT error (attempt {attempt+1}/3): {e}")
            time.sleep(1)
            
    return max(inserted_json, inserted_txt)

def backfill_ace_gap(max_days: int = 7):
    """
    Detects if there is a gap in ace_swepam (e.g. when PC was turned off).
    If the latest recorded record is older than 15 minutes,
    it automatically downloads high-cadence daily telemetry (1m SWEPAM/MAG, 5m EPAM/SIS)
    from NASA SOHOFTP for each missing day and backfills the database.
    """
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT MAX(time_tag) FROM ace_swepam")
        res = cur.fetchone()
        conn.close()
        
        now_utc = datetime.now(timezone.utc)
        latest_time_tag = None
        if res and res[0]:
            t_str = str(res[0]).replace('Z', '').strip()
            if '.' in t_str:
                t_str = t_str.split('.')[0]
            if 'T' in t_str:
                t_str = t_str.replace('T', ' ')
            try:
                latest_time_tag = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            except Exception as e:
                print(f"[ACE Auto-Backfill] Failed to parse latest time_tag '{res[0]}': {e}")
        
        if latest_time_tag is None:
            start_dt = (now_utc - timedelta(days=3)).replace(hour=0, minute=0, second=0, microsecond=0)
            print(f"[ACE Auto-Backfill] Database empty. Backfilling last 3 days from NASA SOHOFTP...")
        elif now_utc - latest_time_tag > timedelta(minutes=15):
            gap_duration = now_utc - latest_time_tag
            earliest_allowed = (now_utc - timedelta(days=max_days)).replace(hour=0, minute=0, second=0, microsecond=0)
            start_dt = max(latest_time_tag - timedelta(hours=1), earliest_allowed).replace(hour=0, minute=0, second=0, microsecond=0)
            print(f"[ACE Auto-Backfill] Gap detected of {gap_duration}. Auto-backfilling from {start_dt.strftime('%Y-%m-%d')} to {now_utc.strftime('%Y-%m-%d')} via SOHOFTP...")
        else:
            print("[ACE Auto-Backfill] Data is up-to-date (no gap). Skipping SOHOFTP backfill.")
            return

        from backfill_ace_soho import backfill_date_range
        backfill_date_range(start_dt, now_utc)
    except Exception as e:
        print(f"[ACE Auto-Backfill] Error: {e}")

def fetch_all_ace():
    try:
        backfill_ace_gap()
    except Exception as e:
        print(f"[ACE Fetcher] Gap check error: {e}")

    return {
        "swepam": fetch_swepam(),
        "mag":    fetch_mag(),
        "epam":   fetch_epam(),
        "sis":    fetch_sis(),
    }