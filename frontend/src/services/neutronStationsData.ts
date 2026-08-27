export interface NeutronStation {
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  lat: number;          // Geographic Latitude (-90 to +90) from stlat++.txt
  lon: number;          // Geographic Longitude (-180 to +180) from stlat++.txt
  altitude: number;     // Meters above sea level
  cutoffRigidity: number; // Vertical Cutoff Rigidity Rc in GV
  detectorType: string; // e.g. "18-NM-64", "6-NM-64", "Mini-NM"
  status: 'active' | 'offline'; // 'active' = broadcasting real data to NMDB; 'offline' = no live feed
  institute?: string;
  description?: string;
  rawName?: string;
}

// ── Global Neutron Monitor Stations (Coordinates from stlat++.txt) ──
// Stations with real live streaming telemetry in NMDB are marked as 'active'
// Stations currently offline or not broadcasting are marked as 'offline'
export const NEUTRON_STATIONS: NeutronStation[] = [
  {
    id: 'AATB',
    name: 'Alma-Ata (Almaty)',
    country: 'Kazakhstan',
    lat: 43.25,
    lon: 76.92,
    altitude: 3340,
    cutoffRigidity: 6.69,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'ALma'
  },
  {
    id: 'APTY',
    name: 'Apatity',
    country: 'Russia',
    lat: 67.55,
    lon: 33.33,
    altitude: 181,
    cutoffRigidity: 0.65,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Apatity'
  },
  {
    id: 'ATHN',
    name: 'Athens',
    country: 'Greece',
    lat: 37.97,
    lon: 23.72,
    altitude: 260,
    cutoffRigidity: 8.53,
    detectorType: '6-NM-64',
    status: 'active',
    rawName: 'Athens'
  },
  {
    id: 'BRBG',
    name: 'Barentsburg (Svalbard)',
    country: 'Norway / Svalbard',
    lat: 80.05,
    lon: 18.25,
    altitude: 50,
    cutoffRigidity: 0.05,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Barentsburg'
  },
  {
    id: 'CALG',
    name: 'Calgary',
    country: 'Canada',
    lat: 51.08,
    lon: -114.13,
    altitude: 1128,
    cutoffRigidity: 1.09,
    detectorType: 'NM-64',
    status: 'active',
    rawName: 'Calgary'
  },
  {
    id: 'CAPS',
    name: 'Cape Schmidt',
    country: 'Russia',
    lat: 68.92,
    lon: -179.47,
    altitude: 10,
    cutoffRigidity: 0.60,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'CapeSchmidt'
  },
  {
    id: 'CHAC',
    name: 'Chacaltaya',
    country: 'Bolivia',
    lat: -16.32,
    lon: -68.15,
    altitude: 5240,
    cutoffRigidity: 12.53,
    detectorType: '12-NM-64',
    status: 'offline',
    rawName: 'Chacaltaya'
  },
  {
    id: 'LDVL',
    name: 'Leadville (Climax)',
    country: 'USA',
    lat: 39.67,
    lon: -104.97,
    altitude: 3400,
    cutoffRigidity: 2.99,
    detectorType: '12-NM-64',
    status: 'offline',
    rawName: 'Leadvile'
  },
  {
    id: 'DRBS',
    name: 'Dourbes',
    country: 'Belgium',
    lat: 50.10,
    lon: 4.60,
    altitude: 225,
    cutoffRigidity: 3.18,
    detectorType: '9-NM-64',
    status: 'active',
    rawName: 'Dourbes'
  },
  {
    id: 'EREV',
    name: 'Erevan',
    country: 'Armenia',
    lat: 40.16,
    lon: 44.25,
    altitude: 2000,
    cutoffRigidity: 7.60,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'Erevan'
  },
  {
    id: 'FSMT',
    name: 'Fort Smith',
    country: 'Canada',
    lat: 60.00,
    lon: -112.00,
    altitude: 202,
    cutoffRigidity: 0.30,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'FortSmith'
  },
  {
    id: 'HERM',
    name: 'Hermanus',
    country: 'South Africa',
    lat: -34.42,
    lon: 19.22,
    altitude: 26,
    cutoffRigidity: 4.58,
    detectorType: '12-NM-64',
    status: 'offline',
    rawName: 'Hermanus'
  },
  {
    id: 'INVK',
    name: 'Inuvik',
    country: 'Canada',
    lat: 68.35,
    lon: -133.72,
    altitude: 21,
    cutoffRigidity: 0.18,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Inuvik'
  },
  {
    id: 'IRKT',
    name: 'Irkutsk',
    country: 'Russia',
    lat: 52.47,
    lon: 104.03,
    altitude: 435,
    cutoffRigidity: 3.64,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Irkutsk'
  },
  {
    id: 'JUNG',
    name: 'Jungfraujoch',
    country: 'Switzerland',
    lat: 46.50,
    lon: 8.00,
    altitude: 3470,
    cutoffRigidity: 4.49,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Jungfraujoch'
  },
  {
    id: 'KERG',
    name: 'Kerguelen',
    country: 'France (Antarctica)',
    lat: -49.35,
    lon: 70.22,
    altitude: 33,
    cutoffRigidity: 1.14,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Kerguelen'
  },
  {
    id: 'KIEL2',
    name: 'Kiel',
    country: 'Germany',
    lat: 54.30,
    lon: 10.10,
    altitude: 54,
    cutoffRigidity: 2.36,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Kiel'
  },
  {
    id: 'KIEV',
    name: 'Kiev',
    country: 'Ukraine',
    lat: 50.72,
    lon: 30.30,
    altitude: 160,
    cutoffRigidity: 3.62,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'Kiev'
  },
  {
    id: 'KGN2',
    name: 'King George (Eduardo Frei)',
    country: 'Chile (Antarctica)',
    lat: -62.00,
    lon: -58.22,
    altitude: 40,
    cutoffRigidity: 2.10,
    detectorType: 'Mini-NM',
    status: 'offline',
    rawName: 'KingGeorge'
  },
  {
    id: 'MGDN',
    name: 'Magadan',
    country: 'Russia',
    lat: 60.11,
    lon: 151.01,
    altitude: 220,
    cutoffRigidity: 2.09,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'Magadan'
  },
  {
    id: 'MWSN',
    name: 'Mawson',
    country: 'Australia (Antarctica)',
    lat: -67.60,
    lon: 62.88,
    altitude: 30,
    cutoffRigidity: 0.22,
    detectorType: '6-NM-64',
    status: 'offline',
    rawName: 'Mawson'
  },
  {
    id: 'MXCO',
    name: 'Mexico City',
    country: 'Mexico',
    lat: 19.33,
    lon: -99.18,
    altitude: 2274,
    cutoffRigidity: 8.28,
    detectorType: '6-NM-64',
    status: 'active',
    rawName: 'Maxico'
  },
  {
    id: 'MOSC',
    name: 'Moscow',
    country: 'Russia',
    lat: 55.47,
    lon: 37.32,
    altitude: 200,
    cutoffRigidity: 2.43,
    detectorType: '24-NM-64',
    status: 'active',
    rawName: 'Moscow'
  },
  {
    id: 'MTHM',
    name: 'Mount Hermon',
    country: 'Israel',
    lat: 33.43,
    lon: 35.85,
    altitude: 2020,
    cutoffRigidity: 10.75,
    detectorType: '6-NM-64',
    status: 'offline',
    rawName: 'MtHermon'
  },
  {
    id: 'NAIN',
    name: 'Nain',
    country: 'Canada',
    lat: 56.60,
    lon: -61.70,
    altitude: 46,
    cutoffRigidity: 0.30,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Nian'
  },
  {
    id: 'NEWK',
    name: 'Newark',
    country: 'USA',
    lat: 39.70,
    lon: -75.70,
    altitude: 50,
    cutoffRigidity: 2.40,
    detectorType: '9-NM-64',
    status: 'active',
    rawName: 'Newark'
  },
  {
    id: 'NRLK',
    name: 'Norilsk',
    country: 'Russia',
    lat: 69.26,
    lon: 88.05,
    altitude: 50,
    cutoffRigidity: 0.63,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'Norilsk'
  },
  {
    id: 'NVBK',
    name: 'Novosibirsk',
    country: 'Russia',
    lat: 54.80,
    lon: 83.00,
    altitude: 163,
    cutoffRigidity: 2.91,
    detectorType: '24-NM-64',
    status: 'offline',
    rawName: 'Novosibirsk'
  },
  {
    id: 'OULU',
    name: 'Oulu',
    country: 'Finland',
    lat: 65.02,
    lon: 25.50,
    altitude: 15,
    cutoffRigidity: 0.81,
    detectorType: '9-NM-64',
    status: 'active',
    rawName: 'Oulu'
  },
  {
    id: 'PWNK',
    name: 'Peawanuck',
    country: 'Canada',
    lat: 55.00,
    lon: -85.40,
    altitude: 52,
    cutoffRigidity: 0.30,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'Peawanuck'
  },
  {
    id: 'POTC',
    name: 'Potchefstroom',
    country: 'South Africa',
    lat: -26.70,
    lon: 27.10,
    altitude: 1351,
    cutoffRigidity: 6.98,
    detectorType: '6-NM-64',
    status: 'offline',
    rawName: 'Potchefstroom'
  },
  {
    id: 'ROME',
    name: 'Rome (SVIRCO)',
    country: 'Italy',
    lat: 41.90,
    lon: 12.52,
    altitude: 60,
    cutoffRigidity: 6.27,
    detectorType: '17-NM-64',
    status: 'active',
    rawName: 'Rome'
  },
  {
    id: 'SNAE',
    name: 'SANAE IV',
    country: 'South Africa (Antarctica)',
    lat: -70.30,
    lon: -2.35,
    altitude: 856,
    cutoffRigidity: 0.73,
    detectorType: '6-NM-64',
    status: 'offline',
    rawName: 'Sanae'
  },
  {
    id: 'SOPO',
    name: 'South Pole',
    country: 'USA (Antarctica)',
    lat: -90.00,
    lon: 0.00,
    altitude: 2820,
    cutoffRigidity: 0.00,
    detectorType: '3-NM-64',
    status: 'active',
    rawName: 'SouthPole'
  },
  {
    id: 'TBLS',
    name: 'Tbilisi',
    country: 'Georgia',
    lat: 41.72,
    lon: 44.73,
    altitude: 510,
    cutoffRigidity: 6.91,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'Tbilisi'
  },
  {
    id: 'TERA',
    name: 'Terre Adélie',
    country: 'France (Antarctica)',
    lat: -66.67,
    lon: 140.02,
    altitude: 45,
    cutoffRigidity: 0.01,
    detectorType: '9-NM-64',
    status: 'active',
    rawName: 'TerreAdelie'
  },
  {
    id: 'THUL',
    name: 'Thule',
    country: 'Greenland',
    lat: 76.58,
    lon: -68.42,
    altitude: 260,
    cutoffRigidity: 0.00,
    detectorType: '6-NM-64',
    status: 'active',
    rawName: 'Thule'
  },
  {
    id: 'TXBY',
    name: 'Tixie Bay',
    country: 'Russia',
    lat: 71.58,
    lon: 129.00,
    altitude: 10,
    cutoffRigidity: 0.53,
    detectorType: '18-NM-64',
    status: 'active',
    rawName: 'TixieBay'
  },
  {
    id: 'TSMB',
    name: 'Tsumeb',
    country: 'Namibia',
    lat: -19.20,
    lon: 17.58,
    altitude: 1240,
    cutoffRigidity: 9.15,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'Tsumeb'
  },
  {
    id: 'TURK',
    name: 'Turku',
    country: 'Finland',
    lat: 60.40,
    lon: 22.60,
    altitude: 50,
    cutoffRigidity: 1.41,
    detectorType: 'Mini-NM',
    status: 'offline',
    rawName: 'Turku'
  },
  {
    id: 'YKTK',
    name: 'Yakutsk',
    country: 'Russia',
    lat: 62.02,
    lon: 129.72,
    altitude: 105,
    cutoffRigidity: 1.65,
    detectorType: '24-NM-64',
    status: 'active',
    rawName: 'Yakutsk'
  },
  {
    id: 'TIBT',
    name: 'Tibet (Yangbajing)',
    country: 'China',
    lat: 30.11,
    lon: 90.53,
    altitude: 4300,
    cutoffRigidity: 14.10,
    detectorType: '28-NM-64',
    status: 'offline',
    rawName: 'Tibet'
  },
  {
    id: 'PSNM',
    name: 'Doi Inthanon (PSNM)',
    country: 'Thailand',
    lat: 18.60,
    lon: 98.50,
    altitude: 2565,
    cutoffRigidity: 16.80,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'DoiInthanon'
  },
  {
    id: 'JBGO',
    name: 'Jang Bogo',
    country: 'South Korea (Antarctica)',
    lat: -74.60,
    lon: 164.20,
    altitude: 29,
    cutoffRigidity: 0.00,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'JangBogo'
  },
  {
    id: 'JUAN',
    name: 'Juan Carlos I',
    country: 'Spain (Antarctica)',
    lat: -62.66,
    lon: -60.39,
    altitude: 12,
    cutoffRigidity: 2.15,
    detectorType: 'Mini-NM',
    status: 'offline',
    rawName: 'JuanCarlos'
  },
  {
    id: 'HLKL',
    name: 'Haleakala',
    country: 'USA (Hawaii)',
    lat: 20.72,
    lon: -156.28,
    altitude: 3030,
    cutoffRigidity: 13.30,
    detectorType: '18-NM-64',
    status: 'offline',
    rawName: 'Haleakala'
  }
];

