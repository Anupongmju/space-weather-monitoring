/**
 * chartHelpers.ts
 * Standardized X-axis time formatting and Day Divider markLines for ECharts across the dashboard.
 */

/**
 * Creates a two-tier ECharts axisLabel configuration for time axes:
 * - At 00:00 UTC: highlighted date + '00:00 UTC'
 * - Multi-day (3D, 7D, custom): 'HH:mm' on top, 'DD MMM' on bottom
 * - 1-day: clean 'HH:mm'
 */
export function createTimeAxisLabel(isLight: boolean, isMultiDay = false) {
  return {
    show: true,
    color: isLight ? '#475569' : '#CBD5E1',
    fontSize: 11,
    fontFamily: 'monospace, sans-serif',
    formatter: (value: number) => {
      const d = new Date(value)
      if (isNaN(d.getTime())) return ''

      const hours = d.getUTCHours().toString().padStart(2, '0')
      const mins = d.getUTCMinutes().toString().padStart(2, '0')
      const timeStr = `${hours}:${mins}`

      const day = d.getUTCDate().toString().padStart(2, '0')
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      const weekday = d.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' })

      if (hours === '00' && mins === '00') {
        return `{midnightDate|${weekday} ${day} ${month}}\n{midnightTime|00:00 UTC}`
      }

      if (isMultiDay) {
        return `{time|${timeStr}}\n{date|${day} ${month}}`
      }

      return `{time|${timeStr}}`
    },
    rich: {
      midnightDate: {
        color: isLight ? '#0284C7' : '#38BDF8',
        fontWeight: 700,
        fontSize: 12,
        fontFamily: 'var(--font-mono), monospace',
        lineHeight: 16,
        align: 'center',
      },
      midnightTime: {
        color: isLight ? '#0369A1' : '#7DD3FC',
        fontWeight: 600,
        fontSize: 10,
        fontFamily: 'var(--font-mono), monospace',
        lineHeight: 14,
        align: 'center',
      },
      time: {
        color: isLight ? '#1E293B' : '#F1F5F9',
        fontWeight: 600,
        fontSize: 11,
        fontFamily: 'var(--font-mono), monospace',
        lineHeight: 15,
        align: 'center',
      },
      date: {
        color: isLight ? '#64748B' : '#94A3B8',
        fontWeight: 500,
        fontSize: 10,
        fontFamily: 'var(--font-mono), monospace',
        lineHeight: 14,
        align: 'center',
      },
    },
  }
}

/**
 * Returns UTC midnight timestamps strictly within (minTs, maxTs).
 */
export function getMidnightTimestamps(minTs?: number, maxTs?: number): number[] {
  if (!minTs || !maxTs || isNaN(minTs) || isNaN(maxTs) || minTs >= maxTs) return []
  const midnights: number[] = []
  const start = new Date(minTs)
  start.setUTCHours(0, 0, 0, 0)
  let curr = start.getTime()
  while (curr <= maxTs) {
    if (curr > minTs + 60000 && curr < maxTs - 60000) {
      midnights.push(curr)
    }
    curr += 24 * 60 * 60 * 1000
  }
  return midnights
}

/**
 * Creates subtle, thin vertical solid divider lines for 00:00 UTC midnights.
 */
export function getMidnightDividerMarkLines(midnightTimestamps: number[], isLight: boolean) {
  return midnightTimestamps.map(ts => ({
    xAxis: ts,
    lineStyle: {
      color: isLight ? 'rgba(2, 132, 199, 0.3)' : 'rgba(56, 189, 248, 0.25)',
      width: 1,
      type: 'solid' as const,
    },
    label: { show: false },
  }))
}

/**
 * Safely combines day divider markLines with user-drawn trendlines and extra reference lines (e.g. yAxis: 0).
 */
export function combineMarkLines(
  midnightDividers: any[] = [],
  userMarkLines?: any,
  extraLines: any[] = []
) {
  const userData = userMarkLines?.data || []
  const allData = [...midnightDividers, ...extraLines, ...userData]
  if (allData.length === 0) return undefined
  return {
    silent: true,
    symbol: ['none', 'none'],
    data: allData,
  }
}

/**
 * Extracts min and max timestamps from a dataset.
 */
export function getTimeDomain(data: any[], timeKey = 'time_tag') {
  if (!data || data.length === 0) return { minTs: undefined, maxTs: undefined }
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < data.length; i++) {
    const raw = Array.isArray(data[i]) ? data[i][0] : data[i][timeKey]
    if (raw) {
      const t = typeof raw === 'number' ? raw : new Date(raw).getTime()
      if (!isNaN(t)) {
        if (t < min) min = t
        if (t > max) max = t
      }
    }
  }
  return {
    minTs: min !== Infinity ? min : undefined,
    maxTs: max !== -Infinity ? max : undefined,
  }
}
