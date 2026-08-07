"""
nc_reader.py — อ่านข้อมูล GOES-18 SGPS L2 จาก NetCDF ไฟล์ใน local disk
คืนข้อมูลในรูปแบบเดียวกับ goes_proton table เพื่อให้ frontend ใช้งานได้โดยไม่ต้องแก้ไข
"""
import os
import glob
import datetime
import math
import threading
from typing import Optional

try:
    import netCDF4 as nc_lib
    NC_AVAILABLE = True
except ImportError:
    NC_AVAILABLE = False

# epoch ของ GOES NC files
EPOCH = datetime.datetime(2000, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)

# path base ของ NC files
# Docker: /app/data/goes18  |  local dev: ./data/goes18
_module_dir = os.path.dirname(os.path.abspath(__file__))
NC_BASE = os.path.normpath(os.path.join(_module_dir, '..', 'data', 'goes18'))

# netCDF4 ไม่ thread-safe → ใช้ Lock คุมไม่ให้ 2 requests อ่านพร้อมกัน
_NC_LOCK = threading.Lock()


def _nc_files_for_range(start_date: datetime.date, end_date: datetime.date) -> list[str]:
    """หา NC files ที่ตรงกับช่วง date ที่ต้องการ"""
    files = []
    current = start_date
    while current <= end_date:
        pattern = os.path.join(
            NC_BASE,
            str(current.year),
            f'{current.month:02d}',
            f'sci_sgps-l2-avg5m_g18_d{current.strftime("%Y%m%d")}_v*.nc'
        )
        matched = glob.glob(pattern)
        if matched:
            files.append(sorted(matched)[-1])  # เลือก version ล่าสุด
        current += datetime.timedelta(days=1)
    return files


def _safe_float(val) -> Optional[float]:
    """แปลง masked/nan value เป็น float หรือ None"""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _read_single_nc(fpath: str) -> tuple[list, list, list]:
    """
    อ่าน 1 NC file → คืน (time_list, int_flux_list, diff_flux_list)
    ทุก array เป็น plain Python list แล้ว (ไม่มี masked array)
    เรียกภายใต้ _NC_LOCK เสมอ
    """
    f = nc_lib.Dataset(fpath)
    try:
        time_vals = f.variables['time'][:].data.tolist()   # copy → plain list
        int_flux  = f.variables['AvgIntProtonFlux'][:, 0].data.tolist()
        diff_flux = f.variables['AvgDiffProtonFlux'][:, 0, :].data.tolist()
    finally:
        f.close()
    return time_vals, int_flux, diff_flux


def read_proton_nc(start_date: datetime.date, end_date: datetime.date) -> list[dict]:
    """
    อ่าน proton flux จาก NC files ในช่วง [start_date, end_date]
    คืน list ของ dict ที่มี format เหมือน goes_proton table:
      {time_tag, energy, flux, satellite, source}
    Thread-safe: ใช้ _NC_LOCK คุม netCDF4
    """
    if not NC_AVAILABLE:
        return []

    files = _nc_files_for_range(start_date, end_date)
    if not files:
        return []

    DIFF_CHANNELS = [
        '1-2 MeV', '2-3 MeV', '2-4 MeV', '4-7 MeV',
        '6-11 MeV', '12-23 MeV', '26-38 MeV', '41-77 MeV',
        '81-98 MeV', '96-118 MeV', '115-138 MeV', '153-229 MeV', '267-390 MeV',
    ]

    rows = []
    for fpath in files:
        try:
            # อ่าน NC ทีละไฟล์ภายใต้ lock — ป้องกัน concurrent access crash
            with _NC_LOCK:
                time_vals, int_flux_list, diff_flux_list = _read_single_nc(fpath)

            # แปลงข้อมูลใน plain Python (ไม่ต้อง lock แล้ว)
            for i in range(len(time_vals)):
                t_sec = time_vals[i]
                if t_sec is None or math.isnan(t_sec):
                    continue
                dt = EPOCH + datetime.timedelta(seconds=t_sec)
                time_tag = dt.strftime('%Y-%m-%dT%H:%M:%SZ')

                # Integral P11 (>500 MeV)
                int_val = _safe_float(int_flux_list[i])
                if int_val is not None:
                    rows.append({
                        'time_tag':  time_tag,
                        'energy':    '>=500 MeV',
                        'flux':      int_val,
                        'satellite': 18,
                        'source':    'nc',
                    })

                # Differential channels P1-P10
                diff_row = diff_flux_list[i]
                for ch_idx, energy_str in enumerate(DIFF_CHANNELS):
                    val = _safe_float(diff_row[ch_idx])
                    if val is not None:
                        rows.append({
                            'time_tag':  time_tag,
                            'energy':    energy_str,
                            'flux':      val,
                            'satellite': 18,
                            'source':    'nc',
                        })

        except Exception as e:
            print(f'[NC Reader] Error reading {fpath}: {e}')
            continue

    return rows


def nc_date_coverage() -> dict:
    """คืน dict ที่บอกว่า NC มีข้อมูลช่วงไหนบ้าง"""
    if not NC_AVAILABLE:
        return {'available': False}

    all_dates = []
    for year_dir in glob.glob(os.path.join(NC_BASE, '*')):
        for month_dir in glob.glob(os.path.join(year_dir, '*')):
            for f in glob.glob(os.path.join(month_dir, '*.nc')):
                fname = os.path.basename(f)
                # ดึงวันที่จาก filename: sci_sgps-l2-avg5m_g18_d20220913_v3-0-0.nc
                try:
                    date_str = fname.split('_d')[1][:8]
                    all_dates.append(datetime.date(int(date_str[:4]), int(date_str[4:6]), int(date_str[6:8])))
                except Exception:
                    continue

    if not all_dates:
        return {'available': False, 'min_date': None, 'max_date': None}

    return {
        'available': True,
        'min_date': str(min(all_dates)),
        'max_date': str(max(all_dates)),
        'file_count': len(all_dates),
    }