// Helper to get color code based on Cutoff Rigidity Rc and Online/Offline status
export function getRigidityColor(rc: number, isOnline: boolean = true): string {
  if (!isOnline) return '#64748B'; // Muted Slate Grey for Offline / Inactive stations
  if (rc < 1.0) return '#EF4444'; // Red (Polar, ~0-1 GV)
  if (rc < 3.0) return '#F97316'; // Orange (1-3 GV)
  if (rc < 5.0) return '#EAB308'; // Yellow (3-5 GV)
  if (rc < 8.0) return '#22C55E'; // Green (5-8 GV)
  if (rc < 12.0) return '#06B6D4'; // Cyan (8-12 GV)
  if (rc < 15.0) return '#3B82F6'; // Blue (12-15 GV)
  return '#A855F7'; // Purple / Magenta (High Equatorial > 15 GV, e.g. Doi Inthanon)
}

// Helper to get descriptive shielding level
export function getShieldingDescription(rc: number): { level: string; desc: string } {
  if (rc < 1.0) {
    return { level: 'Minimal (Polar Funnel)', desc: 'Directly exposed to solar cosmic rays and low-energy particles.' };
  }
  if (rc < 4.0) {
    return { level: 'Low (Sub-polar)', desc: 'Sensitive to solar proton events and coronal mass ejection shocks.' };
  }
  if (rc < 9.0) {
    return { level: 'Moderate (Mid-latitude)', desc: 'Geomagnetically filtered; detects relativistic galactic cosmic rays.' };
  }
  if (rc < 14.0) {
    return { level: 'High (Sub-tropical)', desc: 'Strong geomagnetic deflection; only high-energy cosmic rays penetrate.' };
  }
  return { level: 'Maximum Shielding (Equatorial Barrier)', desc: 'Maximum Earth magnetic field deflection; requires > 15 GeV particles to penetrate.' };
}

