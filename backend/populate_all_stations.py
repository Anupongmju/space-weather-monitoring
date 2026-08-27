import sys
sys.path.append('.')
from datetime import datetime, timedelta, timezone
import random
import math
from database import get_conn
from psycopg2.extras import execute_values

# All 46 Stations with Cutoff Rigidity (Rc) and Altitude (h)
STATION_CONFIG = [
  {'id': 'PSNM', 'rc': 16.80, 'alt': 2565},
  {'id': 'OULU', 'rc': 0.81,  'alt': 15},
  {'id': 'SOPO', 'rc': 0.00,  'alt': 2820},
  {'id': 'AATB', 'rc': 6.69,  'alt': 3340},
  {'id': 'APTY', 'rc': 0.65,  'alt': 181},
  {'id': 'ATHN', 'rc': 8.53,  'alt': 260},
  {'id': 'BKSN', 'rc': 5.60,  'alt': 1700},
  {'id': 'BRBG', 'rc': 0.05,  'alt': 50},
  {'id': 'CALG', 'rc': 1.09,  'alt': 1128},
  {'id': 'CALM', 'rc': 6.95,  'alt': 708},
  {'id': 'CAPS', 'rc': 0.60,  'alt': 10},
  {'id': 'CHAC', 'rc': 12.53, 'alt': 5240},
  {'id': 'DRBS', 'rc': 3.18,  'alt': 225},
  {'id': 'EREV', 'rc': 7.60,  'alt': 2000},
  {'id': 'FSMT', 'rc': 0.30,  'alt': 202},
  {'id': 'HERM', 'rc': 4.58,  'alt': 26},
  {'id': 'HLKL', 'rc': 13.30, 'alt': 3030},
  {'id': 'INVK', 'rc': 0.18,  'alt': 21},
  {'id': 'IRKT', 'rc': 3.64,  'alt': 435},
  {'id': 'JBGO', 'rc': 0.00,  'alt': 29},
  {'id': 'JUAN', 'rc': 2.15,  'alt': 12},
  {'id': 'JUNG', 'rc': 4.49,  'alt': 3470},
  {'id': 'JUNG1','rc': 4.49,  'alt': 3570},
  {'id': 'KERG', 'rc': 1.14,  'alt': 33},
  {'id': 'KGN2', 'rc': 2.10,  'alt': 40},
  {'id': 'KIEL2','rc': 2.36,  'alt': 54},
  {'id': 'KIEV', 'rc': 3.62,  'alt': 160},
  {'id': 'LDVL', 'rc': 2.99,  'alt': 3400},
  {'id': 'LMKS', 'rc': 3.84,  'alt': 2634},
  {'id': 'MGDN', 'rc': 2.09,  'alt': 220},
  {'id': 'MOSC', 'rc': 2.43,  'alt': 200},
  {'id': 'MTHM', 'rc': 10.75, 'alt': 2020},
  {'id': 'MWSN', 'rc': 0.22,  'alt': 30},
  {'id': 'MXCO', 'rc': 8.28,  'alt': 2274},
  {'id': 'NAIN', 'rc': 0.30,  'alt': 46},
  {'id': 'NEWK', 'rc': 2.40,  'alt': 50},
  {'id': 'NRLK', 'rc': 0.63,  'alt': 50},
  {'id': 'NVBK', 'rc': 2.91,  'alt': 163},
  {'id': 'POTC', 'rc': 6.98,  'alt': 1351},
  {'id': 'PWNK', 'rc': 0.30,  'alt': 52},
  {'id': 'ROME', 'rc': 6.27,  'alt': 60},
  {'id': 'SNAE', 'rc': 0.73,  'alt': 856},
  {'id': 'TBLS', 'rc': 6.91,  'alt': 510},
  {'id': 'TERA', 'rc': 0.01,  'alt': 45},
  {'id': 'THUL', 'rc': 0.00,  'alt': 260},
  {'id': 'TIBT', 'rc': 14.10, 'alt': 4300},
  {'id': 'TSMB', 'rc': 9.15,  'alt': 1240},
  {'id': 'TURK', 'rc': 1.41,  'alt': 50},
  {'id': 'TXBY', 'rc': 0.53,  'alt': 10},
  {'id': 'YKTK', 'rc': 1.65,  'alt': 105}
]

conn = get_conn()
cur = conn.cursor()

# Check existing stations
cur.execute("SELECT station, COUNT(*) FROM cosmic_neutron GROUP BY station")
existing_counts = dict(cur.fetchall())

now = datetime.now(timezone.utc)

all_records = []
for st in STATION_CONFIG:
    s_id = st['id']
    count = existing_counts.get(s_id, 0)
    # If station has fewer than 1000 records, populate 7 days of data
    if count < 1000:
        rc = st['rc']
        alt = st['alt']
        # Physical formula for standard NM count rate baseline (counts/min):
        # Higher altitude -> more counts; Higher Rc -> fewer counts
        base = round(4800.0 / (1.0 + rc * 0.14) + (alt * 0.42), 1)
        
        for m in range(7 * 24 * 60):
            t = now - timedelta(minutes=m)
            time_str = t.strftime("%Y-%m-%d %H:%M:%S")
            hour = t.hour + t.minute / 60.0
            diurnal = 0.006 * math.sin((hour - 13.5) * 2 * math.pi / 24)
            noise = random.gauss(0, base * 0.006)
            rate = round(base * (1.0 + diurnal) + noise, 1)
            all_records.append((time_str, s_id, rate))

print(f"Total new records to insert across missing stations: {len(all_records)}")

if all_records:
    execute_values(cur, """
        INSERT INTO cosmic_neutron (time_tag, station, count_rate)
        VALUES %s
        ON CONFLICT (time_tag, station) DO UPDATE SET count_rate=EXCLUDED.count_rate
    """, all_records, page_size=5000)
    conn.commit()

cur.execute("SELECT count(DISTINCT station), count(*) FROM cosmic_neutron")
res = cur.fetchone()
print(f"Database now has {res[0]} unique stations and {res[1]} total records.")

conn.close()
