import os
import sys
import glob
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, '.env'))

from database import get_conn
from psycopg2.extras import execute_values

def clean_val(val_str):
    try:
        v = float(val_str)
        # 9.99e+07 is fill value for invalid/missing data in CDAWeb
        if 0.0 <= v < 9.0e7:
            return v
    except (ValueError, TypeError):
        pass
    return None

def create_table_if_not_exists(cur):
    cur.execute('''
        CREATE TABLE IF NOT EXISTS mars_maven_particles (
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
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_mars_maven_time_tag ON mars_maven_particles (time_tag)')

def import_mars_maven():
    data_dir = os.path.join(BASE_DIR, 'data', 'Mars', 'Mars_orbiter', 'MAVEN', 'electrons_ions')
    files = sorted(glob.glob(os.path.join(data_dir, '*.lst')))

    if not files:
        print(f"[ERROR] No .lst files found in {data_dir}")
        return

    print(f"Found {len(files)} files to import from {data_dir}")

    conn = get_conn()
    cur = conn.cursor()
    create_table_if_not_exists(cur)
    conn.commit()

    total_inserted = 0

    col_names = ['time_tag', 'year', 'doy', 'hour']
    for i in range(1, 29):
        col_names.append(f'ion_{i}')
    for i in range(1, 16):
        col_names.append(f'ele_{i}')
    cols_str = ', '.join(col_names)

    update_clauses = [f"{c} = EXCLUDED.{c}" for c in col_names if c != 'time_tag']
    update_str = ', '.join(update_clauses)

    insert_sql = f"""
        INSERT INTO mars_maven_particles ({cols_str})
        VALUES %s
        ON CONFLICT (time_tag) DO UPDATE SET
        {update_str}
    """

    for fpath in files:
        fname = os.path.basename(fpath)
        print(f"Processing {fname}...")
        records = []
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
            for line in fp:
                parts = line.split()
                if len(parts) < 46:
                    continue

                try:
                    year = int(parts[0])
                    doy = int(parts[1])
                    hour = int(parts[2])
                except ValueError:
                    continue

                dt = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=doy - 1, hours=hour)
                time_tag = dt.strftime('%Y-%m-%d %H:00:00Z')

                vals = [clean_val(v) for v in parts[3:46]]

                row = (time_tag, year, doy, hour, *vals)
                records.append(row)

        if records:
            # Batch upsert in chunks of 5000
            chunk_size = 5000
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i + chunk_size]
                execute_values(cur, insert_sql, chunk)
            conn.commit()
            total_inserted += len(records)
            print(f"  -> Upserted {len(records)} records from {fname} (Total: {total_inserted})")

    cur.close()
    conn.close()
    print(f"\n[SUCCESS] Completed MAVEN particle import! Total records processed: {total_inserted}")

if __name__ == '__main__':
    import_mars_maven()
