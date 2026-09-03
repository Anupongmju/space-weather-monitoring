import os
import glob
import math
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/moon", tags=["Moon Orbit & Space Weather"])

# Standard Earth Radius in kilometers
EARTH_RADIUS_KM = 6371.0

# 27 Specific Event Dates provided by User
EVENT_DATES = [
    "2026/04/03",
    "2026/03/20",
    "2026/02/21",
    "2026/01/21",
    "2025/12/03",
    "2025/11/20",
    "2025/11/08",
    "2025/11/06",
    "2025/09/03",
    "2025/06/20",
    "2025/06/02",
    "2025/04/16",
    "2025/04/02",
    "2024/12/21",
    "2024/11/29",
    "2024/10/28",
    "2024/10/12",
    "2024/10/07",
    "2024/09/18",
    "2024/09/05",
    "2024/08/12",
    "2024/07/29",
    "2024/05/10",  # Historic G5 Solar Storm
    "2024/03/24",  # Major G4 Solar Storm
    "2023/04/23",  # Severe G4 Geomagnetic Storm
    "2021/11/03",  # Major Solar CME
]

# ── INGEST & INDEX CRATER DOSERATE DATA FROM BACKEND/DATA/DOESRATE ──
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSERATE_DIR = os.path.join(BASE_DIR, "data", "doesrate")

_DOSERATE_CACHE: Dict[str, Dict[str, Any]] = {}

def _load_doserate_data():
    global _DOSERATE_CACHE
    if _DOSERATE_CACHE:
        return _DOSERATE_CACHE

    res: Dict[str, List[Dict[str, Any]]] = {}
    files = glob.glob(os.path.join(DOSERATE_DIR, "*.txt"))
    for f in files:
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as fp:
                for line in fp:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split("\t")
                    if len(parts) >= 16:
                        try:
                            jd = float(parts[0])
                            # Convert Julian Date to UTC datetime
                            dt_jd = datetime(1858, 11, 17, tzinfo=timezone.utc) + timedelta(days=jd - 2400000.5)
                            d_str = dt_jd.strftime("%Y/%m/%d")

                            def parse_float(v):
                                try:
                                    val = float(v)
                                    return None if (math.isnan(val) or math.isinf(val)) else val
                                except Exception:
                                    return None

                            d12 = parse_float(parts[7])
                            d34 = parse_float(parts[8])
                            d56 = parse_float(parts[9])
                            d1 = parse_float(parts[10])
                            d2 = parse_float(parts[11])
                            d3 = parse_float(parts[12])
                            d4 = parse_float(parts[13])
                            d5 = parse_float(parts[14])
                            d6 = parse_float(parts[15])

                            if d_str not in res:
                                res[d_str] = []
                            res[d_str].append({
                                "time": dt_jd.strftime("%H:%M"),
                                "d12": d12, "d34": d34, "d56": d56,
                                "d1": d1, "d2": d2, "d3": d3,
                                "d4": d4, "d5": d5, "d6": d6,
                            })
                        except Exception:
                            continue
        except Exception as e:
            print(f"[Moon Router] Error loading doserates file {f}: {e}")

    # Compute daily aggregates
    cache_summary: Dict[str, Dict[str, Any]] = {}
    for d_str, entries in res.items():
        def avg(key):
            vals = [e[key] for e in entries if e[key] is not None]
            return round(sum(vals) / len(vals), 6) if vals else None

        a12 = avg("d12")
        a34 = avg("d34")
        a56 = avg("d56")
        a1 = avg("d1")
        a2 = avg("d2")
        a3 = avg("d3")
        a4 = avg("d4")
        a5 = avg("d5")
        a6 = avg("d6")

        status = "VALID" if (a12 is not None or a34 is not None or a56 is not None) else "DATA_GAP"
        hourly_series = [
            {
                "time": e["time"],
                "d12": e["d12"],
                "d34": e["d34"],
                "d56": e["d56"],
            }
            for e in entries
        ]
        cache_summary[d_str] = {
            "d12": a12,
            "d34": a34,
            "d56": a56,
            "d1": a1,
            "d2": a2,
            "d3": a3,
            "d4": a4,
            "d5": a5,
            "d6": a6,
            "status": status,
            "unit": "cGy/yr",
            "samples_count": len(entries),
            "hourly": hourly_series
        }

    _DOSERATE_CACHE = cache_summary
    return _DOSERATE_CACHE

