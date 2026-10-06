import API_BASE from '../config'
const BASE = `${API_BASE}/maw`

export const fetchMawToday = (): Promise<any> => fetch(`${BASE}/fetch/today`, { method: 'POST' }).then(r => r.json())

export const fetchMawRange = (days = 7): Promise<any> => fetch(`${BASE}/fetch/range?days=${days}`, { method: 'POST' }).then(r => r.json())

export const loadMawData = (limit = 1440, startDate?: string, endDate?: string, fullResolution?: boolean): Promise<any[]> => {
  let url = `${BASE}/data?limit=${limit}`
  if (startDate && endDate) {
    url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  if (fullResolution) {
    url += `&full_resolution=true`
  }
  return fetch(url).then(r => r.json())
}

export const loadMawRange = (start: string, end: string): Promise<any[]> =>
  fetch(`${BASE}/data/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`).then(r => r.json())

export const loadMawDates = (): Promise<any[]> => fetch(`${BASE}/dates`).then(r => r.json())

export const loadMawScatter = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  let url = `${BASE}/scatter?limit=${limit}`
  if (startDate && endDate) {
    url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return fetch(url).then(r => r.json())
}

export interface MawTubeRegression {
  id: string
  tube_num: number
  name: string
  full_name: string
  type: string
  is_bare: boolean
  is_online: boolean
  status: string
  points_count: number
  slope: number
  se_slope: number
  intercept: number
  beta_mbar: number
  se_mbar: number
  beta_mmhg: number
  se_mmhg: number
  r2: number
  p_lim: number
  ln_lim: number
  sample_points: [number, number][]
}

export interface MawRegressionData {
  dataset_years: string
  station: string
  latitude: string
  longitude: string
  cutoff_rigidity: string
  resolution: string
  mean_nm18_beta_mbar: number
  mean_bare6_beta_mbar: number
  summary: {
    total_tubes: number
    nm18_count: number
    bare6_count: number
    mean_nm18_beta_mbar: number
    mean_nm18_beta_mmhg: number
    mean_bare6_beta_mbar: number
    mean_bare6_beta_mmhg: number
    clean_sum: { name: string; beta_mbar: number; beta_mmhg: number; r2: number; points: number }
    nm18_sum: { name: string; beta_mbar: number; beta_mmhg: number; r2: number; points: number }
    bare_sum: { name: string; beta_mbar: number; beta_mmhg: number; r2: number; points: number }
  }
  mlr_3?: {
    name: string
    title: string
    description: string
    points_count: number
    slope: number
    intercept: number
    beta_mbar: number
    beta_mmhg: number
    r2: number
    p_lim: number
    ln_lim: number
    sample_points: [number, number][]
  }
  tubes_24: MawTubeRegression[]
}

export const loadMawRegression = (): Promise<MawRegressionData> =>
  fetch(`${BASE}/regression`).then(r => r.json())

