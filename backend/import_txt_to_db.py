"""
import_txt_to_db.py — Import g19e1MeV++.txt into PostgreSQL (goes_xray & goes_proton)
Run inside docker: docker exec space_weather_backend python /app/import_txt_to_db.py
"""
import sys
import os
import datetime
import time
import math
import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://myuser:mypassword@db:5432/space_weather')
TXT_FILE = '/app/data/datagoes/g19e1MeV++.txt'

# Mapping of TXT header columns to DB energy strings for goes_proton
PROTON_COL_MAP = {
    'g18e5MeV': '>=5 MeV',
    'g18e10MeV': '>=10 MeV',
    'g18e30MeV': '>=30 MeV',
    'g18e50MeV': '>=50 MeV',
    'g18e60MeV': '>=60 MeV',
    'g18e100MeV': '>=100 MeV',
    'g18e500MeV': '>=500 MeV',
}

def safe_float(val: str):
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None

def main():
    print('=== Importing g19e1MeV++.txt to PostgreSQL ===')
    print(f'File: {TXT_FILE}')
    print(f'DB:   {DATABASE_URL}')

    if not os.path.exists(TXT_FILE):
        print(f'Error: File not found {TXT_FILE}')
        return

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Base start timestamp: 2022-09-13 00:00:00 UTC
    start_dt = datetime.datetime(2022, 9, 13, 0, 0, 0, tzinfo=datetime.timezone.utc)
    current_dt = start_dt

    xray_batch = []
    proton_batch = []
    
    total_xray_inserted = 0
    total_proton_inserted = 0
    row_count = 0

    t_start = time.time()

    with open(TXT_FILE, 'r') as f:
        header_line = f.readline().strip()
        headers = header_line.split('\t')
        print(f'Header columns: {headers}')

        for line in f:
            row_count += 1
            parts = line.strip().split('\t')
            if not parts or not parts[0]:
                continue

            time_tag = current_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
            num_cols = len(parts)

            if num_cols >= 10:
                # 10 columns mode: 5-min step for both proton & xray
                # 1. Proton values
                for col_idx, col_name in enumerate(headers):
                    if col_name in PROTON_COL_MAP and col_idx < num_cols:
                        val = safe_float(parts[col_idx])
                        if val is not None:
                            proton_batch.append((time_tag, PROTON_COL_MAP[col_name], val, 18))

                # 2. X-Ray values
                long_val = safe_float(parts[8]) if num_cols > 8 else None
                short_val = safe_float(parts[9]) if num_cols > 9 else None
                if long_val is not None or short_val is not None:
                    xray_batch.append((time_tag, long_val, short_val, 18))

                # Advance 5 minutes for 10-cols section
                current_dt += datetime.timedelta(minutes=5)

            elif num_cols >= 2:
                # 2 columns mode: 1-min step for X-Ray (Long_X_ray_G18, Short_X_ray_g18)
                long_val = safe_float(parts[0])
                short_val = safe_float(parts[1]) if num_cols > 1 else None
                if long_val is not None or short_val is not None:
                    xray_batch.append((time_tag, long_val, short_val, 18))

                # Advance 1 minute for 2-cols section
                current_dt += datetime.timedelta(minutes=1)

            # Flush xray_batch when reaching 10,000 rows
            if len(xray_batch) >= 10000:
                execute_values(
                    cur,
                    """INSERT INTO goes_xray (time_tag, flux_long, flux_short, satellite)
                       VALUES %s
                       ON CONFLICT (time_tag) DO NOTHING""",
                    xray_batch
                )
                conn.commit()
                total_xray_inserted += len(xray_batch)
                xray_batch.clear()

                if row_count % 100000 == 0:
                    elapsed = time.time() - t_start
                    pct = row_count / 1992959 * 100
                    print(f'Processed {row_count:,} rows ({pct:.1f}%) | X-Ray inserted: {total_xray_inserted:,} | {elapsed:.1f}s')

            # Flush proton_batch when reaching 5,000 rows
            if len(proton_batch) >= 5000:
                execute_values(
                    cur,
                    """INSERT INTO goes_proton (time_tag, energy, flux, satellite)
                       VALUES %s
                       ON CONFLICT (time_tag, energy) DO NOTHING""",
                    proton_batch
                )
                conn.commit()
                total_proton_inserted += len(proton_batch)
                proton_batch.clear()

    # Flush remaining batches
    if xray_batch:
        execute_values(
            cur,
            """INSERT INTO goes_xray (time_tag, flux_long, flux_short, satellite)
               VALUES %s
               ON CONFLICT (time_tag) DO NOTHING""",
            xray_batch
        )
        conn.commit()
        total_xray_inserted += len(xray_batch)

    if proton_batch:
        execute_values(
            cur,
            """INSERT INTO goes_proton (time_tag, energy, flux, satellite)
               VALUES %s
               ON CONFLICT (time_tag, energy) DO NOTHING""",
            proton_batch
        )
        conn.commit()
        total_proton_inserted += len(proton_batch)

    conn.close()

    total_time = time.time() - t_start
    print()
    print('=== TXT Import Completed Successfully ===')
    print(f'Processed rows:        {row_count:,}')
    print(f'Total X-Ray inserted:  {total_xray_inserted:,}')
    print(f'Total Proton inserted: {total_proton_inserted:,}')
    print(f'Total time taken:      {total_time:.1f} seconds ({total_time/60:.1f} min)')

if __name__ == '__main__':
    main()
