import API_BASE from '../config';

const BASE = `${API_BASE}/geomag`;

export interface KpRecord {
  time_tag: string;
  kp: number | null;
  a_running: number | null;
  station_count: number | null;
}

export const loadKpIndex = (limit = 100, startDate?: string, endDate?: string): Promise<KpRecord[]> => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const url = `${BASE}/kp?${params.toString()}`;
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};

export const loadLatestKp = (): Promise<KpRecord> => {
  return fetch(`${BASE}/kp/latest`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};
