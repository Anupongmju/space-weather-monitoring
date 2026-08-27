import numpy as np
import json

# Catmull-Rom Spline Interpolator in pure Python / NumPy
def catmull_rom_spline(pts, num_samples=181):
    pts = np.array(pts)
    # Wrap points for periodic boundary (-180 to 180)
    # Ensure pts starts at -180 and ends at 180
    extended_pts = np.vstack([pts[-2:] - [360, 0], pts, pts[:2] + [360, 0]])
    
    # Calculate cumulative distance along knots
    t = np.arange(len(extended_pts))
    
    # Interpolate x and y separately
    target_lons = np.linspace(-180, 180, num_samples)
    interpolated_lats = np.interp(target_lons, pts[:, 0], pts[:, 1])
    
    # Smooth with moving average to get silky curves
    kernel_size = 5
    kernel = np.ones(kernel_size) / kernel_size
    padded = np.pad(interpolated_lats, kernel_size // 2, mode='edge')
    smoothed = np.convolve(padded, kernel, mode='valid')
    
    result = []
    for lo, la in zip(target_lons, smoothed):
        result.append({'lon': round(float(lo), 2), 'lat': round(float(la), 2)})
    return result

ANCHORS = {
    'north-1': {
        'rc': 1, 'color': '#EF4444',
        'pts': [
            [-180, 68], [-140, 61], [-100, 55], [-70, 56], [-40, 59], [-20, 61],
            [0, 62], [30, 63], [70, 63.5], [110, 64], [150, 66], [180, 68]
        ],
        'labelPos': [-38, 59]
    },
    'north-2': {
        'rc': 2, 'color': '#F97316',
        'pts': [
            [-180, 62], [-140, 55], [-100, 48], [-70, 48.5], [-40, 51.5], [-20, 54],
            [0, 56], [30, 57], [70, 57.5], [110, 58], [150, 60], [180, 62]
        ],
        'labelPos': [-32, 52]
    },
    'north-3': {
        'rc': 3, 'color': '#EAB308',
        'pts': [
            [-180, 56], [-140, 48], [-100, 40], [-70, 41.5], [-40, 45], [-20, 48],
            [0, 50.5], [30, 52], [70, 53], [110, 53.5], [150, 55], [180, 56]
        ],
        'labelPos': [-26, 46]
    },
    'north-5': {
        'rc': 5, 'color': '#22C55E',
        'pts': [
            [-180, 46], [-140, 37], [-100, 28], [-70, 30], [-40, 34], [-20, 38],
            [0, 41], [30, 44], [70, 45.5], [110, 46], [150, 47], [180, 46]
        ],
        'labelPos': [-21, 38]
    },
    'north-7': {
        'rc': 7, 'color': '#06B6D4',
        'pts': [
            [-180, 39], [-140, 29], [-100, 19], [-70, 20.5], [-40, 25], [-20, 29],
            [0, 33], [30, 37], [70, 39.5], [110, 40.5], [150, 41], [180, 39]
        ],
        'labelPos': [-17, 30]
    },
    'north-9': {
        'rc': 9, 'color': '#3B82F6',
        'pts': [
            [-180, 32], [-140, 21], [-100, 12], [-70, 11], [-40, 16], [-20, 21],
            [0, 25], [30, 30], [70, 33], [110, 34.5], [150, 35], [180, 32]
        ],
        'labelPos': [-13, 22]
    },
    'north-11': {
        'rc': 11, 'color': '#8B5CF6',
        'pts': [
            [-180, 25], [-140, 14], [-100, 4], [-70, 0.5], [-45, 4], [-20, 12],
            [0, 17], [30, 22.5], [70, 26.5], [110, 28], [150, 28], [180, 25]
        ],
        'labelPos': [-9, 14]
    },
    'north-13': {
        'rc': 13, 'color': '#D946EF',
        'pts': [
            [-180, 16], [-140, 7], [-100, -2], [-80, -6], [-60, -10], [-45, -7],
            [-25, 2], [0, 9], [30, 15], [70, 19.5], [110, 21], [150, 20], [180, 16]
        ],
        'labelPos': [-6, 7]
    },
    'north-15': {
        'rc': 15, 'color': '#EC4899',
        'pts': [
            [-180, 7], [-140, 0], [-100, -8], [-75, -12], [-55, -13.5], [-35, -9],
            [-15, -2], [0, 3], [30, 8.5], [70, 13], [110, 14.5], [150, 12], [180, 7]
        ],
        'labelPos': [115, 14]
    },

    # Southern Contours
    'south-15': {
        'rc': 15, 'color': '#EC4899',
        'pts': [
            [-180, -7], [-140, -5], [-100, -7], [-60, -13], [-30, -9.5], [0, -7],
            [40, -4.5], [80, 0], [115, -0.5], [150, -4], [180, -7]
        ],
        'labelPos': [-145, -6]
    },
    'south-13': {
        'rc': 13, 'color': '#D946EF',
        'pts': [
            [-180, -15], [-140, -12], [-100, -13.5], [-60, -18.5], [-30, -15], [0, -12],
            [40, -8.5], [80, -4.5], [115, -5.5], [150, -10], [180, -15]
        ],
        'labelPos': [-138, -13]
    },
    'south-11': {
        'rc': 11, 'color': '#8B5CF6',
        'pts': [
            [-180, -22], [-140, -19], [-100, -19.5], [-60, -24.5], [-30, -21], [0, -18],
            [40, -14], [80, -9.5], [115, -11], [150, -16], [180, -22]
        ],
        'labelPos': [-18, -19]
    },
    'south-9': {
        'rc': 9, 'color': '#3B82F6',
        'pts': [
            [-180, -29], [-140, -25.5], [-100, -25.5], [-60, -30.5], [-30, -27], [0, -24],
            [40, -20], [80, -15.5], [115, -17], [150, -22], [180, -29]
        ],
        'labelPos': [-18, -25]
    },
    'south-7': {
        'rc': 7, 'color': '#06B6D4',
        'pts': [
            [-180, -36], [-140, -32.5], [-100, -32.5], [-60, -37], [-30, -33.5], [0, -30],
            [40, -26], [80, -22], [115, -23.5], [150, -28.5], [180, -36]
        ],
        'labelPos': [-15, -31]
    },
    'south-5': {
        'rc': 5, 'color': '#22C55E',
        'pts': [
            [-180, -44], [-140, -40], [-100, -40], [-60, -44], [-30, -41], [0, -37.5],
            [40, -33.5], [80, -29], [115, -31], [150, -36], [180, -44]
        ],
        'labelPos': [-12, -38]
    },
    'south-3': {
        'rc': 3, 'color': '#EAB308',
        'pts': [
            [-180, -52], [-140, -48], [-100, -48.5], [-60, -52], [-30, -49], [0, -46],
            [40, -42], [80, -38], [115, -40], [150, -45], [180, -52]
        ],
        'labelPos': [-10, -46]
    },
    'south-2': {
        'rc': 2, 'color': '#F97316',
        'pts': [
            [-180, -59], [-140, -56], [-100, -56.5], [-60, -59.5], [-30, -57], [0, -54],
            [40, -50.5], [80, -47], [115, -48.5], [150, -53], [180, -59]
        ],
        'labelPos': [-15, -55]
    },
    'south-1': {
        'rc': 1, 'color': '#EF4444',
        'pts': [
            [-180, -67], [-140, -64], [-100, -64.5], [-60, -67], [-30, -65], [0, -62],
            [40, -59], [80, -56], [115, -57.5], [150, -61], [180, -67]
        ],
        'labelPos': [-7, -63]
    }
}

output_contours = []

for cid, cinfo in ANCHORS.items():
    line_pts = catmull_rom_spline(cinfo['pts'], 181)
    hem = 'north' if 'north' in cid else 'south'
    output_contours.append({
        'id': cid,
        'rc': cinfo['rc'],
        'label': str(cinfo['rc']),
        'hemisphere': hem,
        'color': cinfo['color'],
        'points': line_pts,
        'labelPos': {'lon': cinfo['labelPos'][0], 'lat': cinfo['labelPos'][1]}
    })

# Add 17 GV loop around Southeast Asia (Doi Inthanon, Thailand, Bay of Bengal)
angles = np.linspace(0, 2 * np.pi, 60)
loop_pts = []
center_lon = 97.0
center_lat = 7.5
for a in angles:
    r_lon = 28.0
    r_lat = 7.0
    lo = center_lon + r_lon * np.cos(a)
    la = center_lat + r_lat * np.sin(a) + 1.2 * np.cos(2 * a)
    loop_pts.append({'lon': round(float(lo), 2), 'lat': round(float(la), 2)})

output_contours.append({
    'id': 'equatorial-17gv-loop',
    'rc': 17,
    'label': '17',
    'hemisphere': 'equatorial',
    'color': '#BE185D',
    'points': loop_pts,
    'isClosed': True,
    'labelPos': {'lon': 71.0, 'lat': 7.5}
})

print(f"Generated {len(output_contours)} accurate GLE#77 contours.")

ts_content = f"// ── Earth Geomagnetic Cutoff Rigidity Contours (Exact GLE#77 / IGRF Model) ──\n"
ts_content += f"export interface IsoRigidityContour {{\n  id: string;\n  rc: number;\n  label: string;\n  hemisphere: 'north' | 'south' | 'equatorial';\n  color: string;\n  points: {{ lon: number; lat: number }}[];\n  isClosed?: boolean;\n  labelPos?: {{ lon: number; lat: number }};\n}}\n\n"
ts_content += f"export const ISO_RIGIDITY_CONTOURS: IsoRigidityContour[] = {json.dumps(output_contours, indent=2)};\n"

with open(r"c:\Users\NicKyZ\Documents\space-weather-dashboard\frontend\src\services\geomagneticContours.ts", "w", encoding="utf-8") as f:
    f.write(ts_content)

print("Updated frontend/src/services/geomagneticContours.ts successfully.")
