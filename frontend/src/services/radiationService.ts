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

export const loadAceEpam = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${API_BASE}/ace/epam?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${API_BASE}/ace/epam?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadAceSis = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${API_BASE}/ace/sis?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${API_BASE}/ace/sis?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadSolar1Plasma = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/solar1/plasma?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/solar1/plasma?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadSolar1Mag = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/solar1/mag?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/solar1/mag?limit=${limit}`
  return fetch(url).then(r => r.json())
}
