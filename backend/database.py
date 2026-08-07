import os
import time
import psycopg2
import psycopg2.extras
import psycopg2.pool
from psycopg2.extensions import connection as PsyConnection
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

class PooledConnection(PsyConnection):
    def close(self):
        if hasattr(self, '_pool') and self._pool:
            pool = self._pool
            self._pool = None
            pool.putconn(self)
        else:
            super().close()

_pool = None

def get_pool():
    """
    สร้าง connection pool โดยมี retry logic แบบ exponential backoff
    เพื่อรอให้ PostgreSQL พร้อมรับ connection ก่อนที่จะ raise error
    """
    global _pool
    if _pool is None:
        max_retries = 10
        delay = 1  # วินาที (จะเพิ่มเป็น 2x ทุกรอบ, สูงสุด 30 วินาที)
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                print(f"[DB] กำลังเชื่อมต่อฐานข้อมูล... (ครั้งที่ {attempt}/{max_retries})")
                _pool = psycopg2.pool.ThreadedConnectionPool(
                    2, 15, DATABASE_URL, connection_factory=PooledConnection
                )
                print("[DB] เชื่อมต่อฐานข้อมูลสำเร็จ ✓")
                return _pool
            except psycopg2.OperationalError as e:
                last_error = e
                if attempt < max_retries:
                    print(f"[DB] ยังไม่พร้อม รอ {delay} วินาที... ({e})")
                    time.sleep(delay)
                    delay = min(delay * 2, 30)  # exponential backoff สูงสุด 30 วินาที

        raise RuntimeError(
            f"[DB] ไม่สามารถเชื่อมต่อฐานข้อมูลได้หลังจากลอง {max_retries} ครั้ง: {last_error}"
        )
    return _pool

def get_conn():
    pool = get_pool()
    conn = pool.getconn()
    conn._pool = pool
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS ace_swepam (
        time_tag TEXT PRIMARY KEY,
        proton_density REAL, bulk_speed REAL,
        ion_temp REAL, status INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS ace_mag (
        time_tag TEXT PRIMARY KEY,
        bx REAL, by REAL, bz REAL, bt REAL,
        lat REAL, lon REAL, status INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS ace_epam (
        time_tag TEXT PRIMARY KEY,
        e38_53 REAL, e175_315 REAL,
        p47_65 REAL, p112_187 REAL,
        p310_580 REAL, p761_1220 REAL,
        status INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS ace_sis (
        time_tag TEXT PRIMARY KEY,
        p10 REAL, p30 REAL, status INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS goes_xray (
        time_tag TEXT PRIMARY KEY,
        flux_long REAL, flux_short REAL, satellite INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS goes_proton (
        time_tag TEXT, energy TEXT, flux REAL, satellite INTEGER,
        PRIMARY KEY (time_tag, energy)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS goes_electron (
        time_tag TEXT, energy TEXT, flux REAL, satellite INTEGER,
        PRIMARY KEY (time_tag, energy)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS goes_mag (
        time_tag TEXT PRIMARY KEY,
        hp REAL, he REAL, hn REAL, ht REAL, satellite INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS goes_wind (
        time_tag TEXT PRIMARY KEY,
        density REAL, speed REAL, temperature REAL, satellite INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS cosmic_neutron (
        time_tag TEXT, station TEXT, count_rate REAL,
        PRIMARY KEY (time_tag, station)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS cosmic_maw (
        time_tag TEXT PRIMARY KEY,
        year INTEGER, doy INTEGER, hour INTEGER, minute INTEGER,
        nm_corrected REAL, nm_uncorrected REAL, pressure REAL,
        bare_corrected REAL, bare_uncorrected REAL,
        tube_1 REAL, tube_2 REAL, tube_3 REAL, tube_4 REAL, tube_5 REAL, tube_6 REAL,
        tube_7 REAL, tube_8 REAL, tube_9 REAL, tube_10 REAL, tube_11 REAL, tube_12 REAL,
        tube_13 REAL, tube_14 REAL, tube_15 REAL, tube_16 REAL, tube_17 REAL, tube_18 REAL,
        bare_1 REAL, bare_2 REAL, bare_3 REAL, bare_4 REAL, bare_5 REAL, bare_6 REAL,
        corr_factor REAL, stat_error REAL, status_flag INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS stereo_particles (
        time_tag TEXT PRIMARY KEY,
        ele_b02 REAL, ele_b05 REAL, ele_b10 REAL, ele_b15 REAL,
        pro_b02 REAL, pro_b05 REAL, pro_b10 REAL, pro_b15 REAL
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS solar1_rtsw (
        time_tag TEXT PRIMARY KEY,
        proton_density REAL, proton_speed REAL, proton_temperature REAL,
        active BOOLEAN
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS crater_doserates (
        time_tag TEXT PRIMARY KEY,
        julian_date REAL,
        d12 REAL, d34 REAL, d56 REAL,
        d1 REAL, d2 REAL, d3 REAL, d4 REAL, d5 REAL, d6 REAL
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS solar1_stis_particles (
        time_tag TEXT PRIMARY KEY,
        p1 REAL, p2 REAL, p3 REAL, p4 REAL, p5 REAL, p6 REAL, p7 REAL, p8 REAL,
        de1 REAL, de2 REAL, de3 REAL, de4 REAL,
        active BOOLEAN DEFAULT TRUE
    )''')

    conn.commit()
    conn.close()
    print("[OK] Supabase PostgreSQL initialized")