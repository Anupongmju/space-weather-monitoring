import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveGoesWind, loadGoesWind } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'

export default function SolarWind() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef<any>(null)

  // ── Trend Line Drawing ───────────────────────────────────────────────
  const { lines, drawingMode, pendingP1, toggleDrawingMode, handleClick, removeLine, clearLines } = useLineDrawing()

  // Wrapper div ref — used to compute pixel ↔ chart-coordinate conversion
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  // Mouse position for the SVG ghost-line preview
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // ── ECharts coordinate helpers ──────────────────────────────────────

  /** Detect which ECharts grid (0–2) the mouse is inside using containPixel */
  const detectGrid = useCallback((clientX: number, clientY: number): number | null => {
    const instance = (chartRef.current as any)?.getEchartsInstance?.()
    if (!instance) return null
    const rect = chartWrapperRef.current?.getBoundingClientRect()
    if (!rect) return null
    const px = clientX - rect.left
    const py = clientY - rect.top
    for (let i = 0; i < 3; i++) {
      try { if (instance.containPixel({ gridIndex: i }, [px, py])) return i } catch { }
    }
    return null
  }, [])

  /** client pixel → { time (ms), value } for a given gridIndex */
  const pixelToCoord = useCallback((clientX: number, clientY: number, gridIndex: number) => {
    const instance = (chartRef.current as any)?.getEchartsInstance?.()
    if (!instance) return null
    const rect = chartWrapperRef.current?.getBoundingClientRect()
    if (!rect) return null
    const px = clientX - rect.left
    const py = clientY - rect.top
    try {
      const pt = instance.convertFromPixel({ gridIndex }, [px, py])
      if (!pt) return null
      return { time: pt[0], value: pt[1] }
    } catch {
      return null
    }
  }, [])

  /** { time (ms), value } → chart-wrapper-relative pixel [x, y] */
  const coordToPixel = useCallback((time: number, value: number, gridIndex: number) => {
    const instance = (chartRef.current as any)?.getEchartsInstance?.()
    if (!instance) return null
    try {
      const px = instance.convertToPixel({ gridIndex }, [time, value])
      return px ? { x: px[0], y: px[1] } : null
    } catch {
      return null
    }
  }, [])

  // Pixel position of pending P1 for the ghost line
  const p1Pixel = pendingP1 ? coordToPixel(pendingP1.time, pendingP1.value, pendingP1.gridIndex) : null

  // ─────────────────────────────────────────────────────────────────────

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadGoesWind(0, start, end),
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined
      const d = await loadGoesWind(limit, sDate, eDate)
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
      await fetchAndSaveGoesWind()
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

  const { minTs, maxTs } = getTimeDomain(data)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  const buildUserMarkLines = (gi: number) => {
    const filtered = lines.filter(l => l.gridIndex === gi)
    if (filtered.length === 0) return undefined
    return {
      data: filtered.map(l => [
        { coord: [l.p1.time, l.p1.value], itemStyle: { color: l.color } },
        { coord: [l.p2.time, l.p2.value], itemStyle: { color: l.color }, lineStyle: { color: l.color, width: 1.8, opacity: 0.9 }, label: { show: false } }
      ])
    }
  }

  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#FDE68A' : 'rgba(245,158,11,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#D97706' : '#F59E0B', type: 'dashed', width: 1.5 } },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const rawTime = params[0]?.value ? params[0].value[0] : (params[0]?.axisValue || '')
        const timeStr = formatUTCTime(rawTime, true)
        let html = `<div style="font-family:var(--font-mono);font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};font-weight:700;color:${isLight ? '#D97706' : '#F59E0B'}">
          🕒 ${timeStr}
        </div>`
        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          const valStr = typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;margin:3px 0;font-family:var(--font-mono);">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
            </span>
            <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr}</strong>
          </div>`
        })
        return html
      }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 35, left: 85, right: 20, height: '26%' },    // Grid 0: Density
      { top: '38%', left: 85, right: 20, height: '26%' },   // Grid 1: Speed
      { top: '69%', left: 85, right: 20, height: '24%' }    // Grid 2: Temperature
    ],
    xAxis: [
      {
        gridIndex: 0,
        type: 'time',
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'time',
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
        type: 'time',
        axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange),
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'value',
        name: 'Density (p/cc)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#B45309' : '#FBBF24',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'value',
        name: 'Speed (km/s)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#C2410C' : '#FB923C',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
        type: 'value',
        name: 'Temp (K)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#0284C7' : '#38BDF8',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1, 2],
        filterMode: 'none',
        rangeMode: ['value', 'value'],
        zoomOnMouseWheel: !drawingMode,
        moveOnMouseMove: !drawingMode,
        ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
      }
    ],
    series: [
      {
        name: 'Density',
        type: 'line',
        xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false,
        itemStyle: { color: isLight ? '#D97706' : '#FBBF24' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.density]),
        markLine: combineMarkLines(midnightDividers, buildUserMarkLines(0)),
      },
      {
        name: 'Speed',
        type: 'line',
        xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false,
        itemStyle: { color: isLight ? '#EA580C' : '#FB923C' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.speed]),
        markLine: combineMarkLines(midnightDividers, buildUserMarkLines(1)),
      },
      {
        name: 'Temperature',
        type: 'line',
        xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false,
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.temperature]),
        markLine: combineMarkLines(midnightDividers, buildUserMarkLines(2)),
      },
    ]
  }

  // ── Stats for each committed line ──────────────────────────────────────
  const GRID_UNITS = ['p/cc', 'km/s', 'K']

  function fmtDuration(ms: number) {
    const totalMin = Math.round(Math.abs(ms) / 60000)
    const h = Math.floor(totalMin / 60), m = totalMin % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  function fmtValue(v: number, gridIndex: number) {
    return gridIndex === 2 ? Math.round(v).toLocaleString() : v.toFixed(2)
  }

  const exportColumns = useMemo((): ExportColumn[] => [
    { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
    { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') },
    { key: 'density', label: 'Proton_Density(p/cc)', width: 20 },
    { key: 'speed', label: 'Bulk_Speed(km/s)', width: 18 },
    { key: 'temperature', label: 'Ion_Temperature(K)', width: 20 }
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
            fontSize: 27,
            fontWeight: 700,
            color: isLight ? '#0C1E35' : '#F59E0B',
            margin: 0,
            letterSpacing: -0.5
          }}>
            GOES / SOLAR WIND PLASMA
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 14.5,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Real-Time Solar Wind Density, Speed &amp; Temperature (GOES &amp; DSCOVR Observatories)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14.5, color: isLight ? '#D97706' : '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '5px 12px', background: 'transparent', border: 'none',
              color: isLight ? '#D97706' : '#F59E0B', fontFamily: 'var(--font-mono)', fontSize: 14.5, fontWeight: 600,
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
          accentColor={isLight ? '#D97706' : '#F59E0B'}
          loading={loading}
        />
      </div>

      {/* Main Multi-Grid Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="GOES SOLAR WIND PLASMA METRICS (REAL-TIME)"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {panLoading && (
                <span style={{ fontSize: 14, color: isLight ? '#D97706' : '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              {/* ── Trend Line Toolbar ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {drawingMode && (
                  <span style={{
                    fontSize: 14, fontFamily: 'var(--font-mono)',
                    color: pendingP1 ? (isLight ? '#D97706' : '#FBBF24') : (isLight ? '#7C3AED' : '#A78BFA'),
                    fontWeight: 700, letterSpacing: 0.3,
                  }}>
                    {pendingP1 ? '● P1 SET — CLICK P2' : '○ CLICK P1 ON ANY CHART'}
                  </span>
                )}
                <button
                  onClick={toggleDrawingMode}
                  title="วาดเส้น trend line: คลิก P1 → คลิก P2"
                  style={{
                    padding: '5px 12px',
                    background: drawingMode ? (isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(167,139,250,0.2)') : (isLight ? '#FFFFFF' : 'transparent'),
                    border: `1px solid ${drawingMode ? (isLight ? '#7C3AED' : '#A78BFA') : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)')}`,
                    color: drawingMode ? (isLight ? '#7C3AED' : '#A78BFA') : (isLight ? '#334155' : '#94A3B8'),
                    fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: 0.5,
                    transition: 'all 0.2s', borderRadius: 4,
                  }}
                >
                  {drawingMode ? '╱ DRAWING ON' : '╱ DRAW LINE'}
                </button>
                {lines.length > 0 && (
                  <button
                    onClick={clearLines}
                    style={{
                      padding: '5px 12px', background: isLight ? '#FEF2F2' : 'transparent',
                      border: `1px solid ${isLight ? '#FECACA' : 'rgba(248,113,113,0.4)'}`,
                      color: '#DC2626',
                      fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', letterSpacing: 0.5, borderRadius: 4,
                    }}
                  >
                    CLEAR ({lines.length})
                  </button>
                )}
              </div>
              <ExportChartMenu
                chartRef={chartRef}
                data={data}
                columns={exportColumns}
                metadata={{
                  station: 'GOES / DSCOVR (L1 ORBIT)',
                  viewTitle: 'GOES SOLAR WIND PLASMA METRICS',
                  description: 'Real-Time Solar Wind Plasma: Proton Density, Bulk Speed, and Ion Temperature',
                  timeRangeText: exportTimeRange,
                  totalRecords: data.length
                }}
                filenameBase={`GOES_SOLAR_WIND_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                accentColor={isLight ? '#D97706' : '#F59E0B'}
              />
            </div>
          }
        >
          {/* ── Chart wrapper with interactive SVG overlay ── */}
          <div
            ref={chartWrapperRef}
            style={{
              position: 'relative', height: 580, width: '100%',
              cursor: drawingMode ? 'crosshair' : 'default',
            }}
            onClick={(e) => {
              if (!drawingMode) return
              const gIdx = detectGrid(e.clientX, e.clientY)
              if (gIdx == null) return
              const coord = pixelToCoord(e.clientX, e.clientY, gIdx)
              if (coord == null) return
              handleClick(coord.time, coord.value, gIdx)
            }}
            onMouseMove={(e) => {
              if (!drawingMode || !pendingP1) { setMousePos(null); return }
              const rect = chartWrapperRef.current?.getBoundingClientRect()
              if (!rect) return
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
            onMouseLeave={() => setMousePos(null)}
          >
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: 580, width: '100%' }}
              onChartReady={onChartReady}
              onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
            />

            {/* ── SVG overlay: ghost line + committed line endpoints + stats ── */}
            <svg
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none', overflow: 'visible',
              }}
            >
              {/* Ghost preview line from P1 to mouse */}
              {drawingMode && p1Pixel && mousePos && (
                <line
                  x1={p1Pixel.x} y1={p1Pixel.y}
                  x2={mousePos.x} y2={mousePos.y}
                  stroke={isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)'}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
              )}
              {/* P1 pending dot */}
              {drawingMode && p1Pixel && (
                <circle cx={p1Pixel.x} cy={p1Pixel.y} r={5}
                  fill={isLight ? '#7C3AED' : '#A78BFA'}
                  stroke={isLight ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                  strokeWidth={1.5}
                />
              )}
            </svg>

            {/* ── Stats panels for each committed line ── */}
            {lines.map(l => {
              const px1 = coordToPixel(l.p1.time, l.p1.value, l.gridIndex)
              const px2 = coordToPixel(l.p2.time, l.p2.value, l.gridIndex)
              if (!px1 || !px2) return null

              const pct = l.p1.value !== 0
                ? ((l.p2.value - l.p1.value) / Math.abs(l.p1.value)) * 100
                : 0
              const delta = l.p2.value - l.p1.value
              const duration = fmtDuration(l.p2.time - l.p1.time)
              const pctColor = pct >= 0 ? (isLight ? '#059669' : '#34D399') : (isLight ? '#DC2626' : '#F87171')
              const unit = GRID_UNITS[l.gridIndex]

              // Place stats label at midpoint of line
              const midX = (px1.x + px2.x) / 2
              const midY = (px1.y + px2.y) / 2

              return (
                <div key={l.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {/* Endpoint dots (double-click to remove) */}
                  {[px1, px2].map((pt, i) => (
                    <div
                      key={i}
                      title="ดับเบิลคลิกเพื่อลบเส้น"
                      onDoubleClick={(e) => { e.stopPropagation(); removeLine(l.id) }}
                      style={{
                        position: 'absolute',
                        left: pt.x - 5, top: pt.y - 5,
                        width: 10, height: 10, borderRadius: '50%',
                        background: l.color,
                        border: '1.5px solid rgba(255,255,255,0.9)',
                        boxShadow: `0 0 6px ${l.color}`,
                        cursor: 'pointer',
                        pointerEvents: 'all',
                        zIndex: 10,
                      }}
                    />
                  ))}

                  {/* Stats badge at midpoint */}
                  <div style={{
                    position: 'absolute',
                    left: midX + 8,
                    top: midY - 36,
                    background: isLight ? '#FFFFFF' : 'rgba(5,10,20,0.92)',
                    border: `1px solid ${l.color}`,
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 20,
                    boxShadow: isLight ? '0 4px 14px rgba(0,0,0,0.12)' : `0 2px 12px rgba(0,0,0,0.6), 0 0 8px ${l.color}22`,
                  }}>
                    <div style={{ color: l.color, fontWeight: 700, marginBottom: 2, letterSpacing: 0.3 }}>
                      ▲ {fmtValue(l.p1.value, l.gridIndex)} → {fmtValue(l.p2.value, l.gridIndex)} {unit}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: pctColor, fontWeight: 700 }}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                      <span style={{ color: isLight ? '#475569' : '#94A3B8' }}>
                        {delta >= 0 ? '+' : ''}{fmtValue(delta, l.gridIndex)}
                      </span>
                      <span style={{ color: isLight ? '#64748B' : '#64748B' }}>{duration}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#D97706' : '#F59E0B'}
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
              fontSize: 17,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              องค์ประกอบและการวัดค่าของลมสุริยะ (Solar Wind Plasma)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 14.5,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>Solar Wind</strong> (ลมสุริยะ) คือ ลำของอนุภาคพลาสม่ามีประจุพลังงานสูงที่ไหลออกจากชั้นบรรยากาศดวงอาทิตย์:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#D97706' : '#F59E0B'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 14.5 }}>Density (ความหนาแน่นพลาสม่า):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 14.5, marginLeft: 6 }}>ความหนาแน่นโปรตอน (p/cc) บ่งบอกมวลอนุภาคที่กำลังเข้าปะทะโลก</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#EA580C' : '#FB923C'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 14.5 }}>Speed (ความเร็วลมสุริยะ):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 14.5, marginLeft: 6 }}>ความเร็วเฉลี่ย (km/s) ปกติ 300-500 km/s หากเกิด CME อาจพุ่งเกิน 1,000 km/s</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 14.5 }}>Temperature (อุณหภูมิ):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 14.5, marginLeft: 6 }}>ระดับพลังงานจลน์ความร้อนของไอออน (K) บ่งบอกความสั่นสะเทือนพลังงาน</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 17,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              ผลกระทบของลมสุริยะความเร็วสูง (Space Weather Impacts)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 14.5,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              การปะทะของลมสุริยะความเร็วสูง (High-Speed Streams) ส่งผลต่ออวกาศรอบโลก:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>การบีบอัดสนามแม่เหล็กโลก</h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 14, margin: 0, lineHeight: '1.6' }}>
                  ความเร็วและความหนาแน่นสูงถ่ายโอนพลังงานจลน์ บีบเกราะแม่เหล็กโลก ก่อพายุแม่เหล็กโลก (Geomagnetic Storm)
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFF7ED' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FED7AA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#EA580C', margin: '0 0 6px 0', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>ขัดข้องดาวเทียม &amp; GPS</h5>
                <p style={{ color: isLight ? '#9A3412' : '#94A3B8', fontSize: 14, margin: 0, lineHeight: '1.6' }}>
                  ประจุไฟฟ้าสะสมผิวนอกดาวเทียมและไอโอโนสเฟียร์ถูกรบกวน ส่งผลให้สัญญาณ GPS และสื่อสารเบี่ยงเบน
                </p>
              </div>
              <div style={{
                background: isLight ? '#F0FDF4' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #BBF7D0' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#059669', margin: '0 0 6px 0', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>การเกิดแสงออโรรา (Aurora)</h5>
                <p style={{ color: isLight ? '#166534' : '#94A3B8', fontSize: 14, margin: 0, lineHeight: '1.6' }}>
                  อนุภาคพลังงานสูงเล็ดลอดตามแนวขั้วโลก ปะทะแก๊สในบรรยากาศชั้นบนเกิดแสงออโรราสว่างไสว
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
              fontSize: 17,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              รายละเอียดทางเทคนิคของระบบวิเคราะห์ลมสุริยะ
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>แหล่งข้อมูลดาวเทียมหลัก</td>
                  <td style={{ padding: '8px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>DSCOVR (Deep Space Climate Observatory) — NOAA / NASA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ตำแหน่งการวัดค่า</td>
                  <td style={{ padding: '8px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>จุดลากรานจ์ L1 (ห่างจากโลก 1.5 ล้าน กม. ทางดวงอาทิตย์)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>พารามิเตอร์วัดหลัก</td>
                  <td style={{ padding: '8px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Density (p/cc), Speed (km/s), Temperature (K)</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ความครอบคลุมย้อนหลัง</td>
                  <td style={{ padding: '8px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>7 วันล่าสุดแบบเรียลไทม์ละเอียดสูง</td>
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
              fontSize: 17,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              แหล่งที่มาของข้อมูล &amp; เครดิต (Data Source &amp; Credits)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 14.5,
              margin: '0 0 14px 0',
              lineHeight: '1.7'
            }}>
              ข้อมูลและภาพกราฟทั้งหมดได้รับการสนับสนุนสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: isLight ? '#334155' : '#94A3B8' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#D97706' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์เฝ้าระวังสภาพอากาศอวกาศ NOAA
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#D97706' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>DSCOVR &amp; ACE Missions (NASA / NOAA):</strong> ดาวเทียมตรวจลมสุริยะจุด L1
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              fontSize: 14,
              color: isLight ? '#475569' : '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#D97706' : '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC Plasma Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}