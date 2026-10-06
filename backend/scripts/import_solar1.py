import os
import sys
from dotenv import load_dotenv

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, '.env'))

from database import get_conn
from psycopg2.extras import execute_values

def clean_val(val_str, is_mag=False):
    try:
        v = float(val_str)
        if is_mag:
            if abs(v) < 1000 and v != -99999:
                return v
        else:
            if 0 <= v < 1e8 and v != -99999:
                return v
    except (ValueError, TypeError):
        pass
    return None

def import_solar1():
    conn = get_conn()
    cur = conn.cursor()

    # 1. Import STIS Particles from ions_data_20260907_092406.txt
    ions_file = os.path.join(BASE_DIR, 'data', 'ions_data_20260907_092406.txt')
    if os.path.exists(ions_file):
        print(f"Reading {ions_file}...")
        ions_records = {}
        with open(ions_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 14 and parts[0].startswith('2026-') and parts[2] == 'SOLAR-1':
                    time_tag = f"{parts[0]}T{parts[1][:-1]}:00Z"
                    p = [clean_val(parts[i]) for i in range(3, 11)]
                    de = [clean_val(parts[i]) for i in range(11, 15)]
                    if any(x is not None for x in p + de):
                        ions_records[time_tag] = (time_tag, *p, *de, True)
        
        records_list = list(ions_records.values())
        print(f"Upserting {len(records_list)} records into solar1_stis_particles...")
        execute_values(cur, """
            INSERT INTO solar1_stis_particles
            (time_tag, p1, p2, p3, p4, p5, p6, p7, p8, de1, de2, de3, de4, active)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            p1=EXCLUDED.p1, p2=EXCLUDED.p2, p3=EXCLUDED.p3, p4=EXCLUDED.p4,
            p5=EXCLUDED.p5, p6=EXCLUDED.p6, p7=EXCLUDED.p7, p8=EXCLUDED.p8,
            de1=EXCLUDED.de1, de2=EXCLUDED.de2, de3=EXCLUDED.de3, de4=EXCLUDED.de4,
            active=EXCLUDED.active
        """, records_list)
        conn.commit()
        print("[OK] solar1_stis_particles upsert completed.")

    # 2. Import Plasma & Mag from rtsw_data_20260907_092340.txt
    rtsw_file = os.path.join(BASE_DIR, 'data', 'rtsw_data_20260907_092340.txt')
    if os.path.exists(rtsw_file):
        print(f"Reading {rtsw_file}...")
        rtsw_records = {}
        mag_records = {}
        with open(rtsw_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 13 and parts[0].startswith('2026-'):
                    time_tag = f"{parts[0]}T{parts[1][:-1]}:00Z"
                    mag_src = parts[2]
                    bt = clean_val(parts[3], is_mag=True)
                    bz = clean_val(parts[4], is_mag=True)
                    bx = clean_val(parts[5], is_mag=True)
                    by = clean_val(parts[6], is_mag=True)
                    plasma_src = parts[9]
                    density = clean_val(parts[10])
                    speed = clean_val(parts[11])
                    temp = clean_val(parts[12])

                    if mag_src == 'SOLAR-1' and any(x is not None for x in [bt, bx, by, bz]):
                        mag_records[time_tag] = (time_tag, bt, bx, by, bz, True)
                    if plasma_src == 'SOLAR-1' and any(x is not None for x in [density, speed, temp]):
                        rtsw_records[time_tag] = (time_tag, density, speed, temp, True)

        # Upsert MAG
        mag_list = list(mag_records.values())
        print(f"Upserting {len(mag_list)} records into solar1_mag...")
        execute_values(cur, """
            INSERT INTO solar1_mag
            (time_tag, bt, bx_gse, by_gse, bz_gse, active)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            bt=EXCLUDED.bt, bx_gse=EXCLUDED.bx_gse,
            by_gse=EXCLUDED.by_gse, bz_gse=EXCLUDED.bz_gse,
            active=EXCLUDED.active
        """, mag_list)
        conn.commit()
        print("[OK] solar1_mag upsert completed.")

        # Upsert RTSW Plasma
        rtsw_list = list(rtsw_records.values())
        print(f"Upserting {len(rtsw_list)} records into solar1_rtsw...")
        execute_values(cur, """
            INSERT INTO solar1_rtsw
            (time_tag, proton_density, proton_speed, proton_temperature, active)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            proton_density=EXCLUDED.proton_density,
            proton_speed=EXCLUDED.proton_speed,
            proton_temperature=EXCLUDED.proton_temperature,
            active=EXCLUDED.active
        """, rtsw_list)
        conn.commit()
        print("[OK] solar1_rtsw upsert completed.")

    # Check Day 5 counts after import
    print("\n=== Verification for 2026-09-05 ===")
    for t in ['solar1_stis_particles', 'solar1_rtsw', 'solar1_mag']:
        cur.execute(f"SELECT COUNT(*), MIN(time_tag), MAX(time_tag) FROM {t} WHERE time_tag LIKE '2026-09-05%'")
        res = cur.fetchone()
        print(f"{t}: count={res[0]}, min={res[1]}, max={res[2]}")

    conn.close()

if __name__ == '__main__':
    import_solar1()
