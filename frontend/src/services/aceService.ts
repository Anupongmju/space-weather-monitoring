import API_BASE from '../config'
import { safeJson } from '../utils/safeFetch'
const BASE = `${API_BASE}/ace`

// ── Fetch & Save (เรียก backend ให้ไปดึงและเก็บลง SQLite) ──
export const fetchAndSaveSwepam = (): Promise<any> => fetch(`${BASE}/fetch/swepam`, { method: 'POST' }).then(safeJson)
export const fetchAndSaveMag    = (): Promise<any> => fetch(`${BASE}/fetch/mag`,    { method: 'POST' }).then(safeJson)
export const fetchAndSaveEpam   = (): Promise<any> => fetch(`${BASE}/fetch/epam`,   { method: 'POST' }).then(safeJson)
export const fetchAndSaveSis    = (): Promise<any> => fetch(`${BASE}/fetch/sis`,    { method: 'POST' }).then(safeJson)
export const fetchAndSaveSwics  = (): Promise<any[]> => Promise.resolve([]) // ไม่มีข้อมูล

export const fetchAllACE = (): Promise<any> => fetch(`${BASE}/fetch`, { method: 'POST' }).then(safeJson)

// ── Load from SQLite (ดึงข้อมูลที่เก็บไว้มา plot) ──
export const loadSwepam = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/swepam?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/swepam?limit=${limit}`
  return fetch(url).then(safeJson)
}

// ── On-demand archive loader (does not store to DB) ──
export const fetchArchiveSwepam = (startDate: string, endDate: string, limit = 10000): Promise<any[]> => {
  const url = `${API_BASE}/archive/ace/swepam?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadMag = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/mag?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/mag?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadEpam = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/epam?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/epam?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadSis = (limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/sis?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/sis?limit=${limit}`
  return fetch(url).then(safeJson)
}

export const loadSwics  = (): Promise<any[]>             => Promise.resolve([])

