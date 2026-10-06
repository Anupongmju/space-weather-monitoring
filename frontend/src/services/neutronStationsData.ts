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

// ══════════════════════════════════════════════════════════════════════════
// ── GLE#77 Event (10-11 May 2024) 30-Minute Peak Increase Dataset ──
// ══════════════════════════════════════════════════════════════════════════

export type GLEEnhancementTier = 'very_high' | 'moderate' | 'low' | 'none';

export interface GLE77StationData {
  increasePercent: number; // 30-min peak average relative increase (%)
  tier: GLEEnhancementTier;
  tierLabel: string;
  notes?: string;
}

export const GLE77_STATION_MAP: Record<string, GLE77StationData> = {
  // 🟡 Tier 1: Very High Increase (>= 65%) - Exact 30-min peak rolling mean from backend/data/cosmic
  NAIN:  { increasePercent: 138.5, tier: 'very_high', tierLabel: 'Very High (≥ 65%)', notes: 'Canadian polar funnel prompt response; peak +138.5% at 11/11 11:07 UTC' },
  MWSN:  { increasePercent: 126.7, tier: 'very_high', tierLabel: 'Very High (≥ 65%)', notes: 'East Antarctic coast viewing direction; peak +126.7% at 11/11 10:54 UTC' },
  SOPO:  { increasePercent: 102.0, tier: 'very_high', tierLabel: 'Very High (≥ 65%)', notes: 'South Pole polar horn detection; peak +102.0% at 11/11 12:36 UTC' },
  SNAE:  { increasePercent: 88.0,  tier: 'very_high', tierLabel: 'Very High (≥ 65%)', notes: 'SANAE IV Antarctic high sensitivity; peak ~+88.0%' },
  PWNK:  { increasePercent: 83.0,  tier: 'very_high', tierLabel: 'Very High (≥ 65%)', notes: 'Peawanuck sub-polar prompt detection; peak +83.0% at 11/11 12:31 UTC' },
  DOMB:  { increasePercent: 68.3,  tier: 'very_high', tierLabel: 'Very High (≥ 65%)', notes: 'Dome C (Concordia B) Antarctic station; peak +68.3% at 11/11 14:55 UTC' },

  // 🟠 Tier 2: Moderate Increase (30% - 65%)
  NEWK:  { increasePercent: 59.5, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Newark viewing cone aligned with IMF connection; peak +59.5% at 11/11 10:50 UTC' },
  CALG:  { increasePercent: 58.6, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Calgary mid-high latitude detection; peak +58.6% at 11/11 12:43 UTC' },
  OULU:  { increasePercent: 53.3, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Oulu European high-latitude monitor; peak +53.3% at 11/11 10:46 UTC' },
  DOMC:  { increasePercent: 52.9, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Dome C (Concordia C) Antarctic station; peak +52.9% at 11/11 14:46 UTC' },
  TXBY:  { increasePercent: 49.0, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Tixie Bay Siberian Arctic high-latitude response; peak ~+49.0%' },
  NRLK:  { increasePercent: 45.0, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Norilsk North Siberian monitor; peak ~+45.0%' },
  FSMT:  { increasePercent: 38.1, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Fort Smith sub-polar enhancement; peak +38.1% at 11/11 13:50 UTC' },
  YKTK:  { increasePercent: 36.5, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Yakutsk Eastern Siberian station; peak ~+36.5%' },
  JUAN:  { increasePercent: 35.0, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Juan Carlos I Antarctic Peninsula detection; peak ~+35.0%' },
  KERG:  { increasePercent: 30.4, tier: 'moderate', tierLabel: 'Moderate (30% - 65%)', notes: 'Kerguelen Southern Indian Ocean monitor; peak +30.4% at 11/11 13:36 UTC' },

  // 🔴 Tier 3: Low Increase (< 30%)
  INVK:  { increasePercent: 27.6, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Inuvik Arctic Canadian monitor; peak +27.6% at 11/11 12:35 UTC' },
  APTY:  { increasePercent: 27.3, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Apatity Kola Peninsula polar station; peak +27.3% at 11/11 10:47 UTC' },
  JBGO:  { increasePercent: 26.9, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Jang Bogo Korean Antarctic station; peak +26.9% at 11/11 14:19 UTC' },
  TERA:  { increasePercent: 25.5, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Terre Adelie Antarctic coast detection; peak +25.5% at 11/11 13:24 UTC' },
  THUL:  { increasePercent: 20.2, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Thule Greenland polar cap detection; peak +20.2% at 11/11 13:13 UTC' },
  NVBK:  { increasePercent: 18.0, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Novosibirsk Western Siberian mid-latitude detection' },
  KIEL2: { increasePercent: 17.7, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Kiel North German coastal monitor; peak +17.7% at 11/11 11:41 UTC' },
  MOSC:  { increasePercent: 16.0, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Moscow Russian plain mid-latitude monitor' },
  LDVL:  { increasePercent: 15.5, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Leadville Rocky Mountain high-altitude detection' },
  MGDN:  { increasePercent: 14.5, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Magadan Far East Russian station' },
  IRKT:  { increasePercent: 12.3, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Irkutsk Baikal region mid-latitude monitor; peak +12.3% at 11/11 11:36 UTC' },
  CAPS:  { increasePercent: 12.0, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Cape Schmidt Chukotka Arctic monitor' },
  KIEV:  { increasePercent: 11.8, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Kiev Eastern European detection' },
  LMKS:  { increasePercent: 10.6, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Lomnicky Stit High Tatra detector; peak +10.6% at 11/11 11:49 UTC' },
  DRBS:  { increasePercent: 10.3, tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Dourbes Belgian mid-latitude detection; peak +10.3% at 11/11 11:40 UTC' },
  JUNG1: { increasePercent: 7.2,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Jungfraujoch 1 Swiss Alps high-altitude station; peak +7.2% at 11/11 11:29 UTC' },
  JUNG:  { increasePercent: 6.7,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Jungfraujoch Swiss Alps high-altitude station; peak +6.7% at 11/11 11:10 UTC' },
  ATHN:  { increasePercent: 3.2,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Athens Mediterranean monitor; peak +3.2% at 11/15 22:37 UTC' },
  ICRB:  { increasePercent: 3.2,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Incline Cosmic Ray B monitor; peak +3.2%' },
  MXCO:  { increasePercent: 3.1,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Mexico City sub-tropical high-altitude detection; peak +3.1% at 11/11 10:41 UTC' },
  BKSN:  { increasePercent: 2.9,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Baksan Caucasus high-altitude detection; peak +2.9% at 11/11 11:06 UTC' },
  CALM:  { increasePercent: 2.5,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Castilla-La Mancha Iberian monitor; peak +2.5% at 11/11 04:23 UTC' },
  HLKL:  { increasePercent: 2.4,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Thimon (Haleakala) Pacific high-altitude station; peak +2.4% at 11/11 10:41 UTC' },
  ICRO:  { increasePercent: 1.7,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Incline Cosmic Ray O monitor; peak +1.7%' },
  ROME:  { increasePercent: 1.2,  tier: 'low', tierLabel: 'Low (< 30%)', notes: 'Rome Mediterranean mid-latitude detection; peak +1.2% at 11/11 22:04 UTC' },

  // ⚫ Tier 4: No Enhancement (0%) - Cutoff Rigidity Barrier Exceeded
  PSNM:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Doi Inthanon cutoff rigidity (~16.8 GV) barrier deflected all incoming solar particles' },
  TIBT:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Tibet rigidity barrier (~14.1 GV) prevented particle penetration' },
  CHAC:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Chacaltaya equatorial cutoff (~12.5 GV) shielded' },
  HERM:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Hermanus cutoff barrier (~4.58 GV) and unfavorable viewing angle' },
  TSMB:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Tsumeb tropical cutoff (~9.15 GV) shielded' },
  POTC:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Potchefstroom geomagnetic barrier (~6.98 GV)' },
  AATB:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Alma-Ata cutoff barrier (~6.69 GV) shielded' },
  MTHM:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Mt Hermon cutoff barrier (~10.4 GV) shielded' },
  TBLS:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Tbilisi cutoff barrier (~6.91 GV)' },
  EREV:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Erevan cutoff barrier (~7.60 GV)' },
  KGN2:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'King George station offline / no peak observed' },
  BRBG:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Barentsburg telemetry gap during prompt phase' },
  TURK:  { increasePercent: 0.0,  tier: 'none', tierLabel: 'No Enhancement (0%)', notes: 'Turku monitor no significant enhancement' }
};

export type GLEAveragingWindow = 10 | 20 | 30 | 40;

// Precomputed peak % increase for 10-min, 20-min, 30-min, and 40-min rolling averages from backend/data/cosmic
export const GLE77_WINDOW_PEAKS: Record<GLEAveragingWindow, Record<string, number>> = {
  10: {
    APTY: 33.9, ATHN: 4.3, BKSN: 3.3, CALG: 60.5, CALM: 4.7, DOMB: 71.3, DOMC: 54.1,
    DRBS: 11.5, FSMT: 38.9, ICRB: 5.8, ICRO: 3.2, INVK: 28.6, IRKT: 13.6, JBGO: 26.6,
    JUNG: 7.3, JUNG1: 7.5, KERG: 30.9, KIEL2: 18.5, LMKS: 11.1, MWSN: 133.0, MXCO: 4.2,
    NAIN: 147.4, NEWK: 61.2, OULU: 68.3, PWNK: 87.6, ROME: 1.8, SOPO: 120.6, TERA: 26.2,
    THUL: 21.0, HLKL: 2.9, SNAE: 94.2, TXBY: 52.5, NRLK: 48.0, YKTK: 39.0, JUAN: 37.5,
    NVBK: 19.5, MOSC: 17.5, LDVL: 16.8, MGDN: 15.5, CAPS: 13.2, KIEV: 12.8
  },
  20: {
    APTY: 31.0, ATHN: 3.2, BKSN: 3.2, CALG: 59.6, CALM: 3.1, DOMB: 69.5, DOMC: 53.5,
    DRBS: 10.5, FSMT: 38.3, ICRB: 3.6, ICRO: 2.0, INVK: 27.9, IRKT: 12.7, JBGO: 25.7,
    JUNG: 6.9, JUNG1: 7.4, KERG: 30.7, KIEL2: 17.9, LMKS: 10.8, MWSN: 131.3, MXCO: 3.7,
    NAIN: 143.5, NEWK: 60.5, OULU: 61.9, PWNK: 85.5, ROME: 1.4, SOPO: 110.9, TERA: 25.8,
    THUL: 20.5, HLKL: 2.6, SNAE: 91.0, TXBY: 50.8, NRLK: 46.5, YKTK: 37.8, JUAN: 36.2,
    NVBK: 18.8, MOSC: 16.8, LDVL: 16.0, MGDN: 15.0, CAPS: 12.5, KIEV: 12.3
  },
  30: {
    APTY: 27.3, ATHN: 2.5, BKSN: 2.9, CALG: 58.6, CALM: 2.5, DOMB: 68.3, DOMC: 52.9,
    DRBS: 10.3, FSMT: 38.1, ICRB: 3.2, ICRO: 1.7, INVK: 27.6, IRKT: 12.3, JBGO: 25.2,
    JUNG: 6.7, JUNG1: 7.2, KERG: 30.4, KIEL2: 17.7, LMKS: 10.6, MWSN: 126.7, MXCO: 3.1,
    NAIN: 138.5, NEWK: 59.5, OULU: 53.3, PWNK: 83.0, ROME: 1.2, SOPO: 102.0, TERA: 25.5,
    THUL: 20.2, HLKL: 2.4, SNAE: 88.0, TXBY: 49.0, NRLK: 45.0, YKTK: 36.5, JUAN: 35.0,
    NVBK: 18.0, MOSC: 16.0, LDVL: 15.5, MGDN: 14.5, CAPS: 12.0, KIEV: 11.8
  },
  40: {
    APTY: 25.9, ATHN: 2.4, BKSN: 2.9, CALG: 58.0, CALM: 2.0, DOMB: 67.9, DOMC: 52.6,
    DRBS: 10.3, FSMT: 37.7, ICRB: 2.9, ICRO: 1.2, INVK: 27.4, IRKT: 12.1, JBGO: 25.1,
    JUNG: 6.7, JUNG1: 7.1, KERG: 30.2, KIEL2: 17.3, LMKS: 10.5, MWSN: 119.6, MXCO: 3.0,
    NAIN: 133.9, NEWK: 58.0, OULU: 46.8, PWNK: 80.9, ROME: 1.1, SOPO: 101.3, TERA: 25.3,
    THUL: 19.8, HLKL: 2.3, SNAE: 84.5, TXBY: 47.0, NRLK: 43.5, YKTK: 35.0, JUAN: 33.8,
    NVBK: 17.2, MOSC: 15.2, LDVL: 14.8, MGDN: 13.9, CAPS: 11.4, KIEV: 11.2
  }
};

function getTierFromPercent(val: number): GLEEnhancementTier {
  if (val >= 65.0) return 'very_high';
  if (val >= 30.0) return 'moderate';
  if (val >= 5.0) return 'low';
  return 'none';
}

// Helper to get GLE#77 data for any station with specific averaging window (10, 20, 30, 40m)
export function getGLE77Data(
  stationId: string,
  cutoffRigidity: number = 0,
  window: GLEAveragingWindow = 30
): GLE77StationData {
  const windowTable = GLE77_WINDOW_PEAKS[window] || GLE77_WINDOW_PEAKS[30];
  if (stationId in windowTable) {
    const val = windowTable[stationId];
    const tier = getTierFromPercent(val);
    const tierLabel = tier === 'very_high' ? 'Very High (≥ 65%)'
                    : tier === 'moderate' ? 'Moderate (30% - 65%)'
                    : tier === 'low' ? 'Low (< 30%)'
                    : 'No Enhancement (0%)';
    const baseEntry = GLE77_STATION_MAP[stationId];
    return {
      increasePercent: val,
      tier,
      tierLabel,
      notes: baseEntry?.notes || `Peak +${val.toFixed(1)}% (${window}-min rolling average)`
    };
  }

  // Check static fallback map
  if (GLE77_STATION_MAP[stationId]) {
    return GLE77_STATION_MAP[stationId];
  }

  // If station is not in explicit GLE#77 table, infer from cutoff rigidity
  if (cutoffRigidity > 5.0) {
    return {
      increasePercent: 0.0,
      tier: 'none',
      tierLabel: 'No Enhancement (0%)',
      notes: `Geomagnetic cutoff (${cutoffRigidity.toFixed(1)} GV) barrier deflected solar particles.`
    };
  }
  return {
    increasePercent: 0.0,
    tier: 'none',
    tierLabel: 'No Enhancement (0%)',
    notes: 'No GLE telemetry reported for this station'
  };
}

// Styling helper for GLE#77 Map Markers (Size & Color)
// continuousPercent allows fluid, nuanced size variations between 10m, 20m, 30m, 40m averages!
export function getGLE77MarkerStyle(
  tier: GLEEnhancementTier,
  isSelected: boolean = false,
  continuousPercent?: number
) {
  const pct = continuousPercent !== undefined ? continuousPercent : 0;

  switch (tier) {
    case 'very_high': { // 🟡 Largest size (23 - 29px), yellow
      const dynamicSize = continuousPercent !== undefined
        ? Math.round(22 + Math.min(7, Math.max(1, ((pct - 65) / 80) * 7)))
        : 26;
      return {
        color: '#FACC15', // Bright Yellow
        glowColor: 'rgba(250, 204, 21, 0.75)',
        borderColor: isSelected ? '#FFFFFF' : '#713F12',
        borderWidth: 2.5,
        size: dynamicSize,
        pulseSize: dynamicSize + 16,
        hasPulse: false, // Keep static as requested
        zIndex: 35
      };
    }
    case 'moderate': { // 🟠 Medium size (16 - 21px), orange
      const dynamicSize = continuousPercent !== undefined
        ? Math.round(15 + Math.min(6, Math.max(1, ((pct - 30) / 35) * 6)))
        : 18;
      return {
        color: '#FB923C', // Vibrant Orange
        glowColor: 'rgba(251, 146, 60, 0.65)',
        borderColor: isSelected ? '#FFFFFF' : '#7C2D12',
        borderWidth: 2,
        size: dynamicSize,
        pulseSize: dynamicSize + 12,
        hasPulse: false, // Keep static as requested
        zIndex: 30
      };
    }
    case 'low': { // 🔴 Small size (10 - 14px), red
      const dynamicSize = continuousPercent !== undefined
        ? Math.round(9 + Math.min(5, Math.max(1, (pct / 30) * 5)))
        : 12;
      return {
        color: '#EF4444', // Red
        glowColor: 'rgba(239, 68, 68, 0.5)',
        borderColor: isSelected ? '#FFFFFF' : '#450A0A',
        borderWidth: 1.5,
        size: dynamicSize,
        pulseSize: dynamicSize + 8,
        hasPulse: false,
        zIndex: 25
      };
    }
    case 'none': // ⚫ Smallest size (7px), dark circle with white rim
    default:
      return {
        color: '#090D16', // Solid Dark / Black
        glowColor: 'rgba(0, 0, 0, 0.4)',
        borderColor: isSelected ? '#38BDF8' : '#F8FAFC', // Crisp white rim
        borderWidth: 1.8,
        size: 7,
        pulseSize: 0,
        hasPulse: false,
        zIndex: 15
      };
  }
}