# Preload cache on module import
_load_doserate_data()

def get_doserate_for_date(date_str: str, window_days_before: int = 3, window_days_after: int = 4) -> Dict[str, Any]:
    """
    Look up CRaTER doserate data for a 1-week window around the event date
    (default: 3 days before + event day + 4 days after).
    """
    clean_d = date_str.strip().replace('-', '/')
    cache = _load_doserate_data()

    parts = clean_d.split('/')
    if len(parts) != 3:
        return {"status": "DATA_GAP", "samples_count": 0, "hourly": []}

    try:
        y_int, m_int, day_int = int(parts[0]), int(parts[1]), int(parts[2])
        target_dt = datetime(y_int, m_int, day_int, tzinfo=timezone.utc)
    except Exception:
        return {"status": "DATA_GAP", "samples_count": 0, "hourly": []}

    start_dt = target_dt - timedelta(days=window_days_before)
    end_dt = target_dt + timedelta(days=window_days_after)

    event_day_data = cache.get(clean_d, {})

    combined_hourly = []
    for offset in range(-window_days_before, window_days_after + 1):
        cur_dt = target_dt + timedelta(days=offset)
        cur_key = cur_dt.strftime("%Y/%m/%d")
        day_entry = cache.get(cur_key)
        if day_entry and day_entry.get("hourly"):
            m_s = cur_dt.strftime("%m-%d")
            for h in day_entry["hourly"]:
                combined_hourly.append({
                    "time": f"{m_s} {h['time']}",
                    "d12": h.get("d12"),
                    "d34": h.get("d34"),
                    "d56": h.get("d56"),
                    "d1": h.get("d1"),
                    "d2": h.get("d2"),
                    "d3": h.get("d3"),
                    "d4": h.get("d4"),
                    "d5": h.get("d5"),
                    "d6": h.get("d6"),
                })

    status = event_day_data.get("status", "VALID" if combined_hourly else "DATA_GAP")
    return {
        "d12": event_day_data.get("d12"),
        "d34": event_day_data.get("d34"),
        "d56": event_day_data.get("d56"),
        "d1": event_day_data.get("d1"),
        "d2": event_day_data.get("d2"),
        "d3": event_day_data.get("d3"),
        "d4": event_day_data.get("d4"),
        "d5": event_day_data.get("d5"),
        "d6": event_day_data.get("d6"),
        "status": status,
        "unit": "cGy/yr",
        "samples_count": len(combined_hourly),
        "window_start": start_dt.strftime("%Y-%m-%d"),
        "window_end": end_dt.strftime("%Y-%m-%d"),
        "event_date": target_dt.strftime("%Y-%m-%d"),
        "hourly": combined_hourly
    }


# ── INGEST & INDEX GOES PROTON DIFFERENTIAL FLUX (GOES-18 NC / GOES-16 TXT) ──
GOES_NC_DIR = os.path.join(BASE_DIR, "data", "GOES18")
if not os.path.exists(GOES_NC_DIR):
    GOES_NC_DIR = os.path.join(BASE_DIR, "data", "goes18")

EPOCH_2000 = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
_GOES_DIFF_CACHE: Dict[str, Dict[str, Any]] = {}

DIFF_CHANNELS = [
    '1-2 MeV', '2-3 MeV', '2-4 MeV', '4-7 MeV',
    '6-11 MeV', '12-23 MeV', '26-38 MeV', '41-77 MeV',
    '81-98 MeV', '96-118 MeV', '115-138 MeV', '153-229 MeV', '267-390 MeV',
]

