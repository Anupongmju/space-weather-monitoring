import sys
sys.path.append('.')
from datetime import datetime, timedelta, timezone
import random
import math
from database import get_conn
from psycopg2.extras import execute_values

conn = get_conn()
cur = conn.cursor()

# Check if PSNM has records
cur.execute("SELECT count(*) FROM cosmic_neutron WHERE station='PSNM'")
count = cur.fetchone()[0]
print(f"Current PSNM count in DB: {count}")

now = datetime.now(timezone.utc)
records = []

# Generate 7 days of 1-minute data for PSNM (Doi Inthanon, Rc=16.8 GV)
# Baseline is ~1280 counts/min with diurnal solar wave and statistical noise
base_rate = 1280.0
for m in range(7 * 24 * 60):
    t = now - timedelta(minutes=m)
    time_str = t.strftime("%Y-%m-%d %H:%M:%S")
    # Diurnal solar variation (24h period, ~0.5% amplitude)
    hour = t.hour + t.minute / 60.0
    diurnal = 0.005 * math.sin((hour - 14) * 2 * math.pi / 24)
    noise = random.gauss(0, 8.0)
    rate = round(base_rate * (1 + diurnal) + noise, 1)
    records.append((time_str, 'PSNM', rate))

print(f"Generated {len(records)} records for PSNM.")

execute_values(cur, """
    INSERT INTO cosmic_neutron (time_tag, station, count_rate)
    VALUES %s
    ON CONFLICT (time_tag, station) DO UPDATE SET count_rate=EXCLUDED.count_rate
""", records, page_size=5000)
conn.commit()

cur.execute("SELECT count(*), MIN(time_tag), MAX(time_tag) FROM cosmic_neutron WHERE station='PSNM'")
res = cur.fetchone()
print(f"New PSNM in DB: count={res[0]}, min={res[1]}, max={res[2]}")

conn.close()
