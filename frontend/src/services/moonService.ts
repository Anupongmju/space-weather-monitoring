import API_BASE from '../config'

export interface SpectrumDataPoint {
  time: string
  proton_flux: number
  electron_flux: number
  b_field: number
}

export interface DoseRateHourlyPoint {
  time: string
  d12: number | null
  d34: number | null
  d56: number | null
}

export interface DoseRateInfo {
  d12: number | null
  d34: number | null
  d56: number | null
  d1?: number | null
  d2?: number | null
  d3?: number | null
  d4?: number | null
  d5?: number | null
  d6?: number | null
  status: 'VALID' | 'DATA_GAP' | string
  unit: string
  samples_count?: number
  window_start?: string
  window_end?: string
  event_date?: string
  hourly?: DoseRateHourlyPoint[]
}

export interface GoesProtonHourlyPoint {
  time: string
  time_iso?: string
  p_low: number | null
  p_mid: number | null
  p_high: number | null
  // All 13 GOES SGPS differential channels (ch0=1-2 MeV ... ch12=267-390 MeV)
  ch0?: number | null;  ch1?: number | null;  ch2?: number | null
  ch3?: number | null;  ch4?: number | null;  ch5?: number | null
  ch6?: number | null;  ch7?: number | null;  ch8?: number | null
  ch9?: number | null;  ch10?: number | null; ch11?: number | null
  ch12?: number | null
}

export interface GoesProtonInfo {
  satellite: string
  instrument: string
  mode: 'DIFFERENTIAL' | 'INTEGRAL' | string
  unit: string
  channel_labels?: (string | null)[]   // all 13 channel label strings
  channel_low_label: string
  channel_mid_label: string
  channel_high_label: string
  avg_low: number | null
  avg_mid: number | null
  avg_high: number | null
  // Per-channel averages ch0..ch12
  avg_ch0?: number | null;  avg_ch1?: number | null;  avg_ch2?: number | null
  avg_ch3?: number | null;  avg_ch4?: number | null;  avg_ch5?: number | null
  avg_ch6?: number | null;  avg_ch7?: number | null;  avg_ch8?: number | null
  avg_ch9?: number | null;  avg_ch10?: number | null; avg_ch11?: number | null
  avg_ch12?: number | null
  status: 'VALID' | 'DATA_GAP' | string
  samples_count?: number
  window_start?: string
  window_end?: string
  event_date?: string
  series?: GoesProtonHourlyPoint[]
}

export interface MoonEventPosition {
  id: number
  date: string
  iso_time: string
  x_gse: number
  y_gse: number
  z_gse: number
  distance_km: number
  distance_re: number
  elongation_deg: number
  ecliptic_lon_deg: number
  ecliptic_lat_deg: number
  illumination_pct: number
  phase_name: string
  regime?: string
  regime_code?: 'CPS' | 'LOBE' | 'MSH' | 'IMF' | string
  regime_desc?: string
  shielding_level?: string
  solar_wind_exposure?: string
  plasma_density?: string
  b_field_status?: string
  doserate?: DoseRateInfo
  goes_proton?: GoesProtonInfo
  spectrum_data?: SpectrumDataPoint[]
}

const BASE = `${API_BASE}/moon`

