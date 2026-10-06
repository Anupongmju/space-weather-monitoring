// frontend/src/components/studio/studioTypes.ts
import { TimeRange } from '../ui/DateRangeToolbar'

export type ChartCategory = 'all' | 'goes' | 'ace' | 'ground' | 'deepspace' | 'moon' | 'mars'

export type ChartId =
  | 'goes-xray'
  | 'goes-proton'
  | 'goes-electron'
  | 'goes-mag'
  | 'ace-swepam'
  | 'ace-mag'
  | 'ace-epam'
  | 'ace-sis'
  | 'solar1-plasma'
  | 'solar1-mag'
  | 'solar1-particles'
  | 'stereo-particles'
  | 'neutron-monitor'
  | 'psnm-neutron'
  | 'maw-neutron'
  | 'global-neutron'
  | 'sunspot-number'
  | 'moon-crater'
  | 'mars-rad'
  | 'mars-maven'

export interface ChartCatalogItem {
  id: ChartId
  title: string
  subtitle: string
  domain: string
  category: ChartCategory
  tag: string
  accentColor: string
  lightAccentColor: string
  description: string
  yAxisUnit: string
  icon: string
}

export interface StudioCardConfig {
  instanceId: string
  chartId: ChartId
  station?: string // e.g. 'PSNM', 'MAWSON', 'OULU', 'SOPO', 'THUL', etc.
  timeRangeOverride?: TimeRange | null // null = follow global
  customRangeOverride?: { startDate: string; endDate: string } | null
}

export interface NeutronStationItem {
  id: string
  label: string
  country: string
}

export const POPULAR_STATIONS: NeutronStationItem[] = [
  { id: 'OULU', label: 'Oulu (OULU)', country: 'Finland' },
  { id: 'SOPO', label: 'South Pole (SOPO)', country: 'Antarctica' },
  { id: 'KIEL2', label: 'Kiel (KIEL2)', country: 'Germany' },
  { id: 'JUNG', label: 'Jungfraujoch (JUNG)', country: 'Switzerland' },
  { id: 'MAWSON', label: 'Mawson (MAWSON)', country: 'Antarctica' },
  { id: 'CALG', label: 'Calgary (CALG)', country: 'Canada' },
  { id: 'NEWK', label: 'Newark (NEWK)', country: 'USA' },
  { id: 'ROME', label: 'Rome (ROME)', country: 'Italy' },
  { id: 'MXCO', label: 'Mexico City (MXCO)', country: 'Mexico' },
]

export interface StudioPreset {
  id: string
  name: string
  nameTh: string
  description: string
  descriptionTh: string
  isBuiltIn: boolean
  layout: '1col' | '2col'
  globalTimeRange: TimeRange
  chartIds: ChartId[]
}

