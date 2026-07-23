import API_BASE from '../config'
const BASE = `${API_BASE}/cosmic`

export interface Station {
  id: string;
  label: string;
  country: string;
}

export const STATIONS: Station[] = [
  { id: 'OULU',  label: 'Oulu',         country: 'Finland' },
  { id: 'AATB',  label: 'Alma-Ata',     country: 'Kazakhstan' },
  { id: 'APTY',  label: 'Apatity',      country: 'Russia' },
  { id: 'ATHN',  label: 'Athens',       country: 'Greece' },
  { id: 'BKSN',  label: 'Baksan',       country: 'Russia' },
  { id: 'CALG',  label: 'Calgary',      country: 'Canada' },
  { id: 'CALM',  label: 'Castilla-La Mancha', country: 'Spain' },
  { id: 'DRBS',  label: 'Dourbes',      country: 'Belgium' },
  { id: 'FSMT',  label: 'Fort Smith',   country: 'Canada' },
  { id: 'ICRO',  label: 'Rome',         country: 'Italy' },
  { id: 'INVK',  label: 'Inuvik',       country: 'Canada' },
  { id: 'IRKT',  label: 'Irkutsk',      country: 'Russia' },
  { id: 'JUNG1', label: 'Jungfraujoch', country: 'Switzerland' },
  { id: 'KERG',  label: 'Kerguelen',    country: 'Antarctica (France)' },
  { id: 'KIEL2', label: 'Kiel',         country: 'Germany' },
  { id: 'LMKS',  label: 'Lomnicky Stit',country: 'Slovakia' },
  { id: 'MOSC',  label: 'Moscow',       country: 'Russia' },
  { id: 'MXCO',  label: 'Mexico City',  country: 'Mexico' },
  { id: 'NAIN',  label: 'Nain',         country: 'Canada' },
  { id: 'NEWK',  label: 'Newark',       country: 'USA' },
  { id: 'PWNK',  label: 'Peawanuck',    country: 'Canada' },
  { id: 'ROME',  label: 'Rome',         country: 'Italy' },
  { id: 'SOPB',  label: 'South Pole B', country: 'Antarctica (USA)' },
  { id: 'SOPO',  label: 'South Pole',   country: 'Antarctica (USA)' },
  { id: 'TERA',  label: 'Terre Adelie', country: 'Antarctica (France)' },
  { id: 'THUL',  label: 'Thule',        country: 'Greenland' },
  { id: 'TXBY',  label: 'Tixie Bay',    country: 'Russia' },
  { id: 'YKTK',  label: 'Yakutsk',      country: 'Russia' }
]

// ── Fetch & Save ──
export const fetchAndSaveNeutron = (station = 'OULU', hours = 24): Promise<any> =>
  fetch(`${BASE}/fetch/${station}?hours=${hours}`, { method: 'POST' }).then(r => r.json())

export const fetchAllCosmic = (): Promise<any> =>
  fetch(`${BASE}/fetch`, { method: 'POST' }).then(r => r.json())

// ── Load from SQLite ──
export const loadNeutron = (station = 'OULU', limit = 1440): Promise<any[]> =>
  fetch(`${BASE}/neutron?station=${station}&limit=${limit}`).then(r => r.json())

export const loadNeutronWithFallback = async (
  stations = ['OULU', 'SOPO', 'JUNG1', 'THUL', 'MOSC', 'KIEL2'],
  limit = 1440
): Promise<{ station: string; data: any[] }> => {
  for (const st of stations) {
    try {
      const data = await loadNeutron(st, limit)
      const validData = data.filter((d: any) => d && d.count_rate > 0)
      if (validData.length > 0) {
        return { station: st, data: validData }
      }
    } catch (e) {
      console.warn(`Failed to load neutron data for station ${st}:`, e)
    }
  }
  return { station: stations[0], data: [] }
}