DIFF_CH_MAP = {
    # Standard MeV format
    '1-2 MeV': 0, '2-3 MeV': 1, '2-4 MeV': 2, '4-7 MeV': 3,
    '6-11 MeV': 4, '12-23 MeV': 5, '26-38 MeV': 6, '41-77 MeV': 7,
    '81-98 MeV': 8, '96-118 MeV': 9, '115-138 MeV': 10, '153-229 MeV': 11, '267-390 MeV': 12,
    # keV format (GOES Level-2 NC / DB alternate format)
    '1020-1860 keV': 0, '1900-2300 keV': 1, '2310-3340 keV': 2, '3400-6480 keV': 3,
    '5840-11000 keV': 4, '11640-23270 keV': 5, '25900-38100 keV': 6, '40300-73400 keV': 7,
    '83700-98500 keV': 8, '99900-118000 keV': 9, '115000-143000 keV': 10, '160000-242000 keV': 11, '276000-404000 keV': 12,
    # Integral channels fallback
    '>=1 MeV': 0, '>1 MeV': 0,
    '>=5 MeV': 3, '>5 MeV': 3,
    '>=10 MeV': 5, '>10 MeV': 5,
    '>=30 MeV': 6, '>30 MeV': 6,
    '>=50 MeV': 7, '>50 MeV': 7,
    '>=60 MeV': 7, '>60 MeV': 7,
    '>=100 MeV': 12, '>100 MeV': 12,
    '>=500 MeV': 12, '>500 MeV': 12,
}

