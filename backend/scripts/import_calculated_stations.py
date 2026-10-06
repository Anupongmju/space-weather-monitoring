"""
Script: import_calculated_stations.py
Description: Imports calculated pressure-corrected, uncorrected, and pressure data
for both Mawson Station and PSNM (Princess Sirindhorn Neutron Monitor, Doi Inthanon)
into PostgreSQL.
"""

import os
import sys
import datetime
from pathlib import Path
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Paths
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
MAW_CODE_DIR = Path(r"C:\Users\NicKyZ\Documents\mawson_con_code")

load_dotenv(BASE_DIR / ".env")
DB_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@127.0.0.1:5433/space_weather")
# If host is localhost on Windows, ensure it works with 127.0.0.1 if needed
if "localhost:5433" in DB_URL:
    DB_URL = DB_URL.replace("localhost:5433", "127.0.0.1:5433")

def get_connection():
    return psycopg2.connect(DB_URL)

def setup_tables(conn):
    with conn.cursor() as cur:
        # 1. Add leader_cor column to cosmic_maw if not present
        cur.execute("ALTER TABLE cosmic_maw ADD COLUMN IF NOT EXISTS leader_cor REAL;")

        # 2. Create cosmic_psnm table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cosmic_psnm (
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
                status_flag INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_cosmic_psnm_time ON cosmic_psnm(time_tag);
        """)
        conn.commit()
    print("[+] Table schema verified successfully.")

def parse_datetimes(df):
    """Parses YY/MM/DD HH:MM:SS to standard ISO timestamp string and components."""
    dt_str = "20" + df["Date"].astype(str).str.strip() + " " + df["Time"].astype(str).str.strip()
    datetimes = pd.to_datetime(dt_str, format="%Y/%m/%d %H:%M:%S", errors="coerce")
    return datetimes

def import_mawson(conn):
    print("\n[*] Importing Mawson station data...")
    f_uncor = MAW_CODE_DIR / "Mawson" / "output" / "MAW_2025_2026_MCT_CR_nm18_bare_hourly.txt"
    f_cor = MAW_CODE_DIR / "Mawson" / "output" / "tables" / "mawson_corrected_NM_Bare_Leader_1hr.csv"

    if not f_uncor.exists() or not f_cor.exists():
        print(f"[-] Mawson files not found: {f_uncor} / {f_cor}")
        return 0

    df_u = pd.read_csv(f_uncor, sep=r"\s+", skiprows=[1], dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])
    df_c = pd.read_csv(f_cor, dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])

    merged = pd.merge(df_u, df_c, on=["Date", "Time"], how="outer")
    merged["dt"] = parse_datetimes(merged)
    merged = merged.dropna(subset=["dt"]).sort_values("dt").reset_index(drop=True)

    records = []
    for _, row in merged.iterrows():
        dt = row["dt"]
        time_tag = dt.strftime("%Y-%m-%d %H:%M:%S")
        year = dt.year
        doy = dt.timetuple().tm_yday
        hour = dt.hour
        minute = dt.minute

        def val(v):
            if pd.isna(v) or np.isnan(v):
                return None
            return float(v)

        nm_cor = val(row.get("NM_cor"))
        nm_uncor = val(row.get("MCT_CR_clean16_sum"))
        pressure = val(row.get("Pressure"))
        bare_cor = val(row.get("Bare_cor"))
        bare_uncor = val(row.get("MCT_CR_bare_sum"))
        leader_cor = val(row.get("Leader_cor"))

        # Skip rows where all metrics are None
        if all(x is None for x in [nm_cor, nm_uncor, pressure, bare_cor, bare_uncor]):
            continue

        records.append((
            time_tag, year, doy, hour, minute,
            nm_cor, nm_uncor, pressure, bare_cor, bare_uncor, leader_cor
        ))

    print(f"    -> Prepared {len(records):,} valid records for Mawson.")
    if not records:
        return 0

    query = """
        INSERT INTO cosmic_maw (
            time_tag, year, doy, hour, minute,
            nm_corrected, nm_uncorrected, pressure, bare_corrected, bare_uncorrected, leader_cor
        ) VALUES %s
        ON CONFLICT (time_tag) DO UPDATE SET
            year = EXCLUDED.year,
            doy = EXCLUDED.doy,
            hour = EXCLUDED.hour,
            minute = EXCLUDED.minute,
            nm_corrected = COALESCE(EXCLUDED.nm_corrected, cosmic_maw.nm_corrected),
            nm_uncorrected = COALESCE(EXCLUDED.nm_uncorrected, cosmic_maw.nm_uncorrected),
            pressure = COALESCE(EXCLUDED.pressure, cosmic_maw.pressure),
            bare_corrected = COALESCE(EXCLUDED.bare_corrected, cosmic_maw.bare_corrected),
            bare_uncorrected = COALESCE(EXCLUDED.bare_uncorrected, cosmic_maw.bare_uncorrected),
            leader_cor = COALESCE(EXCLUDED.leader_cor, cosmic_maw.leader_cor);
    """
    with conn.cursor() as cur:
        execute_values(cur, query, records, page_size=1000)
        conn.commit()

    print(f"[+] Mawson imported: {len(records):,} records updated in cosmic_maw.")
    return len(records)

def import_psnm(conn):
    print("\n[*] Importing PSNM (Princess Sirindhorn, Doi Inthanon) station data...")
    f_uncor = MAW_CODE_DIR / "PSNM" / "output" / "PRS_2025_2026_MCT_CR_nm18_bare_hourly.txt"
    f_cor = MAW_CODE_DIR / "PSNM" / "output" / "tables" / "psnm_corrected_NM_Bare_Leader_1hr.csv"

    if not f_uncor.exists() or not f_cor.exists():
        print(f"[-] PSNM files not found: {f_uncor} / {f_cor}")
        return 0

    df_u = pd.read_csv(f_uncor, sep=r"\s+", skiprows=[1], dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])
    df_c = pd.read_csv(f_cor, dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])

    merged = pd.merge(df_u, df_c, on=["Date", "Time"], how="outer")
    merged["dt"] = parse_datetimes(merged) - pd.Timedelta(hours=7)
    merged = merged.dropna(subset=["dt"]).sort_values("dt").reset_index(drop=True)

    records = []
    neutron_records = []
    for _, row in merged.iterrows():
        dt = row["dt"]
        time_tag = dt.strftime("%Y-%m-%d %H:%M:%S")
        year = dt.year
        doy = dt.timetuple().tm_yday
        hour = dt.hour
        minute = dt.minute

        def val(v):
            if pd.isna(v) or np.isnan(v):
                return None
            return float(v)

        nm_cor = val(row.get("NM_cor"))
        nm_uncor = val(row.get("MCT_CR_nm18_sum"))
        pressure = val(row.get("Pressure"))
        bare_cor = val(row.get("Bare_cor"))
        bare_uncor = val(row.get("MCT_CR_bare_sum"))
        leader_cor = val(row.get("Leader_cor"))

        if all(x is None for x in [nm_cor, nm_uncor, pressure, bare_cor, bare_uncor]):
            continue

        records.append((
            time_tag, year, doy, hour, minute,
            nm_cor, nm_uncor, pressure, bare_cor, bare_uncor, leader_cor
        ))

        # Add to cosmic_neutron for global station comparisons
        c_rate = nm_cor if nm_cor is not None else nm_uncor
        if c_rate is not None:
            neutron_records.append((time_tag, "PSNM", c_rate))

    print(f"    -> Prepared {len(records):,} valid records for PSNM.")
    if not records:
        return 0

    query = """
        INSERT INTO cosmic_psnm (
            time_tag, year, doy, hour, minute,
            nm_corrected, nm_uncorrected, pressure, bare_corrected, bare_uncorrected, leader_cor
        ) VALUES %s
        ON CONFLICT (time_tag) DO UPDATE SET
            year = EXCLUDED.year,
            doy = EXCLUDED.doy,
            hour = EXCLUDED.hour,
            minute = EXCLUDED.minute,
            nm_corrected = COALESCE(EXCLUDED.nm_corrected, cosmic_psnm.nm_corrected),
            nm_uncorrected = COALESCE(EXCLUDED.nm_uncorrected, cosmic_psnm.nm_uncorrected),
            pressure = COALESCE(EXCLUDED.pressure, cosmic_psnm.pressure),
            bare_corrected = COALESCE(EXCLUDED.bare_corrected, cosmic_psnm.bare_corrected),
            bare_uncorrected = COALESCE(EXCLUDED.bare_uncorrected, cosmic_psnm.bare_uncorrected),
            leader_cor = COALESCE(EXCLUDED.leader_cor, cosmic_psnm.leader_cor);
    """
    with conn.cursor() as cur:
        execute_values(cur, query, records, page_size=1000)
        
        # Also upsert into cosmic_neutron
        if neutron_records:
            q_neutron = """
                INSERT INTO cosmic_neutron (time_tag, station, count_rate)
                VALUES %s
                ON CONFLICT (time_tag, station) DO UPDATE SET
                    count_rate = EXCLUDED.count_rate;
            """
            execute_values(cur, q_neutron, neutron_records, page_size=1000)

        conn.commit()

    print(f"[+] PSNM imported: {len(records):,} records updated in cosmic_psnm & cosmic_neutron.")
    return len(records)

def main():
    print("=" * 60)
    print("Space Weather Dashboard: Calculated Data Importer")
    print("=" * 60)
    conn = get_connection()
    try:
        setup_tables(conn)
        n_maw = import_mawson(conn)
        n_psnm = import_psnm(conn)
        print("\n" + "=" * 60)
        print(f"[SUCCESS] Import completed!")
        print(f" - Mawson: {n_maw:,} hourly records")
        print(f" - PSNM:   {n_psnm:,} hourly records")
        print("=" * 60)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
