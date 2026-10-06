from fastapi import APIRouter
from typing import Optional
import psycopg2.extras
from database import get_conn
from fetchers.kp_fetcher import fetch_kp_index

router = APIRouter(prefix="/geomag", tags=["Geomagnetic / Kp Index"])

def query(sql, params=()):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@router.post("/kp/fetch")
def trigger_kp_fetch():
    return fetch_kp_index()

@router.get("/kp")
def get_kp_data(
    limit: Optional[int] = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    # Auto-fetch if DB is empty
    count_res = query("SELECT COUNT(*) as cnt FROM noaa_kp_index")
    if not count_res or count_res[0]['cnt'] == 0:
        fetch_kp_index()

    base_sql = "SELECT time_tag, kp, a_running, station_count FROM noaa_kp_index"
    where_clauses = []
    params = []

    if start_date:
        where_clauses.append("time_tag >= %s")
        params.append(start_date)
    if end_date:
        where_clauses.append("time_tag <= %s")
        params.append(end_date)

    if where_clauses:
        base_sql += " WHERE " + " AND ".join(where_clauses)

    if limit is not None and limit > 0:
        sql = f"SELECT * FROM ({base_sql} ORDER BY time_tag DESC LIMIT %s) sub ORDER BY time_tag ASC"
        params.append(limit)
    else:
        sql = f"{base_sql} ORDER BY time_tag ASC"

    return query(sql, tuple(params))

@router.get("/kp/latest")
def get_latest_kp():
    count_res = query("SELECT COUNT(*) as cnt FROM noaa_kp_index")
    if not count_res or count_res[0]['cnt'] == 0:
        fetch_kp_index()

    res = query("SELECT time_tag, kp, a_running, station_count FROM noaa_kp_index ORDER BY time_tag DESC LIMIT 1")
    if not res:
        return {"time_tag": None, "kp": None, "a_running": None, "station_count": None}
    return res[0]
