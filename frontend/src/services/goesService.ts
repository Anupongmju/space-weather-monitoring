import API_BASE from '../config'
const BASE = `${API_BASE}/goes`

// ── Fetch & Save ──
export const fetchAndSaveXray     = (): Promise<any> => fetch(`${BASE}/fetch/xray`, { method: 'POST' }).then(r => r.json())
export const fetchAndSaveProton   = (): Promise<any> => fetch(`${BASE}/fetch/proton`, { method: 'POST' }).then(r => r.json())
export const fetchAndSaveElectron = (): Promise<any> => fetch(`${BASE}/fetch/electron`, { method: 'POST' }).then(r => r.json())
export const fetchAndSaveGosMag   = (): Promise<any> => fetch(`${BASE}/fetch/mag`, { method: 'POST' }).then(r => r.json())
export const fetchAndSaveGoesWind = (): Promise<any> => fetch(`${BASE}/fetch/wind`, { method: 'POST' }).then(r => r.json())

export const fetchAllGOES = (): Promise<any> => fetch(`${BASE}/fetch`, { method: 'POST' }).then(r => r.json())

// ── Load from SQLite ──
export const loadXray = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/xray?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/xray?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadProton = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/proton?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/proton?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadElectron = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/electron?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/electron?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadGoesMag = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/mag?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/mag?limit=${limit}`
  return fetch(url).then(r => r.json())
}

export const loadGoesWind = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/wind?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/wind?limit=${limit}`
  return fetch(url).then(r => r.json())
}


export const loadSuviLoop = (wavelength: string, limit = 40): Promise<{ urls: string[]; error?: string }> =>
  fetch(`${BASE}/suvi-loop/${wavelength}?limit=${limit}`).then(r => r.json())

