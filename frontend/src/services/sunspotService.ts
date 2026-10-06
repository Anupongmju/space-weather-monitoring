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

export interface LoadMonthlySunspotParams {
  limit?: number;
  startYear?: number;
  endYear?: number;
}

export const loadMonthlySunspot = (
  limitOrParams?: number | LoadMonthlySunspotParams,
  startYear?: number,
  endYear?: number
): Promise<SunspotRecord[]> => {
  let lim: number | undefined;
  let start: number | undefined;
  let end: number | undefined;

  if (typeof limitOrParams === 'number') {
    lim = limitOrParams;
    start = startYear;
    end = endYear;
  } else if (limitOrParams && typeof limitOrParams === 'object') {
    lim = limitOrParams.limit;
    start = limitOrParams.startYear;
    end = limitOrParams.endYear;
  }

  const params = new URLSearchParams();
  if (lim !== undefined) params.append('limit', lim.toString());
  if (start !== undefined) params.append('start_year', start.toString());
  if (end !== undefined) params.append('end_year', end.toString());

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
