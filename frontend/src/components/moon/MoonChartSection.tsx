import React, { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { ArrowUp, Radiation, Zap } from 'lucide-react'
import { MoonEventPosition } from '../../services/moonService'

interface MoonChartSectionProps {
  events: MoonEventPosition[]
  selectedEvent?: MoonEventPosition | null
  onSelectEvent?: (event: MoonEventPosition) => void
  onScrollToOrbit: () => void
}

const PHASE_ICON: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Third Quarter': '🌗',
  'Waning Crescent': '🌘',
}

const fmtDose = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return 'N/A'
  if (v >= 1) return v.toFixed(3)
  if (v < 0.0001) return v.toExponential(2)
  return v.toFixed(4)
}

const fmtProton = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return 'N/A'
  if (v >= 1000) return v.toFixed(0)
  if (v >= 1) return v.toFixed(2)
  if (v < 0.0001) return v.toExponential(2)
  return v.toFixed(3)
}

const CH_COLORS = [
  '#38BDF8', // ch0  1-2 MeV       cyan
  '#22D3EE', // ch1  2-3 MeV       sky
  '#67E8F9', // ch2  2-4 MeV       light-cyan
  '#4ADE80', // ch3  4-7 MeV       green
  '#86EFAC', // ch4  6-11 MeV      light-green
  '#FBBF24', // ch5  12-23 MeV     amber
  '#FCD34D', // ch6  26-38 MeV     light-amber
  '#F97316', // ch7  41-77 MeV     orange
  '#A855F7', // ch8  81-98 MeV     purple
  '#C084FC', // ch9  96-118 MeV    light-purple
  '#EC4899', // ch10 115-138 MeV   pink
  '#F43F5E', // ch11 153-229 MeV   rose
  '#EF4444', // ch12 267-390 MeV   red
]

const DEFAULT_DIFF_LABELS = [
  '1-2 MeV', '2-3 MeV', '2-4 MeV', '4-7 MeV', '6-11 MeV',
  '12-23 MeV', '26-38 MeV', '41-77 MeV',
  '81-98 MeV', '96-118 MeV', '115-138 MeV', '153-229 MeV', '267-390 MeV',
]

