from fastapi import APIRouter
from typing import Optional
from database import get_conn
from fetchers.cosmic_fetcher import fetch_neutron, fetch_all_cosmic
import psycopg2.extras

router = APIRouter(prefix="/cosmic", tags=["Cosmic"])

def query(sql, params=()):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@router.post("/fetch")
def fetch_all(): return fetch_all_cosmic()

@router.post("/fetch/{station}")
def fetch_station(station: str, hours: int = 24):
    return {"rows": fetch_neutron(station, hours)}

def format_date_boundary(date_str: str, is_end: bool = False) -> str:
    if not date_str:
        return ""
    date_str = date_str.strip().replace('T', ' ')
    if len(date_str) == 10:
        return f"{date_str} 23:59:59" if is_end else f"{date_str} 00:00:00"
    return date_str

@router.get("/neutron")
def get_neutron(station: str = "OULU", limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    if start_date and end_date:
        s = format_date_boundary(start_date, is_end=False)
        e = format_date_boundary(end_date, is_end=True)
        sql = """
            SELECT * FROM cosmic_neutron 
            WHERE station=%s 
              AND time_tag >= %s 
              AND time_tag <= %s
            ORDER BY time_tag ASC
        """
        return query(sql, (station, s, e))

    if limit <= 0:
        sql = """
            SELECT * FROM cosmic_neutron 
            WHERE station=%s 
            ORDER BY time_tag ASC
        """
        return query(sql, (station,))

    sql = """
        WITH cutoff AS (
            SELECT to_char(MAX(time_tag)::timestamp - (%s || ' minutes')::interval, 'YYYY-MM-DD HH24:MI:SS') as t
            FROM cosmic_neutron WHERE station = %s
        )
        SELECT cosmic_neutron.* FROM cosmic_neutron, cutoff
        WHERE station = %s 
          AND time_tag >= cutoff.t
        ORDER BY time_tag ASC
    """
    return query(sql, (limit, station, station))

@router.get("/gle77/timeline")
def get_gle77_timeline(window: int = 10):
    from routers.gle77_processor import load_and_process_gle77
    valid_window = window if window in (10, 20, 30) else 10
    return load_and_process_gle77(valid_window)