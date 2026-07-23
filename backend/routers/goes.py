from fastapi import APIRouter
from database import get_conn
from fetchers.goes_fetcher import fetch_all_goes
import psycopg2.extras

router = APIRouter(prefix="/goes", tags=["GOES"])

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
def fetch_all(): return fetch_all_goes()

from fetchers.goes_fetcher import fetch_xray, fetch_proton, fetch_electron, fetch_goes_mag, fetch_goes_wind

@router.post("/fetch/xray")
def route_fetch_xray(): return fetch_xray()

@router.post("/fetch/proton")
def route_fetch_proton(): return fetch_proton()

@router.post("/fetch/electron")
def route_fetch_electron(): return fetch_electron()

@router.post("/fetch/mag")
def route_fetch_mag(): return fetch_goes_mag()

@router.post("/fetch/wind")
def route_fetch_wind(): return fetch_goes_wind()


@router.get("/xray")
def get_xray(limit: int = 1440):
    return query(
        """SELECT * FROM goes_xray 
           WHERE time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM goes_xray) - (%s || ' minutes')::INTERVAL
           ORDER BY time_tag ASC""",
        (limit,)
    )

@router.get("/proton")
def get_proton(limit: int = 1440):
    return query(
        """SELECT * FROM goes_proton 
           WHERE time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM goes_proton) - (%s || ' minutes')::INTERVAL
           ORDER BY time_tag ASC""",
        (limit,)
    )

@router.get("/electron")
def get_electron(limit: int = 1440):
    return query(
        """SELECT * FROM goes_electron 
           WHERE time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM goes_electron) - (%s || ' minutes')::INTERVAL
           ORDER BY time_tag ASC""",
        (limit,)
    )

@router.get("/mag")
def get_mag(limit: int = 1440):
    return query(
        """SELECT * FROM goes_mag 
           WHERE time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM goes_mag) - (%s || ' minutes')::INTERVAL
           ORDER BY time_tag ASC""",
        (limit,)
    )

@router.get("/wind")
def get_wind(limit: int = 1440):
    return query(
        """SELECT * FROM goes_wind 
           WHERE time_tag::TIMESTAMP >= (SELECT MAX(time_tag)::TIMESTAMP FROM goes_wind) - (%s || ' minutes')::INTERVAL
           ORDER BY time_tag ASC""",
        (limit,)
    )

@router.get("/suvi-loop/{wavelength}")
def get_suvi_loop(wavelength: str, limit: int = 40):
    import httpx
    url = f"https://services.swpc.noaa.gov/products/animations/suvi-primary-{wavelength}.json"
    try:
        r = httpx.get(url, timeout=10.0)
        if r.status_code != 200:
            return {"urls": [], "error": f"NOAA returned status code {r.status_code}"}
        data = r.json()
        # Extract and format the URLs
        urls = [f"https://services.swpc.noaa.gov{item['url']}" for item in data[-limit:]]
        return {"urls": urls}
    except Exception as e:
        return {"urls": [], "error": str(e)}

@router.get("/sdo-rotation-frames")
async def get_sdo_rotation_frames(year: int = 2026, month: int = 6):
    import httpx, re, asyncio

    async with httpx.AsyncClient(timeout=5.0) as client:
        async def fetch_day(day: int):
            day_str = f"{day:02d}"
            month_str = f"{month:02d}"
            dir_url = f"https://sdo.gsfc.nasa.gov/assets/img/browse/{year}/{month_str}/{day_str}/"
            try:
                r = await client.get(dir_url)
                if r.status_code == 200:
                    match = re.search(r'href="([^"]+_1024_0304\.jpg)"', r.text)
                    if match:
                        return (day, f"{dir_url}{match.group(1)}")
            except Exception:
                pass
            return (day, None)

        tasks = [fetch_day(d) for d in range(1, 31)]
        results = await asyncio.gather(*tasks)
        sorted_results = sorted([r for r in results if r[1] is not None], key=lambda x: x[0])
        urls = [r[1] for r in sorted_results]

    return {"urls": urls}