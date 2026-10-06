import os
import sys
import glob
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, '.env'))

from database import get_conn
from psycopg2.extras import execute_values

def clean_val(val_str, missing_vals=(-999.9, -9999.9, -1.00e+05, -100000.0, -1.0)):
    try:
        v = float(val_str)
        if any(abs(v - mv) < 0.01 for mv in missing_vals):
            return None
        return v
    except (ValueError, TypeError):
        return None

def import_ace_data(folder_path=r"C:\Users\NicKyZ\Documents\GroundBased_data\New folder (2)\ACE"):
    if not os.path.exists(folder_path):
        print(f"[ERROR] Folder not found: {folder_path}")
        return

    conn = get_conn()
    cur = conn.cursor()

    files = sorted(glob.glob(os.path.join(folder_path, "**", "*.txt"), recursive=True))
    print(f"Found {len(files)} ACE text files.")

    mag_batch = []
    swepam_batch = []
    epam_batch = []
    sis_batch = []

    total_mag = 0
    total_swepam = 0
    total_epam = 0
    total_sis = 0

    def flush_mag():
        nonlocal mag_batch, total_mag
        if not mag_batch:
            return
        execute_values(cur, """
            INSERT INTO ace_mag (time_tag, bx, by, bz, bt, lat, lon, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                bx=EXCLUDED.bx, by=EXCLUDED.by, bz=EXCLUDED.bz, bt=EXCLUDED.bt,
                lat=EXCLUDED.lat, lon=EXCLUDED.lon, status=EXCLUDED.status
        """, mag_batch)
        conn.commit()
        total_mag += len(mag_batch)
        mag_batch = []

    def flush_swepam():
        nonlocal swepam_batch, total_swepam
        if not swepam_batch:
            return
        execute_values(cur, """
            INSERT INTO ace_swepam (time_tag, proton_density, bulk_speed, ion_temp, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                proton_density=EXCLUDED.proton_density,
                bulk_speed=EXCLUDED.bulk_speed,
                ion_temp=EXCLUDED.ion_temp,
                status=EXCLUDED.status
        """, swepam_batch)
        conn.commit()
        total_swepam += len(swepam_batch)
        swepam_batch = []

    def flush_epam():
        nonlocal epam_batch, total_epam
        if not epam_batch:
            return
        execute_values(cur, """
            INSERT INTO ace_epam (time_tag, e38_53, e175_315, p47_65, p112_187, p310_580, p761_1220, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                e38_53=EXCLUDED.e38_53,
                e175_315=EXCLUDED.e175_315,
                p47_65=EXCLUDED.p47_65,
                p112_187=EXCLUDED.p112_187,
                p310_580=EXCLUDED.p310_580,
                p761_1220=EXCLUDED.p761_1220,
                status=EXCLUDED.status
        """, epam_batch)
        conn.commit()
        total_epam += len(epam_batch)
        epam_batch = []

    def flush_sis():
        nonlocal sis_batch, total_sis
        if not sis_batch:
            return
        execute_values(cur, """
            INSERT INTO ace_sis (time_tag, p10, p30, status)
            VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
                p10=EXCLUDED.p10,
                p30=EXCLUDED.p30,
                status=EXCLUDED.status
        """, sis_batch)
        conn.commit()
        total_sis += len(sis_batch)
        sis_batch = []

    for idx, filepath in enumerate(files, 1):
        fname = os.path.basename(filepath)
        is_mag = "_ace_mag_" in fname
        is_swepam = "_ace_swepam_" in fname
        is_epam = "_ace_epam_" in fname
        is_sis = "_ace_sis_" in fname

        if not (is_mag or is_swepam or is_epam or is_sis):
            continue

        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if line.startswith(':') or line.startswith('#'):
                        continue
                    p = line.split()
                    if len(p) < 7:
                        continue

                    # YR MO DA HHMM
                    yr, mo, da, hhmm = p[0], p[1], p[2], p[3]
                    if len(hhmm) == 4:
                        time_tag = f"{yr}-{mo}-{da} {hhmm[:2]}:{hhmm[2:]}:00Z"
                    else:
                        continue

                    if is_mag and len(p) >= 13:
                        status = int(p[6])
                        bx = clean_val(p[7])
                        by = clean_val(p[8])
                        bz = clean_val(p[9])
                        bt = clean_val(p[10])
                        lat = clean_val(p[11])
                        lon = clean_val(p[12])
                        mag_batch.append((time_tag, bx, by, bz, bt, lat, lon, status))
                        if len(mag_batch) >= 5000:
                            flush_mag()

                    elif is_swepam and len(p) >= 10:
                        status = int(p[6])
                        density = clean_val(p[7])
                        speed = clean_val(p[8])
                        temp = clean_val(p[9])
                        swepam_batch.append((time_tag, density, speed, temp, status))
                        if len(swepam_batch) >= 5000:
                            flush_swepam()

                    elif is_epam and len(p) >= 14:
                        status = int(p[6])
                        e38 = clean_val(p[7])
                        e175 = clean_val(p[8])
                        p47 = clean_val(p[10])
                        p112 = clean_val(p[11])
                        p310 = clean_val(p[12])
                        p761 = clean_val(p[13])
                        epam_batch.append((time_tag, e38, e175, p47, p112, p310, p761, status))
                        if len(epam_batch) >= 5000:
                            flush_epam()

                    elif is_sis and len(p) >= 10:
                        status = int(p[6])
                        p10 = clean_val(p[7])
                        p30 = clean_val(p[9])
                        sis_batch.append((time_tag, p10, p30, status))
                        if len(sis_batch) >= 5000:
                            flush_sis()

        except Exception as e:
            print(f"Error reading {fname}: {e}")

        if idx % 50 == 0 or idx == len(files):
            print(f"[{idx}/{len(files)}] Processed files... (MAG: {total_mag + len(mag_batch)}, SWEPAM: {total_swepam + len(swepam_batch)}, EPAM: {total_epam + len(epam_batch)}, SIS: {total_sis + len(sis_batch)})")

    flush_mag()
    flush_swepam()
    flush_epam()
    flush_sis()

    print("========================================")
    print("IMPORT COMPLETE:")
    print(f"  ace_mag    : {total_mag:,} rows")
    print(f"  ace_swepam : {total_swepam:,} rows")
    print(f"  ace_epam   : {total_epam:,} rows")
    print(f"  ace_sis    : {total_sis:,} rows")
    print("========================================")

if __name__ == "__main__":
    import_ace_data()
