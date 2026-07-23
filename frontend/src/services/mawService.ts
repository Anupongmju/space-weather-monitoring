import API_BASE from '../config'
const BASE = `${API_BASE}/maw`

export const fetchMawToday = (): Promise<any> => fetch(`${BASE}/fetch/today`,{method:'POST'}).then(r => r.json())

export const fetchMawRange = (days = 7): Promise<any> => fetch(`${BASE}/fetch/range?days=${days}`,{method:'POST'}).then(r => r.json())
export const loadMawData = (limit = 1440): Promise<any[]> => fetch(`${BASE}/data?limit=${limit}`).then(r => r.json())
export const loadMawRange = (start: string, end: string): Promise<any[]> => fetch(`${BASE}/data/range?start=${start}&end=${end}`).then(r => r.json())
export const loadMawDates = (): Promise<any[]> => fetch(`${BASE}/dates`).then(r => r.json())
export const loadMawScatter = (limit = 1440): Promise<any[]> => fetch(`${BASE}/scatter?limit=${limit}`).then(r => r.json())
