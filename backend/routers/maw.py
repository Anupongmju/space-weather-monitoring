from fastapi import APIRouter
from database import get_conn
from fetchers.maw_fetcher import fetch_maw_today, fetch_maw_range, fetch_maw_day
import psycopg2.extras

router = APIRouter(prefix="/maw", tags=["MAW"])

def query(sql, params=()):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@router.post("/fetch/today")
def fetch_today(): return fetch_maw_today()

@router.post("/fetch/range")
def fetch_range(days: int = 7): return fetch_maw_range(days)

@router.post("/fetch/{year}/{doy}")
def fetch_specific(year: int, doy: int):
    count, err = fetch_maw_day(year, doy)
    return {"year": year, "doy": doy, "rows": count, "error": err}

@router.get("/data")
def get_data(limit: int = 1440):
    sql = """
        SELECT * FROM cosmic_maw 
        WHERE time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM cosmic_maw) - (%s || ' minutes')::INTERVAL
        ORDER BY time_tag ASC
    """
    return query(sql, (limit,))

@router.get("/data/range")
def get_data_range(start: str, end: str):
    return query(
        "SELECT * FROM cosmic_maw WHERE time_tag BETWEEN %s AND %s ORDER BY time_tag",
        (start, end)
    )

@router.get("/dates")
def get_dates():
    return query(
        """SELECT substr(time_tag,1,10) as date, COUNT(*) as records,
           MAX(nm_corrected) as max_count, MIN(nm_corrected) as min_count,
           AVG(pressure) as avg_pressure
           FROM cosmic_maw
           GROUP BY substr(time_tag,1,10)
           ORDER BY date DESC"""
    )

@router.get("/scatter")
def get_scatter(limit: int = 1440):
    sql = """
        SELECT time_tag, pressure, nm_uncorrected, nm_corrected
        FROM cosmic_maw 
        WHERE pressure > 0 AND nm_uncorrected > 0
          AND time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM cosmic_maw) - (%s || ' minutes')::INTERVAL
        ORDER BY time_tag ASC
    """
    return query(sql, (limit,))