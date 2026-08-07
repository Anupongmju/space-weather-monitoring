import re
import io
import os
import tempfile
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx

BASE_DIR = "https://spdf.gsfc.nasa.gov/pub/data/ace/swepam/level_2_cdaweb/swe_h0/"

try:
    import cdflib
except Exception:
    cdflib = None


def _http_get(url: str, timeout: Optional[httpx.Timeout] = None, attempts: int = 2) -> httpx.Response:
    if timeout is None:
        timeout = httpx.Timeout(60.0, connect=10.0, read=120.0)

    last_error: Optional[Exception] = None
    for attempt in range(1, attempts + 1):
        try:
            resp = httpx.get(url, timeout=timeout, follow_redirects=True)
            resp.raise_for_status()
            return resp
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RemoteProtocolError) as exc:
            last_error = exc
            if attempt == attempts:
                raise
        except Exception:
            raise
    raise RuntimeError(f"Failed to fetch URL after {attempts} attempts: {url}") from last_error


_YEAR_FILE_CACHE: Dict[int, List[str]] = {}


def list_year_files(year: int) -> List[str]:
    if year in _YEAR_FILE_CACHE:
        return _YEAR_FILE_CACHE[year]

    url = f"{BASE_DIR}{year}/"
    try:
        r = _http_get(url)
    except Exception:
        _YEAR_FILE_CACHE[year] = []
        return []

    hrefs = re.findall(r'href="([^"]+)"', r.text)
    files = [h for h in hrefs if h.lower().endswith('.cdf')]
    _YEAR_FILE_CACHE[year] = files
    return files


def find_file_for_date(date: datetime) -> Optional[str]:
    files = list_year_files(date.year)
    if not files:
        return None

    date_str = date.strftime('%Y%m%d')
    matches = [f for f in files if date_str in f]
    if not matches:
        return None
    matches.sort()
    return matches[-1]


def download_cdf_bytes(relative_path: str) -> bytes:
    # relative_path may already include year/filename
    url = f"{BASE_DIR}{relative_path}" if not relative_path.startswith('http') else relative_path
    resp = _http_get(url, timeout=httpx.Timeout(120.0, connect=20.0, read=180.0), attempts=3)
    return resp.content


def parse_cdf_bytes(content: bytes) -> List[Dict[str, Any]]:
    if cdflib is None:
        raise RuntimeError('cdflib is required to parse CDF files (pip install cdflib)')
    # cdflib expects a filename; write bytes to a temporary file first
    tmp = None
    with tempfile.NamedTemporaryFile(delete=False, suffix='.cdf') as f:
        f.write(content)
        tmp = f.name
    cdf = cdflib.CDF(tmp)
    info = cdf.cdf_info()
    # cdflib.cdf_info() may return a dict or an object with attributes
    if isinstance(info, dict):
        rvars = info.get('rVariables', [])
    else:
        rvars = getattr(info, 'rVariables', []) or getattr(info, 'rVariables', [])

    # heuristics for variable names
    epoch_candidates = [v for v in rvars if re.search(r'epoch', v, re.I)]
    density_candidates = [v for v in rvars if re.search(r'n(_)?p|proton|density', v, re.I)]
    speed_candidates = [v for v in rvars if re.search(r'v(|x|y|z)|bulk|speed', v, re.I)]

    epoch_name = epoch_candidates[0] if epoch_candidates else (rvars[0] if rvars else None)
    density_name = density_candidates[0] if density_candidates else None
    speed_name = speed_candidates[0] if speed_candidates else None

    rows: List[Dict[str, Any]] = []
    if not epoch_name:
        return rows

    epochs = cdf.varget(epoch_name)
    dens = cdf.varget(density_name) if density_name and density_name in rvars else [None] * len(epochs)
    spd = cdf.varget(speed_name) if speed_name and speed_name in rvars else [None] * len(epochs)

    def normalize_time(value: Any) -> Optional[str]:
        if isinstance(value, (list, tuple)) and value:
            return normalize_time(value[0])

        if isinstance(value, bytes):
            return normalize_time(value.decode('utf-8', errors='ignore'))

        if isinstance(value, datetime):
            return value.strftime('%Y-%m-%dT%H:%M:%SZ')

        if isinstance(value, str):
            s = value.strip()
            if s.startswith('[') and s.endswith(']'):
                s = s[1:-1].strip()
            if (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')):
                s = s[1:-1].strip()
            return s

        if hasattr(value, '__iter__') and not isinstance(value, (str, bytes, dict)):
            try:
                iterator = iter(value)
                first = next(iterator)
                return normalize_time(first)
            except Exception:
                pass

        try:
            return str(value)
        except Exception:
            return None

    for i, e in enumerate(epochs):
        t_iso = None
        try:
            t_dt = cdflib.cdfepoch.to_datetime(e)
            t_iso = normalize_time(t_dt)
        except Exception:
            t_iso = normalize_time(e)

        def clean_value(value: Any) -> Optional[float]:
            try:
                v = float(value)
                if abs(v) > 1e28:
                    return None
                return v
            except Exception:
                return None

        row = {
            'time_tag': t_iso,
            'proton_density': clean_value(dens[i]) if dens is not None else None,
            'bulk_speed': clean_value(spd[i]) if spd is not None else None,
            'ion_temp': None,
        }
        rows.append(row)

    # cdflib CDF object does not require explicit close
    # cleanup temporary file
    try:
        if tmp and os.path.exists(tmp):
            os.remove(tmp)
    except Exception:
        pass
    return rows


def fetch_swepam_range(start_date: datetime, end_date: datetime, max_points: int = 10000) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    dt = start_date
    while dt <= end_date:
        fname = find_file_for_date(dt)
        if fname:
            try:
                content = download_cdf_bytes(f"{dt.year}/{fname}")
                parsed = parse_cdf_bytes(content)
                out.extend(parsed)
            except Exception:
                # skip problematic days
                pass
        dt += timedelta(days=1)
        if len(out) >= max_points:
            break
    return out[:max_points]