export const CHART_CATALOG: ChartCatalogItem[] = [
  // ── GOES ──
  {
    id: 'goes-xray',
    title: 'GOES X-Ray Flux',
    subtitle: '0.05-0.4 nm & 0.1-0.8 nm (Solar Flare Classes)',
    domain: 'GOES-18 (GEO)',
    category: 'goes',
    tag: 'XRS',
    accentColor: '#EF4444',
    lightAccentColor: '#DC2626',
    description: 'Real-time solar X-ray irradiance monitoring with NOAA A, B, C, M, X flare classification threshold zones.',
    yAxisUnit: 'W/m²',
    icon: 'Zap',
  },
  {
    id: 'goes-proton',
    title: 'GOES High-Energy Proton Flux',
    subtitle: '≥10, ≥50, ≥100 MeV (Solar Radiation Storms)',
    domain: 'GOES-18 (GEO)',
    category: 'goes',
    tag: 'SEPS',
    accentColor: '#F59E0B',
    lightAccentColor: '#D97706',
    description: 'Integral proton flux monitoring solar energetic particle (SEP) events and S1–S5 Solar Radiation Storm levels.',
    yAxisUnit: 'pfu',
    icon: 'ShieldAlert',
  },
  {
    id: 'goes-electron',
    title: 'GOES Relativistic Electron Flux',
    subtitle: '≥0.8, ≥2, ≥4 MeV (Outer Radiation Belt)',
    domain: 'GOES-18 (GEO)',
    category: 'goes',
    tag: 'MAGED',
    accentColor: '#38BDF8',
    lightAccentColor: '#0284C7',
    description: 'Relativistic magnetospheric electrons at geostationary orbit affecting satellite electronics & deep dielectric charging.',
    yAxisUnit: 'electrons/(cm²·s·sr)',
    icon: 'Radio',
  },
  {
    id: 'goes-mag',
    title: 'GOES Magnetometer Field',
    subtitle: 'Hp, He, Hn, Total Field (Geostationary Compression)',
    domain: 'GOES-18 (GEO)',
    category: 'goes',
    tag: 'MAG',
    accentColor: '#34D399',
    lightAccentColor: '#059669',
    description: 'Geostationary magnetic field components detecting magnetopause crossings and storm compression signatures.',
    yAxisUnit: 'nT',
    icon: 'Compass',
  },

  // ── ACE ──
  {
    id: 'ace-swepam',
    title: 'ACE SWEPAM Solar Wind Plasma',
    subtitle: 'Proton Speed (km/s), Density (p/cm³), Temperature (K)',
    domain: 'ACE (L1 Point)',
    category: 'ace',
    tag: 'SWEPAM',
    accentColor: '#06B6D4',
    lightAccentColor: '#0891B2',
    description: 'Interplanetary solar wind speed and plasma density measured 1.5 million km sunward at Sun-Earth Lagrange L1.',
    yAxisUnit: 'km/s / p/cm³',
    icon: 'Wind',
  },
  {
    id: 'ace-mag',
    title: 'ACE Magnetic Field Vectors',
    subtitle: 'Bt Total & Interplanetary Bz (Southward IMF)',
    domain: 'ACE (L1 Point)',
    category: 'ace',
    tag: 'MAG',
    accentColor: '#818CF8',
    lightAccentColor: '#4F46E5',
    description: 'Interplanetary Magnetic Field (IMF). Negative Bz triggers geomagnetic reconnection and auroral substorms.',
    yAxisUnit: 'nT',
    icon: 'Layers',
  },
  {
    id: 'ace-epam',
    title: 'ACE EPAM Energetic Particles',
    subtitle: 'Low-Energy Protons (P1-P8) & Electrons',
    domain: 'ACE (L1 Point)',
    category: 'ace',
    tag: 'EPAM',
    accentColor: '#FB923C',
    lightAccentColor: '#EA580C',
    description: 'Low-energy ions and electrons accelerated by interplanetary shocks and Coronal Mass Ejections (CMEs).',
    yAxisUnit: 'particles/(cm²·s·sr·MeV)',
    icon: 'Activity',
  },
  {
    id: 'ace-sis',
    title: 'ACE SIS Solar Isotope Spectrometer',
    subtitle: '>10 MeV & >30 MeV Protons / Heavy Cosmic Rays',
    domain: 'ACE (L1 Point)',
    category: 'ace',
    tag: 'SIS',
    accentColor: '#10B981',
    lightAccentColor: '#059669',
    description: 'Solar Isotope Spectrometer measuring elemental and isotopic composition of solar energetic particles and galactic cosmic rays.',
    yAxisUnit: 'particles/(cm²·s·sr)',
    icon: 'Layers',
  },
  {
    id: 'solar1-plasma',
    title: 'SOLAR-1 SWiPS Solar Wind Plasma',
    subtitle: 'Proton Speed (km/s), Density (p/cm³), Temperature (K)',
    domain: 'SOLAR-1 (L1 Orbit)',
    category: 'ace',
    tag: 'SWiPS',
    accentColor: '#F59E0B',
    lightAccentColor: '#D97706',
    description: 'Solar wind plasma ion spectrometer on India Aditya-L1 / SOLAR-1 at Sun-Earth L1 measuring velocity, density, and temperature.',
    yAxisUnit: 'km/s / p/cm³',
    icon: 'Wind',
  },
  {
    id: 'solar1-mag',
    title: 'SOLAR-1 Magnetic Field Vectors',
    subtitle: 'Bt Total, Interplanetary Bz, Bx, By (nT)',
    domain: 'SOLAR-1 (L1 Orbit)',
    category: 'ace',
    tag: 'MAG',
    accentColor: '#EC4899',
    lightAccentColor: '#DB2777',
    description: 'Triaxial fluxgate magnetometer on SOLAR-1 at L1 measuring interplanetary magnetic field components and shock fronts.',
    yAxisUnit: 'nT',
    icon: 'Compass',
  },
  {
    id: 'solar1-particles',
    title: 'SOLAR-1 STIS Energetic Particles',
    subtitle: 'p1–p8 Ions (47–5263 keV) & de1–de4 Electrons',
    domain: 'SOLAR-1 (L1 Orbit)',
    category: 'ace',
    tag: 'STIS',
    accentColor: '#F97316',
    lightAccentColor: '#EA580C',
    description: 'Suprathermal & Energetic Particle Spectrometer tracking solar particle acceleration and shock propagation at L1.',
    yAxisUnit: 'pfu',
    icon: 'Activity',
  },
  {
    id: 'stereo-particles',
    title: 'STEREO-A Solar Energetic Particles',
    subtitle: 'SEPT & HET Protons & Electrons (Heliocentric Orbit)',
    domain: 'STEREO-A (Orbit)',
    category: 'deepspace',
    tag: 'SEPT',
    accentColor: '#6366F1',
    lightAccentColor: '#4F46E5',
    description: 'Solar electron and proton telemetry from STEREO-Ahead trailing heliocentric orbit for 360-degree solar storm early warning.',
    yAxisUnit: 'particles/(cm²·s·sr)',
    icon: 'Radio',
  },

  // ── GROUND & SOLAR ──
  {
    id: 'neutron-monitor',
    title: 'Cosmic Ray Neutron Monitor',
    subtitle: 'NMDB International Network (Selectable Station)',
    domain: 'GROUND (NMDB)',
    category: 'ground',
    tag: 'NMDB',
    accentColor: '#A855F7',
    lightAccentColor: '#7E22CE',
    description: 'Ground-based cosmic ray neutron monitor network measuring secondary neutron cascades from galactic cosmic rays (GCRs).',
    yAxisUnit: 'counts/sec',
    icon: 'Activity',
  },
  {
    id: 'psnm-neutron',
    title: 'PSNM Neutron Monitor (Thailand)',
    subtitle: 'Princess Sirindhorn Station · Doi Inthanon',
    domain: 'GROUND (Thailand)',
    category: 'ground',
    tag: 'PSNM',
    accentColor: '#A855F7',
    lightAccentColor: '#7E22CE',
    description: 'Cosmic ray neutron monitor at Doi Inthanon (highest vertical geomagnetic cutoff rigidity station in the world, 16.8 GV).',
    yAxisUnit: 'counts/sec',
    icon: 'Mountain',
  },
  {
    id: 'maw-neutron',
    title: 'Mawson Observatory (Antarctica)',
    subtitle: 'Polar Cosmic Ray NM64 & Bare Counters',
    domain: 'GROUND (Antarctica)',
    category: 'ground',
    tag: 'MAW',
    accentColor: '#6366F1',
    lightAccentColor: '#4338CA',
    description: 'High-latitude polar neutron monitor near the South Pole with low geomagnetic cutoff, sensitive to low-energy GCR/GLEs.',
    yAxisUnit: 'counts/sec',
    icon: 'Snowflake',
  },
  {
    id: 'global-neutron',
    title: 'Global Neutron Monitor Comparison',
    subtitle: 'Multi-Station NMDB Normalized Variation (%)',
    domain: 'GROUND (NMDB)',
    category: 'ground',
    tag: 'NMDB',
    accentColor: '#EC4899',
    lightAccentColor: '#BE185D',
    description: 'Normalized cosmic ray intensity variation from international NMDB stations detecting Forbush Decreases.',
    yAxisUnit: '% Variation',
    icon: 'Globe',
  },
  {
    id: 'sunspot-number',
    title: 'International Sunspot Number',
    subtitle: 'SILSO Daily / Monthly & 12-Month Smoothed (SC25)',
    domain: 'SOLAR CYCLE',
    category: 'ground',
    tag: 'SILSO',
    accentColor: '#FBBF24',
    lightAccentColor: '#B45309',
    description: 'Long-term solar activity indicator tracking Solar Cycle 25 progression and solar magnetic variability.',
    yAxisUnit: 'Sunspot Number',
    icon: 'Sun',
  },

  // ── MOON ──
  {
    id: 'moon-crater',
    title: 'Lunar Radiation Dose Rate (CRaTER)',
    subtitle: 'LRO Silicon Detectors (D1-D6) Moon Orbit',
    domain: 'MOON (LRO)',
    category: 'moon',
    tag: 'CRaTER',
    accentColor: '#F59E0B',
    lightAccentColor: '#B45309',
    description: 'Cosmic Ray Telescope for the Effects of Radiation (CRaTER) measuring ionizing radiation doses for Artemis lunar astronauts.',
    yAxisUnit: 'μGy/hr',
    icon: 'Moon',
  },

  // ── MARS ──
  {
    id: 'mars-rad',
    title: 'Mars Curiosity Surface Radiation',
    subtitle: 'MSL RAD Detector (Silicon & Plastic Dose)',
    domain: 'MARS (Surface)',
    category: 'mars',
    tag: 'RAD',
    accentColor: '#F87171',
    lightAccentColor: '#DC2626',
    description: 'Surface radiation dose rate and neutral particle flux measured in Gale Crater, Mars by the Curiosity rover.',
    yAxisUnit: 'μGy/day',
    icon: 'Flame',
  },
  {
    id: 'mars-maven',
    title: 'Mars MAVEN Plasma & Particles',
    subtitle: 'Orbiter SWEA / SWIA Ion & Electron Flux',
    domain: 'MARS (Orbit)',
    category: 'mars',
    tag: 'MAVEN',
    accentColor: '#E11D48',
    lightAccentColor: '#9F1239',
    description: 'Atmospheric escape and magnetosheath particle flux around Mars from NASA MAVEN orbiter.',
    yAxisUnit: 'flux',
    icon: 'Sparkles',
  },
]

