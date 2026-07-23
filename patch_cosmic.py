with open('backend/fetchers/cosmic_fetcher.py', 'r') as f:
    text = f.read()

import re

new_func = """def fetch_neutron(station='OULU', hours=24):
    url = "https://www.nmdb.eu/rt/realtime.txt"
    r = httpx.get(url, timeout=30)
    r.raise_for_status()

    records = []
    for line in r.text.split('\\n'):
        if not line or line.startswith('#'): continue
        parts = line.strip().split(';')
        if len(parts) < 3: continue
        
        try:
            time_tag = parts[0].strip()
            st = parts[1].strip()
            if st != station: continue
            
            count_rate = float(parts[2].strip())
            records.append((time_tag, station, count_rate))
        except: continue

    if not records: return 0

    conn = get_conn()
    cur = conn.cursor()
    execute_values(cur, \"\"\"INSERT INTO cosmic_neutron (time_tag,station,count_rate)
           VALUES %s
           ON CONFLICT (time_tag,station) DO UPDATE SET
           count_rate=EXCLUDED.count_rate\"\"\", records)
    conn.commit(); conn.close()
    return len(records)"""

text = re.sub(r'def fetch_neutron.*?return len\(records\)', new_func, text, flags=re.DOTALL)

with open('backend/fetchers/cosmic_fetcher.py', 'w') as f:
    f.write(text)

print("Cosmic patched!")
