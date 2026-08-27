from fastapi import APIRouter
from typing import Optional
import psycopg2.extras
from database import get_conn
from fetchers.sunspot_fetcher import fetch_sunspot_data

router = APIRouter(prefix="/sunspot", tags=["Sunspot"])

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
def trigger_sunspot_fetch():
    return fetch_sunspot_data()

@router.get("/monthly")
def get_monthly_sunspot(
    limit: Optional[int] = None,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None
):
    # Check if DB has data, if empty, auto fetch
    count_res = query("SELECT COUNT(*) as cnt FROM sunspot_monthly")
    if not count_res or count_res[0]['cnt'] == 0:
        fetch_sunspot_data()

    base_sql = "SELECT * FROM sunspot_monthly"
    where_clauses = []
    params = []

    if start_year is not None:
        where_clauses.append("year >= %s")
        params.append(start_year)
    if end_year is not None:
        where_clauses.append("year <= %s")
        params.append(end_year)

    if where_clauses:
        base_sql += " WHERE " + " AND ".join(where_clauses)

    if limit is not None and limit > 0:
        sql = f"SELECT * FROM ({base_sql} ORDER BY time_tag DESC LIMIT %s) sub ORDER BY time_tag ASC"
        params.append(limit)
    else:
        sql = f"{base_sql} ORDER BY time_tag ASC"

    return query(sql, tuple(params))

@router.get("/latest")
def get_latest_sunspot():
    count_res = query("SELECT COUNT(*) as cnt FROM sunspot_monthly")
    if not count_res or count_res[0]['cnt'] == 0:
        fetch_sunspot_data()

    latest_rows = query("SELECT * FROM sunspot_monthly ORDER BY time_tag DESC LIMIT 1")
    if not latest_rows:
        return {"status": "nodata"}

    latest = latest_rows[0]
    
    # Calculate 12-month average/max for context
    stats_rows = query("""
        SELECT 
            AVG(sunspot_number) as avg_12m,
            MAX(sunspot_number) as max_12m,
            MIN(sunspot_number) as min_12m
        FROM (
            SELECT sunspot_number FROM sunspot_monthly ORDER BY time_tag DESC LIMIT 12
        ) sub
    """)

    stats = stats_rows[0] if stats_rows else {}

    return {
        "status": "success",
        "latest": latest,
        "avg_12m": round(stats.get("avg_12m") or 0.0, 1),
        "max_12m": round(stats.get("max_12m") or 0.0, 1),
        "min_12m": round(stats.get("min_12m") or 0.0, 1),
    }
