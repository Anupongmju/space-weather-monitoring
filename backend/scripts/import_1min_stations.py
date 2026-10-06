"""
Script: import_1min_stations.py
Description: High-speed importer for 1-minute resolution calculated space weather data
(Mawson Station and Princess Sirindhorn Neutron Monitor - PSNM, Doi Inthanon)
into PostgreSQL using temporary staging tables and COPY command.
"""

import os
import sys
import io
import time
from pathlib import Path
import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
MAW_CODE_DIR = Path(r"C:\Users\NicKyZ\Documents\mawson_con_code")

load_dotenv(BASE_DIR / ".env")
DB_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@127.0.0.1:5433/space_weather")
if "localhost:5433" in DB_URL:
    DB_URL = DB_URL.replace("localhost:5433", "127.0.0.1:5433")

def get_connection():
    return psycopg2.connect(DB_URL)

def setup_tables(conn):
    with conn.cursor() as cur:
        cur.execute("ALTER TABLE cosmic_maw ADD COLUMN IF NOT EXISTS leader_cor REAL;")
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

def import_station_1min(conn, station_name: str, f_uncor: Path, f_cor: Path, target_table: str, update_neutron: bool = False):
    print(f"\n[*] Processing 1-minute data for {station_name}...")
    t0 = time.time()

    if not f_uncor.exists() or not f_cor.exists():
        print(f"[-] Files not found for {station_name}: {f_uncor} / {f_cor}")
        return 0

    print("    -> Reading uncorrected file...")
    # Column in uncor file for NM count
    # Check headers
    first_line = ""
    with open(f_uncor, "r", errors="ignore") as fp:
        first_line = fp.readline()

    df_u = pd.read_csv(f_uncor, sep=r"\s+", skiprows=[1], dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])
    print(f"    -> Reading corrected file...")
    df_c = pd.read_csv(f_cor, dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])

    print("    -> Merging datasets...")
    merged = pd.merge(df_u, df_c, on=["Date", "Time"], how="outer")

    # Parse timestamps
    print("    -> Parsing datetime timestamps...")
    dt_str = "20" + merged["Date"].astype(str).str.strip() + " " + merged["Time"].astype(str).str.strip()
    merged["dt"] = pd.to_datetime(dt_str, format="%Y/%m/%d %H:%M:%S", errors="coerce")
    if station_name.upper() == "PSNM":
        print("    -> Converting PSNM timestamps from Thailand Time (UTC+7) to UTC (-7 hours)...")
        merged["dt"] = merged["dt"] - pd.Timedelta(hours=7)
    merged = merged.dropna(subset=["dt"]).sort_values("dt").reset_index(drop=True)

    # Determine NM uncorrected column name
    nm_uncor_col = "MCT_CR_nm18_sum" if "MCT_CR_nm18_sum" in merged.columns else ("MCT_CR_clean16_sum" if "MCT_CR_clean16_sum" in merged.columns else None)
    bare_uncor_col = "MCT_CR_bare_sum" if "MCT_CR_bare_sum" in merged.columns else None

    # Filter only rows that have at least one valid measurement
    cols_to_check = ["NM_cor", "Pressure"]
    if nm_uncor_col:
        cols_to_check.append(nm_uncor_col)
    if "Bare_cor" in merged.columns:
        cols_to_check.append("Bare_cor")

    valid_mask = merged[cols_to_check].notna().any(axis=1)
    filtered = merged[valid_mask].copy()

    total_valid = len(filtered)
    print(f"    -> Found {total_valid:,} valid 1-minute measurements (filtered out NaNs).")
    if total_valid == 0:
        return 0

    filtered["time_tag"] = filtered["dt"].dt.strftime("%Y-%m-%d %H:%M:%S")
    filtered["year"] = filtered["dt"].dt.year
    filtered["doy"] = filtered["dt"].dt.dayofyear
    filtered["hour"] = filtered["dt"].dt.hour
    filtered["minute"] = filtered["dt"].dt.minute

    # Format numeric values (replace NaN with empty string for CSV COPY)
    out_df = pd.DataFrame()
    out_df["time_tag"] = filtered["time_tag"]
    out_df["year"] = filtered["year"]
    out_df["doy"] = filtered["doy"]
    out_df["hour"] = filtered["hour"]
    out_df["minute"] = filtered["minute"]
    out_df["nm_corrected"] = filtered["NM_cor"].apply(lambda v: f"{v:.4f}" if pd.notna(v) else "")
    out_df["nm_uncorrected"] = (filtered[nm_uncor_col].apply(lambda v: f"{v:.4f}" if pd.notna(v) else "") if nm_uncor_col else "")
    out_df["pressure"] = filtered["Pressure"].apply(lambda v: f"{v:.4f}" if pd.notna(v) else "")
    out_df["bare_corrected"] = (filtered["Bare_cor"].apply(lambda v: f"{v:.4f}" if pd.notna(v) else "") if "Bare_cor" in filtered.columns else "")
    out_df["bare_uncorrected"] = (filtered[bare_uncor_col].apply(lambda v: f"{v:.4f}" if pd.notna(v) else "") if bare_uncor_col else "")
    out_df["leader_cor"] = (filtered["Leader_cor"].apply(lambda v: f"{v:.6f}" if pd.notna(v) else "") if "Leader_cor" in filtered.columns else "")

    print(f"    -> Staging and copying {total_valid:,} rows to PostgreSQL...")
    csv_buf = io.StringIO()
    out_df.to_csv(csv_buf, index=False, header=False, na_rep="")
    csv_buf.seek(0)

    staging_table = f"staging_{target_table}"
    with conn.cursor() as cur:
        cur.execute(f"DROP TABLE IF EXISTS {staging_table};")
        cur.execute(f"""
            CREATE UNLOGGED TABLE {staging_table} (
                time_tag TEXT,
                year INTEGER,
                doy INTEGER,
                hour INTEGER,
                minute INTEGER,
                nm_corrected REAL,
                nm_uncorrected REAL,
                pressure REAL,
                bare_corrected REAL,
                bare_uncorrected REAL,
                leader_cor REAL
            );
        """)

        cur.copy_expert(f"""
            COPY {staging_table} (
                time_tag, year, doy, hour, minute,
                nm_corrected, nm_uncorrected, pressure, bare_corrected, bare_uncorrected, leader_cor
            ) FROM STDIN WITH (FORMAT CSV)
        """, csv_buf)

        print(f"    -> Upserting from staging to {target_table}...")
        cur.execute(f"""
            INSERT INTO {target_table} (
                time_tag, year, doy, hour, minute,
                nm_corrected, nm_uncorrected, pressure, bare_corrected, bare_uncorrected, leader_cor
            )
            SELECT
                time_tag, year, doy, hour, minute,
                nm_corrected, nm_uncorrected, pressure, bare_corrected, bare_uncorrected, leader_cor
            FROM {staging_table}
            ON CONFLICT (time_tag) DO UPDATE SET
                year = EXCLUDED.year,
                doy = EXCLUDED.doy,
                hour = EXCLUDED.hour,
                minute = EXCLUDED.minute,
                nm_corrected = COALESCE(EXCLUDED.nm_corrected, {target_table}.nm_corrected),
                nm_uncorrected = COALESCE(EXCLUDED.nm_uncorrected, {target_table}.nm_uncorrected),
                pressure = COALESCE(EXCLUDED.pressure, {target_table}.pressure),
                bare_corrected = COALESCE(EXCLUDED.bare_corrected, {target_table}.bare_corrected),
                bare_uncorrected = COALESCE(EXCLUDED.bare_uncorrected, {target_table}.bare_uncorrected),
                leader_cor = COALESCE(EXCLUDED.leader_cor, {target_table}.leader_cor);
            
            DROP TABLE {staging_table};
        """)

        if update_neutron:
            print(f"    -> Updating cosmic_neutron with {station_name} 1-minute measurements...")
            cur.execute(f"""
                INSERT INTO cosmic_neutron (time_tag, station, count_rate)
                SELECT time_tag, '{station_name}', COALESCE(nm_corrected, nm_uncorrected)
                FROM {target_table}
                WHERE COALESCE(nm_corrected, nm_uncorrected) IS NOT NULL
                ON CONFLICT (time_tag, station) DO UPDATE SET
                    count_rate = EXCLUDED.count_rate;
            """)

        conn.commit()

    elapsed = time.time() - t0
    print(f"[+] {station_name} finished: {total_valid:,} rows imported in {elapsed:.2f} seconds!")
    return total_valid

