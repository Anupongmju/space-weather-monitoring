from fastapi import APIRouter
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

@router.get("/neutron")
def get_neutron(station: str = "OULU", limit: int = 1440):
    sql = """
        SELECT * FROM cosmic_neutron 
        WHERE station=%s 
          AND time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM cosmic_neutron WHERE station=%s) - (%s || ' minutes')::INTERVAL
        ORDER BY time_tag ASC
    """
    return query(sql, (station, station, limit))