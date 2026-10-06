import database

conn = database.get_conn()
cur = conn.cursor()
cur.execute("CREATE INDEX IF NOT EXISTS idx_cosmic_psnm_time_tag ON cosmic_psnm(time_tag);")
cur.execute("CREATE INDEX IF NOT EXISTS idx_cosmic_maw_time_tag ON cosmic_maw(time_tag);")
conn.commit()
conn.close()
print("Indexes verified!")
