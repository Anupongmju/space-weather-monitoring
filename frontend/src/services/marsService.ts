import API_BASE from '../config'

const BASE = `${API_BASE}/mars`

export interface MarsRadRecord {
  time_tag: string
  sol: number
  dose_rate_silicon: number // uGy/hr
  dose_rate_plastic: number // uGy/hr
  dose_a1?: number          // uGy/hr
  dose_a2?: number          // uGy/hr
  dose_b?: number           // uGy/hr
  dose_c?: number           // uGy/hr (CsI)
  dose_d?: number           // uGy/hr
  dose_e?: number           // uGy/hr (Plastic)
  dose_f?: number           // uGy/hr (Anticoincidence)
  flux_charged: number      // particles / (cm^2 s sr)
  flux_neutral: number      // count rate / neutral flux
  l1_cnt_fast?: number      // counts/sec
  l1_cnt_slow?: number      // counts/sec
  l2_coinc_ab?: number      // counts/sec
  l2_coinc_ade?: number     // counts/sec
  pressure_mbar?: number    // mbar
}

export interface MarsSummary {
  current_sol: number
  latest_time_tag: string
  dose_rate_silicon: number
  dose_rate_plastic: number
  flux_charged: number
  flux_neutral: number
  daily_dose_si_mGy: number
  daily_dose_plastic_mSv: number
  annual_projected_mSv: number
  status: string
  human_safety_level: string
  maven_latest?: any
}

const safeJson = async (r: Response) => {
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}: ${text || r.statusText}`)
  }
  return r.json()
}

export const fetchMarsData = (): Promise<any> =>
  fetch(`${BASE}/fetch`, { method: 'POST' }).then(safeJson)

export const loadMarsRad = (limit = 1440, startDate?: string, endDate?: string, sol?: number): Promise<MarsRadRecord[]> => {
  let url = `${BASE}/rad?limit=${limit}`
  if (sol !== undefined) {
    url = `${BASE}/rad?sol=${sol}`
  } else if (startDate && endDate) {
    url = `${BASE}/rad?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return fetch(url).then(safeJson)
}

export const loadMarsSummary = (): Promise<MarsSummary> =>
  fetch(`${BASE}/summary`).then(safeJson)

export interface MarsMavenRecord {
  time_tag: string
  year: number
  doy: number
  hour: number
  [key: string]: any
}

