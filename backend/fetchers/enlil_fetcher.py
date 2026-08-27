import io
import os
import re
import tarfile
import zipfile
import concurrent.futures
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
import httpx
import imageio.v3 as iio

NOAA_REALTIME_API = "https://services.swpc.noaa.gov/products/animations/enlil.json"
NOAA_BASE_URL = "https://services.swpc.noaa.gov"
NOAA_S3_API = "https://archive.data.noaa.gov/satellite-spaceweather/"
NS = {'s3': 'http://s3.amazonaws.com/doc/2006-03-01/'}
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

def get_latest_enlil_archive_info():
    """Queries NOAA S3 XML API to locate the newest WSA-ENLIL CME archive URL."""
    now = datetime.now(timezone.utc)
    
    # Search current month and up to 3 previous months
    for month_offset in range(4):
        dt = now - timedelta(days=month_offset * 28)
        prefix = f"SWPC/Models/ENLIL/swpc_wsaenlil_cme/{dt.year}/{dt.month:02d}/"
        try:
            r = httpx.get(NOAA_S3_API, params={"list-type": "2", "prefix": prefix}, timeout=15)
            if r.status_code == 200:
                root = ET.fromstring(r.content)
                keys: list[str] = [
                    elem.text for elem in root.findall('.//s3:Key', NS)
                    if elem.text and elem.text.endswith(('.tar.gz', '.zip'))
                ]
                if keys:
                    keys.sort()
                    latest_key = keys[-1]
                    return f"{NOAA_S3_API}{latest_key}", latest_key
        except Exception as e:
            print(f"[enlil_fetcher] Error listing S3 keys for prefix {prefix}: {e}")
            continue

    return None, None

def convert_to_mp4(input_path: str, output_mp4: str):
    """Converts .mpg or video file to web-compatible MP4 using imageio."""
    try:
        frames = iio.imread(input_path)
        iio.imwrite(output_mp4, frames, fps=12)
        print(f"[enlil_fetcher] Converted {input_path} to {output_mp4}")
        return True
    except Exception as e:
        print(f"[enlil_fetcher] MP4 conversion error: {e}")
        return False

def cleanup_old_enlil_videos(keep_count: int = 2):
    """
    Keeps only the newest `keep_count` timestamped ENLIL video files,
    deleting older ones from STATIC_DIR.
    """
    try:
        files = [
            f for f in os.listdir(STATIC_DIR)
            if f.startswith("swpc_wsaenlil_") and not f.startswith("enlil_latest")
        ]
        base_names = sorted(list(set([os.path.splitext(f)[0] for f in files])))
        
        if len(base_names) > keep_count:
            to_delete_bases = base_names[:-keep_count]
            for base in to_delete_bases:
                for f in files:
                    if f.startswith(base):
                        file_to_remove = os.path.join(STATIC_DIR, f)
                        if os.path.exists(file_to_remove):
                            os.remove(file_to_remove)
                            print(f"[enlil_fetcher] Cleaned up old video: {f}")
    except Exception as e:
        print(f"[enlil_fetcher] Error during cleanup: {e}")

def fetch_realtime_enlil_video():
    """
    Fetches real-time WSA-ENLIL CME simulation frame sequence from NOAA SWPC API,
    downloads frames concurrently, and encodes them into static/enlil_latest.mp4.
    """
    os.makedirs(STATIC_DIR, exist_ok=True)
    try:
        r = httpx.get(NOAA_REALTIME_API, timeout=15)
        if r.status_code != 200:
            print(f"[enlil_fetcher] Realtime API returned HTTP {r.status_code}")
            return None
        
        frames_meta = r.json()
        if not isinstance(frames_meta, list) or len(frames_meta) == 0:
            print("[enlil_fetcher] Realtime API returned empty frame list")
            return None

        print(f"[enlil_fetcher] Found {len(frames_meta)} real-time ENLIL frames from NOAA SWPC")

        first_url = frames_meta[0].get("url", "")
        run_id = None
        start_time_str = None
        match = re.search(r'enlil_[^_]+_(\d+)_(\d{8}T\d{6})', first_url)
        if match:
            run_id, start_time_str = match.groups()

        urls = [NOAA_BASE_URL + item["url"] for item in frames_meta if "url" in item]

        def download_frame(url):
            try:
                resp = httpx.get(url, timeout=10)
                if resp.status_code == 200:
                    return iio.imread(resp.content)
            except Exception:
                pass
            return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
            results = list(executor.map(download_frame, urls))

        images = [img for img in results if img is not None]

        if len(images) < 10:
            print(f"[enlil_fetcher] Insufficient valid frame images downloaded ({len(images)})")
            return None

        latest_mp4_path = os.path.join(STATIC_DIR, "enlil_latest.mp4")
        iio.imwrite(latest_mp4_path, images, fps=12)

        mp4_size = os.path.getsize(latest_mp4_path)
        now_ts = int(datetime.now().timestamp() * 1000)

        print(f"[enlil_fetcher] Successfully generated real-time ENLIL MP4 ({mp4_size} bytes, {len(images)} frames)")

        return {
            "status": "success",
            "source": "swpc_realtime",
            "filename": "enlil_latest.mp4",
            "video_url": "/static/enlil_latest.mp4",
            "latest_video_url": "/static/enlil_latest.mp4",
            "size_bytes": mp4_size,
            "last_modified": now_ts,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "frame_count": len(images),
            "run_id": run_id,
            "model_start": start_time_str
        }
    except Exception as e:
        print(f"[enlil_fetcher] Error fetching real-time ENLIL video: {e}")
        return None

