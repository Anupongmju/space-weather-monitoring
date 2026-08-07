import threading
import time
import httpx
import os
from datetime import datetime, timezone, timedelta
from database import get_conn

def cleanup_old_data():
    conn = None
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%SZ')
        conn = get_conn()
        cur = conn.cursor()
        tables = ['ace_swepam','ace_mag','ace_epam','ace_sis',
                  'goes_xray','goes_proton','goes_electron','goes_mag','goes_wind',
                  'cosmic_neutron']
        for table in tables:
            cur.execute(f"""
                DELETE FROM {table}
                WHERE time_tag < %s
            """, (cutoff,))
        conn.commit()
        print("[Scheduler] Cleanup old data complete.")
    except Exception as e:
        print(f"[Scheduler] Cleanup Error: {e}")
    finally:
        if conn:
            conn.close()

def ping_self():
    url = os.getenv("RENDER_EXTERNAL_URL", "")
    if not url: return
    try:
        httpx.get(f"{url}/", timeout=10)
        print("[Ping] Self-ping successful")
    except Exception as e:
        print(f"[Ping] Failed: {e}")

def fetch_realtime():
    """ดึงข้อมูล ACE/GOES/Cosmic/Radiation ทุก 5 นาที"""
    try:
        from fetchers.ace_fetcher import fetch_all_ace
        from fetchers.goes_fetcher import fetch_all_goes
        from fetchers.cosmic_fetcher import fetch_all_cosmic
        from fetchers.stereo_fetcher import fetch_stereo_particles
        from fetchers.solar1_fetcher import fetch_solar1_rtsw
        from fetchers.crater_fetcher import fetch_crater_doserates
        fetch_all_ace()
        fetch_all_goes()
        fetch_all_cosmic()
        fetch_stereo_particles()
        fetch_solar1_rtsw()
        fetch_crater_doserates()
        print(f"[Scheduler] Realtime data updated: {datetime.now(timezone.utc)}")
    except Exception as e:
        print(f"[Scheduler] Realtime Error: {e}")

def start_scheduler():

    # ── Thread 1: ACE/GOES/Cosmic ทุก 5 นาที + ping ────────────────────────
    def realtime_job():
        while True:
            fetch_realtime()
            ping_self()
            time.sleep(5 * 60)  # ทุก 5 นาที

    # ── Thread 2: MAW & ENLIL ทุก 1 ชั่วโมง / 6 ชั่วโมง ─────────────
    def maw_job():
        enlil_counter = 0
        while True:
            try:
                from fetchers.maw_fetcher import fetch_maw_range
                result = fetch_maw_range(days=3)
                print(f"[Scheduler] MAW auto-fetch (3 days): {len(result)} days processed")
            except Exception as e:
                print(f"[Scheduler] MAW Error: {e}")

            if enlil_counter % 6 == 0:
                try:
                    from fetchers.enlil_fetcher import fetch_latest_enlil_video
                    enlil_res = fetch_latest_enlil_video()
                    print(f"[Scheduler] ENLIL video fetch: {enlil_res.get('status')}")
                except Exception as e:
                    print(f"[Scheduler] ENLIL Error: {e}")
            enlil_counter += 1

            # Disabled cleanup to preserve historical data indefinitely.
            # cleanup_old_data()
            time.sleep(3600)

    # รัน 2 threads พร้อมกัน
    t1 = threading.Thread(target=realtime_job, daemon=True)
    t2 = threading.Thread(target=maw_job,      daemon=True)
    t1.start()
    t2.start()
    print("[Scheduler] Started — Realtime every 5min + MAW hourly + ENLIL every 6h")