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
}

export const fetchMarsData = (): Promise<any> =>
  fetch(`${BASE}/fetch`, { method: 'POST' }).then(r => r.json())

export const loadMarsRad = (limit = 1440, startDate?: string, endDate?: string, sol?: number): Promise<MarsRadRecord[]> => {
  let url = `${BASE}/rad?limit=${limit}`
  if (sol !== undefined) {
    url = `${BASE}/rad?sol=${sol}`
  } else if (startDate && endDate) {
    url = `${BASE}/rad?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return fetch(url).then(r => r.json())
}

export const loadMarsSummary = (): Promise<MarsSummary> =>
  fetch(`${BASE}/summary`).then(r => r.json())
