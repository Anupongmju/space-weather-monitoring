"""
import_nc_to_db.py — import GOES-18 SGPS NC ไฟล์ทั้งหมดเข้า goes_proton table
รัน: docker exec space_weather_backend python /app/import_nc_to_db.py
"""
import sys, os, glob, datetime, time
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/fetchers')

import psycopg2
from psycopg2.extras import execute_values
from fetchers.nc_reader import _nc_files_for_range, _read_single_nc, _NC_LOCK, EPOCH, _safe_float

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://myuser:mypassword@db:5432/space_weather')
NC_BASE = '/app/data/goes18'

DIFF_CHANNELS = [
    '1-2 MeV', '2-3 MeV', '2-4 MeV', '4-7 MeV',
    '6-11 MeV', '12-23 MeV', '26-38 MeV', '41-77 MeV',
    '81-98 MeV', '96-118 MeV', '115-138 MeV', '153-229 MeV', '267-390 MeV',
]

def get_all_nc_dates():
    """หาวันทั้งหมดที่มี NC ไฟล์ เรียง ascending"""
    dates = []
    for year_dir in sorted(glob.glob(os.path.join(NC_BASE, '*'))):
        for month_dir in sorted(glob.glob(os.path.join(year_dir, '*'))):
            for f in sorted(glob.glob(os.path.join(month_dir, '*.nc'))):
                fname = os.path.basename(f)
                try:
                    date_str = fname.split('_d')[1][:8]
                    d = datetime.date(int(date_str[:4]), int(date_str[4:6]), int(date_str[6:8]))
                    dates.append((d, f))
                except Exception:
                    continue
    return dates

def import_one_day(fpath: str, conn) -> int:
    """อ่าน NC 1 วัน แล้ว INSERT เข้า DB — คืนจำนวน rows ที่ insert"""
    import math

    with _NC_LOCK:
        time_vals, int_flux_list, diff_flux_list = _read_single_nc(fpath)

    rows = []
    for i in range(len(time_vals)):
        t_sec = time_vals[i]
        if t_sec is None or math.isnan(float(t_sec)):
            continue
        dt = EPOCH + datetime.timedelta(seconds=float(t_sec))
        time_tag = dt.strftime('%Y-%m-%dT%H:%M:%SZ')

        # Integral P11 (>=500 MeV)
        int_val = _safe_float(int_flux_list[i])
        if int_val is not None:
            rows.append((time_tag, '>=500 MeV', int_val, 18))

        # Differential P1-P10
        diff_row = diff_flux_list[i]
        for ch_idx, energy_str in enumerate(DIFF_CHANNELS):
            val = _safe_float(diff_row[ch_idx])
            if val is not None:
                rows.append((time_tag, energy_str, val, 18))

    if not rows:
        return 0

    cur = conn.cursor()
    execute_values(
        cur,
        """INSERT INTO goes_proton (time_tag, energy, flux, satellite)
           VALUES %s
           ON CONFLICT (time_tag, energy) DO NOTHING""",
        rows
    )
    conn.commit()
    return len(rows)

def main():
    print('=== NC → PostgreSQL Import ===')
    print(f'DB: {DATABASE_URL}')

    conn = psycopg2.connect(DATABASE_URL)

    all_dates = get_all_nc_dates()
    total_days = len(all_dates)
    print(f'NC files found: {total_days} days')
    print(f'Date range: {all_dates[0][0]} → {all_dates[-1][0]}')
    print()

    total_rows = 0
    t_start = time.time()

    for idx, (date, fpath) in enumerate(all_dates):
        t0 = time.time()
        try:
            inserted = import_one_day(fpath, conn)
            total_rows += inserted
            elapsed = time.time() - t0
            pct = (idx + 1) / total_days * 100
            eta_sec = (time.time() - t_start) / (idx + 1) * (total_days - idx - 1)
            eta_min = eta_sec / 60
            print(f'[{idx+1:4d}/{total_days}] {date} | {inserted:5d} rows | {elapsed*1000:.0f}ms | {pct:.1f}% | ETA {eta_min:.1f}min')
        except Exception as e:
            print(f'[{idx+1:4d}/{total_days}] {date} ERROR: {e}')
            conn.rollback()
            continue

    conn.close()

    total_time = time.time() - t_start
    print()
    print(f'=== Done ===')
    print(f'Total rows inserted: {total_rows:,}')
    print(f'Total time: {total_time/60:.1f} min')

if __name__ == '__main__':
    main()
