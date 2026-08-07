from fastapi import APIRouter
from typing import Optional
import datetime
import psycopg2.extras
from database import get_conn
from fetchers.stereo_fetcher import fetch_stereo_particles
from fetchers.solar1_fetcher import fetch_solar1_rtsw
from fetchers.crater_fetcher import fetch_crater_doserates

router = APIRouter(prefix="/radiation", tags=["Radiation & Particles"])

def query(sql, params=()):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

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
               WHERE time_tag >= %s 
                 AND time_tag <= %s
               ORDER BY time_tag ASC""",
            (s, e)
        )

    max_row = query(f"SELECT MAX(time_tag) as max_t FROM {table_name}")
    if not max_row or not max_row[0]['max_t']:
        return query(f"SELECT * FROM {table_name} ORDER BY time_tag ASC LIMIT %s", (limit,))

    max_t_str = max_row[0]['max_t']
    try:
        dt = datetime.datetime.fromisoformat(max_t_str.replace('Z', '+00:00'))
        min_dt = dt - datetime.timedelta(minutes=limit)
        min_t_str = min_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception:
        min_t_str = max_t_str

    rows = query(
        f"""SELECT * FROM {table_name} 
           WHERE time_tag >= %s
           ORDER BY time_tag ASC""",
        (min_t_str,)
    )

    if not rows:
        return query(f"SELECT * FROM {table_name} ORDER BY time_tag ASC LIMIT %s", (limit,))

    return rows

@router.post("/fetch")
def fetch_all_radiation():
    return {
        "stereo":  fetch_stereo_particles(),
        "solar1":  fetch_solar1_rtsw(),
        "crater":  fetch_crater_doserates()
    }

@router.get("/stereo")
def get_stereo(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("stereo_particles", limit, start_date, end_date)

@router.get("/solar1")
def get_solar1(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("solar1_stis_particles", limit, start_date, end_date)

@router.get("/crater")
def get_crater(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("crater_doserates", limit, start_date, end_date)