def get_goes_proton_for_date(date_str: str, window_days_before: int = 3, window_days_after: int = 4) -> Dict[str, Any]:
    """
    Extract GOES-18 SGPS Differential Proton flux for a 1-week window around the event date
    (default: 3 days before + event day + 4 days after).
    """
    global _GOES_DIFF_CACHE
    clean_d = date_str.strip().replace('-', '/')
    cache_key = f"{clean_d}_w{window_days_before}_{window_days_after}"
    if cache_key in _GOES_DIFF_CACHE:
        return _GOES_DIFF_CACHE[cache_key]

    parts = clean_d.split('/')
    if len(parts) != 3:
        return {"status": "DATA_GAP", "samples_count": 0, "series": []}

    try:
        y_int, m_int, day_int = int(parts[0]), int(parts[1]), int(parts[2])
        target_dt = datetime(y_int, m_int, day_int, tzinfo=timezone.utc)
    except Exception:
        return {"status": "DATA_GAP", "samples_count": 0, "series": []}

    start_dt = target_dt - timedelta(days=window_days_before)
    end_dt = target_dt + timedelta(days=window_days_after + 1)
    t_start_iso = start_dt.strftime("%Y-%m-%dT00:00:00Z")
    t_end_iso = end_dt.strftime("%Y-%m-%dT00:00:00Z")

    # 0. Query PostgreSQL Database (goes_proton table) — Fast indexed scan
    try:
        from database import get_conn
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT time_tag, energy, flux FROM goes_proton WHERE time_tag >= %s AND time_tag < %s ORDER BY time_tag ASC",
            (t_start_iso, t_end_iso)
        )
        db_rows = cur.fetchall()
        conn.close()

        if db_rows:
            time_map: Dict[str, Dict[str, Any]] = {}
            ch_vals = [[] for _ in range(13)]
            for t_tag, energy, flux in db_rows:
                if energy not in DIFF_CH_MAP:
                    continue

                ch_idx = DIFF_CH_MAP[energy]
                try:
                    f_val = float(flux) if flux is not None else None
                    if f_val is None or math.isnan(f_val) or f_val < 0:
                        continue
                except Exception:
                    continue

                # Format time label as 'MM-DD HH:mm'
                t_label = f"{t_tag[5:10]} {t_tag[11:16]}" if len(t_tag) >= 16 else t_tag
                if t_label not in time_map:
                    pt_init: Dict[str, Any] = {"time": t_label, "time_iso": t_tag}
                    for k in range(13):
                        pt_init[f"ch{k}"] = None
                    pt_init["p_low"] = None
                    pt_init["p_mid"] = None
                    pt_init["p_high"] = None
                    time_map[t_label] = pt_init

                time_map[t_label][f"ch{ch_idx}"] = f_val
                ch_vals[ch_idx].append(f_val)
                if ch_idx == 0:
                    time_map[t_label]["p_low"] = f_val
                elif ch_idx == 5:
                    time_map[t_label]["p_mid"] = f_val
                elif ch_idx == 8 or ch_idx == 12:
                    if time_map[t_label]["p_high"] is None or ch_idx == 8:
                        time_map[t_label]["p_high"] = f_val

            series = list(time_map.values())
            if series:
                avgs = {f"avg_ch{k}": (round(sum(ch_vals[k]) / len(ch_vals[k]), 6) if ch_vals[k] else None) for k in range(13)}
                avg_low = avgs["avg_ch0"]
                avg_mid = avgs["avg_ch5"]
                avg_high = avgs["avg_ch8"] if avgs["avg_ch8"] is not None else avgs["avg_ch12"]

                res = {
                    "satellite": "GOES-18",
                    "instrument": "SGPS (Differential)",
                    "mode": "DIFFERENTIAL",
                    "unit": "protons/(cm²·s·sr·MeV)",
                    "channel_labels": DIFF_CHANNELS,
                    "channel_low_label": "1-2 MeV",
                    "channel_mid_label": "12-23 MeV",
                    "channel_high_label": "81-98 MeV",
                    "avg_low": avg_low,
                    "avg_mid": avg_mid,
                    "avg_high": avg_high,
                    **avgs,
                    "window_start": start_dt.strftime("%Y-%m-%d"),
                    "window_end": (target_dt + timedelta(days=window_days_after)).strftime("%Y-%m-%d"),
                    "event_date": target_dt.strftime("%Y-%m-%d"),
                    "status": "VALID" if any(v is not None for v in avgs.values()) else "DATA_GAP",
                    "samples_count": len(series),
                    "series": series
                }
                _GOES_DIFF_CACHE[cache_key] = res
                return res
    except Exception as e:
        print(f"[Moon Router] Database lookup error for {clean_d}: {e}")

    # 1. Fallback to GOES-18 NetCDF Level-2 Differential Flux (2022 - 2026) across all days in window
    try:
        import netCDF4 as nc_lib
        series = []
        ch_vals = [[] for _ in range(13)]

        for offset in range(-window_days_before, window_days_after + 1):
            cur_dt = target_dt + timedelta(days=offset)
            y_s = str(cur_dt.year)
            m_s = str(cur_dt.month).zfill(2)
            d_s = str(cur_dt.day).zfill(2)
            pattern = os.path.join(GOES_NC_DIR, y_s, m_s, f"sci_sgps-l2-avg5m_g18_d{y_s}{m_s}{d_s}_*.nc")
            nc_files = glob.glob(pattern)
            if not nc_files:
                continue

            fpath = sorted(nc_files)[-1]
            ds = nc_lib.Dataset(fpath)
            time_arr = ds.variables['time'][:].data
            diff_arr = ds.variables['AvgDiffProtonFlux'][:, 0, :].data  # shape: (288, 13)
            ds.close()

            def parse_nc_float(val):
                try:
                    v = float(val)
                    return None if (math.isnan(v) or math.isinf(v) or v < 0) else v
                except Exception:
                    return None

            for i in range(len(time_arr)):
                t_sec = float(time_arr[i])
                if math.isnan(t_sec):
                    continue
                dt_pt = EPOCH_2000 + timedelta(seconds=t_sec)
                t_label = dt_pt.strftime("%m-%d %H:%M")

                ch = [parse_nc_float(diff_arr[i, k]) for k in range(13)]
                for k, v in enumerate(ch):
                    if v is not None:
                        ch_vals[k].append(v)

                pt: Dict[str, Any] = {"time": t_label, "time_iso": dt_pt.strftime("%Y-%m-%dT%H:%M:%SZ")}
                for k in range(13):
                    pt[f"ch{k}"] = ch[k]
                pt["p_low"]  = ch[0]
                pt["p_mid"]  = ch[5]
                pt["p_high"] = ch[8]
                series.append(pt)

        if series:
            avgs = {f"avg_ch{k}": (round(sum(ch_vals[k]) / len(ch_vals[k]), 6) if ch_vals[k] else None) for k in range(13)}
            avg_low  = avgs["avg_ch0"]
            avg_mid  = avgs["avg_ch5"]
            avg_high = avgs["avg_ch8"]

            res = {
                "satellite": "GOES-18",
                "instrument": "SGPS (Differential)",
                "mode": "DIFFERENTIAL",
                "unit": "protons/(cm²·s·sr·MeV)",
                "channel_labels": DIFF_CHANNELS,
                "channel_low_label": "1-2 MeV",
                "channel_mid_label": "12-23 MeV",
                "channel_high_label": "81-98 MeV",
                "avg_low": avg_low,
                "avg_mid": avg_mid,
                "avg_high": avg_high,
                **avgs,
                "window_start": start_dt.strftime("%Y-%m-%d"),
                "window_end": (target_dt + timedelta(days=window_days_after)).strftime("%Y-%m-%d"),
                "event_date": target_dt.strftime("%Y-%m-%d"),
                "status": "VALID" if any(v is not None for v in avgs.values()) else "DATA_GAP",
                "samples_count": len(series),
                "series": series
            }
            _GOES_DIFF_CACHE[cache_key] = res
            return res
    except Exception as e:
        print(f"[Moon Router] Error loading GOES NC for {clean_d}: {e}")

    # 2. Fallback to GOES-16/18 Cleaned TXT (e.g. 2021) across all days in window
    try:
        series = []
        vals_low, vals_mid, vals_high = [], [], []

        # Collect targets
        day_tuples = set()
        for offset in range(-window_days_before, window_days_after + 1):
            cur_dt = target_dt + timedelta(days=offset)
            day_tuples.add((str(cur_dt.year), str(cur_dt.month).zfill(2), str(cur_dt.day).zfill(2)))

        years = set(t[0] for t in day_tuples)
        for y_s in years:
            txt_path = os.path.join(BASE_DIR, "data", "datagoes", y_s, f"GOES16_{y_s}_5m_clean.txt")
            if not os.path.exists(txt_path):
                txt_path = os.path.join(BASE_DIR, "data", "datagoes", y_s, f"GOES18_{y_s}_5m_clean.txt")
            if os.path.exists(txt_path):
                with open(txt_path, "r", encoding="utf-8", errors="ignore") as fp:
                    for line in fp:
                        parts = line.split()
                        if len(parts) >= 12:
                            y_line, m_line, d_line = parts[0], parts[1].zfill(2), parts[2].zfill(2)
                            if (y_line, m_line, d_line) in day_tuples:
                                t_str = parts[3]
                                time_fmt = f"{m_line}-{d_line} {t_str[:2]}:{t_str[2:]}" if len(t_str) == 4 else f"{m_line}-{d_line} {t_str}"
                                def parse_txt_float(val_str):
                                    try:
                                        v = float(val_str)
                                        return None if (math.isnan(v) or v < 0) else v
                                    except Exception:
                                        return None
                                p_low  = parse_txt_float(parts[6])   # P>1
                                p_mid  = parse_txt_float(parts[8])   # P>10
                                p_high = parse_txt_float(parts[11])  # P>100
                                if p_low  is not None: vals_low.append(p_low)
                                if p_mid  is not None: vals_mid.append(p_mid)
                                if p_high is not None: vals_high.append(p_high)
                                series.append({
                                    "time": time_fmt,
                                    "p_low": p_low, "p_mid": p_mid, "p_high": p_high,
                                    "ch0": p_low, "ch1": None, "ch2": None, "ch3": None,
                                    "ch4": None, "ch5": p_mid, "ch6": None, "ch7": None,
                                    "ch8": None, "ch9": None, "ch10": None, "ch11": None, "ch12": p_high,
                                })

        if series:
            # Sort series by time
            series.sort(key=lambda s: s.get("time", ""))
            avg_low  = round(sum(vals_low)  / len(vals_low),  4) if vals_low  else None
            avg_mid  = round(sum(vals_mid)  / len(vals_mid),  4) if vals_mid  else None
            avg_high = round(sum(vals_high) / len(vals_high), 4) if vals_high else None
            res = {
                "satellite": "GOES-16",
                "instrument": "SGPS (Integral)",
                "mode": "INTEGRAL",
                "unit": "protons/(cm²·s·sr)",
                "channel_labels": [">1 MeV", None, None, None, None, ">10 MeV", None, None, None, None, None, None, ">100 MeV"],
                "channel_low_label": ">1 MeV",
                "channel_mid_label": ">10 MeV",
                "channel_high_label": ">100 MeV",
                "avg_low": avg_low, "avg_mid": avg_mid, "avg_high": avg_high,
                "avg_ch0": avg_low, "avg_ch1": None, "avg_ch2": None, "avg_ch3": None,
                "avg_ch4": None, "avg_ch5": avg_mid, "avg_ch6": None, "avg_ch7": None,
                "avg_ch8": None, "avg_ch9": None, "avg_ch10": None, "avg_ch11": None, "avg_ch12": avg_high,
                "window_start": start_dt.strftime("%Y-%m-%d"),
                "window_end": (target_dt + timedelta(days=window_days_after)).strftime("%Y-%m-%d"),
                "event_date": target_dt.strftime("%Y-%m-%d"),
                "status": "VALID" if (avg_low is not None or avg_mid is not None) else "DATA_GAP",
                "samples_count": len(series),
                "series": series
            }
            _GOES_DIFF_CACHE[cache_key] = res
            return res
    except Exception as e:
        print(f"[Moon Router] Error loading GOES TXT for {clean_d}: {e}")

    empty_res = {
        "satellite": "GOES", "instrument": "N/A", "mode": "N/A",
        "unit": "protons/(cm²·s·sr·MeV)",
        "channel_labels": ['1-2 MeV','2-3 MeV','2-4 MeV','4-7 MeV','6-11 MeV','12-23 MeV','26-38 MeV','41-77 MeV','81-98 MeV','96-118 MeV','115-138 MeV','153-229 MeV','267-390 MeV'],
        "channel_low_label": "1-2 MeV", "channel_mid_label": "12-23 MeV", "channel_high_label": "81-98 MeV",
        "avg_low": None, "avg_mid": None, "avg_high": None,
        **{f"avg_ch{k}": None for k in range(13)},
        "window_start": start_dt.strftime("%Y-%m-%d"),
        "window_end": (target_dt + timedelta(days=window_days_after)).strftime("%Y-%m-%d"),
        "event_date": target_dt.strftime("%Y-%m-%d"),
        "status": "DATA_GAP", "samples_count": 0, "series": []
    }
    _GOES_DIFF_CACHE[cache_key] = empty_res
    return empty_res

