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
export const loadXray     = (limit = 1440): Promise<any[]> => fetch(`${BASE}/xray?limit=${limit}`).then(r => r.json())
export const loadProton   = (limit = 1440): Promise<any[]> => fetch(`${BASE}/proton?limit=${limit}`).then(r => r.json())
export const loadElectron = (limit = 1440): Promise<any[]> => fetch(`${BASE}/electron?limit=${limit}`).then(r => r.json())
export const loadGoesMag  = (limit = 1440): Promise<any[]> => fetch(`${BASE}/mag?limit=${limit}`).then(r => r.json())
export const loadGoesWind = (limit = 1440): Promise<any[]> => fetch(`${BASE}/wind?limit=${limit}`).then(r => r.json())

export const loadSuviLoop = (wavelength: string, limit = 40): Promise<{ urls: string[]; error?: string }> =>
  fetch(`${BASE}/suvi-loop/${wavelength}?limit=${limit}`).then(r => r.json())