export const BUILT_IN_PRESETS: StudioPreset[] = [
  {
    id: 'solar-storm',
    name: 'Solar Storm Early Warning',
    nameTh: 'ตรวจจับพายุสุริยะฉับพลัน (Solar Storm Early Warning)',
    description: 'Correlates GOES X-ray flares, ACE Solar Wind velocity/density, Interplanetary Bz southward orientation, and Proton Flux acceleration.',
    descriptionTh: 'เปรียบเทียบ Solar Flare (GOES X-ray), ความเร็วลมสุริยะ (ACE SWEPAM), ทิศทางสนามแม่เหล็ก Bz (ACE MAG) และอนุภาคโปรตอน (GOES Proton)',
    isBuiltIn: true,
    layout: '2col',
    globalTimeRange: 4320,
    chartIds: ['goes-xray', 'ace-swepam', 'ace-mag', 'goes-proton'],
  },
  {
    id: 'deep-space',
    name: 'Deep Space & Planetary Radiation',
    nameTh: 'รังสีอวกาศลึก ดวงจันทร์ และดาวอังคาร',
    description: 'Cross-planetary radiation comparison across Moon (CRaTER), Mars Curiosity (RAD), Earth surface (PSNM), and Earth GEO orbit (GOES).',
    descriptionTh: 'เปรียบเทียบระดับรังสีพร้อมกัน 4 ระดับ: ดวงจันทร์ (CRaTER), ดาวอังคาร (Curiosity), บนผิวโลก (ดอยอินทนนท์ PSNM) และวงโคจรค้างฟ้า (GOES Proton)',
    isBuiltIn: true,
    layout: '2col',
    globalTimeRange: 4320,
    chartIds: ['moon-crater', 'mars-rad', 'psnm-neutron', 'goes-proton'],
  },
  {
    id: 'geomagnetic',
    name: 'Geomagnetic Storm & Magnetosphere',
    nameTh: 'พายุสนามแม่เหล็กโลกและแถบรังสี',
    description: 'Analyzes magnetosphere compression by comparing L1 IMF Bz against GOES geostationary magnetometer and relativistic electron flux.',
    descriptionTh: 'วิเคราะห์การบีบอัดสนามแม่เหล็กโลก เปรียบเทียบสนามแม่เหล็กสุริยะ Bz กับสนามแม่เหล็กวงโคจร GOES และอิเล็กตรอนพลังงานสูง',
    isBuiltIn: true,
    layout: '2col',
    globalTimeRange: 4320,
    chartIds: ['ace-mag', 'goes-mag', 'ace-swepam', 'goes-electron'],
  },
  {
    id: 'cosmic-solar',
    name: 'Cosmic Ray & Solar Activity',
    nameTh: 'รังสีคอสมิกและวัฏจักรสุริยะ',
    description: 'Ground-based neutron monitors (Equatorial Thailand vs Polar Antarctica) correlated with international NMDB and sunspot counts.',
    descriptionTh: 'วิเคราะห์รังสีคอสมิกระหว่างสถานีดอยอินทนนท์ (เส้นศูนย์สูตร) กับสถานีมอว์สัน (ขั้วโลกใต้) พร้อมเทียบจุดมืดดวงอาทิตย์',
    isBuiltIn: true,
    layout: '2col',
    globalTimeRange: 10080,
    chartIds: ['psnm-neutron', 'maw-neutron', 'global-neutron', 'sunspot-number'],
  },
]
