import API_BASE from '../config'
const BASE = `${API_BASE}/ace`

// ── Fetch & Save (เรียก backend ให้ไปดึงและเก็บลง SQLite) ──
export const fetchAndSaveSwepam = (): Promise<any> => fetch(`${BASE}/fetch/swepam`, { method: 'POST' }).then(r => r.json())
export const fetchAndSaveMag    = (): Promise<any> => fetch(`${BASE}/fetch/mag`,    { method: 'POST' }).then(r => r.json())
export const fetchAndSaveEpam   = (): Promise<any> => fetch(`${BASE}/fetch/epam`,   { method: 'POST' }).then(r => r.json())
export const fetchAndSaveSis    = (): Promise<any> => fetch(`${BASE}/fetch/sis`,    { method: 'POST' }).then(r => r.json())
export const fetchAndSaveSwics  = (): Promise<any[]> => Promise.resolve([]) // ไม่มีข้อมูล

export const fetchAllACE = (): Promise<any> => fetch('http://localhost:8000/ace/fetch', { method: 'POST' }).then(r => r.json())

// ── Load from SQLite (ดึงข้อมูลที่เก็บไว้มา plot) ──
export const loadSwepam = (limit = 1440): Promise<any[]> => fetch(`${BASE}/swepam?limit=${limit}`).then(r => r.json())
export const loadMag    = (limit = 1440): Promise<any[]> => fetch(`${BASE}/mag?limit=${limit}`).then(r => r.json())
export const loadEpam   = (limit = 1440): Promise<any[]> => fetch(`${BASE}/epam?limit=${limit}`).then(r => r.json())
export const loadSis    = (limit = 1440): Promise<any[]> => fetch(`${BASE}/sis?limit=${limit}`).then(r => r.json())
export const loadSwics  = (): Promise<any[]>             => Promise.resolve([])
