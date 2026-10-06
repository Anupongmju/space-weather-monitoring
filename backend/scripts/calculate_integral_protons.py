import os
import sys
import math
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, '.env'))

from database import get_conn
from psycopg2.extras import execute_values

# SGPS Differential Channel Energy Bandwidths in keV
# Extracted from NOAA GOES-18 SGPS NetCDF specifications
# DiffProtonUpperEnergy - DiffProtonLowerEnergy
W = {
    '1-2 MeV': 840.0,       # P1:  1020 -  1860 keV
    '2-3 MeV': 400.0,       # P2:  1900 -  2300 keV
    '2-4 MeV': 1030.0,      # P3:  2310 -  3340 keV
    '4-7 MeV': 3080.0,      # P4:  3400 -  6480 keV
    '6-11 MeV': 5160.0,     # P5:  5840 - 11000 keV
    '12-23 MeV': 11630.0,   # P6: 11640 - 23270 keV
    '26-38 MeV': 12900.0,   # P7: 25500 - 38400 keV
    '41-77 MeV': 36000.0,   # P8: 41000 - 77000 keV
    '81-98 MeV': 16700.0,   # P9: 80900 - 97600 keV
    '96-118 MeV': 22100.0,  # P10: 96300 - 118400 keV
    '115-138 MeV': 23520.0, # P11: 114880 - 138400 keV
    '153-229 MeV': 76000.0, # P12: 153300 - 229300 keV
    '267-390 MeV': 123000.0 # P13: 267000 - 390000 keV
}

def calculate_integrals_for_range(start_tag="2026-01-01", end_tag="2026-06-01", satellite=18):
    conn = get_conn()
    cur = conn.cursor()

    print(f"=== Calculating Integral Proton Flux from Differential Channels ===")
    print(f"Time Range: {start_tag} to {end_tag}")

    # Fetch all records in range
    print("Fetching differential and >500 MeV records from DB...")
    cur.execute("""
        SELECT time_tag, energy, flux, satellite
        FROM goes_proton
        WHERE time_tag >= %s AND time_tag < %s
        ORDER BY time_tag ASC
    """, (start_tag, end_tag))

    rows = cur.fetchall()
    print(f"Loaded {len(rows):,} rows from goes_proton.")

    # Group by time_tag
    records_by_time = {}
    for t, energy, flux, sat in rows:
        if t not in records_by_time:
            records_by_time[t] = {}
        records_by_time[t][energy] = flux

    print(f"Unique timestamps to process: {len(records_by_time):,}")

    insert_batch = []
    total_inserted = 0

    for t, energies in records_by_time.items():
        # Check if already has >=10 MeV
        if '>=10 MeV' in energies and energies['>=10 MeV'] is not None:
            continue

        def get_val(key):
            val = energies.get(key)
            if val is None or math.isnan(val) or val <= 0:
                return 0.0
            return float(val)

        j500 = get_val('>=500 MeV')

        # Compute partial integral steps from high energy down to low energy
        # P11_diff (115-138) + P12 (153-229) + P13 (267-390) + >500 MeV
        f_115 = get_val('115-138 MeV') * W['115-138 MeV']
        f_153 = get_val('153-229 MeV') * W['153-229 MeV']
        f_267 = get_val('267-390 MeV') * W['267-390 MeV']
        p_100 = f_115 + f_153 + f_267 + j500

        # P9 (81-98) + P10 (96-118)
        f_81  = get_val('81-98 MeV') * W['81-98 MeV']
        f_96  = get_val('96-118 MeV') * W['96-118 MeV']
        p_60  = f_81 + f_96 + p_100

        # P8 (41-77 MeV)
        f_41  = get_val('41-77 MeV') * W['41-77 MeV']
        p_50  = (f_41 * 0.6) + p_60

        # P7 (26-38 MeV)
        f_26  = get_val('26-38 MeV') * W['26-38 MeV']
        p_30  = f_26 + f_41 + p_60

        # P6 (12-23 MeV)
        f_12  = get_val('12-23 MeV') * W['12-23 MeV']
        p_10  = f_12 + p_30

        # P5 (6-11 MeV)
        f_6   = get_val('6-11 MeV') * W['6-11 MeV']
        p_5   = f_6 + p_10

        # P1..P4 (1-7 MeV)
        f_1   = get_val('1-2 MeV') * W['1-2 MeV']
        f_2   = get_val('2-3 MeV') * W['2-3 MeV']
        f_2_4 = get_val('2-4 MeV') * W['2-4 MeV']
        f_4   = get_val('4-7 MeV') * W['4-7 MeV']
        p_1   = f_1 + f_2 + f_2_4 + f_4 + p_5

        channels_to_add = [
            ('>=1 MeV', p_1),
            ('>=5 MeV', p_5),
            ('>=10 MeV', p_10),
            ('>=30 MeV', p_30),
            ('>=50 MeV', p_50),
            ('>=60 MeV', p_60),
            ('>=100 MeV', p_100),
        ]

        for ch_name, val in channels_to_add:
            if val > 0:
                insert_batch.append((t, ch_name, val, satellite))

        if len(insert_batch) >= 10000:
            execute_values(cur, """
                INSERT INTO goes_proton (time_tag, energy, flux, satellite)
                VALUES %s
                ON CONFLICT (time_tag, energy) DO UPDATE SET flux = EXCLUDED.flux
            """, insert_batch)
            conn.commit()
            total_inserted += len(insert_batch)
            insert_batch = []
            print(f"Upserted {total_inserted:,} integral records...")

    if insert_batch:
        execute_values(cur, """
            INSERT INTO goes_proton (time_tag, energy, flux, satellite)
            VALUES %s
            ON CONFLICT (time_tag, energy) DO UPDATE SET flux = EXCLUDED.flux
        """, insert_batch)
        conn.commit()
        total_inserted += len(insert_batch)

    print(f"=== COMPLETED: Added {total_inserted:,} Integral Proton records! ===")
    conn.close()

if __name__ == "__main__":
    start = sys.argv[1] if len(sys.argv) > 1 else "2026-01-01"
    end   = sys.argv[2] if len(sys.argv) > 2 else "2026-06-01"
    calculate_integrals_for_range(start, end)
