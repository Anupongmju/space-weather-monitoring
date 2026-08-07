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
              AND time_tag::TIMESTAMP >= %s::TIMESTAMP 
              AND time_tag::TIMESTAMP <= %s::TIMESTAMP
            ORDER BY time_tag ASC
        """
        return query(sql, (station, s, e))

    sql = """
        SELECT * FROM cosmic_neutron 
        WHERE station=%s 
          AND time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM cosmic_neutron WHERE station=%s) - (%s || ' minutes')::INTERVAL
        ORDER BY time_tag ASC
    """
    return query(sql, (station, station, limit))