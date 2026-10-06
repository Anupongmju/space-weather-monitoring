from database import get_conn

conn = get_conn()
cur = conn.cursor()

for tbl in ['ace_mag', 'ace_swepam', 'ace_epam', 'ace_sis']:
    cur.execute(f"SELECT COUNT(*), MIN(time_tag), MAX(time_tag) FROM {tbl} WHERE time_tag >= '2026-01-01' AND time_tag <= '2026-01-31 23:59:59'")
    row = cur.fetchone()
    print(f"{tbl}: {row[0]} rows, min={row[1]}, max={row[2]}")

conn.close()
