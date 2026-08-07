from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List

from database import get_conn
from fetchers.ace_archive_fetcher import fetch_swepam_range
from psycopg2.extras import RealDictCursor, execute_values

router = APIRouter(prefix="/archive/ace", tags=["archive"])


def _query_swepam_from_db(start_dt: datetime, end_dt: datetime, limit: int) -> List[dict]:
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT time_tag, proton_density, bulk_speed, ion_temp
            FROM ace_swepam
            WHERE time_tag::TIMESTAMP >= %s::TIMESTAMP
              AND time_tag::TIMESTAMP <= %s::TIMESTAMP
            ORDER BY time_tag ASC
            LIMIT %s
            """,
            (start_dt.strftime('%Y-%m-%d %H:%M:%S'), end_dt.strftime('%Y-%m-%d %H:%M:%S'), limit)
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def _save_swepam_rows(rows: List[dict]) -> int:
    if not rows:
        return 0

    records = [
        (
            row.get('time_tag'),
            row.get('proton_density'),
            row.get('bulk_speed'),
            row.get('ion_temp'),
            0,
        )
        for row in rows
        if row.get('time_tag')
    ]

    if not records:
        return 0

    conn = get_conn()
    try:
        cur = conn.cursor()
        execute_values(
            cur,
            """
            INSERT INTO ace_swepam (time_tag, proton_density, bulk_speed, ion_temp, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
              proton_density = EXCLUDED.proton_density,
              bulk_speed = EXCLUDED.bulk_speed,
              ion_temp = EXCLUDED.ion_temp
            """,
            records,
        )
        conn.commit()
        return len(records)
    finally:
        conn.close()


@router.get('/swepam')
def archive_swepam(start: str = Query(..., description='YYYY-MM-DD'), end: str = Query(..., description='YYYY-MM-DD'), limit: int = Query(10000, ge=1, le=20000)) -> List[dict]:
    try:
        start_dt = datetime.strptime(start, '%Y-%m-%d')
        end_dt = datetime.strptime(end, '%Y-%m-%d')
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid date format; use YYYY-MM-DD')

    if end_dt < start_dt:
        raise HTTPException(status_code=400, detail='end must be >= start')

    db_rows = _query_swepam_from_db(start_dt, end_dt, limit)
    if db_rows:
        return db_rows

    try:
        rows = fetch_swepam_range(start_dt, end_dt, max_points=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        _save_swepam_rows(rows)
    except Exception:
        pass

    return rows
