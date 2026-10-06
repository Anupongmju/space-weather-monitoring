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
                print(f"[DB] Connecting to database... (Attempt {attempt}/{max_retries})")
                _pool = psycopg2.pool.ThreadedConnectionPool(
                    2, 15, DATABASE_URL, connection_factory=PooledConnection
                )
                print("[DB] Database connected successfully [OK]")
                return _pool
            except psycopg2.OperationalError as e:
                last_error = e
                if attempt < max_retries:
                    print(f"[DB] Database not ready, retrying in {delay}s... ({e})")
                    time.sleep(delay)
                    delay = min(delay * 2, 30)  # exponential backoff max 30s

        raise RuntimeError(
            f"[DB] Unable to connect to database after {max_retries} attempts: {last_error}"
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
        active BOOLEAN DEFAULT TRUE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS solar1_mag (
        time_tag TEXT PRIMARY KEY,
        bt REAL, bx_gse REAL, by_gse REAL, bz_gse REAL,
        active BOOLEAN DEFAULT TRUE
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

    c.execute('''CREATE TABLE IF NOT EXISTS sunspot_monthly (
        time_tag TEXT PRIMARY KEY,
        year INTEGER,
        month INTEGER,
        fractional_year REAL,
        sunspot_number REAL,
        std_dev REAL,
        obs_count INTEGER,
        is_definitive BOOLEAN DEFAULT TRUE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS mars_rad_doserates (
        time_tag TEXT PRIMARY KEY,
        sol INTEGER,
        dose_rate_silicon REAL,
        dose_rate_plastic REAL,
        dose_a1 REAL,
        dose_a2 REAL,
        dose_b REAL,
        dose_c REAL,
        dose_d REAL,
        dose_e REAL,
        dose_f REAL,
        flux_charged REAL,
        flux_neutral REAL,
        l1_cnt_fast REAL,
        l1_cnt_slow REAL,
        l2_coinc_ab REAL,
        l2_coinc_ade REAL,
        pressure_mbar REAL
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS mars_maven_particles (
        time_tag TEXT PRIMARY KEY,
        year INTEGER,
        doy INTEGER,
        hour INTEGER,
        ion_1 REAL, ion_2 REAL, ion_3 REAL, ion_4 REAL, ion_5 REAL, ion_6 REAL, ion_7 REAL,
        ion_8 REAL, ion_9 REAL, ion_10 REAL, ion_11 REAL, ion_12 REAL, ion_13 REAL, ion_14 REAL,
        ion_15 REAL, ion_16 REAL, ion_17 REAL, ion_18 REAL, ion_19 REAL, ion_20 REAL, ion_21 REAL,
        ion_22 REAL, ion_23 REAL, ion_24 REAL, ion_25 REAL, ion_26 REAL, ion_27 REAL, ion_28 REAL,
        ele_1 REAL, ele_2 REAL, ele_3 REAL, ele_4 REAL, ele_5 REAL, ele_6 REAL, ele_7 REAL,
        ele_8 REAL, ele_9 REAL, ele_10 REAL, ele_11 REAL, ele_12 REAL, ele_13 REAL, ele_14 REAL, ele_15 REAL
    )''')
    c.execute('CREATE INDEX IF NOT EXISTS idx_mars_maven_time_tag ON mars_maven_particles (time_tag)')
    c.execute('''CREATE TABLE IF NOT EXISTS noaa_kp_index (
        time_tag TEXT PRIMARY KEY,
        kp REAL,
        a_running REAL,
        station_count INTEGER
    )''')
    c.execute('CREATE INDEX IF NOT EXISTS idx_noaa_kp_time_tag ON noaa_kp_index (time_tag)')

    conn.commit()
    conn.close()
    print("[OK] Supabase PostgreSQL initialized")