import API_BASE from '../config';

const BASE = `${API_BASE}/sunspot`;

export interface SunspotRecord {
  time_tag: string;
  year: number;
  month: number;
  fractional_year: number;
  sunspot_number: number;
  std_dev: number;
  obs_count: number;
  is_definitive: boolean;
}

export interface SunspotLatestResponse {
  status: string;
  latest?: SunspotRecord;
  avg_12m?: number;
  max_12m?: number;
  min_12m?: number;
}

export const loadMonthlySunspot = (
  limit?: number,
  startYear?: number,
  endYear?: number
): Promise<SunspotRecord[]> => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (startYear) params.append('start_year', startYear.toString());
  if (endYear) params.append('end_year', endYear.toString());

  const queryString = params.toString();
  const url = `${BASE}/monthly${queryString ? `?${queryString}` : ''}`;
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};

export const loadLatestSunspot = (): Promise<SunspotLatestResponse> => {
  return fetch(`${BASE}/latest`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};

export const triggerFetchSunspot = (): Promise<any> => {
  return fetch(`${BASE}/fetch`, { method: 'POST' }).then(r => r.json());
};