def calculate_julian_date(dt: datetime) -> float:
    """Calculate Julian Date from UTC datetime."""
    year = dt.year
    month = dt.month
    day = dt.day + (dt.hour + dt.minute / 60.0 + dt.second / 3600.0) / 24.0

    if month <= 2:
        year -= 1
        month += 12

    A = math.floor(year / 100)
    B = 2 - A + math.floor(A / 4)
    jd = math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1)) + day + B - 1524.5
    return jd

def calculate_moon_gse(dt: datetime):
    """
    Computes precise Moon position in Geocentric Solar Ecliptic (GSE) coordinates (in Earth Radii Re).
    """
    jd = calculate_julian_date(dt)
    T = (jd - 2451545.0) / 36525.0  # Julian centuries from J2000.0

    # Moon's mean elements (degrees)
    L0 = 218.3164477 + 481267.88123421 * T - 0.0015786 * T**2
    D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T**2      # Mean elongation
    M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T**2       # Sun mean anomaly
    M_prime = 134.9633964 + 477198.8675055 * T + 0.0087414 * T**2 # Moon mean anomaly
    F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T**2        # Moon argument of latitude

    # Convert to radians
    d_r = math.radians(D % 360)
    m_r = math.radians(M % 360)
    mp_r = math.radians(M_prime % 360)
    f_r = math.radians(F % 360)

    # Moon's geocentric ecliptic longitude perturbations (degrees)
    l_pert = (
        6.288774 * math.sin(mp_r)
        + 1.274027 * math.sin(2 * d_r - mp_r)
        + 0.658314 * math.sin(2 * d_r)
        + 0.213618 * math.sin(2 * mp_r)
        - 0.185116 * math.sin(m_r)
        - 0.114332 * math.sin(2 * f_r)
        + 0.058793 * math.sin(2 * d_r - 2 * mp_r)
        + 0.057066 * math.sin(2 * d_r - m_r - mp_r)
        + 0.053322 * math.sin(2 * d_r + mp_r)
        + 0.045758 * math.sin(2 * d_r - m_r)
    )
    moon_lon = (L0 + l_pert) % 360

    # Moon's geocentric ecliptic latitude (degrees)
    b_pert = (
        5.128122 * math.sin(f_r)
        + 0.280602 * math.sin(mp_r + f_r)
        + 0.277693 * math.sin(mp_r - f_r)
        + 0.173237 * math.sin(2 * d_r - f_r)
        + 0.055413 * math.sin(2 * d_r - mp_r + f_r)
        + 0.046271 * math.sin(2 * d_r - mp_r - f_r)
        + 0.032573 * math.sin(2 * d_r + f_r)
    )
    moon_lat = b_pert

    # Earth-Moon distance (km)
    r_pert = (
        -20905.355 * math.cos(mp_r)
        - 3699.111 * math.cos(2 * d_r - mp_r)
        - 2955.968 * math.cos(2 * d_r)
        - 569.925 * math.cos(2 * mp_r)
        + 246.158 * math.cos(2 * d_r - 2 * mp_r)
        - 152.138 * math.cos(2 * d_r - m_r - mp_r)
        - 170.733 * math.cos(2 * d_r + mp_r)
    )
    distance_km = 385000.56 + r_pert
    distance_re = distance_km / EARTH_RADIUS_KM

    # Sun's geometric ecliptic longitude (degrees)
    sun_lon = (280.46646 + 36000.76983 * T + 1.914602 * math.sin(m_r) + 0.019993 * math.sin(2 * m_r)) % 360

    # Moon Phase Angle & Elongation
    elongation = (moon_lon - sun_lon) % 360
    phi_rad = math.radians(elongation)

    # Convert to GSE (Geocentric Solar Ecliptic) coordinates
    x_gse = distance_re * math.cos(phi_rad) * math.cos(math.radians(moon_lat))
    y_gse = distance_re * math.sin(phi_rad) * math.cos(math.radians(moon_lat))
    z_gse = distance_re * math.sin(math.radians(moon_lat))

    illumination_pct = round((1.0 - math.cos(phi_rad)) / 2.0 * 100.0, 1)

    # Lunar Phase Identification
    if elongation < 7.5 or elongation >= 352.5:
        phase_name = "New Moon"
    elif 7.5 <= elongation < 82.5:
        phase_name = "Waxing Crescent"
    elif 82.5 <= elongation < 97.5:
        phase_name = "First Quarter"
    elif 97.5 <= elongation < 172.5:
        phase_name = "Waxing Gibbous"
    elif 172.5 <= elongation < 187.5:
        phase_name = "Full Moon"
    elif 187.5 <= elongation < 262.5:
        phase_name = "Waning Gibbous"
    elif 262.5 <= elongation < 277.5:
        phase_name = "Third Quarter"
    else:
        phase_name = "Waning Crescent"

    # Attach actual CRaTER doserate and GOES Proton Differential flux for this specific date
    date_key = dt.strftime("%Y/%m/%d")
    doserate_info = get_doserate_for_date(date_key)
    goes_proton_info = get_goes_proton_for_date(date_key)

    return {
        "x_gse": round(x_gse, 2),
        "y_gse": round(y_gse, 2),
        "z_gse": round(z_gse, 2),
        "distance_km": round(distance_km, 1),
        "distance_re": round(distance_re, 2),
        "elongation_deg": round(elongation, 2),
        "ecliptic_lon_deg": round(moon_lon, 2),
        "ecliptic_lat_deg": round(moon_lat, 2),
        "illumination_pct": illumination_pct,
        "phase_name": phase_name,
        "doserate": doserate_info,
        "goes_proton": goes_proton_info
    }

