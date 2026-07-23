import io
import os
import tarfile
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
import httpx

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
        import imageio.v3 as iio
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
        # Group by base timestamp name (e.g. swpc_wsaenlil_20260720T1800)
        base_names = sorted(list(set([os.path.splitext(f)[0] for f in files])))
        
        # If there are more than keep_count timestamped groups, delete the older ones
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

def fetch_latest_enlil_video():
    """
    Downloads the latest WSA-ENLIL CME archive in-memory,
    extracts ONLY the video file (.mpg, .mp4, .gif, .wmv),
    converts it to web-compatible MP4, and saves it into static directory.
    Retains only the newest 2 video files (latest + 1 backup).
    """
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
                        
                        # Save specific named file
                        with open(target_file_path, 'wb') as f:
                            f.write(video_content)
                        
                        # Save alias 'enlil_latest.mpg'
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
                        
                        # Save specific named file
                        with open(target_file_path, 'wb') as f:
                            f.write(video_content)
                        
                        # Save alias 'enlil_latest.mpg'
                        latest_path = os.path.join(STATIC_DIR, "enlil_latest.mpg")
                        with open(latest_path, 'wb') as f:
                            f.write(video_content)

                        extracted_size = len(video_content)
                        break

    except Exception as e:
        return {"status": "error", "message": f"Failed to extract video from archive: {e}"}

    if not extracted_filename:
        return {"status": "error", "message": "No video file (.mpg/.mp4/.gif) found inside the archive"}

    # Convert to MP4 for web browser compatibility
    latest_mpg_path = os.path.join(STATIC_DIR, "enlil_latest.mpg")
    latest_mp4_path = os.path.join(STATIC_DIR, "enlil_latest.mp4")
    if os.path.exists(latest_mpg_path):
        convert_to_mp4(latest_mpg_path, latest_mp4_path)

    # Also convert named timestamp file to mp4 if needed
    if extracted_filename and extracted_filename.endswith('.mpg'):
        named_mp4 = os.path.join(STATIC_DIR, f"{os.path.splitext(extracted_filename)[0]}.mp4")
        if not os.path.exists(named_mp4):
            convert_to_mp4(os.path.join(STATIC_DIR, extracted_filename), named_mp4)

    # Clean up old videos (Keep 2 newest)
    cleanup_old_enlil_videos(keep_count=2)

    mp4_size = os.path.getsize(latest_mp4_path) if os.path.exists(latest_mp4_path) else extracted_size

    return {
        "status": "success",
        "archive_name": os.path.basename(key),
        "archive_url": url,
        "filename": extracted_filename,
        "video_url": "/static/enlil_latest.mp4",
        "latest_video_url": "/static/enlil_latest.mp4",
        "size_bytes": mp4_size,
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }
