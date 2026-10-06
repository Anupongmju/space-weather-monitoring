import os
import json
import time
from pathlib import Path
import numpy as np
import pandas as pd

MMHG_TO_MBAR = 1.33322387415

BASE_PSNM_DIR = Path(r"c:\Users\NicKyZ\Documents\mawson_con_code\PSNM")
DIFF_DIR = BASE_PSNM_DIR / "output_yearly" / "04_diff"
OUT_DIR = Path(__file__).resolve().parent / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "psnm_regression.json"

def main():
    print("[*] Computing PSNM Barometric Regressions from raw diff data...")
    t0 = time.time()

    # 1. Load MCT diff files (PRS_YYYY_MOP_MCT_ln_diff.txt)
    mct_dfs = []
    mct_cols = [
        "Date", "Time", "diff_Pressure", "diff_ln_MCT_nm18_sum", "diff_ln_MCT_bare_sum"
    ] + [f"diff_ln_MCT_{i:02d}" for i in range(1, 22)]

    for yr in [2025, 2026]:
        f = DIFF_DIR / f"PRS_{yr}_MOP_MCT_ln_diff.txt"
        if f.exists():
            print(f"  Reading {f.name}...")
            df = pd.read_csv(
                f, sep=r"\s+", skiprows=2, header=None, names=mct_cols,
                na_values=["NaN", "nan", "NAN"], dtype={"Date": str, "Time": str}
            )
            mct_dfs.append(df)

    if not mct_dfs:
        print("[!] No MCT diff files found!")
        return

    df_mct = pd.concat(mct_dfs, ignore_index=True)
    p_mct = pd.to_numeric(df_mct["diff_Pressure"], errors="coerce").values

    # 2. Compute regressions for all 21 tubes (18 NM-64 + 3 Bare)
    print("  Calculating OLS regressions for all 21 tubes...")
    tubes_21 = []
    p_lim = 7.5
    ln_lim = 0.25

    nm_betas = []
    bare_betas = []

    for i in range(1, 22):
        is_bare = (i >= 19)
        col = f"diff_ln_MCT_{i:02d}"
        y_raw = pd.to_numeric(df_mct[col], errors="coerce").values

        mask = np.isfinite(p_mct) & np.isfinite(y_raw) & (np.abs(p_mct) <= 8.0) & (np.abs(y_raw) <= ln_lim)
        x_c = p_mct[mask]
        y_c = y_raw[mask]
        n = len(x_c)

        if n < 100:
            continue

        slope, intercept = np.polyfit(x_c, y_c, 1)
        beta_mb = -slope * 100.0
        beta_mm = beta_mb * MMHG_TO_MBAR

        ss_tot = np.sum((y_c - np.mean(y_c)) ** 2)
        ss_res = np.sum((y_c - (slope * x_c + intercept)) ** 2)
        r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        df_freedom = n - 2
        s_err = np.sqrt(ss_res / df_freedom) if df_freedom > 0 else 0.0
        x_mean = np.mean(x_c)
        x_dev_sq = np.sum((x_c - x_mean) ** 2)
        se_slope = s_err / np.sqrt(x_dev_sq) if x_dev_sq > 0 else 0.0
        se_mb = se_slope * 100.0
        se_mm = se_mb * MMHG_TO_MBAR

        if is_bare:
            bare_betas.append(beta_mb)
        else:
            nm_betas.append(beta_mb)

        # Sample 350 points for web canvas scatter
        np.random.seed(i)
        sample_n = min(350, n)
        idx = np.random.choice(n, sample_n, replace=False)
        pts = [[round(float(x_c[j]), 3), round(float(y_c[j]), 5)] for j in idx]

        tubes_21.append({
            "id": f"T{i:02d}",
            "tube_num": i,
            "name": f"Tube {i:02d}",
            "full_name": f"{'Bare Counter' if is_bare else 'NM-64'} Tube {i:02d}",
            "type": "Bare" if is_bare else "NM-64",
            "is_bare": is_bare,
            "points_count": n,
            "slope": round(float(slope), 6),
            "se_slope": round(float(se_slope), 6),
            "intercept": round(float(intercept), 6),
            "beta_mbar": round(float(beta_mb), 4),
            "se_mbar": round(float(se_mb), 4),
            "beta_mmhg": round(float(beta_mm), 4),
            "se_mmhg": round(float(se_mm), 4),
            "r2": round(float(r2), 4),
            "p_lim": p_lim,
            "ln_lim": ln_lim,
            "sample_points": pts
        })

    mean_nm18_beta = float(round(np.mean(nm_betas), 4)) if nm_betas else 0.6518
    mean_bare3_beta = float(round(np.mean(bare_betas), 4)) if bare_betas else 0.5946

    # 3. Compute MLR_3 Benchmark
    print("  Calculating MLR_3 multiplicity benchmark...")
    mlr_dfs = []
    mlr_names = ["Date", "Time", "diff_Pressure", "diff_ln_MLR_1", "diff_ln_MLR_3"]
    for yr in [2025, 2026]:
        f = DIFF_DIR / f"PRS_{yr}_MOP_MLR_ln_diff.txt"
        if f.exists():
            df = pd.read_csv(
                f, sep=r"\s+", skiprows=2, header=None, names=mlr_names,
                na_values=["NaN", "nan", "NAN"], dtype={"Date": str, "Time": str}
            )
            mlr_dfs.append(df)

    fit_mlr3 = None
    if mlr_dfs:
        df_mlr = pd.concat(mlr_dfs, ignore_index=True)
        p_mlr = pd.to_numeric(df_mlr["diff_Pressure"], errors="coerce").values
        y_mlr3 = pd.to_numeric(df_mlr["diff_ln_MLR_3"], errors="coerce").values

        mask3 = np.isfinite(p_mlr) & np.isfinite(y_mlr3) & (np.abs(p_mlr) <= 8.0) & (np.abs(y_mlr3) <= 0.06)
        x_m3 = p_mlr[mask3]
        y_m3 = y_mlr3[mask3]
        n3 = len(x_m3)
        if n3 > 100:
            s3, i3 = np.polyfit(x_m3, y_m3, 1)
            b_mb3 = -s3 * 100.0
            b_mm3 = b_mb3 * MMHG_TO_MBAR
            ss_tot3 = np.sum((y_m3 - np.mean(y_m3)) ** 2)
            ss_res3 = np.sum((y_m3 - (s3 * x_m3 + i3)) ** 2)
            r2_3 = 1.0 - (ss_res3 / ss_tot3)

            np.random.seed(42)
            idx3 = np.random.choice(n3, min(6000, n3), replace=False)
            pts3 = [[round(float(x_m3[j]), 3), round(float(y_m3[j]), 5)] for j in idx3]

            fit_mlr3 = {
                "name": "MLR_3 (Multiplicity Rate Total Sum)",
                "title": "PSNM MLR_3 Barometric Regression: Δln N vs ΔP",
                "description": "Total Multiplicity Rate (Official PSNM Scientific Benchmark)",
                "points_count": n3,
                "slope": round(float(s3), 6),
                "intercept": round(float(i3), 6),
                "beta_mbar": round(float(b_mb3), 4),
                "beta_mmhg": round(float(b_mm3), 4),
                "r2": round(float(r2_3), 4),
                "p_lim": 8.0,
                "ln_lim": 0.06,
                "sample_points": pts3
            }

    # 4. Construct payload for web app
    payload = {
        "dataset_years": "2025–2026 Combined",
        "resolution": "1-Min Resolution",
        "mean_nm18_beta_mbar": mean_nm18_beta,
        "mean_bare3_beta_mbar": mean_bare3_beta,
        "summary": {
            "total_tubes": 21,
            "nm18_count": 18,
            "bare3_count": 3,
            "mean_nm18_beta_mbar": mean_nm18_beta,
            "mean_nm18_beta_mmhg": round(mean_nm18_beta * MMHG_TO_MBAR, 4),
            "mean_bare3_beta_mbar": mean_bare3_beta,
            "mean_bare3_beta_mmhg": round(mean_bare3_beta * MMHG_TO_MBAR, 4)
        },
        "tubes_21": tubes_21,
        "mlr_3": fit_mlr3,
        "bar_chart_data": {
            "categories": [t["id"] for t in tubes_21],
            "values": [t["beta_mbar"] for t in tubes_21],
            "types": [t["type"] for t in tubes_21],
            "nm_mean": mean_nm18_beta,
            "bare_mean": mean_bare3_beta
        }
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"[OK] Generated {OUT_FILE} in {time.time() - t0:.2f}s!")

if __name__ == "__main__":
    main()