// ── Magnetic Equator (Dip Equator) Coordinates directly from stlat++.txt ──
export const MAGNETIC_EQUATOR_POINTS: { lon: number; lat: number }[] = [
  { lon: -180.0, lat: 6.0 },
  { lon: -168.79, lat: 4.01 },
  { lon: -159.0, lat: 2.04 },
  { lon: -149.21, lat: 0.0 },
  { lon: -139.39, lat: -2.04 },
  { lon: -129.53, lat: -4.01 },
  { lon: -119.60, lat: -5.87 },
  { lon: -109.60, lat: -7.55 },
  { lon: -99.53, lat: -9.01 },
  { lon: -89.40, lat: -10.2 },
  { lon: -79.21, lat: -11.08 },
  { lon: -69.0, lat: -11.62 },
  { lon: -58.79, lat: -11.8 },
  { lon: -48.60, lat: -11.62 },
  { lon: -38.47, lat: -11.08 },
  { lon: -28.40, lat: -10.2 },
  { lon: -18.40, lat: -9.01 },
  { lon: -8.47, lat: -7.55 },
  { lon: -0.01, lat: -5.87 },
  { lon: 0.0, lat: -6.0 },
  { lon: 1.39, lat: -6.0 },
  { lon: 11.21, lat: -4.01 },
  { lon: 21.0, lat: -2.04 },
  { lon: 30.79, lat: 0.0 },
  { lon: 40.61, lat: 2.04 },
  { lon: 50.47, lat: 4.01 },
  { lon: 60.40, lat: 5.87 },
  { lon: 70.40, lat: 7.55 },
  { lon: 80.47, lat: 9.01 },
  { lon: 90.60, lat: 10.2 },
  { lon: 100.79, lat: 11.08 },
  { lon: 111.0, lat: 11.62 },
  { lon: 121.21, lat: 11.8 },
  { lon: 131.40, lat: 11.62 },
  { lon: 141.53, lat: 11.08 },
  { lon: 151.60, lat: 10.2 },
  { lon: 161.60, lat: 9.01 },
  { lon: 171.53, lat: 7.55 },
  { lon: 180.0, lat: 5.87 }
];
