import httpx
import re
from datetime import datetime, timedelta, timezone
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

BASE_URL = "http://www2.physik.uni-kiel.de/stereo/data/sept/level2/ahead/1min/"

def fetch_stereo_particles(recent_days=10):
    """
    Fetches SEPT level 2 1-minute electron and proton (ion) data from University of Kiel.
    Fetches the recent daily files (default 10 days) and stores in stereo_particles table.
    """
    try:
        r = httpx.get(BASE_URL, timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
        r.raise_for_status()
        html = r.text
        years = sorted([l for l in re.findall(r'href=["\'](\d{4}/)["\']', html)])
        if not years:
            print("[STEREO Fetcher] No year directories found.")
            return 0

        latest_year = years[-1]
        url_year = BASE_URL + latest_year
        r_y = httpx.get(url_year, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        r_y.raise_for_status()
        files = sorted([f for f in re.findall(r'href=["\'](.*?\.(?:dat|txt))["\']', r_y.text) if not f.startswith('?')])

        ele_files = [f for f in files if 'ele_sun' in f][-recent_days:]
        ion_files = [f for f in files if 'ion_sun' in f][-recent_days:]

        if not ele_files or not ion_files:
            print("[STEREO Fetcher] Missing ele or ion files in latest year.")
            return 0

        ele_dict = {}
        for ef in ele_files:
            try:
                r_ele = httpx.get(url_year + ef, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
                if r_ele.status_code != 200: continue
                for line in r_ele.text.splitlines():
                    line = line.strip()
                    if not line or line.startswith('#'): continue
                    parts = line.split()
                    if len(parts) >= 21:
                        try:
                            year, doy, h, m, s = int(parts[1]), float(parts[2]), int(parts[3]), int(parts[4]), int(parts[5])
                            dt = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=doy-1, hours=h, minutes=m, seconds=s)
                            time_tag = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                            b02 = float(parts[6]) if float(parts[6]) > -9000 else 0.0
                            b05 = float(parts[9]) if float(parts[9]) > -9000 else 0.0
                            b10 = float(parts[14]) if float(parts[14]) > -9000 else 0.0
                            b15 = float(parts[19]) if float(parts[19]) > -9000 else 0.0
                            ele_dict[time_tag] = (b02, b05, b10, b15)
                        except Exception: continue
            except Exception: continue

        ion_dict = {}
        for inf in ion_files:
            try:
                r_ion = httpx.get(url_year + inf, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
                if r_ion.status_code != 200: continue
                for line in r_ion.text.splitlines():
                    line = line.strip()
                    if not line or line.startswith('#'): continue
                    parts = line.split()
                    if len(parts) >= 36:
                        try:
                            year, doy, h, m, s = int(parts[1]), float(parts[2]), int(parts[3]), int(parts[4]), int(parts[5])
                            dt = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=doy-1, hours=h, minutes=m, seconds=s)
                            time_tag = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                            b02 = float(parts[6]) if float(parts[6]) > -9000 else 0.0
                            b05 = float(parts[9]) if float(parts[9]) > -9000 else 0.0
                            b10 = float(parts[14]) if float(parts[14]) > -9000 else 0.0
                            b15 = float(parts[19]) if float(parts[19]) > -9000 else 0.0
                            ion_dict[time_tag] = (b02, b05, b10, b15)
                        except Exception: continue
            except Exception: continue

        all_times = sorted(list(set(ele_dict.keys()) | set(ion_dict.keys())))
        records = []
        for idx, t in enumerate(all_times):
            if idx % 5 != 0: continue # Downsample to 5-min intervals
            ele = ele_dict.get(t, (0.0, 0.0, 0.0, 0.0))
            pro = ion_dict.get(t, (0.0, 0.0, 0.0, 0.0))
            records.append((t, ele[0], ele[1], ele[2], ele[3], pro[0], pro[1], pro[2], pro[3]))

        if not records: return 0

        conn = get_conn()
        try:
            cur = conn.cursor()
            execute_values(cur, """
                INSERT INTO stereo_particles 
                (time_tag, ele_b02, ele_b05, ele_b10, ele_b15, pro_b02, pro_b05, pro_b10, pro_b15)
                VALUES %s
                ON CONFLICT (time_tag) DO UPDATE SET
                ele_b02=EXCLUDED.ele_b02, ele_b05=EXCLUDED.ele_b05, ele_b10=EXCLUDED.ele_b10, ele_b15=EXCLUDED.ele_b15,
                pro_b02=EXCLUDED.pro_b02, pro_b05=EXCLUDED.pro_b05, pro_b10=EXCLUDED.pro_b10, pro_b15=EXCLUDED.pro_b15
            """, records)
            conn.commit()
            print(f"[STEREO Fetcher] Successfully inserted/updated {len(records)} records.")
        finally:
            conn.close()
        return len(records)

    except Exception as e:
        print(f"[STEREO Fetcher Error]: {e}")
        return 0
