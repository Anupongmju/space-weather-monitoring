
import httpx
from datetime import datetime, timedelta, timezone
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

STATIONS = ['OULU','SOPO','KIEL2','JUNG1','THUL','MOSC']

def fetch_neutron(station='OULU', hours=24):
    url = "https://www.nmdb.eu/rt/realtime.txt"
    r = httpx.get(url, timeout=30)
    r.raise_for_status()

    records = []
    for line in r.text.split('\n'):
        if not line or line.startswith('#'): continue
        parts = line.strip().split(';')
        if len(parts) < 3: continue
        
        try:
            time_tag = parts[0].strip()
            st = parts[1].strip()
            if station != 'ALL' and st != station: continue
            
            count_rate = float(parts[2].strip())
            records.append((time_tag, st, count_rate))
        except: continue

    if not records: return 0

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(cur, """INSERT INTO cosmic_neutron (time_tag,station,count_rate)
               VALUES %s
               ON CONFLICT (time_tag,station) DO UPDATE SET
               count_rate=EXCLUDED.count_rate""", records)
        conn.commit()
    finally:
        conn.close()
    return len(records)

def backfill_cosmic():
    """Detects gaps in cosmic_neutron data and backfills them using NMDB Nest ASCII API."""
    print("[Cosmic Backfill] Checking for gaps...")
    conn = get_conn()
    latest_time_tag = None
    try:
        cur = conn.cursor()
        cur.execute("SELECT MAX(time_tag) FROM cosmic_neutron")
        res = cur.fetchone()
        if res and res[0]:
            t_str = res[0]
            if 'Z' in t_str:
                t_str = t_str.replace('Z', '')
            try:
                latest_time_tag = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            except Exception as e:
                print(f"[Cosmic Backfill] Error parsing max time_tag {t_str}: {e}")
    except Exception as e:
        print(f"[Cosmic Backfill] Error querying max time_tag: {e}")
    finally:
        conn.close()

    now_utc = datetime.now(timezone.utc)
    
    if latest_time_tag is None:
        start = now_utc - timedelta(hours=24)
        print(f"[Cosmic Backfill] Database is empty. Backfilling last 24 hours (from {start})")
    elif now_utc - latest_time_tag > timedelta(minutes=30):
        # We need to backfill from latest_time_tag to now_utc
        # Cap backfill range to 3 days to avoid request timeouts / server load
        max_backfill = now_utc - timedelta(days=3)
        start = max(latest_time_tag, max_backfill)
        print(f"[Cosmic Backfill] Gap detected of {now_utc - latest_time_tag}. Backfilling from {start} to {now_utc}")
    else:
        print("[Cosmic Backfill] No significant gap detected. Skipping backfill.")
        return

    # Add 1 minute to start to avoid duplicate key on the latest record we already have
    start = start + timedelta(minutes=1)
    
    if start >= now_utc:
        print("[Cosmic Backfill] Backfill range is not valid. Skipping.")
        return

    station_params = "".join([f"&stations[]={st}" for st in STATIONS])
    
    url = (
        f"https://www.nmdb.eu/nest/draw_graph.php?formchk=1{station_params}"
        f"&tabchoice=ori&dtype=corr_for_efficiency&tresolution=1&yunits=1&date_choice=bydate"
        f"&start_day={start.day:02d}&start_month={start.month:02d}&start_year={start.year}"
        f"&start_hour={start.hour:02d}&start_min={start.minute:02d}"
        f"&end_day={now_utc.day:02d}&end_month={now_utc.month:02d}&end_year={now_utc.year}"
        f"&end_hour={now_utc.hour:02d}&end_min={now_utc.minute:02d}"
        f"&output=ascii"
    )
    
    try:
        print(f"[Cosmic Backfill] Requesting NMDB URL: {url}")
        r = httpx.get(url, timeout=60)
        r.raise_for_status()
        
        content = r.text
        start_idx = content.find("<pre>")
        end_idx = content.find("</pre>")
        if start_idx == -1 or end_idx == -1:
            print("[Cosmic Backfill] Error: Could not find pre/code blocks in NMDB response")
            return
            
        pre_content = content[start_idx:end_idx]
        lines = [l.strip() for l in pre_content.splitlines() if l.strip()]
        
        header_line = None
        data_start_idx = -1
        for i, line in enumerate(lines):
            if line.startswith("<pre>") or line.startswith("<code>"):
                continue
            if line.startswith("#"):
                continue
            header_line = line
            data_start_idx = i + 1
            break
            
        if not header_line:
            print("[Cosmic Backfill] Error: Could not find station header line in ASCII output")
            return
            
        header_stations = header_line.replace(";", " ").split()
        print(f"[Cosmic Backfill] Header stations returned: {header_stations}")
        
        records = []
        for line in lines[data_start_idx:]:
            if line.startswith("<code>") or line.startswith("</pre>") or line.startswith("#"):
                continue
            
            parts = line.split(";")
            if len(parts) < 2:
                continue
                
            time_tag = parts[0].strip()
            values = []
            for val_str in parts[1:]:
                val_str = val_str.strip()
                if val_str:
                    try:
                        values.append(float(val_str))
                    except ValueError:
                        values.append(None)
            
            for st, val in zip(header_stations, values):
                if val is not None and st in STATIONS:
                    records.append((time_tag, st, val))
                    
        if not records:
            print("[Cosmic Backfill] No valid records found in the fetched range.")
            return
            
        print(f"[Cosmic Backfill] Parsed {len(records)} records. Inserting to database...")
        
        conn = get_conn()
        try:
            cur = conn.cursor()
            execute_values(cur, """
                INSERT INTO cosmic_neutron (time_tag, station, count_rate)
                VALUES %s
                ON CONFLICT (time_tag, station) DO UPDATE SET
                count_rate = EXCLUDED.count_rate
            """, records)
            conn.commit()
            print(f"[Cosmic Backfill] Backfill complete. Inserted/updated {len(records)} records.")
        except Exception as e:
            print(f"[Cosmic Backfill] Database error during insert: {e}")
        finally:
            conn.close()
            
    except Exception as e:
        print(f"[Cosmic Backfill] Error during backfill execution: {e}")

def fetch_all_cosmic():
    try:
        backfill_cosmic()
    except Exception as e:
        print(f"[Cosmic Backfill] Error calling backfill_cosmic: {e}")
        
    try:
        res = fetch_neutron('ALL')
    except Exception as e:
        print(f"Error fetching cosmic realtime data: {e}")
        res = 0
    return {"neutron_all": res}