def main():
    print("=" * 65)
    print("Space Weather Dashboard: 1-Minute Resolution Importer")
    print("=" * 65)
    conn = get_connection()
    try:
        setup_tables(conn)

        # 1. Mawson 1-min
        f_maw_u = MAW_CODE_DIR / "Mawson" / "output" / "MAW_2025_2026_MCT_CR_nm18_bare.txt"
        f_maw_c = MAW_CODE_DIR / "Mawson" / "output" / "tables" / "mawson_corrected_NM_Bare_Leader_1min.csv"
        n_maw = import_station_1min(conn, "MAWSON", f_maw_u, f_maw_c, "cosmic_maw", update_neutron=False)

        # 2. PSNM 1-min
        f_psnm_u = MAW_CODE_DIR / "PSNM" / "output" / "PRS_2025_2026_MCT_CR_nm18_bare.txt"
        f_psnm_c = MAW_CODE_DIR / "PSNM" / "output" / "tables" / "psnm_corrected_NM_Bare_Leader_1min.csv"
        n_psnm = import_station_1min(conn, "PSNM", f_psnm_u, f_psnm_c, "cosmic_psnm", update_neutron=True)

        print("\n" + "=" * 65)
        print("[SUCCESS] All 1-minute datasets successfully imported!")
        print(f" - Mawson 1-minute: {n_maw:,} records")
        print(f" - PSNM 1-minute:   {n_psnm:,} records")
        print("=" * 65)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
