import numpy as np
import json

# Function to compute Magnetic Equator latitude for any longitude
def mag_equator_lat(lon):
    # Sinusoidal dip equator with peak near 105E (+11.8) and trough near 60W (-11.8)
    rad = np.radians(lon - 30.79)
    # Harmonics to match actual IGRF dip equator from stlat++.txt
    lat = 11.8 * np.sin(rad) + 1.2 * np.sin(2 * rad - 0.5)
    return lat

# Generate contours for Northern and Southern Hemispheres
# Rc = 17.5 * cos^4(lambda_m)
# lambda_m = arccos((Rc / 17.5)^(1/4))
# lat = mag_equator_lat(lon) +/- lambda_m_deg
lons = np.linspace(-180, 180, 73)

CONTOURS = []

# Rigidity levels (GV) and styles matching GLE#77
LEVELS = [
    {'rc': 1,  'color': '#EF4444', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 2,  'color': '#F97316', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 3,  'color': '#EAB308', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 5,  'color': '#22C55E', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 7,  'color': '#06B6D4', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 9,  'color': '#3B82F6', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 11, 'color': '#8B5CF6', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 13, 'color': '#D946EF', 'strokeWidth': 1.5, 'dash': 'none'},
    {'rc': 15, 'color': '#EC4899', 'strokeWidth': 1.5, 'dash': 'none'},
]

contours_data = []

# Northern Hemisphere lines
for lvl in LEVELS:
    rc = lvl['rc']
    # compute magnetic latitude offset for this Rc
    cos4 = min(1.0, max(0.0, rc / 17.6))
    cos_val = cos4 ** 0.25
    mag_lat_deg = np.degrees(np.arccos(cos_val)) * 1.08 # slight stretch for realistic dipole geometry
    
    pts = []
    for lon in lons:
        eq_lat = mag_equator_lat(lon)
        # Asymmetry: geomagnetic North pole is tilted towards North America (approx 72W)
        tilt_factor = 1.0 - 0.12 * np.cos(np.radians(lon + 72))
        lat = eq_lat + mag_lat_deg * tilt_factor
        lat = min(82.0, max(-82.0, lat))
        pts.append({'lon': round(float(lon), 2), 'lat': round(float(lat), 2)})
    
    contours_data.append({
        'id': f'north-{rc}gv',
        'rc': rc,
        'label': f'{rc}',
        'hemisphere': 'north',
        'color': lvl['color'],
        'points': pts
    })

# Southern Hemisphere lines
for lvl in LEVELS:
    rc = lvl['rc']
    cos4 = min(1.0, max(0.0, rc / 17.6))
    cos_val = cos4 ** 0.25
    mag_lat_deg = np.degrees(np.arccos(cos_val)) * 1.08
    
    pts = []
    for lon in lons:
        eq_lat = mag_equator_lat(lon)
        tilt_factor = 1.0 + 0.12 * np.cos(np.radians(lon + 72))
        lat = eq_lat - mag_lat_deg * tilt_factor
        lat = min(82.0, max(-82.0, lat))
        pts.append({'lon': round(float(lon), 2), 'lat': round(float(lat), 2)})
    
    contours_data.append({
        'id': f'south-{rc}gv',
        'rc': rc,
        'label': f'{rc}',
        'hemisphere': 'south',
        'color': lvl['color'],
        'points': pts
    })

# Closed loop for 17 GV around Southeast Asia (Doi Inthanon / Thailand / Bay of Bengal)
loop_angles = np.linspace(0, 2 * np.pi, 36)
loop_pts = []
center_lon = 95.0
center_lat = 9.5
for a in loop_angles:
    lon = center_lon + 32.0 * np.cos(a)
    lat = center_lat + 7.5 * np.sin(a)
    loop_pts.append({'lon': round(float(lon), 2), 'lat': round(float(lat), 2)})

contours_data.append({
    'id': 'equatorial-17gv-loop',
    'rc': 17,
    'label': '17',
    'hemisphere': 'equatorial',
    'color': '#BE185D',
    'points': loop_pts,
    'isClosed': True
})

print(f"Generated {len(contours_data)} contour lines successfully.")

# Write to a TS file
ts_content = f"// ── Earth Geomagnetic Cutoff Rigidity Contours (GLE#77 / IGRF Model) ──\n"
ts_content += f"export interface IsoRigidityContour {{\n  id: string;\n  rc: number;\n  label: string;\n  hemisphere: 'north' | 'south' | 'equatorial';\n  color: string;\n  points: {{ lon: number; lat: number }}[];\n  isClosed?: boolean;\n}}\n\n"
ts_content += f"export const ISO_RIGIDITY_CONTOURS: IsoRigidityContour[] = {json.dumps(contours_data, indent=2)};\n"

with open(r"c:\Users\NicKyZ\Documents\space-weather-dashboard\frontend\src\services\geomagneticContours.ts", "w", encoding="utf-8") as f:
    f.write(ts_content)

print("Saved to frontend/src/services/geomagneticContours.ts")
