"""
Script: migrate_psnm_to_utc.py
Description: Converts all PSNM (Princess Sirindhorn Neutron Monitor, Doi Inthanon)
data in PostgreSQL from Thailand Local Time (UTC+7) to Coordinated Universal Time (UTC).
Shifts timestamps by -7 hours so they perfectly align with Mawson, SOPO, NEWK, OULU, and NMDB.
"""

import os
import sys
import time
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@localhost:5433/space_weather")
if "localhost:5433" in DB_URL:
    DB_URL = DB_URL.replace("localhost:5433", "127.0.0.1:5433")

def run_migration():
    print("=" * 70)
    print("MIGRATING PSNM DATA TO UTC (SUBTRACTING 7 HOURS)")
    print("=" * 70)
    
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    
    try:
        cur = conn.cursor()
        
        # 1. Check existing counts
        cur.execute("SELECT count(*), min(time_tag), max(time_tag) FROM cosmic_psnm;")
        psnm_count, psnm_min, psnm_max = cur.fetchone() or (0, None, None)
        print(f"[*] cosmic_psnm before migration: {psnm_count:,} rows ({psnm_min} to {psnm_max})")

        cur.execute("SELECT count(*), min(time_tag), max(time_tag) FROM cosmic_neutron WHERE station = 'PSNM';")
        n_count, n_min, n_max = cur.fetchone() or (0, None, None)
        print(f"[*] cosmic_neutron (PSNM) before migration: {n_count:,} rows ({n_min} to {n_max})")

        # 2. Backup cosmic_psnm to cosmic_psnm_backup_utc7 (if not already backed up)
        print("\n[*] Creating safe backup: cosmic_psnm_backup_utc7...")
        cur.execute("DROP TABLE IF EXISTS cosmic_psnm_backup_utc7;")
        cur.execute("CREATE TABLE cosmic_psnm_backup_utc7 AS TABLE cosmic_psnm;")
        print("    -> Backup table created successfully.")

        # 3. Create cosmic_psnm_utc table
        print("\n[*] Transforming cosmic_psnm timestamps (-7 hours -> UTC)...")
        cur.execute("DROP TABLE IF EXISTS cosmic_psnm_utc;")
        cur.execute("""
            CREATE TABLE cosmic_psnm_utc (
                time_tag TEXT PRIMARY KEY,
                year INTEGER,
                doy INTEGER,
                hour INTEGER,
                minute INTEGER,
                nm_corrected REAL,
                nm_uncorrected REAL,
                pressure REAL,
                bare_corrected REAL,
                bare_uncorrected REAL,
                leader_cor REAL,
                corr_factor REAL,
                stat_error REAL,
                status_flag INTEGER DEFAULT 0,
                tube_1 REAL, tube_2 REAL, tube_3 REAL, tube_4 REAL, tube_5 REAL, tube_6 REAL,
                tube_7 REAL, tube_8 REAL, tube_9 REAL, tube_10 REAL, tube_11 REAL, tube_12 REAL,
                tube_13 REAL, tube_14 REAL, tube_15 REAL, tube_16 REAL, tube_17 REAL, tube_18 REAL,
                bare_1 REAL, bare_2 REAL, bare_3 REAL
            );
        """)
        
        cur.execute("""
            INSERT INTO cosmic_psnm_utc (
                time_tag, year, doy, hour, minute,
                nm_corrected, nm_uncorrected, pressure,
                bare_corrected, bare_uncorrected, leader_cor,
                corr_factor, stat_error, status_flag,
                tube_1, tube_2, tube_3, tube_4, tube_5, tube_6,
                tube_7, tube_8, tube_9, tube_10, tube_11, tube_12,
                tube_13, tube_14, tube_15, tube_16, tube_17, tube_18,
                bare_1, bare_2, bare_3
            )
            SELECT 
                to_char(time_tag::timestamp - interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as time_tag,
                EXTRACT(YEAR FROM (time_tag::timestamp - interval '7 hours'))::integer as year,
                EXTRACT(DOY FROM (time_tag::timestamp - interval '7 hours'))::integer as doy,
                EXTRACT(HOUR FROM (time_tag::timestamp - interval '7 hours'))::integer as hour,
                EXTRACT(MINUTE FROM (time_tag::timestamp - interval '7 hours'))::integer as minute,
                nm_corrected, nm_uncorrected, pressure,
                bare_corrected, bare_uncorrected, leader_cor,
                corr_factor, stat_error, status_flag,
                tube_1, tube_2, tube_3, tube_4, tube_5, tube_6,
                tube_7, tube_8, tube_9, tube_10, tube_11, tube_12,
                tube_13, tube_14, tube_15, tube_16, tube_17, tube_18,
                bare_1, bare_2, bare_3
            FROM cosmic_psnm;
        """)
        
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cosmic_psnm_time ON cosmic_psnm_utc(time_tag);")
        
        # Replace original table
        cur.execute("DROP TABLE cosmic_psnm;")
        cur.execute("ALTER TABLE cosmic_psnm_utc RENAME TO cosmic_psnm;")
        print("    -> cosmic_psnm successfully shifted to UTC!")

        # 4. Migrate cosmic_neutron (PSNM rows)
        print("\n[*] Shifting cosmic_neutron for station = 'PSNM' to UTC...")
        cur.execute("DROP TABLE IF EXISTS cosmic_neutron_psnm_backup_utc7;")
        cur.execute("CREATE TABLE cosmic_neutron_psnm_backup_utc7 AS SELECT * FROM cosmic_neutron WHERE station = 'PSNM';")
        
        # Delete old and insert shifted
        cur.execute("DELETE FROM cosmic_neutron WHERE station = 'PSNM';")
        cur.execute("""
            INSERT INTO cosmic_neutron (time_tag, station, count_rate)
            SELECT 
                to_char(time_tag::timestamp - interval '7 hours', 'YYYY-MM-DD HH24:MI:SS'),
                'PSNM',
                count_rate
            FROM cosmic_neutron_psnm_backup_utc7
            ON CONFLICT (time_tag, station) DO UPDATE SET count_rate = EXCLUDED.count_rate;
        """)
        print("    -> cosmic_neutron (PSNM) successfully shifted to UTC!")

        # 5. Commit transaction
        conn.commit()
        print("\n[+] Database transaction COMMITTED successfully.")

        # 6. Verify result
        cur.execute("SELECT count(*), min(time_tag), max(time_tag) FROM cosmic_psnm;")
        new_p_count, new_p_min, new_p_max = cur.fetchone() or (0, None, None)
        print(f"\n[VERIFICATION] cosmic_psnm: {new_p_count:,} rows ({new_p_min} to {new_p_max})")

        cur.execute("SELECT count(*), min(time_tag), max(time_tag) FROM cosmic_neutron WHERE station = 'PSNM';")
        new_n_count, new_n_min, new_n_max = cur.fetchone() or (0, None, None)
        print(f"[VERIFICATION] cosmic_neutron (PSNM): {new_n_count:,} rows ({new_n_min} to {new_n_max})")

        # 7. Check Jan 19-20 drop alignment
        print("\n=== HOURLY COMPARISON ON JAN 19-20, 2026 (AFTER MIGRATION) ===")
        cur.execute("""
            SELECT substring(time_tag, 1, 13) as hr,
                   station,
                   round(avg(count_rate)::numeric, 1) as avg_cr
            FROM cosmic_neutron
            WHERE station IN ('PSNM', 'MAWSON')
              AND time_tag >= '2026-01-19 18:00:00' AND time_tag <= '2026-01-20 06:00:00'
            GROUP BY hr, station
            ORDER BY hr, station;
        """)
        for r in cur.fetchall():
            print(f"  {r[0]} | {r[1]:8} | {r[2]}")

    except Exception as e:
        conn.rollback()
        print(f"[-] Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
