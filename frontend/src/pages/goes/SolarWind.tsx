import { useEffect, useState, useRef, useCallback } from 'react'
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

export default function SolarWind(){
  const [data,setData] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [fetching,setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(360)
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
      try { if (instance.containPixel({ gridIndex: i }, [px, py])) return i } catch {}
    }
    return null
  }, [])

  /** client pixel → { time (ms), value } for a given gridIndex */
  const pixelToCoord = useCallback((clientX: number, clientY: number, gridIndex: number) => {
    const instance = (chartRef.current as any)?.getEchartsInstance?.()
    if (!instance) return null
    const rect = chartWrapperRef.current?.getBoundingClientRect()
    if (!rect) return null
    const result = instance.convertFromPixel({ gridIndex }, [clientX - rect.left, clientY - rect.top])
    if (!Array.isArray(result)) return null
    return { time: result[0] as number, value: result[1] as number }
  }, [])

  /** { time, value } → { x, y } pixel offset from chartWrapper top-left */
  const coordToPixel = useCallback((time: number, value: number, gridIndex: number) => {
    const instance = (chartRef.current as any)?.getEchartsInstance?.()
    if (!instance) return null
    const result = instance.convertToPixel({ gridIndex }, [time, value])
    if (!Array.isArray(result)) return null
    return { x: result[0] as number, y: result[1] as number }
  }, [])

  // ── P1 pixel position (for ghost line anchor) ────────────────────────
  const p1Pixel = pendingP1
    ? coordToPixel(pendingP1.time, pendingP1.value, pendingP1.gridIndex)
    : null

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined
      const d = await loadGoesWind(limit, sDate, eDate)
      if (Array.isArray(d)) {
        setData(d)
      }
    } catch (err) {
      console.error('Failed to load solar wind data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }
  
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveGoesWind()
    } catch(e) {}
    await load(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadGoesWind(0, start, end),
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    load(true)
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    await load(false)
  }, 60000, !appliedRange)

  const latest = data[data.length - 1]

  // Time calculations for keeping latest data centered with space on the right
  const times = data.map(d => new Date(d.time_tag).getTime()).filter(t => !isNaN(t))
  const minT = times.length ? Math.min(...times) : undefined
  const maxT = times.length ? Math.max(...times) : undefined
  const diff = (minT !== undefined && maxT !== undefined) ? maxT - minT : 0
  const visibleMax = (maxT !== undefined && diff > 0) ? maxT + diff * 0.5 : undefined

  // Multi-grid ECharts option configuration
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(245,158,11,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: '#F59E0B', type: 'dashed', width: 1.5 } }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 35, left: 65, right: 20, height: 120 },    // Grid 0: Density
      { top: 190, left: 65, right: 20, height: 120 },   // Grid 1: Speed
      { top: 345, left: 65, right: 20, height: 120 }    // Grid 2: Temperature
    ],
    xAxis: [
      {
        gridIndex: 0,
        type: 'time',
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'time',
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
        type: 'time',
        axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'value',
        name: 'Density (p/cc)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#FBBF24', fontSize: 10, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'value',
        name: 'Speed (km/s)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#F59E0B', fontSize: 10, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
        type: 'value',
        name: 'Temp (K)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#38BDF8', fontSize: 10, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
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
        itemStyle: { color: '#FBBF24' },
        lineStyle: { width: 2 },
        data: data.map(d => [d.time_tag, d.density]),
        markLine: lines.filter(l => l.gridIndex === 0).length > 0 ? {
          silent: true, symbol: ['circle', 'circle'],
          symbolSize: 6,
          data: lines.filter(l => l.gridIndex === 0).map(l => [
            { coord: [l.p1.time, l.p1.value], itemStyle: { color: l.color } },
            { coord: [l.p2.time, l.p2.value], itemStyle: { color: l.color },
              lineStyle: { color: l.color, width: 1.5, opacity: 0.9 },
              label: { show: false } }
          ])
        } : undefined,
      },
      {
        name: 'Speed',
        type: 'line',
        xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false,
        itemStyle: { color: '#FB923C' },
        lineStyle: { width: 2 },
        data: data.map(d => [d.time_tag, d.speed]),
        markLine: lines.filter(l => l.gridIndex === 1).length > 0 ? {
          silent: true, symbol: ['circle', 'circle'],
          symbolSize: 6,
          data: lines.filter(l => l.gridIndex === 1).map(l => [
            { coord: [l.p1.time, l.p1.value], itemStyle: { color: l.color } },
            { coord: [l.p2.time, l.p2.value], itemStyle: { color: l.color },
              lineStyle: { color: l.color, width: 1.5, opacity: 0.9 },
              label: { show: false } }
          ])
        } : undefined,
      },
      {
        name: 'Temperature',
        type: 'line',
        xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false,
        itemStyle: { color: '#38BDF8' },
        lineStyle: { width: 2 },
        data: data.map(d => [d.time_tag, d.temperature]),
        markLine: lines.filter(l => l.gridIndex === 2).length > 0 ? {
          silent: true, symbol: ['circle', 'circle'],
          symbolSize: 6,
          data: lines.filter(l => l.gridIndex === 2).map(l => [
            { coord: [l.p1.time, l.p1.value], itemStyle: { color: l.color } },
            { coord: [l.p2.time, l.p2.value], itemStyle: { color: l.color },
              lineStyle: { color: l.color, width: 1.5, opacity: 0.9 },
              label: { show: false } }
          ])
        } : undefined,
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

  return(
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 26, fontWeight: 700, color: '#F59E0B', margin: 0, letterSpacing: -0.5 }}>
            GOES / SOLAR WIND PLASMA
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Real-Time Solar Wind Density, Speed & Temperature (GOES Spacecraft)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 11, color: '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: '#F59E0B', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Dedicated Row 2 Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor="#F59E0B"
          loading={loading}
        />
      </div>

      {/* Metric Cards Banner */}
      {latest && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, marginBottom: 28, padding: '0 8px', background: 'transparent', border: 'none'
        }}>
          {[
            { label: 'DENSITY (p/cc)', value: latest.density?.toFixed(1) ?? '—', color: '#FBBF24', unit: 'p/cm³' },
            { label: 'SPEED (km/s)', value: latest.speed?.toFixed(0) ?? '—', color: '#FB923C', unit: 'km/s' },
            { label: 'TEMPERATURE (K)', value: latest.temperature ? Math.round(latest.temperature).toLocaleString() : '—', color: '#38BDF8', unit: 'K' },
          ].map((s, idx) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                  {s.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: s.color }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                    {s.unit}
                  </span>
                </div>
              </div>
              {idx < 2 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      )}

      {/* Combined Multi-Grid Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="GOES SOLAR WIND PLASMA METRICS (REAL-TIME)"
          style={{ marginBottom: 16 }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {panLoading && (
                <span style={{ fontSize: 11, color: '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              {/* ── Trend Line Toolbar ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Status hint while drawing */}
                {drawingMode && (
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', color: pendingP1 ? '#FBBF24' : '#A78BFA',
                    fontWeight: 600, letterSpacing: 0.3,
                  }}>
                    {pendingP1 ? '● P1 SET — CLICK P2' : '○ CLICK P1 ON ANY CHART'}
                  </span>
                )}
                <button
                  onClick={toggleDrawingMode}
                  title="วาดเส้น trend line: คลิก P1 → คลิก P2"
                  style={{
                    padding: '4px 10px',
                    background: drawingMode ? 'rgba(167,139,250,0.2)' : 'transparent',
                    border: `1px solid ${drawingMode ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`,
                    color: drawingMode ? '#A78BFA' : '#94A3B8',
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: 0.5,
                    transition: 'all 0.2s', borderRadius: 2,
                  }}
                >
                  {drawingMode ? '╱ DRAWING ON' : '╱ DRAW LINE'}
                </button>
                {lines.length > 0 && (
                  <button
                    onClick={clearLines}
                    style={{
                      padding: '4px 10px', background: 'transparent',
                      border: '1px solid rgba(248,113,113,0.4)', color: '#F87171',
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                      cursor: 'pointer', letterSpacing: 0.5, borderRadius: 2,
                    }}
                  >
                    CLEAR ({lines.length})
                  </button>
                )}
              </div>
            </div>
          }
        >
          {/* ── Chart wrapper with interactive SVG overlay ── */}
          <div
            ref={chartWrapperRef}
            style={{
              position: 'relative', height: 500, width: '100%',
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
              style={{ height: 500, width: '100%' }}
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
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
              )}
              {/* P1 pending dot */}
              {drawingMode && p1Pixel && (
                <circle cx={p1Pixel.x} cy={p1Pixel.y} r={5}
                  fill="#A78BFA" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5}
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
              const pctColor = pct >= 0 ? '#34D399' : '#F87171'
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
                        border: '1.5px solid rgba(255,255,255,0.5)',
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
                    background: 'rgba(5,10,20,0.92)',
                    border: `1px solid ${l.color}66`,
                    borderRadius: 4,
                    padding: '5px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 20,
                    boxShadow: `0 2px 12px rgba(0,0,0,0.6), 0 0 8px ${l.color}22`,
                  }}>
                    <div style={{ color: l.color, fontWeight: 700, marginBottom: 2, letterSpacing: 0.3 }}>
                      ▲ {fmtValue(l.p1.value, l.gridIndex)} → {fmtValue(l.p2.value, l.gridIndex)} {unit}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: pctColor, fontWeight: 700 }}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                      <span style={{ color: '#94A3B8' }}>
                        {delta >= 0 ? '+' : ''}{fmtValue(delta, l.gridIndex)}
                      </span>
                      <span style={{ color: '#64748B' }}>{duration}</span>
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
        accentColor="#F59E0B"
        tabs={[
          { id: 'usage', label: 'Usage (การใช้งาน)' },
          { id: 'impacts', label: 'Impacts (ผลกระทบ)' },
          { id: 'details', label: 'Details (ข้อมูลอุปกรณ์)' },
          { id: 'credits', label: 'Data Source & Credits (แหล่งข้อมูล)' }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              องค์ประกอบและการวัดค่าของลมสุริยะ (Solar Wind Plasma)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Solar Wind</strong> (ลมสุริยะ) คือ ลำของอนุภาคพลาสม่ามีประจุพลังงานสูงที่ไหลออกจากชั้นบรรยากาศดวงอาทิตย์:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #F59E0B', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Density (ความหนาแน่นพลาสม่า):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความหนาแน่นโปรตอน (p/cc) บ่งบอกมวลอนุภาคที่กำลังเข้าปะทะโลก</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Speed (ความเร็วลมสุริยะ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความเร็วเฉลี่ย (km/s) ปกติ 300-500 km/s หากเกิด CME อาจพุ่งเกิน 1,000 km/s</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Temperature (อุณหภูมิ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ระดับพลังงานจลน์ความร้อนของไอออน (K) บ่งบอกความสั่นสะเทือนพลังงาน</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ผลกระทบของลมสุริยะความเร็วสูง (Space Weather Impacts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              การปะทะของลมสุริยะความเร็วสูง (High-Speed Streams) ส่งผลต่ออวกาศรอบโลก:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>การบีบอัดสนามแม่เหล็กโลก</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ความเร็วและความหนาแน่นสูงถ่ายโอนพลังงานจลน์ บีบเกราะแม่เหล็กโลก ก่อพายุแม่เหล็กโลก (Geomagnetic Storm)
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>ขัดข้องดาวเทียม & GPS</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ประจุไฟฟ้าสะสมผิวนอกดาวเทียมและไอโอโนสเฟียร์ถูกรบกวน ส่งผลให้สัญญาณ GPS และสื่อสารเบี่ยงเบน
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>การเกิดแสงออโรรา (Aurora)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  อนุภาคพลังงานสูงเล็ดลอดตามแนวขั้วโลก ปะทะแก๊สในบรรยากาศชั้นบนเกิดแสงออโรราสว่างไสว
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของระบบวิเคราะห์ลมสุริยะ
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>แหล่งข้อมูลดาวเทียมหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>DSCOVR (Deep Space Climate Observatory) — NOAA / NASA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งการวัดค่า</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>จุดลากรานจ์ L1 (ห่างจากโลก 1.5 ล้าน กม. ทางดวงอาทิตย์)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>พารามิเตอร์วัดหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Density (p/cc), Speed (km/s), Temperature (K)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ความครอบคลุมย้อนหลัง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>7 วันล่าสุดแบบเรียลไทม์ละเอียดสูง</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              แหล่งที่มาของข้อมูล & เครดิต (Data Source & Credits)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 14px 0', lineHeight: '1.7' }}>
              ข้อมูลและภาพกราฟทั้งหมดได้รับการสนับสนุนสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์เฝ้าระวังสภาพอากาศอวกาศ NOAA
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>DSCOVR & ACE Missions (NASA / NOAA):</strong> ดาวเทียมตรวจลมสุริยะจุด L1
              </div>
            </div>
            <div style={{ 
              marginTop: 16, 
              padding: '10px 14px', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: 0, 
              fontSize: 12, 
              color: '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC Plasma Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}