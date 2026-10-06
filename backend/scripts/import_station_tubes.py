"""
Script: import_station_tubes.py
Imports individual tube data for PSNM (18 NM64 + 3 Bare) and Mawson (18 NM64 + 6 Bare)
into PostgreSQL cosmic_psnm and cosmic_maw tables.
"""

import os
import sys
import io
import time
from pathlib import Path
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

def add_columns(conn):
    print("[*] Ensuring tube columns exist in cosmic_psnm...")
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE cosmic_psnm 
              ADD COLUMN IF NOT EXISTS tube_1 REAL,
              ADD COLUMN IF NOT EXISTS tube_2 REAL,
              ADD COLUMN IF NOT EXISTS tube_3 REAL,
              ADD COLUMN IF NOT EXISTS tube_4 REAL,
              ADD COLUMN IF NOT EXISTS tube_5 REAL,
              ADD COLUMN IF NOT EXISTS tube_6 REAL,
              ADD COLUMN IF NOT EXISTS tube_7 REAL,
              ADD COLUMN IF NOT EXISTS tube_8 REAL,
              ADD COLUMN IF NOT EXISTS tube_9 REAL,
              ADD COLUMN IF NOT EXISTS tube_10 REAL,
              ADD COLUMN IF NOT EXISTS tube_11 REAL,
              ADD COLUMN IF NOT EXISTS tube_12 REAL,
              ADD COLUMN IF NOT EXISTS tube_13 REAL,
              ADD COLUMN IF NOT EXISTS tube_14 REAL,
              ADD COLUMN IF NOT EXISTS tube_15 REAL,
              ADD COLUMN IF NOT EXISTS tube_16 REAL,
              ADD COLUMN IF NOT EXISTS tube_17 REAL,
              ADD COLUMN IF NOT EXISTS tube_18 REAL,
              ADD COLUMN IF NOT EXISTS bare_1 REAL,
              ADD COLUMN IF NOT EXISTS bare_2 REAL,
              ADD COLUMN IF NOT EXISTS bare_3 REAL;
        """)
        conn.commit()

def import_psnm_tubes(conn):
    print("\n" + "="*70)
    print("[*] Processing PSNM Individual Tubes (18 NM-64 + 3 Bare)...")
    print("="*70)
    t0 = time.time()

    f_2025 = MAW_CODE_DIR / "PSNM" / "output_yearly" / "02_cleaned_and_mbar" / "PRS_2025_MOP_MCT_count_rate.txt"
    f_2026 = MAW_CODE_DIR / "PSNM" / "output_yearly" / "02_cleaned_and_mbar" / "PRS_2026_MOP_MCT_count_rate.txt"

    dfs = []
    for f in [f_2025, f_2026]:
        if f.exists():
            print(f"    -> Reading {f.name} ({f.stat().st_size / 1e6:.1f} MB)...")
            df = pd.read_csv(f, sep=r"\s+", skiprows=[1], dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])
            dfs.append(df)
        else:
            print(f"    [-] File not found: {f}")

    if not dfs:
        return

    combined = pd.concat(dfs, ignore_index=True)
    print(f"    -> Combined {len(combined):,} rows. Parsing timestamps...")

    dt_str = "20" + combined["Date"].astype(str).str.strip() + " " + combined["Time"].astype(str).str.strip()
    combined["dt"] = pd.to_datetime(dt_str, format="%Y/%m/%d %H:%M:%S", errors="coerce") - pd.Timedelta(hours=7)
    combined = combined.dropna(subset=["dt"]).sort_values("dt").reset_index(drop=True)
    combined["time_tag"] = combined["dt"].dt.strftime("%Y-%m-%d %H:%M:%S")

    # Map tubes: MCT_CR_01 to MCT_CR_18 -> tube_1 to tube_18
    # MCT_CR_19 to MCT_CR_21 -> bare_1 to bare_3
    out_df = pd.DataFrame()
    out_df["time_tag"] = combined["time_tag"]

    for i in range(1, 19):
        col_in = f"MCT_CR_{i:02d}"
        if col_in in combined.columns:
            out_df[f"tube_{i}"] = combined[col_in].apply(lambda v: f"{v:.1f}" if pd.notna(v) else "")
        else:
            out_df[f"tube_{i}"] = ""

    for i in range(1, 4):
        col_in = f"MCT_CR_{18 + i:02d}"
        if col_in in combined.columns:
            out_df[f"bare_{i}"] = combined[col_in].apply(lambda v: f"{v:.1f}" if pd.notna(v) else "")
        else:
            out_df[f"bare_{i}"] = ""

    print(f"    -> Staging and updating {len(out_df):,} rows into cosmic_psnm...")

    csv_buf = io.StringIO()
    out_df.to_csv(csv_buf, index=False, header=False, na_rep="")
    csv_buf.seek(0)

    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS staging_psnm_tubes;")
        tube_defs = ", ".join([f"tube_{i} REAL" for i in range(1, 19)] + [f"bare_{i} REAL" for i in range(1, 4)])
        cur.execute(f"""
            CREATE UNLOGGED TABLE staging_psnm_tubes (
                time_tag TEXT PRIMARY KEY,
                {tube_defs}
            );
        """)
        cur.copy_expert("COPY staging_psnm_tubes FROM STDIN WITH (FORMAT CSV)", csv_buf)
        print("    -> Copied to staging. Updating cosmic_psnm...")

        update_set = ", ".join([f"tube_{i} = s.tube_{i}" for i in range(1, 19)] + [f"bare_{i} = s.bare_{i}" for i in range(1, 4)])
        cur.execute(f"""
            UPDATE cosmic_psnm p
            SET {update_set}
            FROM staging_psnm_tubes s
            WHERE p.time_tag = s.time_tag;
        """)
        updated_rows = cur.rowcount
        cur.execute("DROP TABLE staging_psnm_tubes;")
        conn.commit()

    print(f"[+] PSNM tubes updated: {updated_rows:,} rows in {time.time() - t0:.2f}s")

def import_mawson_tubes(conn):
    print("\n" + "="*70)
    print("[*] Processing Mawson Individual Tubes (18 NM-64 + 6 Bare)...")
    print("="*70)
    t0 = time.time()

    f_2025 = MAW_CODE_DIR / "Mawson" / "output_yearly" / "06_mct_count_rate" / "MAW_2025_MOP_MCT_count_rate.txt"
    f_2026 = MAW_CODE_DIR / "Mawson" / "output_yearly" / "06_mct_count_rate" / "MAW_2026_MOP_MCT_count_rate.txt"

    dfs = []
    for f in [f_2025, f_2026]:
        if f.exists():
            print(f"    -> Reading {f.name} ({f.stat().st_size / 1e6:.1f} MB)...")
            df = pd.read_csv(f, sep=r"\s+", skiprows=[1], dtype={"Date": str, "Time": str}, na_values=["NaN", "nan"])
            dfs.append(df)
        else:
            print(f"    [-] File not found: {f}")

    if not dfs:
        return

    combined = pd.concat(dfs, ignore_index=True)
    print(f"    -> Combined {len(combined):,} rows. Parsing timestamps...")

    dt_str = "20" + combined["Date"].astype(str).str.strip() + " " + combined["Time"].astype(str).str.strip()
    combined["dt"] = pd.to_datetime(dt_str, format="%Y/%m/%d %H:%M:%S", errors="coerce")
    combined = combined.dropna(subset=["dt"]).sort_values("dt").reset_index(drop=True)
    combined["time_tag"] = combined["dt"].dt.strftime("%Y-%m-%d %H:%M:%S")

    out_df = pd.DataFrame()
    out_df["time_tag"] = combined["time_tag"]

    for i in range(1, 19):
        col_in = f"MCT_CR_{i:02d}"
        if col_in in combined.columns:
            out_df[f"tube_{i}"] = combined[col_in].apply(lambda v: f"{v:.1f}" if pd.notna(v) else "")
        else:
            out_df[f"tube_{i}"] = ""

    for i in range(1, 7):
        col_in = f"MCT_CR_{18 + i:02d}"
        if col_in in combined.columns:
            out_df[f"bare_{i}"] = combined[col_in].apply(lambda v: f"{v:.1f}" if pd.notna(v) else "")
        else:
            out_df[f"bare_{i}"] = ""

    print(f"    -> Staging and updating {len(out_df):,} rows into cosmic_maw...")

    csv_buf = io.StringIO()
    out_df.to_csv(csv_buf, index=False, header=False, na_rep="")
    csv_buf.seek(0)

    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS staging_maw_tubes;")
        tube_defs = ", ".join([f"tube_{i} REAL" for i in range(1, 19)] + [f"bare_{i} REAL" for i in range(1, 7)])
        cur.execute(f"""
            CREATE UNLOGGED TABLE staging_maw_tubes (
                time_tag TEXT PRIMARY KEY,
                {tube_defs}
            );
        """)
        cur.copy_expert("COPY staging_maw_tubes FROM STDIN WITH (FORMAT CSV)", csv_buf)
        print("    -> Copied to staging. Updating cosmic_maw...")

        update_set = ", ".join([f"tube_{i} = s.tube_{i}" for i in range(1, 19)] + [f"bare_{i} = s.bare_{i}" for i in range(1, 7)])
        cur.execute(f"""
            UPDATE cosmic_maw m
            SET {update_set}
            FROM staging_maw_tubes s
            WHERE m.time_tag = s.time_tag;
        """)
        updated_rows = cur.rowcount
        cur.execute("DROP TABLE staging_maw_tubes;")
        conn.commit()

    print(f"[+] Mawson tubes updated: {updated_rows:,} rows in {time.time() - t0:.2f}s")

if __name__ == "__main__":
    conn = get_connection()
    try:
        add_columns(conn)
        import_psnm_tubes(conn)
        import_mawson_tubes(conn)
    finally:
        conn.close()
    print("\n[+] All tube imports completed successfully.")