export const loadMarsMaven = (limit = 168, startDate?: string, endDate?: string): Promise<MarsMavenRecord[]> => {
  let url = `${BASE}/maven?limit=${limit}`
  if (startDate && endDate) {
    url = `${BASE}/maven?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return fetch(url).then(safeJson)
}

export const MAVEN_ION_CHANNELS = [
  { key: 'ion_1', label: '19.7 - 21.1 keV/n', range: '19.7-21.1 keV/n', band: 'low' },
  { key: 'ion_2', label: '21.1 - 22.5 keV/n', range: '21.1-22.5 keV/n', band: 'low' },
  { key: 'ion_3', label: '22.4 - 23.8 keV/n', range: '22.4-23.8 keV/n', band: 'low' },
  { key: 'ion_4', label: '23.8 - 26.6 keV/n', range: '23.8-26.6 keV/n', band: 'low' },
  { key: 'ion_5', label: '26.5 - 29.3 keV/n', range: '26.5-29.3 keV/n', band: 'low' },
  { key: 'ion_6', label: '29.3 - 33.3 keV/n', range: '29.3-33.3 keV/n', band: 'low' },
  { key: 'ion_7', label: '33.3 - 38.7 keV/n', range: '33.3-38.7 keV/n', band: 'low' },
  { key: 'ion_8', label: '38.7 - 45.5 keV/n', range: '38.7-45.5 keV/n', band: 'low' },
  { key: 'ion_9', label: '45.5 - 55.1 keV/n', range: '45.5-55.1 keV/n', band: 'low' },
  { key: 'ion_10', label: '55.1 - 67.3 keV/n', range: '55.1-67.3 keV/n', band: 'low' },
  { key: 'ion_11', label: '67.3 - 83.7 keV/n', range: '67.3-83.7 keV/n', band: 'low' },
  { key: 'ion_12', label: '83.6 - 105.4 keV/n', range: '83.6-105.4 keV/n', band: 'low' },
  { key: 'ion_13', label: '105.8 - 134.2 keV/n', range: '105.8-134.2 keV/n', band: 'mid' },
  { key: 'ion_14', label: '133.7 - 170.3 keV/n', range: '133.7-170.3 keV/n', band: 'mid' },
  { key: 'ion_15', label: '170.6 - 219.4 keV/n', range: '170.6-219.4 keV/n', band: 'mid' },
  { key: 'ion_16', label: '219.1 - 282.9 keV/n', range: '219.1-282.9 keV/n', band: 'mid' },
  { key: 'ion_17', label: '283.2 - 368.8 keV/n', range: '283.2-368.8 keV/n', band: 'mid' },
  { key: 'ion_18', label: '369.5 - 480.5 keV/n', range: '369.5-480.5 keV/n', band: 'mid' },
  { key: 'ion_19', label: '480.5 - 627.5 keV/n', range: '480.5-627.5 keV/n', band: 'mid' },
  { key: 'ion_20', label: '628.0 - 822.0 keV/n', range: '628-822 keV/n', band: 'mid' },
  { key: 'ion_21', label: '822.0 - 1078.0 keV/n', range: '0.82-1.08 MeV/n', band: 'high' },
  { key: 'ion_22', label: '1081.5 - 1418.5 keV/n', range: '1.08-1.42 MeV/n', band: 'high' },
  { key: 'ion_23', label: '1417.5 - 1862.5 keV/n', range: '1.42-1.86 MeV/n', band: 'high' },
  { key: 'ion_24', label: '1857.5 - 2442.5 keV/n', range: '1.86-2.44 MeV/n', band: 'high' },
  { key: 'ion_25', label: '2445.5 - 3214.5 keV/n', range: '2.45-3.21 MeV/n', band: 'high' },
  { key: 'ion_26', label: '3215.0 - 4225.0 keV/n', range: '3.22-4.23 MeV/n', band: 'high' },
  { key: 'ion_27', label: '4225.0 - 5575.0 keV/n', range: '4.23-5.58 MeV/n', band: 'high' },
  { key: 'ion_28', label: '5575.0 - 7245.0 keV/n', range: '5.58-7.25 MeV/n', band: 'high' },
]

export const MAVEN_ELE_CHANNELS = [
  { key: 'ele_1', label: '20.1 - 21.5 keV', range: '20.1-21.5 keV' },
  { key: 'ele_2', label: '21.5 - 22.9 keV', range: '21.5-22.9 keV' },
  { key: 'ele_3', label: '22.9 - 24.3 keV', range: '22.9-24.3 keV' },
  { key: 'ele_4', label: '24.3 - 27.1 keV', range: '24.3-27.1 keV' },
  { key: 'ele_5', label: '27.1 - 29.9 keV', range: '27.1-29.9 keV' },
  { key: 'ele_6', label: '29.9 - 34.1 keV', range: '29.9-34.1 keV' },
  { key: 'ele_7', label: '34.1 - 39.7 keV', range: '34.1-39.7 keV' },
  { key: 'ele_8', label: '39.8 - 46.8 keV', range: '39.8-46.8 keV' },
  { key: 'ele_9', label: '46.8 - 56.6 keV', range: '46.8-56.6 keV' },
  { key: 'ele_10', label: '56.6 - 69.3 keV', range: '56.6-69.3 keV' },
  { key: 'ele_11', label: '69.2 - 86.2 keV', range: '69.2-86.2 keV' },
  { key: 'ele_12', label: '86.2 - 108.8 keV', range: '86.2-108.8 keV' },
  { key: 'ele_13', label: '108.2 - 137.8 keV', range: '108.2-137.8 keV' },
  { key: 'ele_14', label: '138.0 - 176.0 keV', range: '138-176 keV' },
  { key: 'ele_15', label: '176.7 - 227.3 keV', range: '177-227 keV' },
]


