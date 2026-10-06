import API_BASE from '../config'
const BASE = `${API_BASE}/radiation`

const safeJson = async (r: Response): Promise<any> => {
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}: ${text || r.statusText}`)
  }
  const text = await r.text()
  if (!text || !text.trim()) return []
  return JSON.parse(text)
}

export const fetchAllRadiation = (): Promise<any> =>
  fetch(`${BASE}/fetch`, { method: 'POST' }).then(safeJson)

export const loadStereo = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/stereo?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/stereo?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadSolar1 = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/solar1?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/solar1?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadCrater = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/crater?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/crater?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadAceEpam = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${API_BASE}/ace/epam?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${API_BASE}/ace/epam?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadAceSis = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${API_BASE}/ace/sis?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${API_BASE}/ace/sis?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadSolar1Plasma = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/solar1/plasma?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/solar1/plasma?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadSolar1Mag = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/solar1/mag?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/solar1/mag?limit=${limit}`
  return fetch(url).then(safeJson)
}
