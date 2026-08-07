from fastapi import APIRouter
from typing import Optional
from database import get_conn
from fetchers.ace_fetcher import fetch_all_ace, fetch_swepam, fetch_mag, fetch_epam, fetch_sis
import psycopg2.extras

router = APIRouter(prefix="/ace", tags=["ACE"])

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
def fetch_all(): return fetch_all_ace()

@router.post("/fetch/swepam")
def fetch_sw(): return {"rows": fetch_swepam()}

@router.post("/fetch/mag")
def fetch_mg(): return {"rows": fetch_mag()}

@router.post("/fetch/epam")
def fetch_ep(): return {"rows": fetch_epam()}

@router.post("/fetch/sis")
def fetch_si(): return {"rows": fetch_sis()}

def format_date_boundary(date_str: str, is_end: bool = False) -> str:
    if not date_str:
        return ""
    date_str = date_str.strip().replace('T', ' ')
    if len(date_str) == 10:
        return f"{date_str} 23:59:59" if is_end else f"{date_str} 00:00:00"
    return date_str

def get_time_filtered_query(table_name: str, limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    if start_date and end_date:
        s = format_date_boundary(start_date, is_end=False)
        e = format_date_boundary(end_date, is_end=True)
        return query(
            f"""SELECT * FROM {table_name} 
               WHERE time_tag::TIMESTAMP >= %s::TIMESTAMP 
                 AND time_tag::TIMESTAMP <= %s::TIMESTAMP
               ORDER BY time_tag ASC""",
            (s, e)
        )
    return query(
        f"""SELECT * FROM {table_name} 
           WHERE time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM {table_name}) - (%s || ' minutes')::INTERVAL
           ORDER BY time_tag ASC""",
        (limit,)
    )

@router.get("/swepam")
def get_swepam(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("ace_swepam", limit, start_date, end_date)

@router.get("/mag")
def get_mag(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("ace_mag", limit, start_date, end_date)

@router.get("/epam")
def get_epam(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("ace_epam", limit, start_date, end_date)

@router.get("/sis")
def get_sis(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("ace_sis", limit, start_date, end_date)