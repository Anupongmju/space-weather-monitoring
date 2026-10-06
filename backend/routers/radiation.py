from fastapi import APIRouter
from typing import Optional
import datetime
import psycopg2.extras  # type: ignore
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

    return query(
        f"""WITH cutoff AS (
            SELECT to_char(MAX(time_tag)::timestamp - (%s || ' minutes')::interval, 'YYYY-MM-DD HH24:MI:SS') as t
            FROM {table_name}
        )
        SELECT {table_name}.* FROM {table_name}, cutoff
        WHERE time_tag >= cutoff.t
        ORDER BY time_tag ASC""",
        (limit,)
    )

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
    rows = get_time_filtered_query("solar1_stis_particles", limit, start_date, end_date)
    if not rows and start_date and end_date:
        try:
            from datetime import datetime
            from backfill_solar1_stis import backfill_solar1_stis
            s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
            e_dt = datetime.strptime(end_date[:10], "%Y-%m-%d")
            if 0 <= (e_dt - s_dt).days <= 31:
                backfill_solar1_stis(s_dt, e_dt, minute_interval=1)
                rows = get_time_filtered_query("solar1_stis_particles", limit, start_date, end_date)
        except Exception as err:
            print(f"[Auto-Fetch SOLAR-1 Error]: {err}")
    return rows

@router.post("/solar1/backfill")
def backfill_solar1_stis_data(start_date: str, end_date: str, freq: str = "1min"):
    from datetime import datetime
    from backfill_solar1_stis import backfill_solar1_stis
    s = datetime.strptime(start_date, "%Y-%m-%d")
    e = datetime.strptime(end_date, "%Y-%m-%d")
    backfill_solar1_stis(s, e, minute_interval=1)
    return {"status": "success", "start": start_date, "end": end_date}

@router.get("/solar1/plasma")
def get_solar1_plasma(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    rows = get_time_filtered_query("solar1_rtsw", limit, start_date, end_date)
    if not rows:
        try:
            from fetchers.solar1_fetcher import fetch_solar1_swips_plasma
            fetch_solar1_swips_plasma()
            rows = get_time_filtered_query("solar1_rtsw", limit, start_date, end_date)
        except Exception as err:
            print(f"[Auto-Fetch SOLAR-1 Plasma Error]: {err}")
    return rows

@router.get("/solar1/mag")
def get_solar1_mag(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    rows = get_time_filtered_query("solar1_mag", limit, start_date, end_date)
    if not rows and start_date and end_date:
        try:
            from datetime import datetime
            from backfill_solar1_mag import backfill_solar1_mag
            s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
            e_dt = datetime.strptime(end_date[:10], "%Y-%m-%d")
            if 0 <= (e_dt - s_dt).days <= 31:
                backfill_solar1_mag(s_dt, e_dt)
                rows = get_time_filtered_query("solar1_mag", limit, start_date, end_date)
        except Exception as err:
            print(f"[Auto-Fetch SOLAR-1 MAG Error]: {err}")
    return rows

@router.get("/crater")
def get_crater(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("crater_doserates", limit, start_date, end_date)
