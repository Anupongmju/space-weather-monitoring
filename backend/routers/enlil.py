import os
from fastapi import APIRouter
from fetchers.enlil_fetcher import fetch_latest_enlil_video, STATIC_DIR

router = APIRouter(prefix="/api/enlil", tags=["enlil"])

@router.get("/latest")
def get_latest_enlil():
    latest_mp4 = os.path.join(STATIC_DIR, "enlil_latest.mp4")
    if not os.path.exists(latest_mp4):
        # If video doesn't exist yet, fetch and convert it on-demand
        result = fetch_latest_enlil_video()
        return result
    
    stat = os.stat(latest_mp4)
    return {
        "status": "success",
        "latest_video_url": "/static/enlil_latest.mp4",
        "size_bytes": stat.st_size,
        "last_modified": stat.st_mtime
    }

@router.post("/fetch")
def trigger_enlil_fetch():
    return fetch_latest_enlil_video()
