import os
import sys
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, '.env'))

from database import get_conn
from fetchers.solar1_fetcher import fetch_solar1_swips_plasma, fetch_solar1_mag

def cleanup_imap_records():
    conn = get_conn()
    cur = conn.cursor()

    # 1. Clean IMAP records from solar1_rtsw
    cur.execute("""
        DELETE FROM solar1_rtsw 
        WHERE time_tag >= '2026-09-28' 
          AND (
            time_tag LIKE '%:04Z' OR 
            time_tag LIKE '%:16Z' OR 
            time_tag LIKE '%:28Z' OR 
            time_tag LIKE '%:40Z' OR 
            time_tag LIKE '%:52Z'
          );
    """)
    deleted_rtsw = cur.rowcount
    print(f"[Cleanup] Deleted {deleted_rtsw} IMAP records from solar1_rtsw.")

    # 2. Clean IMAP records from solar1_mag
    cur.execute("""
        DELETE FROM solar1_mag 
        WHERE (
            time_tag LIKE '%:02Z' OR 
            time_tag LIKE '%:06Z' OR 
            time_tag LIKE '%:10Z'
          );
    """)
    deleted_mag = cur.rowcount
    print(f"[Cleanup] Deleted {deleted_mag} IMAP records from solar1_mag.")

    conn.commit()
    conn.close()

    # 3. Trigger fresh fetch with the new SOLAR-1 only filter
    print("[Fetch] Re-fetching clean SOLAR-1 SWiPS plasma...")
    p_count = fetch_solar1_swips_plasma()
    print(f"[Fetch] Upserted {p_count} clean SOLAR-1 plasma records.")

    print("[Fetch] Re-fetching clean SOLAR-1 MAG...")
    m_count = fetch_solar1_mag()
    print(f"[Fetch] Upserted {m_count} clean SOLAR-1 MAG records.")

if __name__ == '__main__':
    cleanup_imap_records()
