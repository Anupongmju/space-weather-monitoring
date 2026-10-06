"""
Script: import_mawson_reconstructed.py
Description: Fast importer for Mawson 2026 group-reconstructed pressure-corrected & uncorrected data
(MAW_2026_MOP_MLN_recon_first_corrected.txt & MAW_2026_MOP_MLN_recon_first_uncorrected.txt)
into PostgreSQL cosmic_maw and cosmic_neutron tables.
"""

import os
import io
import time
from pathlib import Path
import pandas as pd
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@127.0.0.1:5433/space_weather")
if "localhost:5433" in DB_URL:
    DB_URL = DB_URL.replace("localhost:5433", "127.0.0.1:5433")

DEFAULT_RECON_COR = Path(r"C:\Users\NicKyZ\Documents\mawson_con_code\Mawson\output_yearly\05_pressure_corrected\MAW_2026_MOP_MLN_recon_first_corrected.txt")
DEFAULT_RECON_UNC = Path(r"C:\Users\NicKyZ\Documents\mawson_con_code\Mawson\output_yearly\05_pressure_corrected\MAW_2026_MOP_MLN_recon_first_uncorrected.txt")

def get_connection():
    return psycopg2.connect(DB_URL)

def import_reconstructed_data(file_cor: Path = DEFAULT_RECON_COR, file_unc: Path = DEFAULT_RECON_UNC):
    if not file_cor.exists():
        print(f"[-] Corrected file not found: {file_cor}")
        return

    print("=" * 75)
    print(f"[*] Loading reconstructed data from: {file_cor.name}")
    print(f"    File size: {file_cor.stat().st_size / (1024 * 1024):.2f} MB")
    print("=" * 75)
    t0 = time.time()

    # Read Corrected file
    df_c = pd.read_csv(
        file_cor,
        sep=r"\s+",
        skiprows=[1],
        dtype={"Date": str, "Time": str},
        na_values=["NaN", "nan", "NAN", "null"]
    )
    print(f"    -> Read {len(df_c):,} corrected records in {time.time() - t0:.2f}s")

    # Read Uncorrected file if exists
    df_u = None
    if file_unc.exists():
        t_u = time.time()
        df_u = pd.read_csv(
            file_unc,
            sep=r"\s+",
            skiprows=[1],
            dtype={"Date": str, "Time": str},
            na_values=["NaN", "nan", "NAN", "null"]
        )
        print(f"    -> Read {len(df_u):,} uncorrected records in {time.time() - t_u:.2f}s")

    # Merge on Date, Time if uncorrected is present
    if df_u is not None:
        unc_cols = ["Date", "Time"]
        if "NM64_18tube_sum" in df_u.columns:
            unc_cols.append("NM64_18tube_sum")
        df = pd.merge(df_c, df_u[unc_cols], on=["Date", "Time"], how="left", suffixes=("", "_unc"))
    else:
        df = df_c

    # Format datetime
    dt_str = "20" + df["Date"].astype(str).str.strip() + " " + df["Time"].astype(str).str.strip()
    df["dt"] = pd.to_datetime(dt_str, format="%Y/%m/%d %H:%M:%S", errors="coerce")
    df = df.dropna(subset=["dt"]).sort_values("dt").reset_index(drop=True)

    # Determine Corrected Sum
    if "NM64_18tube_sum" in df.columns:
        df["nm_corrected"] = pd.to_numeric(df["NM64_18tube_sum"], errors="coerce")
    else:
        # Fallback to recon cols sum
        recon_cols = [c for c in df.columns if c.startswith("MLN_") and ("recon" in c)]
        valid_tube_counts = df[recon_cols].notna().sum(axis=1)
        df["nm_corrected"] = df[recon_cols].sum(axis=1, min_count=5)
        df.loc[valid_tube_counts < 5, "nm_corrected"] = None

    # Determine Uncorrected Sum
    if "NM64_18tube_sum_unc" in df.columns:
        df["nm_uncorrected"] = pd.to_numeric(df["NM64_18tube_sum_unc"], errors="coerce")
    else:
        df["nm_uncorrected"] = None

    if "Pressure" in df.columns:
        df["Pressure"] = pd.to_numeric(df["Pressure"], errors="coerce")
    else:
        df["Pressure"] = None

    # Map tube_1 to tube_18
    for i in range(1, 19):
        col_c = f"MLN_{i:02d}_recon_cor"
        col_alt = f"MLN_{i:02d}_recon"
        if col_c in df.columns:
            df[f"tube_{i}"] = pd.to_numeric(df[col_c], errors="coerce")
        elif col_alt in df.columns:
            df[f"tube_{i}"] = pd.to_numeric(df[col_alt], errors="coerce")
        else:
            df[f"tube_{i}"] = None

    # Filter only rows that have valid nm_corrected or nm_uncorrected or pressure
    has_data = df["nm_corrected"].notna() | df["nm_uncorrected"].notna() | df["Pressure"].notna()
    df_valid = df[has_data].copy()
    print(f"    -> {len(df_valid):,} valid records with reconstructed data.")

    # Prepare DataFrame for staging
    out_df = pd.DataFrame()
    out_df["time_tag"] = df_valid["dt"].dt.strftime("%Y-%m-%d %H:%M:%S")
    out_df["year"] = df_valid["dt"].dt.year
    out_df["doy"] = df_valid["dt"].dt.dayofyear
    out_df["hour"] = df_valid["dt"].dt.hour
    out_df["minute"] = df_valid["dt"].dt.minute
    out_df["pressure"] = df_valid["Pressure"].apply(lambda v: f"{v:.2f}" if pd.notna(v) else "")
    out_df["nm_corrected"] = df_valid["nm_corrected"].apply(lambda v: f"{v:.1f}" if pd.notna(v) else "")
    out_df["nm_uncorrected"] = df_valid["nm_uncorrected"].apply(lambda v: f"{v:.1f}" if pd.notna(v) else "")

    for i in range(1, 19):
        out_df[f"tube_{i}"] = df_valid[f"tube_{i}"].apply(lambda v: f"{v:.1f}" if pd.notna(v) else "")

    print(f"    -> Writing CSV buffer for {len(out_df):,} rows...")
    csv_buf = io.StringIO()
    out_df.to_csv(csv_buf, index=False, header=False, na_rep="")
    csv_buf.seek(0)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            staging_table = "staging_maw_recon"
            print(f"    -> Creating temporary staging table: {staging_table}...")
            cur.execute(f"DROP TABLE IF EXISTS {staging_table};")
            tube_fields = ", ".join([f"tube_{i} REAL" for i in range(1, 19)])
            cur.execute(f"""
                CREATE UNLOGGED TABLE {staging_table} (
                    time_tag TEXT PRIMARY KEY,
                    year INTEGER,
                    doy INTEGER,
                    hour INTEGER,
                    minute INTEGER,
                    pressure REAL,
                    nm_corrected REAL,
                    nm_uncorrected REAL,
                    {tube_fields}
                );
            """)

            print(f"    -> Bulk copying data to {staging_table} via COPY...")
            cur.copy_expert(f"COPY {staging_table} FROM STDIN WITH (FORMAT CSV)", csv_buf)

            print(f"    -> Upserting reconstructed data into cosmic_maw...")
            tube_updates = ", ".join([f"tube_{i} = EXCLUDED.tube_{i}" for i in range(1, 19)])
            cur.execute(f"""
                INSERT INTO cosmic_maw (
                    time_tag, year, doy, hour, minute, pressure, nm_corrected, nm_uncorrected,
                    {", ".join([f"tube_{i}" for i in range(1, 19)])}
                )
                SELECT
                    time_tag, year, doy, hour, minute, pressure, nm_corrected, nm_uncorrected,
                    {", ".join([f"tube_{i}" for i in range(1, 19)])}
                FROM {staging_table}
                ON CONFLICT (time_tag) DO UPDATE SET
                    year = EXCLUDED.year,
                    doy = EXCLUDED.doy,
                    hour = EXCLUDED.hour,
                    minute = EXCLUDED.minute,
                    pressure = COALESCE(EXCLUDED.pressure, cosmic_maw.pressure),
                    nm_corrected = COALESCE(EXCLUDED.nm_corrected, cosmic_maw.nm_corrected),
                    nm_uncorrected = COALESCE(EXCLUDED.nm_uncorrected, cosmic_maw.nm_uncorrected),
                    {tube_updates};
            """)
            updated_maw = cur.rowcount
            print(f"       Upserted {updated_maw:,} rows in cosmic_maw.")

            print(f"    -> Syncing Mawson counts to cosmic_neutron table...")
            cur.execute(f"""
                INSERT INTO cosmic_neutron (time_tag, station, count_rate)
                SELECT time_tag, 'MAWSON', nm_corrected
                FROM {staging_table}
                WHERE nm_corrected IS NOT NULL
                ON CONFLICT (time_tag, station) DO UPDATE SET
                    count_rate = EXCLUDED.count_rate;
            """)
            updated_neutron = cur.rowcount
            print(f"       Upserted {updated_neutron:,} rows in cosmic_neutron.")

            cur.execute(f"DROP TABLE {staging_table};")
            conn.commit()

        print("=" * 75)
        print(f"[SUCCESS] Mawson reconstructed data imported in {time.time() - t0:.2f}s!")
        print("=" * 75)

    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    f_c = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_RECON_COR
    f_u = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_RECON_UNC
    import_reconstructed_data(f_c, f_u)
