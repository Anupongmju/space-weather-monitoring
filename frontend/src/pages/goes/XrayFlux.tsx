import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveXray, loadXray } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { formatPowerOf10, formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'
import { useTheme } from '../../context/ThemeContext'

// ── Flare classification ───────────────────────────────────────────
function getFlareClass(flux: number) {
  if (!flux) return { label: '-', color: '#606075' }
  if (flux >= 1e-3) return { label: 'X10', color: '#ff4040' }
  if (flux >= 1e-4) return { label: 'X', color: '#EF4444' }
  if (flux >= 1e-5) return { label: 'M', color: '#F97316' }
  if (flux >= 1e-6) return { label: 'C', color: '#d4c000' }
  if (flux >= 1e-7) return { label: 'B', color: '#22c55e' }
  return { label: 'A', color: '#3b82f6' }
}

// ── NOAA colored background bands ────────────────────────────────────
const getBandZones = (isLight: boolean) => [
  { yMin: 1e-9, yMax: 1e-8, color: isLight ? 'rgba(239, 246, 255, 0.45)' : 'rgba(8,8,14,0.95)' },
  { yMin: 1e-8, yMax: 1e-7, color: isLight ? 'rgba(236, 253, 245, 0.45)' : 'rgba(18,20,28,0.92)' },
  { yMin: 1e-7, yMax: 1e-6, color: isLight ? 'rgba(254, 252, 232, 0.45)' : 'rgba(14,26,16,0.90)' },
  { yMin: 1e-6, yMax: 1e-5, color: isLight ? 'rgba(254, 243, 199, 0.45)' : 'rgba(52,50,4,0.90)' },
  { yMin: 1e-5, yMax: 1e-4, color: isLight ? 'rgba(255, 237, 213, 0.45)' : 'rgba(80,36,4,0.90)' },
  { yMin: 1e-4, yMax: 1e-3, color: isLight ? 'rgba(254, 226, 226, 0.45)' : 'rgba(90,8,8,0.90)' },
  { yMin: 1e-3, yMax: 1e-2, color: isLight ? 'rgba(254, 202, 202, 0.55)' : 'rgba(60,0,0,0.96)' },
]

const BAND_LABELS = [
  { yMid: 3.16e-9, label: 'A0', color: '#555566' },
  { yMid: 3.16e-8, label: 'A', color: '#777788' },
  { yMid: 3.16e-7, label: 'B', color: '#4ade80' },
  { yMid: 3.16e-6, label: 'C', color: '#d4c000' },
  { yMid: 3.16e-5, label: 'M', color: '#F97316' },
  { yMid: 3.16e-4, label: 'X', color: '#EF4444' },
  { yMid: 3.16e-3, label: 'X10', color: '#ff4040' },
]

// ── Dense horizontal sub-gridlines on log scale ──────────────────────
function buildLogGrid(isLight: boolean) {
  const lines: any[] = []
  for (let exp = -9; exp <= -2; exp++) {
    for (let m = 1; m <= 9; m++) {
      lines.push({
        yAxis: m * Math.pow(10, exp),
        lineStyle: {
          color: m === 1
            ? (isLight ? 'rgba(0,0,0,0.14)' : 'rgba(200,200,220,0.14)')
            : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(200,200,220,0.06)'),
          type: 'solid',
          width: m === 1 ? 0.8 : 0.4,
        }
      })
    }
  }
  return lines
}

// ── Detect flare peaks ────────────────────────────────────────────────
function detectFlares(data: any[], selectedClasses: string[]) {
  if (data.length < 5 || selectedClasses.length === 0) return []
  const GAP = 8
  const events: { time: string; label: string }[] = []
  let lastIdx = -GAP - 1
  for (let i = 2; i < data.length - 2; i++) {
    const v = data[i].flux_long
    if (!v || v < 1e-8) continue
    const cls = getFlareClass(v)
    const baseClass = cls.label.startsWith('X') ? 'X' : cls.label

    if (!selectedClasses.includes(baseClass)) continue

    if (
      v >= data[i - 1].flux_long && v >= data[i - 2].flux_long &&
      v >= data[i + 1].flux_long && v >= data[i + 2].flux_long &&
      i - lastIdx > GAP
    ) {
      const base = v >= 1e-3 ? 1e-3 : v >= 1e-4 ? 1e-4 : v >= 1e-5 ? 1e-5 : v >= 1e-6 ? 1e-6 : v >= 1e-7 ? 1e-7 : 1e-8
      events.push({ time: data[i].time_tag, label: `${cls.label}${(v / base).toFixed(1)}` })
      lastIdx = i
    }
  }
  return events
}

export default function XrayFlux() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef(null)

  const [selectedClasses, setSelectedClasses] = useState<string[]>(['M', 'X'])

  const toggleClass = (cls: string) => {
    setSelectedClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    )
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadXray(0, start, end),
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined
      const d = await loadXray(limit, sDate, eDate)
      if (Array.isArray(d)) {
        setData(d)
      } else {
        setData([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveXray()
    } catch (e) { }
    await load(false)
    setFetching(false)
  }

  useEffect(() => {
    resetPan()
    load(true)
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    await load(false)
  }, 60000, !appliedRange)

  const latest = data[data.length - 1]
  const bzStatus = !latest ? 'offline' : latest.flux_long >= 1e-4 ? 'danger' : latest.flux_long >= 1e-5 ? 'warning' : 'normal'

  const tStart = data[0]?.time_tag
  const tEnd = data[data.length - 1]?.time_tag
  const logGridLines = buildLogGrid(isLight)
  const flareEvents = detectFlares(data, selectedClasses)
  const bandZones = getBandZones(isLight)

  const { minTs, maxTs } = getTimeDomain(data)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#93C5FD' : 'rgba(56,189,248,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#1A6DB5' : '#38BDF8', type: 'dashed', width: 1.5 } },
      formatter: (params: any[]) => {
        if (!params || !params.length) return ''
        const rawTime = params[0].data?.[0] || params[0].axisValue
        const dateStr = formatUTCTime(rawTime, true)
        let html = `<div style="font-family:var(--font-mono);font-size:13px;color:${isLight ? '#0284C7' : '#38BDF8'};font-weight:700;margin-bottom:6px;">🕒 ${dateStr}</div>`
        params.forEach(p => {
          if (!p.seriesName.startsWith('_')) {
            const val = p.data ? (p.data[1] != null ? p.data[1].toExponential(3) : 'null') : 'null'
            const cls = p.data && p.data[1] ? getFlareClass(p.data[1]).label : ''
            const clsBadge = cls && cls !== '-'
              ? `<span style="margin-left:6px;font-size:10px;padding:1px 4px;border-radius:2px;background:${p.color}33;color:${p.color};font-weight:bold">${cls}</span>`
              : ''
            html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px;">
              <span style="color:${isLight ? '#334155' : '#CBD5E1'}">${p.marker} ${p.seriesName}</span>
              <span style="font-weight:bold;color:${p.color}">${val} ${clsBadge}</span>
            </div>`
          }
        })
        return html
      }
    },
    grid: { top: 35, right: 90, bottom: 45, left: 85 },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        rangeMode: ['value', 'value'],
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
      }
    ],
    xAxis: {
      type: 'time',
      splitLine: { show: false },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      axisTick: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange)
    },
    yAxis: [
      {
        type: 'log',
        min: 1e-9,
        max: 1e-2,
        interval: 1,
        name: 'Watts / m²',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#0284C7' : '#38BDF8',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisTick: { show: false },
        axisLabel: {
          color: isLight ? '#475569' : '#E2E8F0',
          fontSize: 13,
          fontFamily: 'monospace, sans-serif',
          formatter: formatPowerOf10
        }
      },
      {
        type: 'log',
        min: 1e-9,
        max: 1e-2,
        position: 'right',
        splitLine: { show: false },
        axisLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisTick: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: {
          color: isLight ? '#0C1E35' : '#94A3B8',
          fontSize: 15,
          fontFamily: 'var(--font-mono), monospace',
          fontWeight: 800,
          formatter: (v: number) => {
            if (v === 1e-8) return 'A'
            if (v === 1e-7) return 'B'
            if (v === 1e-6) return 'C'
            if (v === 1e-5) return 'M'
            if (v === 1e-4) return 'X'
            if (v === 1e-3) return 'X10'
            return ''
          }
        }
      }
    ],
    series: [
      {
        name: '_bands', type: 'line', data: [], showSymbol: false, silent: true,
        markArea: {
          silent: true,
          data: bandZones.map(z => [
            { yAxis: z.yMin, itemStyle: { color: z.color } },
            { yAxis: z.yMax }
          ])
        }
      },
      {
        name: '_grid', type: 'line', data: [], showSymbol: false, silent: true,
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          label: { show: false },
          data: logGridLines.map(l => ([
            { coord: [tStart, l.yAxis], lineStyle: l.lineStyle },
            { coord: [tEnd, l.yAxis] }
          ]))
        }
      },
      {
        name: '_flares', type: 'line', data: [], showSymbol: false,
        markLine: {
          silent: false,
          symbol: ['none', 'none'],
          data: flareEvents.map(e => ({
            xAxis: e.time,
            lineStyle: { color: isLight ? '#D97706' : 'rgba(220,220,200,0.5)', type: 'solid', width: 1.2 },
            label: {
              show: true, position: 'insideStartBottom', color: isLight ? '#B45309' : '#eab308',
              fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700,
              formatter: e.label, rotate: 90, distance: 4
            }
          }))
        }
      },
      {
        name: '1-8 Å (Long)',
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2.2, color: isLight ? '#0284C7' : '#3498DB' },
        data: data.map(d => [d.time_tag, d.flux_long]),
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          data: [
            ...midnightDividers,
            ...BAND_LABELS.map(b => ([
              { coord: [tStart, b.yMid], lineStyle: { opacity: 0 } },
              {
                coord: [tEnd, b.yMid],
                lineStyle: { opacity: 0 },
                label: {
                  show: true,
                  position: 'end',
                  distance: 8,
                  formatter: b.label === 'A0' ? 'A0' : `Class ${b.label}`,
                  color: b.color,
                  fontSize: 14,
                  fontFamily: 'var(--font-mono), monospace',
                  fontWeight: 700,
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.9)',
                  borderColor: `${b.color}aa`,
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: [2, 6],
                }
              }
            ]))
          ]
        }
      },
      {
        name: '0.5-4 Å (Short)',
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2.2, color: isLight ? '#059669' : '#22c55e' },
        data: data.map(d => [d.time_tag, d.flux_short])
      }
    ]
  }

  const exportColumns = useMemo((): ExportColumn[] => [
    { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
    { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') },
    { key: 'flux_long', label: '1-8A_Long(W/m2)', width: 18 },
    { key: 'flux_short', label: '0.5-4A_Short(W/m2)', width: 18 },
    { key: 'flare_class', label: 'Flare_Class', width: 14, formatter: (_: any, r?: any) => getFlareClass(r?.flux_long).label }
  ], [])

  const exportTimeRange = appliedRange
    ? `${appliedRange.startDate} to ${appliedRange.endDate}`
    : `Past ${limit / 1440} Day(s)`

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 26, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(26, 109, 181, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#0C1E35' : '#3498DB',
            margin: 0,
            letterSpacing: -0.5
          }}>
            GOES / X-RAY FLUX
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Solar X-Ray Radiation Monitor · 1-8Å &amp; 0.5-4Å (Geostationary Orbit)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14, color: isLight ? '#1A6DB5' : '#3498DB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={bzStatus} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: isLight ? '#1A6DB5' : '#3498DB', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Dedicated Row 2 Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#1A6DB5' : '#3498DB'}
          loading={loading}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <Card
          title="SOLAR X-RAY FLUX"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {panLoading && (
                <span style={{ fontSize: 13, color: isLight ? '#1A6DB5' : '#3498DB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              <ExportChartMenu
                chartRef={chartRef}
                data={data}
                columns={exportColumns}
                metadata={{
                  station: 'GOES (GEOSTATIONARY ORBIT)',
                  viewTitle: 'SOLAR X-RAY FLUX',
                  description: 'Solar X-Ray Radiation Monitor: 1-8 Å (Long) and 0.5-4 Å (Short) Flux',
                  timeRangeText: exportTimeRange,
                  totalRecords: data.length
                }}
                filenameBase={`GOES_XRAY_FLUX_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                accentColor={isLight ? '#0284C7' : '#3498DB'}
              />
            </div>
          }
        >
          {/* Legend & Flare Filter Control */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {[
                { color: isLight ? '#0284C7' : '#3498DB', label: '1–8 Å (Long)' },
                { color: isLight ? '#059669' : '#22c55e', label: '0.5–4 Å (Short)' }
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-mono)', color: l.color, fontWeight: 600 }}>
                  <div style={{ width: 20, height: 3, background: l.color, borderRadius: 2 }} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Flare Multi-Select Class Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.7)',
                padding: '4px 8px',
                border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6
              }}>
                <span style={{ fontSize: 13, color: isLight ? '#475569' : '#94A3B8', fontFamily: 'var(--font-mono)', fontWeight: 600, paddingRight: 4 }}>
                  FLARE CLASSES:
                </span>
                {[
                  { key: 'A', color: '#3b82f6' },
                  { key: 'B', color: '#10b981' },
                  { key: 'C', color: isLight ? '#ca8a04' : '#d4c000' },
                  { key: 'M', color: '#F97316' },
                  { key: 'X', color: '#EF4444' },
                ].map(item => {
                  const isSelected = selectedClasses.includes(item.key)
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleClass(item.key)}
                      style={{
                        padding: '3px 9px',
                        fontSize: 13,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#FFFFFF' : (isLight ? '#475569' : '#64748B'),
                        background: isSelected ? item.color : (isLight ? '#FFFFFF' : 'transparent'),
                        border: `1px solid ${isSelected ? item.color : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)')}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 2px 6px ${item.color}44` : 'none'
                      }}
                    >
                      {isSelected ? '✓ ' : ''}{item.key}
                    </button>
                  )
                })}
                <div style={{ width: 1, height: 16, background: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
                <button
                  type="button"
                  onClick={() => setSelectedClasses(selectedClasses.length === 5 ? ['C', 'M', 'X'] : ['A', 'B', 'C', 'M', 'X'])}
                  style={{
                    padding: '2px 8px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: isLight ? '#1A6DB5' : '#3498DB',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {selectedClasses.length === 5 ? 'RESET' : 'ALL'}
                </button>
              </div>
              <div style={{ fontSize: 13, color: isLight ? '#475569' : '#94A3B8', fontFamily: 'var(--font-mono)', minWidth: 140, textAlign: 'right' }}>
                {flareEvents.length > 0
                  ? `${flareEvents.length} flare event${flareEvents.length > 1 ? 's' : ''} (${selectedClasses.length > 0 ? selectedClasses.slice().sort().join(',') : 'None'})`
                  : `No flares (${selectedClasses.length > 0 ? selectedClasses.slice().sort().join(',') : 'None'})`}
              </div>
            </div>
          </div>
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: 560, width: '100%' }}
            onChartReady={onChartReady}
            onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
          />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#1A6DB5' : '#3498DB'}
        tabs={[
          { id: 'usage', label: '01. USAGE (การใช้งาน)' },
          { id: 'impacts', label: '02. IMPACTS (ผลกระทบ)' },
          { id: 'details', label: '03. DETAILS (ข้อมูลอุปกรณ์)' },
          { id: 'credits', label: '04. DATA SOURCE & CREDITS (แหล่งข้อมูล)' }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              การปะทุจ้าและการแบ่งระดับความรุนแรง (Solar Flare Classification)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              เซนเซอร์ XRS (X-ray Sensor) บน GOES ตรวจวัดรังสีเอกซ์ช่วงความยาวคลื่น <strong>0.1 - 0.8 nm (Long)</strong> และ <strong>0.05 - 0.4 nm (Short)</strong> เพื่อแบ่งระดับความรุนแรงของ Solar Flare เป็น 5 ระดับ:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div style={{
                background: isLight ? '#F0F9FF' : 'rgba(255,255,255,0.02)',
                padding: 12,
                borderRadius: 6,
                borderLeft: '4px solid #38BDF8',
                border: isLight ? '1px solid #BAE6FD' : undefined
              }}>
                <strong style={{ color: '#0284C7', fontSize: 14, fontFamily: 'var(--font-mono)' }}>A-Class (ต่ำมาก)</strong>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: '4px 0 0' }}>ระดับพื้นฐานปกติ ไม่มีผลกระทบต่อโลก</p>
              </div>
              <div style={{
                background: isLight ? '#F0FDF4' : 'rgba(255,255,255,0.02)',
                padding: 12,
                borderRadius: 6,
                borderLeft: '4px solid #34D399',
                border: isLight ? '1px solid #BBF7D0' : undefined
              }}>
                <strong style={{ color: '#059669', fontSize: 14, fontFamily: 'var(--font-mono)' }}>B-Class (ระดับต่ำ)</strong>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: '4px 0 0' }}>การปะทุขนาดเล็กมาก ไม่ส่งผลกระทบ</p>
              </div>
              <div style={{
                background: isLight ? '#FEFCE8' : 'rgba(255,255,255,0.02)',
                padding: 12,
                borderRadius: 6,
                borderLeft: '4px solid #FBBF24',
                border: isLight ? '1px solid #FEF08A' : undefined
              }}>
                <strong style={{ color: '#CA8A04', fontSize: 14, fontFamily: 'var(--font-mono)' }}>C-Class (เล็กน้อย)</strong>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: '4px 0 0' }}>ส่งผลกระทบต่อโลกน้อยมาก</p>
              </div>
              <div style={{
                background: isLight ? '#FFF7ED' : 'rgba(255,255,255,0.02)',
                padding: 12,
                borderRadius: 6,
                borderLeft: '4px solid #FB923C',
                border: isLight ? '1px solid #FED7AA' : undefined
              }}>
                <strong style={{ color: '#EA580C', fontSize: 14, fontFamily: 'var(--font-mono)' }}>M-Class (ปานกลาง)</strong>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: '4px 0 0' }}>รบกวนสัญญาณวิทยุขั้วโลก และมักเกิด CME</p>
              </div>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 12,
                borderRadius: 6,
                borderLeft: '4px solid #F87171',
                border: isLight ? '1px solid #FECACA' : undefined
              }}>
                <strong style={{ color: '#DC2626', fontSize: 14, fontFamily: 'var(--font-mono)' }}>X-Class (รุนแรงสุด)</strong>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: '4px 0 0' }}>วิทยุขัดข้องวงกว้าง ก่อพายุแม่เหล็กโลก</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              สภาวะคลื่นวิทยุขัดข้อง (Radio Blackouts)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              รังสีเอกซ์เดินทางด้วยความเร็วแสง (ใช้เวลา 8 นาทีจากดวงอาทิตย์ถึงโลก) X-ray Flux จึงเป็นด่านแรกเตือนภัย Radio Blackouts:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>คลื่นวิทยุขัดข้องเฉียบพลัน</h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  รังสีเอกซ์เพิ่มความหนาแน่นในบรรยากาศชั้น D-region ดูดกลืนคลื่นวิทยุความถี่สูง (HF Radio) เครื่องบินและวิทยุขั้วโลกขาดการติดต่อ
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFF7ED' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FED7AA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#EA580C', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>สัญญาณนำทาง GPS ขัดข้อง</h5>
                <p style={{ color: isLight ? '#9A3412' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  ไอโอโนสเฟียร์ถูกรบกวนหักเหสัญญาณวิทยุจากดาวเทียม ทำให้ระบบ GPS/GNSS เบี่ยงเบนคลาดเคลื่อนในด้านกลางวัน
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              รายละเอียดทางเทคนิคของอุปกรณ์ XRS
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>GOES (Geostationary Operational Environmental Satellite) — NOAA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Geostationary Orbit (วงโคจรค้างฟ้าเหนือเส้นศูนย์สูตร)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>เครื่องมือวัดหลัก</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>X-Ray Sensor (XRS) หลอด Ionization Chamber 2 ช่องสัญญาณ</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ความละเอียดเวลา</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>ระดับวินาทีเพื่อความรวดเร็วในการแจ้งเตือนแบบทันทีทันใด</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              แหล่งที่มาของข้อมูล & เครดิต (Data Source & Credits)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 14px 0',
              lineHeight: '1.7'
            }}>
              ข้อมูลดัชนีและแผนภูมิกราฟรังสีเอกซ์จากดวงอาทิตย์ได้รับการสนับสนุนแบบสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#334155' : '#94A3B8' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#1A6DB5' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>National Oceanic and Atmospheric Administration (NOAA):</strong> โครงการดาวเทียม GOES
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#1A6DB5' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ประมวลผลและเตือนภัย Radio Blackouts API
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              fontSize: 13,
              color: isLight ? '#475569' : '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#1A6DB5' : '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
