import API_BASE from '../config'
const BASE = `${API_BASE}/radiation`

export const fetchAllRadiation = (): Promise<any> =>
  fetch(`${BASE}/fetch`, { method: 'POST' }).then(r => r.json())

export const loadStereo = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/stereo?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/stereo?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadSolar1 = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/solar1?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/solar1?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadCrater = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/crater?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/crater?limit=${limit}`
  return fetch(url).then(r => r.json())
}