def fetch_archive_enlil_video():
    """Fallback fetcher querying NOAA S3 XML Archive."""
    os.makedirs(STATIC_DIR, exist_ok=True)

    url, key = get_latest_enlil_archive_info()
    if not url or not key:
        return {"status": "error", "message": "No WSA-ENLIL archive files found on NOAA server"}

    try:
        r = httpx.get(url, follow_redirects=True, timeout=60)
        r.raise_for_status()
    except Exception as e:
        return {"status": "error", "message": f"Failed to download archive from NOAA: {e}"}

    extracted_filename = None
    extracted_size = 0

    try:
        if key.endswith('.tar.gz'):
            with tarfile.open(fileobj=io.BytesIO(r.content), mode='r:gz') as tar:
                for member in tar.getmembers():
                    if member.name.lower().endswith(('.mpg', '.mp4', '.gif', '.wmv')):
                        extracted_file = tar.extractfile(member)
                        if extracted_file is None:
                            continue
                        
                        extracted_filename = os.path.basename(member.name)
                        target_file_path = os.path.join(STATIC_DIR, extracted_filename)
                        video_content = extracted_file.read()
                        
                        with open(target_file_path, 'wb') as f:
                            f.write(video_content)
                        
                        latest_path = os.path.join(STATIC_DIR, "enlil_latest.mpg")
                        with open(latest_path, 'wb') as f:
                            f.write(video_content)
                            
                        extracted_size = len(video_content)
                        break

        elif key.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                for member_name in z.namelist():
                    if member_name.lower().endswith(('.mpg', '.mp4', '.gif', '.wmv')):
                        extracted_filename = os.path.basename(member_name)
                        target_file_path = os.path.join(STATIC_DIR, extracted_filename)
                        video_content = z.read(member_name)
                        
                        with open(target_file_path, 'wb') as f:
                            f.write(video_content)
                        
                        latest_path = os.path.join(STATIC_DIR, "enlil_latest.mpg")
                        with open(latest_path, 'wb') as f:
                            f.write(video_content)

                        extracted_size = len(video_content)
                        break

    except Exception as e:
        return {"status": "error", "message": f"Failed to extract video from archive: {e}"}

    if not extracted_filename:
        return {"status": "error", "message": "No video file (.mpg/.mp4/.gif) found inside the archive"}

    latest_mpg_path = os.path.join(STATIC_DIR, "enlil_latest.mpg")
    latest_mp4_path = os.path.join(STATIC_DIR, "enlil_latest.mp4")
    if os.path.exists(latest_mpg_path):
        convert_to_mp4(latest_mpg_path, latest_mp4_path)

    if extracted_filename and extracted_filename.endswith('.mpg'):
        named_mp4 = os.path.join(STATIC_DIR, f"{os.path.splitext(extracted_filename)[0]}.mp4")
        if not os.path.exists(named_mp4):
            convert_to_mp4(os.path.join(STATIC_DIR, extracted_filename), named_mp4)

    cleanup_old_enlil_videos(keep_count=2)

    mp4_size = os.path.getsize(latest_mp4_path) if os.path.exists(latest_mp4_path) else extracted_size
    now_ts = int(datetime.now().timestamp() * 1000)

    return {
        "status": "success",
        "source": "noaa_archive",
        "archive_name": os.path.basename(key),
        "archive_url": url,
        "filename": extracted_filename,
        "video_url": "/static/enlil_latest.mp4",
        "latest_video_url": "/static/enlil_latest.mp4",
        "size_bytes": mp4_size,
        "last_modified": now_ts,
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }

def fetch_latest_enlil_video():
    """
    Tries real-time NOAA SWPC animation API first.
    Falls back to NOAA archive S3 API if real-time API fails.
    """
    res = fetch_realtime_enlil_video()
    if res and res.get("status") == "success":
        return res

    print("[enlil_fetcher] Realtime fetch failed/unavailable, falling back to NOAA S3 archive...")
    return fetch_archive_enlil_video()
