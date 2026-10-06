import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List

# Cache dictionary in memory so calculations only happen once
_CACHE: Dict[int, Dict[str, Any]] = {}

def get_data_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "data", "cosmic")

def load_and_process_gle77(window_minutes: int = 10) -> Dict[str, Any]:
    """
    Loads GLE77_OtherStations_with_DateTime.txt and GLE77_Thimon_with_DateTime.txt,
    computes time-binned averages for the given window (10, 20, 30 min),
    and returns a compact payload for time-series playback.
    """
    if window_minutes in _CACHE:
        return _CACHE[window_minutes]

    data_dir = get_data_dir()
    other_file = os.path.join(data_dir, "GLE77_OtherStations_with_DateTime.txt")
    thimon_file = os.path.join(data_dir, "GLE77_Thimon_with_DateTime.txt")

    if not os.path.exists(other_file):
        raise FileNotFoundError(f"File not found: {other_file}")

    # Read primary stations file
    df = pd.read_csv(other_file, sep='\t')
    df['DateTime'] = pd.to_datetime(df['DateTime'], format='%m/%d/%Y %H:%M:%S', errors='coerce')
    df = df.dropna(subset=['DateTime'])

    # Numeric conversion for station columns
    station_cols = [c for c in df.columns if c.startswith('inc_')]
    for col in station_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Filter isolated hardware glitch spikes (> 300% which only happens for 2 glitch rows in THUL)
    for col in station_cols:
        df.loc[df[col] > 300.0, col] = np.nan
        df[col] = df[col].interpolate(method='linear', limit_direction='both').fillna(0.0)

    # Merge Thimon if available
    if os.path.exists(thimon_file):
        try:
            df_th = pd.read_csv(thimon_file, sep='\t')
            df_th['DateTime'] = pd.to_datetime(df_th['DateTime'], format='%m/%d/%Y %H:%M:%S', errors='coerce')
            df_th = df_th.dropna(subset=['DateTime'])
            if 'inc_Thimon' in df_th.columns:
                df_th['inc_HLKL'] = pd.to_numeric(df_th['inc_Thimon'], errors='coerce')
                df = pd.merge(df, df_th[['DateTime', 'inc_HLKL']], on='DateTime', how='left')
                station_cols.append('inc_HLKL')
                df['inc_HLKL'] = df['inc_HLKL'].interpolate(method='linear', limit_direction='both').fillna(0.0)
        except Exception as e:
            print(f"Warning loading Thimon: {e}")

    # Station IDs (remove 'inc_' prefix)
    station_ids = [c.replace('inc_', '') for c in station_cols]

    # Resample / bin by window_minutes
    rule = f"{window_minutes}min"
    df_resampled = df.resample(rule, on='DateTime')[station_cols].mean().reset_index()

    # Fill any remaining NaNs
    df_resampled[station_cols] = df_resampled[station_cols].interpolate(method='linear', limit_direction='both').fillna(0.0)

    # Format timestamps
    timestamps = df_resampled['DateTime'].dt.strftime('%Y-%m-%d %H:%M').tolist()

    # Matrix data rounded to 1 decimal
    data_matrix: List[List[float]] = []
    for _, row in df_resampled.iterrows():
        frame_vals = [round(float(row[col]), 1) for col in station_cols]
        data_matrix.append(frame_vals)

    # Find global peak stats
    max_val = -999.0
    peak_station = ""
    peak_time = ""
    peak_frame = 0

    for idx, row in df_resampled.iterrows():
        for s_idx, col in enumerate(station_cols):
            v = float(row[col])
            if v > max_val:
                max_val = v
                peak_station = station_ids[s_idx]
                peak_time = timestamps[idx]
                peak_frame = idx

    payload = {
        "window": window_minutes,
        "stations": station_ids,
        "timestamps": timestamps,
        "data": data_matrix,
        "stats": {
            "totalFrames": len(timestamps),
            "startTime": timestamps[0] if timestamps else "",
            "endTime": timestamps[-1] if timestamps else "",
            "peakTime": peak_time,
            "peakStation": peak_station,
            "peakValue": round(max_val, 1),
            "peakFrame": peak_frame
        }
    }

    _CACHE[window_minutes] = payload
    return payload