class DateRequest(BaseModel):
    date_str: str

LITE_CACHE_FILE = os.path.join(BASE_DIR, "data", "moon_events_lite.json")
FULL_CACHE_FILE = os.path.join(BASE_DIR, "data", "moon_events_full.json")

_LITE_CACHE_BYTES: Optional[bytes] = None
_FULL_CACHE_BYTES: Optional[bytes] = None
_FULL_EVENTS_BY_ID: Dict[int, Any] = {}
_PRESET_EVENTS_CACHE: Optional[List[Dict[str, Any]]] = None

def _load_moon_cache():
    global _LITE_CACHE_BYTES, _FULL_CACHE_BYTES, _FULL_EVENTS_BY_ID, _PRESET_EVENTS_CACHE
    try:
        if os.path.exists(LITE_CACHE_FILE):
            with open(LITE_CACHE_FILE, "rb") as f:
                _LITE_CACHE_BYTES = f.read()
        if os.path.exists(FULL_CACHE_FILE):
            with open(FULL_CACHE_FILE, "rb") as f:
                _FULL_CACHE_BYTES = f.read()
            _PRESET_EVENTS_CACHE = json.loads(_FULL_CACHE_BYTES.decode("utf-8"))
            for evt in _PRESET_EVENTS_CACHE:
                _FULL_EVENTS_BY_ID[evt.get("id")] = evt
            print(f"[Moon Router] Instantly loaded {len(_PRESET_EVENTS_CACHE)} moon events from disk cache.")
            return
    except Exception as e:
        print(f"[Moon Router] Error reading cache files: {e}")

    # Fallback calculation if cache files missing
    try:
        results = []
        for idx, d_str in enumerate(EVENT_DATES):
            parts = d_str.strip().replace('-', '/').split('/')
            dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 12, 0, 0, tzinfo=timezone.utc)
            pos = calculate_moon_gse(dt)
            results.append({
                "id": idx + 1,
                "date": d_str,
                "iso_time": dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
                **pos
            })
        _PRESET_EVENTS_CACHE = results
        for evt in _PRESET_EVENTS_CACHE:
            _FULL_EVENTS_BY_ID[evt.get("id")] = evt
        _FULL_CACHE_BYTES = json.dumps(_PRESET_EVENTS_CACHE).encode("utf-8")
        with open(FULL_CACHE_FILE, "wb") as f:
            f.write(_FULL_CACHE_BYTES)
        print(f"[Moon Router] Successfully generated and persisted full moon events cache.")
    except Exception as e:
        print(f"[Moon Router] Error generating moon events: {e}")

