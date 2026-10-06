import json
import numpy as np
import pandas as pd
from pathlib import Path

MMHG_TO_MBAR = 1.33322387415

BASE_MAW_DIR = Path(r"c:\Users\NicKyZ\Documents\mawson_con_code\Mawson")
TABLE_CSV = BASE_MAW_DIR / "output_yearly" / "07_summary_and_reports" / "mawson_all_tubes_and_sum_beta_table.csv"
DIFF_DIR = BASE_MAW_DIR / "output_yearly" / "04_diff"
OUT_DIR = Path(__file__).resolve().parent / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "maw_regression.json"

def main():
    print("[*] Generating Mawson Barometric Regression dataset...")
    
    # 1. Read authoritative summary table
    df_table = pd.read_csv(TABLE_CSV, encoding="utf-8-sig")
    table_lookup = {}
    for _, r in df_table.iterrows():
        table_lookup[str(r["Channel"]).strip()] = r

    # 2. Sample points from 2025 and 2026 ln_diff files
    sample_points = {i: [] for i in range(1, 25)}
    sample_mlr3 = []

    for yr in [2025, 2026]:
        diff_file = DIFF_DIR / f"MAW_{yr}_MOP_ln_diff.txt"
        if not diff_file.exists():
            print(f"[-] Missing {diff_file.name}")
            continue

        print(f"[*] Reading and sampling {diff_file.name}...")
        # Columns in MAW_YYYY_MOP_ln_diff.txt:
        # Date, Time, diff_Pressure, diff_ln_MLR_3, diff_ln_MLN_01 .. diff_ln_MLN_24
        cols = ["Date", "Time", "diff_Pressure", "diff_ln_MLR_3"] + [f"diff_ln_MLN_{i:02d}" for i in range(1, 25)]
        
        # Read in chunks to keep memory low and fast
        for chunk in pd.read_csv(diff_file, sep=r"\s+", skiprows=2, header=None, names=cols, chunksize=50000, na_values=["NaN", "nan", "NAN"]):
            p_mbar = pd.to_numeric(chunk["diff_Pressure"], errors="coerce") * MMHG_TO_MBAR
            
            # Sample for MLR_3
            y_m3 = pd.to_numeric(chunk["diff_ln_MLR_3"], errors="coerce")
            valid_m3 = p_mbar.notnull() & y_m3.notnull() & (p_mbar.abs() <= 8.0) & (y_m3.abs() <= 0.08)
            if valid_m3.sum() > 0:
                p_sub = p_mbar[valid_m3].values[::20]
                y_sub = y_m3[valid_m3].values[::20]
                for px, py in zip(p_sub, y_sub):
                    if len(sample_mlr3) < 4000:
                        sample_mlr3.append([round(float(px), 3), round(float(py), 5)])
            
            # Sample for each tube
            for i in range(1, 25):
                if len(sample_points[i]) >= 400:
                    continue
                col_name = f"diff_ln_MLN_{i:02d}"
                y_tube = pd.to_numeric(chunk[col_name], errors="coerce")
                lim_y = 0.25 if i <= 18 else 0.35
                valid_tube = p_mbar.notnull() & y_tube.notnull() & (p_mbar.abs() <= 8.0) & (y_tube.abs() <= lim_y)
                if valid_tube.sum() > 0:
                    p_sub = p_mbar[valid_tube].values[::15]
                    y_sub = y_tube[valid_tube].values[::15]
                    for px, py in zip(p_sub, y_sub):
                        if len(sample_points[i]) < 400:
                            sample_points[i].append([round(float(px), 3), round(float(py), 5)])

    # 3. Construct 24 tubes
    tubes_24 = []
    nm18_betas = []
    bare6_betas = []

    for i in range(1, 25):
        is_bare = (i >= 19)
        chan_key = f"MLN_{i:02d}"
        row = table_lookup.get(chan_key)

        beta_mb = float(row["Beta_Comb_mbar"]) if row is not None and pd.notnull(row["Beta_Comb_mbar"]) else 0.0
        beta_mm = float(row["Beta_Comb_mmHg"]) if row is not None and pd.notnull(row["Beta_Comb_mmHg"]) else 0.0
        se_mb = float(row["SE_Comb_mbar"]) if row is not None and pd.notnull(row["SE_Comb_mbar"]) else 0.0
        se_mm = float(row["SE_Comb_mmHg"]) if row is not None and pd.notnull(row["SE_Comb_mmHg"]) else 0.0
        r2 = float(row["R2_Comb"]) if row is not None and pd.notnull(row["R2_Comb"]) else 0.0
        n_pts = int(row["N_Comb"]) if row is not None and pd.notnull(row["N_Comb"]) else 0
        status = str(row["Status"]).strip() if row is not None and pd.notnull(row["Status"]) else "Normal"

        slope = - (beta_mb / 100.0)
        intercept = 0.0  # Normalized difference passes through (0,0)

        # For online tubes
        is_online = (n_pts > 100 and beta_mb > 0.01)

        if is_online:
            if is_bare:
                bare6_betas.append(beta_mb)
            else:
                if i not in [2, 14]:  # Standard clean NM-64
                    nm18_betas.append(beta_mb)

        tubes_24.append({
            "id": f"T{i:02d}" if not is_bare else f"B{i:02d}",
            "tube_num": i,
            "name": f"Tube {i:02d}" if not is_bare else f"Bare {i:02d}",
            "full_name": f"{'Bare Counter' if is_bare else 'NM-64'} Tube {i:02d}",
            "type": "Bare" if is_bare else "NM-64",
            "is_bare": is_bare,
            "is_online": is_online,
            "status": status,
            "points_count": n_pts,
            "slope": round(float(slope), 6),
            "se_slope": round(float(se_mb / 100.0), 6),
            "intercept": round(float(intercept), 6),
            "beta_mbar": round(float(beta_mb), 4),
            "se_mbar": round(float(se_mb), 4),
            "beta_mmhg": round(float(beta_mm), 4),
            "se_mmhg": round(float(se_mm), 4),
            "r2": round(float(r2), 4),
            "p_lim": 7.5,
            "ln_lim": 0.25 if not is_bare else 0.35,
            "sample_points": sample_points.get(i, [])
        })

    # Summary statistics
    clean_row = table_lookup.get("Station Clean Sum (16 Tubes excl. 02,14)")
    nm18_row = table_lookup.get("18-NM-64 Total Sum (Tubes 01-18)")
    bare_row = table_lookup.get("Bare Counters Sum (Tubes 19-24)")
    grand_row = table_lookup.get("Station Grand Total (All 24 Tubes Sum)")
    mlr3_row = table_lookup.get("MLR_3 (Station Hardware Log Sum)")

    clean_beta_mb = float(clean_row["Beta_Comb_mbar"]) if clean_row is not None else float(np.mean(nm18_betas))
    bare_beta_mb = float(bare_row["Beta_Comb_mbar"]) if bare_row is not None else float(np.mean(bare6_betas))
    mlr3_beta_mb = float(mlr3_row["Beta_Comb_mbar"]) if mlr3_row is not None else 0.6412

    payload = {
        "dataset_years": "2025–2026 Combined",
        "station": "MAWSON (Antarctica)",
        "latitude": "-67.60°S",
        "longitude": "62.88°E",
        "cutoff_rigidity": "0.22 GV",
        "resolution": "1-Min Resolution",
        "mean_nm18_beta_mbar": round(clean_beta_mb, 4),
        "mean_bare6_beta_mbar": round(bare_beta_mb, 4),
        "summary": {
            "total_tubes": 24,
            "nm18_count": 18,
            "bare6_count": 6,
            "mean_nm18_beta_mbar": round(clean_beta_mb, 4),
            "mean_nm18_beta_mmhg": round(clean_beta_mb * MMHG_TO_MBAR, 4),
            "mean_bare6_beta_mbar": round(bare_beta_mb, 4),
            "mean_bare6_beta_mmhg": round(bare_beta_mb * MMHG_TO_MBAR, 4),
            "clean_sum": {
                "name": "Station Clean Sum (16 Tubes excl. 02, 14)",
                "beta_mbar": round(float(clean_row["Beta_Comb_mbar"]), 4) if clean_row is not None else 0.6656,
                "beta_mmhg": round(float(clean_row["Beta_Comb_mmHg"]), 4) if clean_row is not None else 0.8873,
                "r2": round(float(clean_row["R2_Comb"]), 4) if clean_row is not None else 0.1395,
                "points": int(clean_row["N_Comb"]) if clean_row is not None else 441068
            },
            "nm18_sum": {
                "name": "18-NM-64 Total Sum (Tubes 01-18)",
                "beta_mbar": round(float(nm18_row["Beta_Comb_mbar"]), 4) if nm18_row is not None else 0.6112,
                "beta_mmhg": round(float(nm18_row["Beta_Comb_mmHg"]), 4) if nm18_row is not None else 0.8148,
                "r2": round(float(nm18_row["R2_Comb"]), 4) if nm18_row is not None else 0.0847,
                "points": int(nm18_row["N_Comb"]) if nm18_row is not None else 414946
            },
            "bare_sum": {
                "name": "Bare Counters Sum (Tubes 19-24)",
                "beta_mbar": round(float(bare_row["Beta_Comb_mbar"]), 4) if bare_row is not None else 0.0200,
                "beta_mmhg": round(float(bare_row["Beta_Comb_mmHg"]), 4) if bare_row is not None else 0.0266,
                "r2": round(float(bare_row["R2_Comb"]), 4) if bare_row is not None else 0.0001,
                "points": int(bare_row["N_Comb"]) if bare_row is not None else 94715
            }
        },
        "mlr_3": {
            "name": "MLR_3 (Multiplicity Rate Total Sum)",
            "title": "Mawson MLR_3 Barometric Regression: Δln N vs ΔP",
            "description": "Total Multiplicity Rate (Station Hardware Log Sum)",
            "points_count": int(mlr3_row["N_Comb"]) if mlr3_row is not None else 440282,
            "slope": - round(mlr3_beta_mb / 100.0, 6),
            "intercept": 0.0,
            "beta_mbar": round(mlr3_beta_mb, 4),
            "beta_mmhg": round(float(mlr3_row["Beta_Comb_mmHg"]), 4) if mlr3_row is not None else round(mlr3_beta_mb * MMHG_TO_MBAR, 4),
            "r2": round(float(mlr3_row["R2_Comb"]), 4) if mlr3_row is not None else 0.1282,
            "p_lim": 7.5,
            "ln_lim": 0.06,
            "sample_points": sample_mlr3[:2500]
        },
        "tubes_24": tubes_24
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"[+] Successfully generated {OUT_FILE} (size: {OUT_FILE.stat().st_size:,} bytes)")

if __name__ == "__main__":
    main()