const MoonChartSection = React.memo(function MoonChartSection({
  events,
  selectedEvent,
  onSelectEvent,
  onScrollToOrbit,
}: MoonChartSectionProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<number>(23)
  const activeEvent = useMemo(
    () => selectedEvent || events.find(e => e.id === internalSelectedId) || events[0],
    [selectedEvent, events, internalSelectedId]
  )
  const dose = activeEvent?.doserate
  const goes = activeEvent?.goes_proton

  const phaseIcon = PHASE_ICON[activeEvent?.phase_name ?? ''] ?? '🌙'
  const hasValidDose = dose?.status === 'VALID' && (dose.hourly?.length ?? 0) > 0
  const hasValidGoes = goes?.status === 'VALID' && (goes.series?.length ?? 0) > 0

  const chLabels = useMemo(() => goes?.channel_labels || DEFAULT_DIFF_LABELS, [goes])

  // ── ECharts Option for CRaTER (24H Hardware-Accelerated Canvas with Mouse Wheel Zoom) ──
  const craterOption = useMemo(() => {
    if (!hasValidDose || !dose?.hourly) return null

    const timeCategories = dose.hourly.map((h, i) =>
      h.time ?? `${String(Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`
    )
    const d12Data = dose.hourly.map(h => h.d12 ?? null)
    const d34Data = dose.hourly.map(h => h.d34 ?? null)
    const d56Data = dose.hourly.map(h => h.d56 ?? null)

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        top: 24,
        left: 55,
        right: 20,
        bottom: 30,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0F172A',
        borderColor: '#F472B699',
        borderWidth: 1.5,
        padding: 10,
        textStyle: { color: '#F8FAFC', fontFamily: 'monospace', fontSize: 11 },
        extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 6px;',
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#F472B6', type: 'dashed', width: 1.5 },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          let html = `<div style="font-family: monospace; font-size: 11px; min-width: 180px;">`
          html += `<div style="color: #F472B6; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px; margin-bottom: 6px; font-weight: 700;">⏱ ${params[0].axisValueLabel} UTC</div>`
          params.forEach((p: any) => {
            if (p.value === null || p.value === undefined) return
            const val = Number(p.value).toFixed(4)
            html += `<div style="display: flex; justify-content: space-between; gap: 12px; padding: 1px 0;">`
            html += `<span style="color: ${p.color};">● ${p.seriesName}:</span>`
            html += `<strong style="color: #FFF;">${val} cGy/yr</strong>`
            html += `</div>`
          })
          html += `</div>`
          return html
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          filterMode: 'filter',
        },
      ],
      xAxis: {
        type: 'category',
        data: timeCategories,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.18)' } },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          fontFamily: 'monospace',
          interval: 'auto',
          hideOverlap: true,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.18)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: {
          color: '#F8FAFC',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => v.toFixed(2),
        },
      },
      series: [
        {
          name: 'D12 (Thin)',
          type: 'line',
          data: d12Data,
          smooth: false,
          sampling: 'lttb',
          connectNulls: true,
          showSymbol: false,
          lineStyle: { color: '#4ADE80', width: 1.8 },
          areaStyle: { color: 'rgba(74, 222, 128, 0.08)' },
        },
        {
          name: 'D34 (GCR)',
          type: 'line',
          data: d34Data,
          smooth: false,
          sampling: 'lttb',
          connectNulls: true,
          showSymbol: false,
          lineStyle: { color: '#38BDF8', width: 1.8 },
          areaStyle: { color: 'rgba(56, 189, 248, 0.08)' },
        },
        {
          name: 'D56 (Tissue)',
          type: 'line',
          data: d56Data,
          smooth: false,
          sampling: 'lttb',
          connectNulls: true,
          showSymbol: false,
          lineStyle: { color: '#F472B6', width: 2.2 },
          areaStyle: { color: 'rgba(244, 114, 182, 0.18)' },
        },
      ],
    }
  }, [hasValidDose, dose])

  // ── ECharts Option for GOES Differential Proton Flux (High-Performance 60FPS LTTB Sampling) ──
  const goesOption = useMemo(() => {
    if (!hasValidGoes || !goes?.series) return null

    const timeCategories = goes.series.map((g, i) =>
      g.time ?? `${String(Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`
    )

    // Find event day index for markLine (e.g. '05-10')
    const eventDayTag = activeEvent?.date ? activeEvent.date.slice(5).replace('/', '-') : ''
    const eventIndex = timeCategories.findIndex(t => t.startsWith(eventDayTag))

    const markLineConfig = eventIndex >= 0 ? {
      symbol: ['none', 'none'],
      silent: true,
      data: [
        {
          xAxis: timeCategories[eventIndex],
          label: {
            show: true,
            formatter: '★ EVENT DAY',
            color: '#FBBF24',
            fontSize: 9.5,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            position: 'insideEndTop',
          },
          lineStyle: {
            color: 'rgba(251, 191, 36, 0.85)',
            type: 'dashed',
            width: 1.5,
          },
        }
      ]
    } : undefined

    const seriesList: any[] = []
    for (let k = 0; k < 13; k++) {
      const label = chLabels[k]
      if (!label) continue
      const dataPts = goes.series.map((g: any) => g[`ch${k}`] ?? null)
      const hasAnyData = dataPts.some(v => v !== null && v !== undefined)
      if (!hasAnyData) continue

      seriesList.push({
        name: label,
        type: 'line',
        data: dataPts,
        smooth: false,            // Highly optimizes canvas render & eliminates Bézier spline calculation lag
        sampling: 'lttb',         // Hardware-friendly LTTB downsampling for instantaneous 60fps pan/zoom
        progressive: 3000,        // Progressive canvas chunking
        connectNulls: true,
        showSymbol: false,
        lineStyle: { color: CH_COLORS[k], width: k === 0 ? 2 : 1.4 },
        ...(k === 0 ? { markLine: markLineConfig } : {}),
      })
    }

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        top: 24,
        left: 60,
        right: 20,
        bottom: 30,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0F172A',
        borderColor: '#38BDF899',
        borderWidth: 1.5,
        padding: 10,
        textStyle: { color: '#F8FAFC', fontFamily: 'monospace', fontSize: 11 },
        extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 6px;',
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#38BDF8', type: 'dashed', width: 1.5 },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          let html = `<div style="font-family: monospace; font-size: 11px; min-width: 200px; max-height: 220px; overflow-y: auto;">`
          html += `<div style="color: #38BDF8; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px; margin-bottom: 6px; font-weight: 700;">⏱ ${params[0].axisValueLabel} UTC</div>`
          for (let i = 0; i < params.length; i++) {
            const p = params[i]
            if (p.value === null || p.value === undefined) continue
            const num = Number(p.value)
            const val = num >= 1 ? num.toFixed(3) : num.toExponential(2)
            html += `<div style="display: flex; justify-content: space-between; gap: 12px; padding: 1px 0;">`
            html += `<span style="color: ${p.color};">● ${p.seriesName}:</span>`
            html += `<strong style="color: #FFF;">${val}</strong>`
            html += `</div>`
          }
          html += `</div>`
          return html
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          filterMode: 'filter',
        },
      ],
      xAxis: {
        type: 'category',
        data: timeCategories,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.18)' } },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          fontFamily: 'monospace',
          interval: 'auto',
          hideOverlap: true,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.18)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: {
          color: '#F8FAFC',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v: number) => (v >= 1 ? v.toFixed(1) : v.toExponential(0)),
        },
      },
      series: seriesList,
    }
  }, [hasValidGoes, goes, chLabels, activeEvent])

  // Peak calculations in the 7-day window
  const peakGoesLow = useMemo(() => {
    if (!goes?.series?.length) return null
    let maxV = -Infinity
    for (const pt of goes.series) {
      const v = pt.p_low ?? pt.ch0
      if (v !== null && v !== undefined && v > maxV) maxV = v
    }
    return maxV === -Infinity ? null : maxV
  }, [goes])

  const peakDose56 = useMemo(() => {
    if (!dose?.hourly?.length) return null
    let maxV = -Infinity
    for (const pt of dose.hourly) {
      if (pt.d56 !== null && pt.d56 !== undefined && pt.d56 > maxV) maxV = pt.d56
    }
    return maxV === -Infinity ? null : maxV
  }, [dose])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        background: '#030712',
        color: '#F8FAFC',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cs-fadein { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .cs-fadein-1 { animation-delay: 0.05s; }
        .cs-fadein-2 { animation-delay: 0.10s; }
        .cs-fadein-3 { animation-delay: 0.15s; }
        .cs-fadein-4 { animation-delay: 0.20s; }

        .ev-pill {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #64748B;
          border-radius: 3px;
          padding: 4px 10px;
          font-family: var(--font-mono);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.12s ease;
          user-select: none;
        }
        .ev-pill:hover {
          border-color: rgba(255,255,255,0.35);
          color: #CBD5E1;
        }
        .ev-pill.active {
          background: rgba(251,191,36,0.15);
          border-color: rgba(251,191,36,0.8);
          color: #FDE68A;
          font-weight: 700;
          box-shadow: 0 0 10px rgba(251,191,36,0.25);
        }

        .cs-chart-panel {
          background: rgba(10,15,30,0.5);
          border: 1px solid rgba(255,255,255,0.06);
          position: relative;
        }
        .cs-chart-panel:hover {
          border-color: rgba(255,255,255,0.12);
        }

        .cs-metric-chip {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 4px 10px;
          border-radius: 2px;
        }
      `}</style>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 28px 72px' }}>

        {/* ── Header Row ── */}
        <div
          className="cs-fadein cs-fadein-1"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FBBF24' }} />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 3,
                  color: '#FBBF24',
                  fontWeight: 700,
                }}
              >
                MULTI-TIER RADIATION DOSIMETRY · 1-WEEK EVENT WINDOW
              </span>
            </div>
            <h2
              style={{
                fontSize: 'clamp(18px,2vw,24px)',
                fontWeight: 800,
                color: '#FFF',
                margin: 0,
                fontFamily: 'Orbitron, sans-serif',
                letterSpacing: '0.04em',
              }}
            >
              7-DAY EVENT SPECTRUM ANALYSIS
            </h2>
            <div
              style={{
                fontSize: 11,
                color: '#94A3B8',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
              }}
            >
              3 Days Before (−3d) → Event Peak (0d) → 4 Days Decay (+4d) · LRO CRaTER & GOES Differential Proton Flux
            </div>
          </div>

          <button
            onClick={onScrollToOrbit}
            style={{
              background: 'rgba(15,23,42,0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#CBD5E1',
              padding: '7px 16px',
              borderRadius: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(56,189,248,0.7)'
              e.currentTarget.style.color = '#38BDF8'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              e.currentTarget.style.color = '#CBD5E1'
            }}
          >
            <ArrowUp size={12} /> BACK TO ORBIT VIEW
          </button>
        </div>

        {/* ── Event Selector ── */}
        <div className="cs-fadein cs-fadein-2" style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: '#475569',
              letterSpacing: 2.5,
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            Select Event — Click to switch 24H CRaTER & 7-Day GOES Proton charts
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {events.map(evt => (
              <button
                key={evt.id}
                className={`ev-pill${activeEvent?.id === evt.id ? ' active' : ''}`}
                onClick={() => {
                  setInternalSelectedId(evt.id)
                  onSelectEvent?.(evt)
                }}
                title={`${evt.date} · ${evt.phase_name}`}
              >
                {PHASE_ICON[evt.phase_name] ?? '🌙'} #{evt.id}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active Event Info Strip ── */}
        {activeEvent && (
          <div
            className="cs-fadein cs-fadein-2"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 2,
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 20 }}>{phaseIcon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                EVENT #{activeEvent.id} — {activeEvent.date}
                {goes?.window_start && goes?.window_end && (
                  <span style={{ marginLeft: 8, color: '#FBBF24', fontSize: 11, fontWeight: 600 }}>
                    [GOES 7D: {goes.window_start} ~ {goes.window_end}]
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {activeEvent.phase_name} · {activeEvent.illumination_pct}% illuminated · {activeEvent.distance_km?.toLocaleString()} km
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#475569' }}>D56 (EVENT) </span>
                <strong style={{ color: '#F472B6' }}>{fmtDose(dose?.d56)} cGy/yr</strong>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#475569' }}>{goes?.channel_low_label ?? '1-2 MeV'} AVG </span>
                <strong style={{ color: '#38BDF8' }}>{fmtProton(goes?.avg_low)}</strong>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#475569' }}>SAT </span>
                <strong style={{ color: '#94A3B8' }}>{goes?.satellite ?? '—'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── Dual Chart Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(540px, 1fr))', gap: 16 }}>

          {/* ═══ LEFT: CRaTER ═══ */}
          <div className="cs-chart-panel cs-fadein cs-fadein-3" style={{ padding: '20px 20px 16px', borderRadius: 0, minWidth: 0 }}>
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F472B6', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  ● CRaTER Dose Rate (cGy/yr) · 24H Profile
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                  LRO / Cosmic Ray Telescope · D12 D34 D56 Detectors (Event Date: {activeEvent.date})
                </div>
              </div>
              {hasValidDose && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)', marginBottom: 1 }}>PEAK D56</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#F472B6', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                    {fmtDose(peakDose56)}
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)' }}>cGy/yr</div>
                </div>
              )}
            </div>

            {/* Chart (Hardware-accelerated ECharts with Mouse-Wheel Zoom) */}
            <div style={{ width: '100%', height: 260, minWidth: 0, position: 'relative' }}>
              {hasValidDose && craterOption ? (
                <ReactECharts
                  option={craterOption}
                  notMerge={true}
                  lazyUpdate={true}
                  style={{ height: '100%', width: '100%' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Radiation size={26} color="#334155" />
                  <span style={{ color: '#475569', fontSize: 11, fontFamily: 'var(--font-mono)' }}>CRaTER — DATA GAP / SAFE MODE</span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginTop: 10, justifyContent: 'flex-start', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[['#4ADE80', 'D12 Thin'], ['#38BDF8', 'D34 GCR'], ['#F472B6', 'D56 Tissue']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#64748B' }}>
                  <span style={{ display: 'inline-block', width: 16, height: 2, background: c, borderRadius: 1 }} />
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* ═══ RIGHT: GOES Proton ═══ */}
          <div className="cs-chart-panel cs-fadein cs-fadein-4" style={{ padding: '20px 20px 16px', borderRadius: 0, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FBBF24', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  ● {goes?.satellite ?? 'GOES'} Proton {goes?.mode === 'DIFFERENTIAL' ? 'Diff-Flux' : 'Integral Flux'} · 7-Day Window
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                  GOES SGPS 13-Channel Energy Spectrum (−3d to +4d)
                </div>
              </div>
              {hasValidGoes && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)', marginBottom: 1 }}>7D PEAK LOW-E</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38BDF8', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                    {fmtProton(peakGoesLow)}
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)' }}>{goes?.mode === 'DIFFERENTIAL' ? 'diff-flux' : 'pfu'}</div>
                </div>
              )}
            </div>

            {/* Chart (Hardware-accelerated ECharts with Mouse-Wheel Zoom) */}
            <div style={{ width: '100%', height: 260, minWidth: 0, position: 'relative' }}>
              {hasValidGoes && goesOption ? (
                <ReactECharts
                  option={goesOption}
                  notMerge={true}
                  lazyUpdate={true}
                  style={{ height: '100%', width: '100%' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Zap size={26} color="#334155" />
                  <span style={{ color: '#475569', fontSize: 11, fontFamily: 'var(--font-mono)' }}>GOES SGPS — DATA GAP / OFFLINE</span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-start', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
              {Array.from({ length: 13 }, (_, k) => {
                const label = chLabels[k]
                if (!label) return null
                return (
                  <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: '#64748B' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 2, background: CH_COLORS[k], borderRadius: 1 }} />
                    {label}
                  </span>
                )
              })}
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontFamily: 'var(--font-mono)', color: '#FBBF24', marginLeft: 'auto' }}>
                <span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '2px dashed #FBBF24' }} />
                Event Date Marker
              </span>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: '#475569', fontFamily: 'var(--font-mono)' }}>
            <span>● 7-Day Event Analysis Window: [T−3d → T+4d]</span>
            <span>● Tier 1: LRO CRaTER Dosimetry</span>
            <span>● Tier 2: NOAA GOES-16/18 SGPS Differential Flux</span>
          </div>
          <div style={{ fontSize: 11, color: '#334155', fontFamily: 'var(--font-mono)' }}>
            Scroll mouse wheel on chart to zoom · Drag to pan · Click event pills to switch
          </div>
        </div>

      </div>
    </div>
  )
})

export default MoonChartSection
