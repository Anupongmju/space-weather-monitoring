import os
import sys
from dotenv import load_dotenv

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

def import_ace():
    conn = get_conn()
    cur = conn.cursor()

    # 1. Import EPAM Particles from ions_data files
    ions_files = [
        os.path.join(BASE_DIR, 'data', 'ions_data_20260907_092551.txt'),
        os.path.join(BASE_DIR, 'data', 'ions_data_20260907_092406.txt')
    ]
    epam_records = {}
    for ions_file in ions_files:
        if not os.path.exists(ions_file):
            continue
        print(f"Reading {ions_file}...")
        with open(ions_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 15 and parts[0].startswith('2026-') and parts[2] == 'ACE':
                    time_tag = f"{parts[0]} {parts[1][:-1]}:00Z"
                    p47 = clean_val(parts[3])   # p1
                    p112 = clean_val(parts[5])  # p3
                    p310 = clean_val(parts[7])  # p5
                    p761 = clean_val(parts[9])  # p7
                    e38 = clean_val(parts[11])  # de1
                    e175 = clean_val(parts[14]) # de4
                    status = 0
                    if any(x is not None for x in [e38, e175, p47, p112, p310, p761]):
                        epam_records[time_tag] = (time_tag, e38, e175, p47, p112, p310, p761, status)

    if epam_records:
        records_list = list(epam_records.values())
        print(f"Upserting {len(records_list)} records into ace_epam...")
        execute_values(cur, """
            INSERT INTO ace_epam
            (time_tag, e38_53, e175_315, p47_65, p112_187, p310_580, p761_1220, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            e38_53=EXCLUDED.e38_53,
            e175_315=EXCLUDED.e175_315,
            p47_65=EXCLUDED.p47_65,
            p112_187=EXCLUDED.p112_187,
            p310_580=EXCLUDED.p310_580,
            p761_1220=EXCLUDED.p761_1220,
            status=EXCLUDED.status
        """, records_list)
        conn.commit()
        print("[OK] ace_epam upsert completed.")

    # 2. Import SWEPAM & MAG from rtsw_data files
    rtsw_files = [
        os.path.join(BASE_DIR, 'data', 'rtsw_data_20260907_092532.txt'),
        os.path.join(BASE_DIR, 'data', 'rtsw_data_20260907_092340.txt')
    ]
    mag_records = {}
    swepam_records = {}
    for rtsw_file in rtsw_files:
        if not os.path.exists(rtsw_file):
            continue
        print(f"Reading {rtsw_file}...")
        with open(rtsw_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 13 and parts[0].startswith('2026-'):
                    time_tag = f"{parts[0]} {parts[1][:-1]}:00Z"
                    mag_src = parts[2]
                    bt = clean_val(parts[3], is_mag=True)
                    bz = clean_val(parts[4], is_mag=True)
                    bx = clean_val(parts[5], is_mag=True)
                    by = clean_val(parts[6], is_mag=True)
                    lon = clean_val(parts[7], is_mag=True)
                    lat = clean_val(parts[8], is_mag=True)

                    plasma_src = parts[9]
                    density = clean_val(parts[10])
                    speed = clean_val(parts[11])
                    temp = clean_val(parts[12])
                    status = 0

                    if mag_src == 'ACE' and any(x is not None for x in [bt, bx, by, bz]):
                        mag_records[time_tag] = (time_tag, bx, by, bz, bt, lat, lon, status)
                    if plasma_src == 'ACE' and any(x is not None for x in [density, speed, temp]):
                        swepam_records[time_tag] = (time_tag, density, speed, temp, status)

    # Upsert MAG
    if mag_records:
        mag_list = list(mag_records.values())
        print(f"Upserting {len(mag_list)} records into ace_mag...")
        execute_values(cur, """
            INSERT INTO ace_mag
            (time_tag, bx, by, bz, bt, lat, lon, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            bx=EXCLUDED.bx, by=EXCLUDED.by,
            bz=EXCLUDED.bz, bt=EXCLUDED.bt,
            lat=EXCLUDED.lat, lon=EXCLUDED.lon,
            status=EXCLUDED.status
        """, mag_list)
        conn.commit()
        print("[OK] ace_mag upsert completed.")

    # Upsert SWEPAM
    if swepam_records:
        swepam_list = list(swepam_records.values())
        print(f"Upserting {len(swepam_list)} records into ace_swepam...")
        execute_values(cur, """
            INSERT INTO ace_swepam
            (time_tag, proton_density, bulk_speed, ion_temp, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            proton_density=EXCLUDED.proton_density,
            bulk_speed=EXCLUDED.bulk_speed,
            ion_temp=EXCLUDED.ion_temp,
            status=EXCLUDED.status
        """, swepam_list)
        conn.commit()
        print("[OK] ace_swepam upsert completed.")

    cur.close()
    conn.close()
    print("[SUCCESS] All ACE data imported successfully!")

if __name__ == '__main__':
    import_ace()
