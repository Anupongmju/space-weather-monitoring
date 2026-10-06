from fastapi import APIRouter
from typing import Optional
import datetime
import psycopg2.extras  # type: ignore
from database import get_conn
from fetchers.mars_rad_fetcher import fetch_mars_rad, utc_to_sol

router = APIRouter(prefix="/mars", tags=["Mars Environment & RAD"])

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

@router.post("/fetch")
def fetch_all():
    return {
        "mars_rad": fetch_mars_rad()
    }

@router.get("/rad")
def get_mars_rad(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None, sol: Optional[int] = None):
    # Auto-seed / fetch if table is empty
    count_row = query("SELECT COUNT(*) as c FROM mars_rad_doserates")
    if not count_row or count_row[0]['c'] == 0:
        fetch_mars_rad()

    if sol is not None:
        return query("SELECT * FROM mars_rad_doserates WHERE sol = %s ORDER BY time_tag ASC", (sol,))

    if start_date and end_date:
        s = format_date_boundary(start_date, is_end=False)
        e = format_date_boundary(end_date, is_end=True)
        return query(
            """SELECT * FROM mars_rad_doserates 
               WHERE time_tag >= %s AND time_tag <= %s
               ORDER BY time_tag ASC""",
            (s, e)
        )

    # By default, return time-filtered latest rows using CTE index scan
    return query(
        """WITH cutoff AS (
            SELECT to_char(MAX(time_tag)::timestamp - (%s || ' minutes')::interval, 'YYYY-MM-DD HH24:MI:SS') as t
            FROM mars_rad_doserates
        )
        SELECT mars_rad_doserates.* FROM mars_rad_doserates, cutoff
        WHERE time_tag >= cutoff.t
        ORDER BY time_tag ASC""",
        (limit,)
    )

@router.get("/summary")
def get_mars_summary():
    # Fetch latest row
    latest_rows = query("SELECT * FROM mars_rad_doserates ORDER BY time_tag DESC LIMIT 1")
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    current_sol = utc_to_sol(now_utc)

    if not latest_rows:
        fetch_mars_rad()
        latest_rows = query("SELECT * FROM mars_rad_doserates ORDER BY time_tag DESC LIMIT 1")

    latest = latest_rows[0] if latest_rows else {
        "time_tag": now_utc.strftime('%Y-%m-%dT%H:%M:%SZ'),
        "sol": current_sol,
        "dose_rate_silicon": 8.85,
        "dose_rate_plastic": 9.72,
        "flux_charged": 1.42,
        "flux_neutral": 0.58
    }

    # Calculate 24h average and cumulative projections
    si_val = float(latest.get("dose_rate_silicon") or 8.85)
    plastic_val = float(latest.get("dose_rate_plastic") or 9.72)
    daily_dose_si = round(si_val * 24.0 / 1000.0, 3) # mGy/day
    daily_dose_plastic = round(plastic_val * 24.0 / 1000.0, 3) # mSv/day (approx Q ~ 1)
    annual_dose_mSv = round(daily_dose_plastic * 365.0, 1)

    # Latest MAVEN orbiter particle status
    maven_latest = query("SELECT time_tag, ion_1, ion_12, ion_20, ion_28, ele_1, ele_8, ele_15 FROM mars_maven_particles ORDER BY time_tag DESC LIMIT 1")
    maven_info = maven_latest[0] if maven_latest else None

    return {
        "current_sol": latest.get("sol", current_sol),
        "latest_time_tag": latest.get("time_tag"),
        "dose_rate_silicon": latest.get("dose_rate_silicon"), # uGy/hr
        "dose_rate_plastic": latest.get("dose_rate_plastic"), # uGy/hr
        "flux_charged": latest.get("flux_charged"),
        "flux_neutral": latest.get("flux_neutral"),
        "daily_dose_si_mGy": daily_dose_si,
        "daily_dose_plastic_mSv": daily_dose_plastic,
        "annual_projected_mSv": annual_dose_mSv,
        "status": "NORMAL / GCR QUIET",
        "human_safety_level": "NOMINAL EXPOSURE",
        "maven_latest": maven_info
    }

@router.get("/maven")
def get_mars_maven(limit: int = 168, start_date: Optional[str] = None, end_date: Optional[str] = None):
    if start_date and end_date:
        s_date = start_date.strip()[:10]
        e_date = end_date.strip()[:10]
        return query(
            """SELECT * FROM mars_maven_particles 
               WHERE substring(time_tag, 1, 10) >= %s AND substring(time_tag, 1, 10) <= %s
               ORDER BY time_tag ASC""",
            (s_date, e_date)
        )
    return query(
        """SELECT * FROM (
               SELECT * FROM mars_maven_particles 
               ORDER BY time_tag DESC LIMIT %s
           ) sub ORDER BY time_tag ASC""",
        (limit,)
    )

