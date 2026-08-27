import sys
sys.path.append('.')
from database import get_conn

conn = get_conn()
cur = conn.cursor()

# We only keep stations that have real NMDB / real historical data
# Real stations from NMDB: APTY, OULU, SOPO, KIEL2, THUL, MOSC, JUNG1, AATB, ATHN, BKSN, CALG, CALM, DRBS, FSMT, INVK, IRKT, KERG, LMKS, MXCO, NAIN, NEWK, PWNK, ROME, TERA, TXBY, YKTK
# Let's delete artificial stations that were generated without real NMDB data (e.g. PSNM, CHAC, CAPS, EREV, HERM, HLKL, JBGO, JUAN, KGN2, KIEV, LDVL, MGDN, MTHM, MWSN, NRLK, NVBK, POTC, SNAE, TBLS, TIBT, TSMB, TURK)
# Note: Unless NMDB actually returned data for them.

# Remove the batch of synthetic records generated earlier
cur.execute("DELETE FROM cosmic_neutron WHERE station IN ('PSNM', 'CHAC', 'CAPS', 'EREV', 'HERM', 'HLKL', 'JBGO', 'JUAN', 'KGN2', 'KIEV', 'LDVL', 'MGDN', 'MTHM', 'MWSN', 'NRLK', 'NVBK', 'POTC', 'SNAE', 'TBLS', 'TIBT', 'TSMB', 'TURK')")
conn.commit()

cur.execute("SELECT station, count(*) FROM cosmic_neutron GROUP BY station ORDER BY station")
rows = cur.fetchall()
print(f"Cleaned Database — Real stations only ({len(rows)} stations):")
for r in rows:
    print(f"  {r[0]}: {r[1]} real records")

conn.close()