# Preload cache on startup
_load_moon_cache()

@router.get("/events")
def get_moon_event_positions(full: bool = False):
    """
    Returns high-precision Moon GSE orbital positions, lunar phases,
    CRaTER radiation doserate values, and GOES differential proton flux for all preset event dates.
    Zero-overhead streaming from memory cache.
    """
    global _LITE_CACHE_BYTES, _FULL_CACHE_BYTES, _PRESET_EVENTS_CACHE
    if not full and _LITE_CACHE_BYTES:
        return Response(content=_LITE_CACHE_BYTES, media_type="application/json")
    if full and _FULL_CACHE_BYTES:
        return Response(content=_FULL_CACHE_BYTES, media_type="application/json")
    if _PRESET_EVENTS_CACHE is not None:
        return Response(content=json.dumps(_PRESET_EVENTS_CACHE), media_type="application/json")
    return Response(content="[]", media_type="application/json")

@router.get("/event/{event_id}")
def get_moon_event_detail(event_id: int):
    """
    Returns the complete high-resolution time-series for a single event in < 1ms.
    """
    if event_id in _FULL_EVENTS_BY_ID:
        return Response(content=json.dumps(_FULL_EVENTS_BY_ID[event_id]), media_type="application/json")
    return JSONResponse(status_code=404, content={"error": f"Event {event_id} not found"})


@router.post("/position")
def get_custom_moon_position(req: DateRequest):
    """
    Calculates Moon GSE position and CRaTER doserate for any custom date (YYYY-MM-DD or YYYY/MM/DD).
    """
    clean_date = req.date_str.strip().replace('-', '/')
    parts = clean_date.split('/')
    if len(parts) != 3:
        return {"error": "Invalid date format. Expected YYYY/MM/DD or YYYY-MM-DD"}
    try:
        dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 12, 0, 0, tzinfo=timezone.utc)
        pos = calculate_moon_gse(dt)
        return {
            "date": req.date_str,
            "iso_time": dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
            **pos
        }
    except Exception as e:
        return {"error": str(e)}
