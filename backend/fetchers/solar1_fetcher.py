import httpx
import gzip
import io
import datetime
import xml.etree.ElementTree as ET
from database import get_conn
from psycopg2.extras import execute_values  # type: ignore

ACE_EPAM_REALTIME_URL = "https://services.swpc.noaa.gov/json/ace/epam/ace_epam_5m.json"
S3_ARCHIVE_BASE = "https://archive.data.noaa.gov/satellite-spaceweather/"

def fetch_solar1_stis_particles():
    """
    Fetches real-time SOLAR-1 STIS / EPAM Suprathermal Ions & Electrons particle data.
    First fetches live 5-minute feed from SWPC EPAM API.
    Inserts/updates all 8 Ion channels (p1..p8) and 4 Electron channels (de1..de4) into solar1_stis_particles DB table.
    """
    count = 0
    try:
        r = httpx.get(ACE_EPAM_REALTIME_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        if r.status_code == 200:
            data = r.json()
            records = []
            for d in data:
                time_tag = d.get('time_tag')
                if not time_tag:
                    continue

                if 'Z' not in time_tag and '+' not in time_tag:
                    time_tag += 'Z'

                def clean_val(k):
                    val = d.get(k)
                    if val is not None and float(val) >= 0 and float(val) < 1e8:
                        return float(val)
                    return None

                p1 = clean_val('p1')
                p2 = clean_val('p2')
                p3 = clean_val('p3')
                p4 = clean_val('p4')
                p5 = clean_val('p5')
                p6 = clean_val('p6')
                p7 = clean_val('p7')
                p8 = clean_val('p8')

                de1 = clean_val('de1')
                de2 = clean_val('de2')
                de3 = clean_val('de3')
                de4 = clean_val('de4')

                records.append((time_tag, p1, p2, p3, p4, p5, p6, p7, p8, de1, de2, de3, de4, True))

            if records:
                conn = get_conn()
                try:
                    cur = conn.cursor()
                    execute_values(cur, """
                        INSERT INTO solar1_stis_particles
                        (time_tag, p1, p2, p3, p4, p5, p6, p7, p8, de1, de2, de3, de4, active)
                        VALUES %s
                        ON CONFLICT (time_tag) DO UPDATE SET
                        p1=EXCLUDED.p1, p2=EXCLUDED.p2, p3=EXCLUDED.p3, p4=EXCLUDED.p4,
                        p5=EXCLUDED.p5, p6=EXCLUDED.p6, p7=EXCLUDED.p7, p8=EXCLUDED.p8,
                        de1=EXCLUDED.de1, de2=EXCLUDED.de2, de3=EXCLUDED.de3, de4=EXCLUDED.de4,
                        active=EXCLUDED.active
                    """, records)
                    conn.commit()
                    count = len(records)
                    print(f"[SOLAR-1 STIS Fetcher] Upserted {count} real-time records into solar1_stis_particles.")
                finally:
                    conn.close()
    except Exception as e:
        print(f"[SOLAR-1 STIS Fetcher Error]: {e}")

    return count

def fetch_solar1_rtsw():
    """Wrapper function maintaining compatibility with legacy scheduler calls"""
    return fetch_solar1_stis_particles()
