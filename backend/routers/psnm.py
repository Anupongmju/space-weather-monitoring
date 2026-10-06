from fastapi import APIRouter
from typing import Optional
from database import get_conn
import psycopg2.extras

router = APIRouter(prefix="/psnm", tags=["PSNM"])

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
    if '.' in date_str:
        date_str = date_str.split('.')[0]
    if date_str.endswith('Z'):
        date_str = date_str[:-1].strip()
    return date_str

import datetime

def sanitize_row(r):
    if r.get('nm_uncorrected') is not None and r['nm_uncorrected'] > 80000:
        r['nm_uncorrected'] = None
    if r.get('bare_uncorrected') is not None and r['bare_uncorrected'] > 5000:
        r['bare_uncorrected'] = None
    return r

def decimate(rows, max_points=2200):
    n = len(rows)
    if n <= max_points:
        return [sanitize_row(r) for r in rows]
    step = (n + max_points - 1) // max_points
    return [sanitize_row(r) for r in rows[::step]]

@router.get("/data")
def get_data(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    if start_date and end_date:
        s = format_date_boundary(start_date, is_end=False)
        e = format_date_boundary(end_date, is_end=True)
        use_hourly = False
        try:
            d0 = datetime.date.fromisoformat(s[:10])
            d1 = datetime.date.fromisoformat(e[:10])
            if (d1 - d0).days > 14:
                use_hourly = True
        except Exception:
            pass

        if use_hourly:
            sql = """
                SELECT * FROM cosmic_psnm 
                WHERE time_tag >= %s AND time_tag <= %s AND minute = 0
                ORDER BY time_tag ASC
            """
        else:
            sql = """
                SELECT * FROM cosmic_psnm 
                WHERE time_tag >= %s AND time_tag <= %s
                ORDER BY time_tag ASC
            """
        return decimate(query(sql, (s, e)))

    if limit <= 0:
        sql = "SELECT * FROM cosmic_psnm WHERE minute = 0 ORDER BY time_tag ASC"
        return decimate(query(sql))

    max_row = query("SELECT MAX(time_tag) as max_t FROM cosmic_psnm")
    if not max_row or not max_row[0]['max_t']:
        return []
    max_t_str = max_row[0]['max_t']
    max_dt = datetime.datetime.fromisoformat(max_t_str.replace(' ', 'T'))
    cutoff_str = (max_dt - datetime.timedelta(minutes=limit)).strftime("%Y-%m-%d %H:%M:%S")

    if limit > 14400:
        sql = """
            SELECT * FROM cosmic_psnm 
            WHERE time_tag >= %s AND minute = 0
            ORDER BY time_tag ASC
        """
    else:
        sql = """
            SELECT * FROM cosmic_psnm 
            WHERE time_tag >= %s
            ORDER BY time_tag ASC
        """
    return decimate(query(sql, (cutoff_str,)))

@router.get("/data/range")
def get_data_range(start: str, end: str):
    return get_data(limit=0, start_date=start, end_date=end)

@router.get("/dates")
def get_dates():
    return query(
        """SELECT substr(time_tag, 1, 10) as date, COUNT(*) as records,
           MAX(nm_corrected) as max_count, MIN(nm_corrected) as min_count,
           AVG(pressure) as avg_pressure
           FROM cosmic_psnm
           GROUP BY substr(time_tag, 1, 10)
           ORDER BY date DESC"""
    )

@router.get("/scatter")
def get_scatter(limit: int = 1440, start_date: Optional[str] = None, end_date: Optional[str] = None):
    if start_date and end_date:
        s = format_date_boundary(start_date, is_end=False)
        e = format_date_boundary(end_date, is_end=True)
        sql = """
            SELECT time_tag, pressure, nm_uncorrected, nm_corrected, bare_uncorrected, bare_corrected, leader_cor
            FROM cosmic_psnm 
            WHERE pressure > 0 AND nm_uncorrected > 0
              AND time_tag >= %s AND time_tag <= %s
            ORDER BY time_tag ASC
        """
        return query(sql, (s, e))

    max_row = query("SELECT MAX(time_tag) as max_t FROM cosmic_psnm")
    if not max_row or not max_row[0]['max_t']:
        return []
    max_t_str = max_row[0]['max_t']
    max_dt = datetime.datetime.fromisoformat(max_t_str.replace(' ', 'T'))
    cutoff_str = (max_dt - datetime.timedelta(minutes=limit)).strftime("%Y-%m-%d %H:%M:%S")

    sql = """
        SELECT time_tag, pressure, nm_uncorrected, nm_corrected, bare_uncorrected, bare_corrected, leader_cor
        FROM cosmic_psnm 
        WHERE pressure > 0 AND nm_uncorrected > 0
          AND time_tag >= %s
        ORDER BY time_tag ASC
    """
    return query(sql, (cutoff_str,))

import json
from pathlib import Path
REGRESSION_FILE = Path(__file__).resolve().parent.parent / "data" / "psnm_regression.json"

@router.get("/regression")
def get_regression():
    if REGRESSION_FILE.exists():
        with open(REGRESSION_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "Regression file not found", "channels": {}}
