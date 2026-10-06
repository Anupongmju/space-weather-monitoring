import API_BASE from '../config'
const BASE = `${API_BASE}/psnm`

export interface PsnmDataPoint {
  time_tag: string
  year: number
  doy: number
  hour: number
  minute: number
  nm_corrected?: number | null
  nm_uncorrected?: number | null
  pressure?: number | null
  bare_corrected?: number | null
  bare_uncorrected?: number | null
  leader_cor?: number | null
  corr_factor?: number | null
  stat_error?: number | null
  status_flag?: number
  [key: string]: any
}

export const loadPsnmData = (limit = 1440, startDate?: string, endDate?: string): Promise<PsnmDataPoint[]> => {
  let url = `${BASE}/data?limit=${limit}`
  if (startDate && endDate) {
    url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return fetch(url).then(r => r.json())
}

export const loadPsnmRange = (start: string, end: string): Promise<PsnmDataPoint[]> =>
  fetch(`${BASE}/data/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`).then(r => r.json())

export const loadPsnmDates = (): Promise<{ date: string; records: number; max_count: number; min_count: number; avg_pressure: number }[]> =>
  fetch(`${BASE}/dates`).then(r => r.json())

export const loadPsnmScatter = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  let url = `${BASE}/scatter?limit=${limit}`
  if (startDate && endDate) {
    url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return fetch(url).then(r => r.json())
}

export interface PsnmRegressionChannel {
  title: string
  name: string
  description: string
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

export interface PsnmTubeRegression {
  id: string
  tube_num: number
  name: string
  full_name: string
  type: string
  is_bare: boolean
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

export interface PsnmRegressionData {
  dataset_years: string
  resolution: string
  summary: {
    total_tubes: number
    nm18_count: number
    bare3_count: number
    mean_nm18_beta_mbar: number
    mean_nm18_beta_mmhg: number
    mean_bare3_beta_mbar: number
    mean_bare3_beta_mmhg: number
  }
  tubes_21: PsnmTubeRegression[]
  mlr_3: {
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
  bar_chart_data: {
    categories: string[]
    values: number[]
    types: string[]
    nm_mean: number
    bare_mean: number
  }
}

export const loadPsnmRegression = (): Promise<PsnmRegressionData> =>
  fetch(`${BASE}/regression`).then(r => r.json())

