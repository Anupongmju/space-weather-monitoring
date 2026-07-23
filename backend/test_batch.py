from database import get_conn
from psycopg2.extras import execute_batch

conn = get_conn()
cur = conn.cursor()
try:
    execute_batch(cur, "INSERT INTO ace_swepam (time_tag, proton_density) VALUES (%s, %s) ON CONFLICT DO NOTHING", [("test1", 1), ("test2", 2)])
    conn.commit()
    print("execute_batch works!")
except Exception as e:
    print(e)
finally:
    cur.execute("DELETE FROM ace_swepam WHERE time_tag IN ('test1', 'test2')")
    conn.commit()
    conn.close()
