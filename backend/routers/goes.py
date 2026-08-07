from fastapi import APIRouter
from typing import Optional
import datetime
import asyncio
from database import get_conn
from fetchers.goes_fetcher import fetch_all_goes
from fetchers.nc_reader import read_proton_nc, nc_date_coverage
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
        return []

    max_t_str = max_row[0]['max_t']
    try:
        dt = datetime.datetime.fromisoformat(max_t_str.replace('Z', '+00:00'))
        min_dt = dt - datetime.timedelta(minutes=limit)
        min_t_str = min_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception:
        min_t_str = max_t_str

    return query(
        f"""SELECT * FROM {table_name} 
           WHERE time_tag >= %s
           ORDER BY time_tag ASC""",
        (min_t_str,)
    )

@router.get("/xray")
def get_xray(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("goes_xray", limit, start_date, end_date)

@router.get("/proton")
async def get_proton(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    # ดึงจาก DB ก่อน (run in thread pool เพื่อไม่ block event loop)
    loop = asyncio.get_event_loop()
    db_result = await loop.run_in_executor(None, get_time_filtered_query, "goes_proton", limit, start_date, end_date)

    # ถ้ากำหนด date range และ DB ไม่มีข้อมูล → ลองดึงจาก NC ไฟล์ (ใน thread pool)
    if start_date and end_date and len(db_result) == 0:
        try:
            s = start_date.strip()[:10]  # เอาแค่ YYYY-MM-DD
            e = end_date.strip()[:10]
            start_dt = datetime.date.fromisoformat(s)
            end_dt   = datetime.date.fromisoformat(e)
            nc_result = await loop.run_in_executor(None, read_proton_nc, start_dt, end_dt)
            if nc_result:
                print(f"[NC Fallback] DB empty for {s}~{e}, loaded {len(nc_result)} rows from NC files")
            return nc_result
        except Exception as ex:
            print(f"[NC Fallback] Error: {ex}")
            return db_result

    return db_result


@router.get("/proton-nc")
async def get_proton_nc(start_date: str, end_date: str):
    """อ่าน proton flux จาก NC files โดยตรง (ไม่ผ่าน DB)"""
    try:
        start_dt = datetime.date.fromisoformat(start_date.strip()[:10])
        end_dt   = datetime.date.fromisoformat(end_date.strip()[:10])
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, read_proton_nc, start_dt, end_dt)
    except Exception as ex:
        return {"error": str(ex)}


@router.get("/nc-coverage")
def get_nc_coverage():
    """บอกว่า NC files มีข้อมูลช่วงวันที่ไหนบ้าง"""
    return nc_date_coverage()

@router.get("/electron")
def get_electron(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("goes_electron", limit, start_date, end_date)

@router.get("/mag")
def get_mag(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("goes_mag", limit, start_date, end_date)

@router.get("/wind")
def get_wind(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return get_time_filtered_query("goes_wind", limit, start_date, end_date)


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