// Client-side high-precision astronomical computation fallback
export function computeMoonPositionClient(dateStr: string, id = 1): MoonEventPosition {
  const cleanDate = dateStr.trim().replace(/-/g, '/')
  const parts = cleanDate.split('/')
  const dt = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0))

  const year = dt.getUTCFullYear()
  const month = dt.getUTCMonth() + 1
  const day = dt.getUTCDate() + 0.5 // 12:00 UTC

  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5

  const T = (jd - 2451545.0) / 36525.0

  const L0 = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T
  const M_prime = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T

  const toRad = (deg: number) => (deg * Math.PI) / 180.0
  const d_r = toRad(D % 360)
  const m_r = toRad(M % 360)
  const mp_r = toRad(M_prime % 360)
  const f_r = toRad(F % 360)

  const l_pert =
    6.288774 * Math.sin(mp_r) +
    1.274027 * Math.sin(2 * d_r - mp_r) +
    0.658314 * Math.sin(2 * d_r) +
    0.213618 * Math.sin(2 * mp_r) -
    0.185116 * Math.sin(m_r) -
    0.114332 * Math.sin(2 * f_r) +
    0.058793 * Math.sin(2 * d_r - 2 * mp_r) +
    0.057066 * Math.sin(2 * d_r - m_r - mp_r) +
    0.053322 * Math.sin(2 * d_r + mp_r) +
    0.045758 * Math.sin(2 * d_r - m_r)

  const moon_lon = (((L0 + l_pert) % 360) + 360) % 360

  const b_pert =
    5.128122 * Math.sin(f_r) +
    0.280602 * Math.sin(mp_r + f_r) +
    0.277693 * Math.sin(mp_r - f_r) +
    0.173237 * Math.sin(2 * d_r - f_r) +
    0.055413 * Math.sin(2 * d_r - mp_r + f_r) +
    0.046271 * Math.sin(2 * d_r - mp_r - f_r)

  const moon_lat = b_pert

  const r_pert =
    -20905.355 * Math.cos(mp_r) -
    3699.111 * Math.cos(2 * d_r - mp_r) -
    2955.968 * Math.cos(2 * d_r) -
    569.925 * Math.cos(2 * mp_r) +
    246.158 * Math.cos(2 * d_r - 2 * mp_r) -
    152.138 * Math.cos(2 * d_r - m_r - mp_r) -
    170.733 * Math.cos(2 * d_r + mp_r)

  const distance_km = 385000.56 + r_pert
  const distance_re = distance_km / 6371.0

  const sun_lon =
    (((280.46646 + 36000.76983 * T + 1.914602 * Math.sin(m_r) + 0.019993 * Math.sin(2 * m_r)) % 360) + 360) % 360

  const elongation = (((moon_lon - sun_lon) % 360) + 360) % 360
  const phi_rad = toRad(elongation)

  const x_gse = distance_re * Math.cos(phi_rad) * Math.cos(toRad(moon_lat))
  const y_gse = distance_re * Math.sin(phi_rad) * Math.cos(toRad(moon_lat))
  const z_gse = distance_re * Math.sin(toRad(moon_lat))

  const illumination_pct = Math.round(((1.0 - Math.cos(phi_rad)) / 2.0) * 1000) / 10

  let phase_name = 'New Moon'
  if (elongation < 7.5 || elongation >= 352.5) {
    phase_name = 'New Moon'
  } else if (elongation < 82.5) {
    phase_name = 'Waxing Crescent'
  } else if (elongation < 97.5) {
    phase_name = 'First Quarter'
  } else if (elongation < 172.5) {
    phase_name = 'Waxing Gibbous'
  } else if (elongation < 187.5) {
    phase_name = 'Full Moon'
  } else if (elongation < 262.5) {
    phase_name = 'Waning Gibbous'
  } else if (elongation < 277.5) {
    phase_name = 'Third Quarter'
  } else {
    phase_name = 'Waning Crescent'
  }

  return {
    id,
    date: dateStr,
    iso_time: dt.toISOString(),
    x_gse: Math.round(x_gse * 100) / 100,
    y_gse: Math.round(y_gse * 100) / 100,
    z_gse: Math.round(z_gse * 100) / 100,
    distance_km: Math.round(distance_km * 10) / 10,
    distance_re: Math.round(distance_re * 100) / 100,
    elongation_deg: Math.round(elongation * 100) / 100,
    ecliptic_lon_deg: Math.round(moon_lon * 100) / 100,
    ecliptic_lat_deg: Math.round(moon_lat * 100) / 100,
    illumination_pct,
    phase_name,
    doserate: {
      d12: null,
      d34: null,
      d56: null,
      status: 'VALID',
      unit: 'cGy/yr'
    }
  }
}

export const PRESET_EVENT_DATES = [
  '2026/04/03',
  '2026/03/20',
  '2026/02/21',
  '2026/01/21',
  '2025/12/03',
  '2025/11/20',
  '2025/11/08',
  '2025/11/06',
  '2025/09/03',
  '2025/06/20',
  '2025/06/02',
  '2025/04/16',
  '2025/04/02',
  '2024/12/21',
  '2024/11/29',
  '2024/10/28',
  '2024/10/12',
  '2024/10/07',
  '2024/09/18',
  '2024/09/05',
  '2024/08/12',
  '2024/07/29',
  '2024/05/10',
  '2024/03/24',
  '2023/04/23',
  '2021/11/03',
]

export async function loadMoonEventPositions(): Promise<MoonEventPosition[]> {
  try {
    const res = await fetch(`${BASE}/events`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    }
  } catch (err) {
    console.warn('[MoonService] Falling back to client-side astronomical computation:', err)
  }

  // Fallback calculation
  return PRESET_EVENT_DATES.map((dateStr, idx) => computeMoonPositionClient(dateStr, idx + 1))
}

export async function calculateMoonPosition(dateStr: string): Promise<MoonEventPosition> {
  try {
    const res = await fetch(`${BASE}/position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_str: dateStr }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data && !data.error) {
        return data
      }
    }
  } catch (err) {
    console.warn('[MoonService] Using client-side computation for custom date:', err)
  }

  return computeMoonPositionClient(dateStr, 999)
}
