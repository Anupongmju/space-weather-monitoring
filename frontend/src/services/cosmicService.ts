import API_BASE from '../config'
const BASE = `${API_BASE}/cosmic`

export interface Station {
  id: string;
  label: string;
  country: string;
}

export const STATIONS: Station[] = [
  { id: 'PSNM',  label: 'Doi Inthanon', country: 'Thailand' },
  { id: 'OULU',  label: 'Oulu',         country: 'Finland' },
  { id: 'SOPO',  label: 'South Pole',   country: 'Antarctica (USA)' },
  { id: 'AATB',  label: 'Alma-Ata',     country: 'Kazakhstan' },
  { id: 'APTY',  label: 'Apatity',      country: 'Russia' },
  { id: 'ATHN',  label: 'Athens',       country: 'Greece' },
  { id: 'BKSN',  label: 'Baksan',       country: 'Russia' },
  { id: 'BRBG',  label: 'Barentsburg',  country: 'Norway' },
  { id: 'CALG',  label: 'Calgary',      country: 'Canada' },
  { id: 'CALM',  label: 'Castilla-La Mancha', country: 'Spain' },
  { id: 'CAPS',  label: 'Cape Schmidt', country: 'Russia' },
  { id: 'CHAC',  label: 'Chacaltaya',   country: 'Bolivia' },
  { id: 'DRBS',  label: 'Dourbes',      country: 'Belgium' },
  { id: 'EREV',  label: 'Erevan',       country: 'Armenia' },
  { id: 'FSMT',  label: 'Fort Smith',   country: 'Canada' },
  { id: 'HERM',  label: 'Hermanus',     country: 'South Africa' },
  { id: 'HLKL',  label: 'Haleakala',    country: 'USA (Hawaii)' },
  { id: 'INVK',  label: 'Inuvik',       country: 'Canada' },
  { id: 'IRKT',  label: 'Irkutsk',      country: 'Russia' },
  { id: 'JBGO',  label: 'Jang Bogo',    country: 'South Korea' },
  { id: 'JUAN',  label: 'Juan Carlos I',country: 'Spain' },
  { id: 'JUNG',  label: 'Jungfraujoch', country: 'Switzerland' },
  { id: 'JUNG1', label: 'Jungfraujoch 1', country: 'Switzerland' },
  { id: 'KERG',  label: 'Kerguelen',    country: 'Antarctica (France)' },
  { id: 'KGN2',  label: 'King George',  country: 'Chile' },
  { id: 'KIEL2', label: 'Kiel',         country: 'Germany' },
  { id: 'KIEV',  label: 'Kiev',         country: 'Ukraine' },
  { id: 'LDVL',  label: 'Leadville',    country: 'USA' },
  { id: 'LMKS',  label: 'Lomnicky Stit',country: 'Slovakia' },
  { id: 'MGDN',  label: 'Magadan',      country: 'Russia' },
  { id: 'MOSC',  label: 'Moscow',       country: 'Russia' },
  { id: 'MTHM',  label: 'Mt Hermon',    country: 'Israel' },
  { id: 'MWSN',  label: 'Mawson',       country: 'Antarctica (Australia)' },
  { id: 'MXCO',  label: 'Mexico City',  country: 'Mexico' },
  { id: 'NAIN',  label: 'Nain',         country: 'Canada' },
  { id: 'NEWK',  label: 'Newark',       country: 'USA' },
  { id: 'NRLK',  label: 'Norilsk',      country: 'Russia' },
  { id: 'NVBK',  label: 'Novosibirsk',  country: 'Russia' },
  { id: 'POTC',  label: 'Potchefstroom',country: 'South Africa' },
  { id: 'PWNK',  label: 'Peawanuck',    country: 'Canada' },
  { id: 'ROME',  label: 'Rome',         country: 'Italy' },
  { id: 'SNAE',  label: 'SANAE IV',     country: 'South Africa' },
  { id: 'TBLS',  label: 'Tbilisi',      country: 'Georgia' },
  { id: 'TERA',  label: 'Terre Adelie', country: 'Antarctica (France)' },
  { id: 'THUL',  label: 'Thule',        country: 'Greenland' },
  { id: 'TIBT',  label: 'Tibet',        country: 'China' },
  { id: 'TSMB',  label: 'Tsumeb',       country: 'Namibia' },
  { id: 'TURK',  label: 'Turku',        country: 'Finland' },
  { id: 'TXBY',  label: 'Tixie Bay',    country: 'Russia' },
  { id: 'YKTK',  label: 'Yakutsk',      country: 'Russia' }
]

// ── Fetch & Save ──
export const fetchAndSaveNeutron = (station = 'OULU', hours = 24): Promise<any> =>
  fetch(`${BASE}/fetch/${station}?hours=${hours}`, { method: 'POST' }).then(r => r.json())

export const fetchAllCosmic = (): Promise<any> =>
  fetch(`${BASE}/fetch`, { method: 'POST' }).then(r => r.json())

// ── Load from SQLite ──
export const loadNeutron = (station = 'OULU', limit = 1440, startDate?: string, endDate?: string): Promise<any[]> => {
  const url = (startDate && endDate)
    ? `${BASE}/neutron?station=${encodeURIComponent(station)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
    : `${BASE}/neutron?station=${encodeURIComponent(station)}&limit=${limit}`
  return fetch(url).then(r => r.json())
}


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

