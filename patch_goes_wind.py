with open('backend/fetchers/goes_fetcher.py', 'r') as f:
    text = f.read()

import re

new_func = """def fetch_goes_wind():
    r = httpx.get("https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json", timeout=30)
    if r.status_code == 404: return 0
    r.raise_for_status()
    data = r.json()
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
    cur = conn.cursor()
    execute_values(
        cur,
        \"\"\"INSERT INTO goes_wind (time_tag,density,speed,temperature,satellite)
           VALUES %s
           ON CONFLICT (time_tag) DO UPDATE SET
           density=EXCLUDED.density, speed=EXCLUDED.speed,
           temperature=EXCLUDED.temperature\"\"\",
        records
    )
    conn.commit()
    conn.close()
    return len(records)"""

text = re.sub(r'def fetch_goes_wind\(\):[\s\S]*?return len\(records\)', new_func, text)

with open('backend/fetchers/goes_fetcher.py', 'w') as f:
    f.write(text)

print("Goes wind patched!")
