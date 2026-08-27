import os
from datetime import datetime
from fastapi import APIRouter
from fetchers.enlil_fetcher import fetch_latest_enlil_video, STATIC_DIR

router = APIRouter(prefix="/enlil", tags=["enlil"])

@router.get("/latest")
def get_latest_enlil():
    latest_mp4 = os.path.join(STATIC_DIR, "enlil_latest.mp4")
    latest_mpg = os.path.join(STATIC_DIR, "enlil_latest.mpg")
    
    target_file = latest_mp4 if os.path.exists(latest_mp4) else (latest_mpg if os.path.exists(latest_mpg) else None)
    
    if not target_file:
        result = fetch_latest_enlil_video()
        return result
    
    stat = os.stat(target_file)
    age_seconds = datetime.now().timestamp() - stat.st_mtime
    
    # If video file is older than 2 hours, automatically fetch fresh real-time data
    if age_seconds > 2 * 3600:
        result = fetch_latest_enlil_video()
        if result and result.get("status") == "success":
            return result

    rel_url = f"/static/{os.path.basename(target_file)}"
    return {
        "status": "success",
        "latest_video_url": rel_url,
        "size_bytes": stat.st_size,
        "last_modified": int(stat.st_mtime * 1000)
    }

@router.post("/fetch")
def trigger_enlil_fetch():
    return fetch_latest_enlil_video()
