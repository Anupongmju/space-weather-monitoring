import React, { useState, useMemo, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { ArrowUp, Radiation, Zap, Maximize2, Minimize2 } from 'lucide-react'
import { MoonEventPosition } from '../../services/moonService'
import SciFiFullscreenOverlay from '../ui/SciFiFullscreenOverlay'
import { useTheme } from '../../context/ThemeContext'

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
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [internalSelectedId, setInternalSelectedId] = useState<number>(23)
  const [craterLogScale, setCraterLogScale] = useState<boolean>(true)
  const [goesLogScale, setGoesLogScale] = useState<boolean>(false)
  const [isCraterFs, setIsCraterFs] = useState(false)
  const [isGoesFs, setIsGoesFs] = useState(false)
  const craterPanelRef = useRef<HTMLDivElement>(null)
  const goesPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleFsChange = () => {
      setIsCraterFs(document.fullscreenElement === craterPanelRef.current)
      setIsGoesFs(document.fullscreenElement === goesPanelRef.current)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleCraterFs = async () => {
    if (!craterPanelRef.current) return
    try {
      if (!document.fullscreenElement) {
        await craterPanelRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleGoesFs = async () => {
    if (!goesPanelRef.current) return
    try {
      if (!document.fullscreenElement) {
        await goesPanelRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error(err)
    }
  }

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

  // ── ECharts Option for CRaTER (7-Day Hardware-Accelerated Canvas with Mouse Wheel Zoom) ──
  const craterOption = useMemo(() => {
    if (!hasValidDose || !dose?.hourly) return null

    const timeCategories = dose.hourly.map((h, i) =>
      h.time ?? `${String(Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`
    )
    const d12Data = dose.hourly.map(h => h.d12 ?? null)
    const d34Data = dose.hourly.map(h => h.d34 ?? null)
    const d56Data = dose.hourly.map(h => h.d56 ?? null)

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
            color: '#F472B6',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            position: 'insideEndTop',
          },
          lineStyle: {
            color: 'rgba(244, 114, 182, 0.85)',
            type: 'dashed',
            width: 1.5,
          },
        }
      ]
    } : undefined

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
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#DB2777' : '#F472B699',
        borderWidth: 1.5,
        padding: 10,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'monospace, sans-serif', fontSize: 13 },
        extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.12); border-radius: 6px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 6px;',
        axisPointer: {
          type: 'line',
          lineStyle: { color: isLight ? '#DB2777' : '#F472B6', type: 'dashed', width: 1.5 },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          let html = `<div style="font-family: monospace, sans-serif; font-size: 13px; min-width: 180px;">`
          html += `<div style="color: ${isLight ? '#BE185D' : '#F472B6'}; border-bottom: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}; padding-bottom: 4px; margin-bottom: 6px; font-weight: 700;">⏱ ${params[0].axisValueLabel} UTC</div>`
          params.forEach((p: any) => {
            if (p.value === null || p.value === undefined) return
            const num = Number(p.value)
            const val = num >= 1 ? num.toFixed(3) : num < 0.001 ? num.toExponential(2) : num.toFixed(4)
            html += `<div style="display: flex; justify-content: space-between; gap: 12px; padding: 1px 0;">`
            html += `<span style="color: ${p.color};">● ${p.seriesName}:</span>`
            html += `<strong style="color: ${isLight ? '#0F172A' : '#FFF'};">${val} cGy/yr</strong>`
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
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)' } },
        axisLabel: {
          color: isLight ? '#64748B' : '#94A3B8',
          fontSize: 13,
          fontFamily: 'monospace, sans-serif',
          interval: 'auto',
          hideOverlap: true,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: craterLogScale ? 'log' : 'value',
        min: craterLogScale ? 0.005 : 'dataMin',
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)' } },
        splitLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: {
          color: isLight ? '#475569' : '#F8FAFC',
          fontSize: 13,
          fontFamily: 'monospace, sans-serif',
          formatter: (v: number) => {
            if (v >= 10) return v.toFixed(0)
            if (v >= 1) return v.toFixed(1)
            if (v >= 0.01) return v.toFixed(3)
            return v.toExponential(0)
          },
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
          ...(markLineConfig ? { markLine: markLineConfig } : {}),
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
  }, [hasValidDose, dose, activeEvent, craterLogScale, isLight])

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
            fontFamily: 'monospace, sans-serif',
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
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#D97706' : '#38BDF899',
        borderWidth: 1.5,
        padding: 10,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'monospace, sans-serif', fontSize: 13 },
        extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.12); border-radius: 6px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 6px;',
        axisPointer: {
          type: 'line',
          lineStyle: { color: isLight ? '#D97706' : '#38BDF8', type: 'dashed', width: 1.5 },
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          let html = `<div style="font-family: monospace, sans-serif; font-size: 13px; min-width: 200px; max-height: 220px; overflow-y: auto;">`
          html += `<div style="color: ${isLight ? '#D97706' : '#38BDF8'}; border-bottom: 1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}; padding-bottom: 4px; margin-bottom: 6px; font-weight: 700;">⏱ ${params[0].axisValueLabel} UTC</div>`
          for (let i = 0; i < params.length; i++) {
            const p = params[i]
            if (p.value === null || p.value === undefined) continue
            const num = Number(p.value)
            const val = num >= 1 ? num.toFixed(3) : num.toExponential(2)
            html += `<div style="display: flex; justify-content: space-between; gap: 12px; padding: 1px 0;">`
            html += `<span style="color: ${p.color};">● ${p.seriesName}:</span>`
            html += `<strong style="color: ${isLight ? '#0F172A' : '#FFF'};">${val}</strong>`
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
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)' } },
        axisLabel: {
          color: isLight ? '#64748B' : '#94A3B8',
          fontSize: 13,
          fontFamily: 'monospace, sans-serif',
          interval: 'auto',
          hideOverlap: true,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: goesLogScale ? 'log' : 'value',
        min: goesLogScale ? 0.001 : 'dataMin',
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.18)' } },
        splitLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: {
          color: isLight ? '#475569' : '#F8FAFC',
          fontSize: 13,
          fontFamily: 'monospace, sans-serif',
          formatter: (v: number) => (v >= 1 ? v.toFixed(1) : v.toExponential(0)),
        },
      },
      series: seriesList,
    }
  }, [hasValidGoes, goes, chLabels, activeEvent, goesLogScale, isLight])

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
        background: isLight ? '#F1F5F9' : '#030712',
        color: isLight ? '#0F172A' : '#F8FAFC',
        overflowX: 'hidden',
        transition: 'background 0.25s ease, color 0.25s ease',
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
          background: ${isLight ? '#FFFFFF' : 'transparent'};
          border: 1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)'};
          color: ${isLight ? '#475569' : '#64748B'};
          border-radius: 3px;
          padding: 4px 10px;
          font-family: var(--font-mono);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.12s ease;
          user-select: none;
          box-shadow: ${isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none'};
        }
        .ev-pill:hover {
          border-color: ${isLight ? '#0284C7' : 'rgba(255,255,255,0.35)'};
          color: ${isLight ? '#0284C7' : '#CBD5E1'};
        }
        .ev-pill.active {
          background: ${isLight ? 'rgba(245,158,11,0.15)' : 'rgba(251,191,36,0.15)'};
          border-color: ${isLight ? '#D97706' : 'rgba(251,191,36,0.8)'};
          color: ${isLight ? '#B45309' : '#FDE68A'};
          font-weight: 700;
          box-shadow: 0 0 10px ${isLight ? 'rgba(245,158,11,0.2)' : 'rgba(251,191,36,0.25)'};
        }

        .cs-chart-panel {
          background: ${isLight ? '#FFFFFF' : 'rgba(10,15,30,0.5)'};
          border: 1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'};
          position: relative;
          box-shadow: ${isLight ? '0 4px 20px rgba(0,0,0,0.05)' : 'none'};
        }
        .cs-chart-panel:hover {
          border-color: ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'};
        }

        .cs-metric-chip {
          background: ${isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'};
          border: 1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'};
          padding: 4px 10px;
          border-radius: 2px;
        }
      `}</style>

      {/* ── TOP SEAM FADE DOWN: Deep orbit black fades DOWN into dashboard (54px) ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 54,
          pointerEvents: 'none',
          zIndex: 3,
          background: isLight
            ? 'linear-gradient(to bottom, #000000 0%, rgba(0, 0, 0, 0.28) 40%, rgba(0, 0, 0, 0.08) 70%, transparent 100%)'
            : 'linear-gradient(to bottom, #000000 0%, rgba(3, 7, 18, 0.75) 50%, transparent 100%)',
        }}
      />

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
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 3,
                  color: isLight ? '#B45309' : '#FBBF24',
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
                color: isLight ? '#0F172A' : '#FFF',
                margin: 0,
                fontFamily: 'Orbitron, sans-serif',
                letterSpacing: '0.04em',
              }}
            >
              7-DAY EVENT SPECTRUM ANALYSIS
            </h2>
            <div
              style={{
                fontSize: 14,
                color: isLight ? '#64748B' : '#94A3B8',
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
              background: isLight ? '#FFFFFF' : 'rgba(15,23,42,0.8)',
              backdropFilter: 'blur(8px)',
              border: isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
              color: isLight ? '#1E293B' : '#CBD5E1',
              padding: '7px 16px',
              borderRadius: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              transition: 'all 0.2s',
              boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : undefined,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(56,189,248,0.7)'
              e.currentTarget.style.color = '#0284C7'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
              e.currentTarget.style.color = isLight ? '#1E293B' : '#CBD5E1'
            }}
          >
            <ArrowUp size={12} /> BACK TO ORBIT VIEW
          </button>
        </div>

        {/* ── Event Selector ── */}
        <div className="cs-fadein cs-fadein-2" style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: isLight ? '#64748B' : '#475569',
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
              background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 2,
              marginBottom: 20,
              flexWrap: 'wrap',
              boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.04)' : undefined,
            }}
          >
            <span style={{ fontSize: 20 }}>{phaseIcon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)' }}>
                EVENT #{activeEvent.id} — {activeEvent.date}
                {goes?.window_start && goes?.window_end && (
                  <span style={{ marginLeft: 8, color: isLight ? '#B45309' : '#FBBF24', fontSize: 14, fontWeight: 600 }}>
                    [GOES 7D: {goes.window_start} ~ {goes.window_end}]
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {activeEvent.phase_name} · {activeEvent.illumination_pct}% illuminated · {activeEvent.distance_km?.toLocaleString()} km
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: isLight ? '#64748B' : '#475569' }}>D56 (EVENT) </span>
                <strong style={{ color: isLight ? '#BE185D' : '#F472B6' }}>{fmtDose(dose?.d56)} cGy/yr</strong>
              </div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: isLight ? '#64748B' : '#475569' }}>{goes?.channel_low_label ?? '1-2 MeV'} AVG </span>
                <strong style={{ color: isLight ? '#0284C7' : '#38BDF8' }}>{fmtProton(goes?.avg_low)}</strong>
              </div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: isLight ? '#64748B' : '#475569' }}>SAT </span>
                <strong style={{ color: isLight ? '#334155' : '#94A3B8' }}>{goes?.satellite ?? '—'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── Dual Chart Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(540px, 1fr))', gap: 16 }}>

          {/* ═══ LEFT: CRaTER ═══ */}
          <div
            ref={craterPanelRef}
            className="cs-chart-panel cs-fadein cs-fadein-3"
            style={{
              padding: isCraterFs ? 0 : '20px 20px 16px',
              borderRadius: 0,
              minWidth: 0,
              background: isCraterFs ? (isLight ? '#FFFFFF' : '#020617') : undefined,
              border: isCraterFs ? 'none' : undefined,
            }}
          >
            {isCraterFs ? (
              <SciFiFullscreenOverlay
                isFullscreen={true}
                onClose={toggleCraterFs}
                title="LRO CRaTER 7-DAY RADIATION DOSERATE"
                subtitle="LRO / Cosmic Ray Telescope · D12 D34 D56 Detectors (−3d to +4d) · Event Date: "
                accentColor="#F472B6"
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => setCraterLogScale(prev => !prev)}
                      style={{
                        background: craterLogScale
                          ? (isLight ? 'rgba(219,39,119,0.12)' : 'rgba(244,114,182,0.2)')
                          : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                        border: `1px solid ${
                          craterLogScale
                            ? (isLight ? '#BE185D' : '#F472B6')
                            : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)')
                        }`,
                        color: craterLogScale
                          ? (isLight ? '#BE185D' : '#F472B6')
                          : (isLight ? '#64748B' : '#94A3B8'),
                        padding: '3px 9px',
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {craterLogScale ? '📊 LOG SCALE' : '📈 LINEAR'}
                    </button>
                    {hasValidDose && (
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isLight ? '#BE185D' : '#F472B6', fontWeight: 700 }}>
                        7D PEAK: {fmtDose(peakDose56)} cGy/yr
                      </span>
                    )}
                  </div>
                }
              >
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                      <span style={{ color: '#475569', fontSize: 14, fontFamily: 'var(--font-mono)' }}>CRaTER — DATA GAP / SAFE MODE</span>
                    </div>
                  )}
                </div>
              </SciFiFullscreenOverlay>
            ) : (
              <>
                {/* Panel header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#BE185D' : '#F472B6', fontFamily: 'var(--font-mono)' }}>
                        ● CRaTER Dose Rate (cGy/yr) · 7-Day Window
                      </span>
                      <button
                        onClick={() => setCraterLogScale(prev => !prev)}
                        title="Toggle Logarithmic / Linear scale"
                        style={{
                          background: craterLogScale
                            ? (isLight ? 'rgba(219,39,119,0.12)' : 'rgba(244,114,182,0.2)')
                            : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                          border: `1px solid ${
                            craterLogScale
                              ? (isLight ? '#BE185D' : '#F472B6')
                              : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)')
                          }`,
                          color: craterLogScale
                            ? (isLight ? '#BE185D' : '#F472B6')
                            : (isLight ? '#64748B' : '#94A3B8'),
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          transition: 'all 0.2s',
                        }}
                      >
                        {craterLogScale ? '📊 LOG SCALE' : '📈 LINEAR'}
                      </button>
                      <button
                        onClick={toggleCraterFs}
                        title="Full Screen (F11 style)"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                          border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.15)',
                          color: isLight ? '#475569' : '#94A3B8',
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          transition: 'all 0.2s',
                        }}
                      >
                        <Maximize2 size={12} />
                        <span>FULLSCREEN</span>
                      </button>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      LRO / Cosmic Ray Telescope · D12 D34 D56 Detectors (−3d to +4d)
                    </div>
                  </div>
                  {hasValidDose && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#475569', fontFamily: 'var(--font-mono)', marginBottom: 1 }}>7D PEAK D56</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? '#BE185D' : '#F472B6', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                        {fmtDose(peakDose56)}
                      </div>
                      <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#475569', fontFamily: 'var(--font-mono)' }}>cGy/yr</div>
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
                      <span style={{ color: '#475569', fontSize: 14, fontFamily: 'var(--font-mono)' }}>CRaTER — DATA GAP / SAFE MODE</span>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div style={{
                  display: 'flex', gap: 14, marginTop: 10, justifyContent: 'flex-start', paddingTop: 8,
                  borderTop: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)'
                }}>
                  {[['#4ADE80', 'D12 Thin'], ['#38BDF8', 'D34 GCR'], ['#F472B6', 'D56 Tissue']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontFamily: 'var(--font-mono)', color: isLight ? '#475569' : '#64748B' }}>
                      <span style={{ display: 'inline-block', width: 16, height: 2, background: c, borderRadius: 1 }} />
                      {l}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ═══ RIGHT: GOES Proton ═══ */}
          <div
            ref={goesPanelRef}
            className="cs-chart-panel cs-fadein cs-fadein-4"
            style={{
              padding: isGoesFs ? 0 : '20px 20px 16px',
              borderRadius: 0,
              minWidth: 0,
              background: isGoesFs ? (isLight ? '#FFFFFF' : '#020617') : undefined,
              border: isGoesFs ? 'none' : undefined,
            }}
          >
            {isGoesFs ? (
              <SciFiFullscreenOverlay
                isFullscreen={true}
                onClose={toggleGoesFs}
                title={`${goes?.satellite ?? 'GOES'} PROTON DIFFERENTIAL FLUX`}
                subtitle="GOES SGPS 13-Channel Energy Spectrum (−3d to +4d)"
                accentColor="#FBBF24"
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => setGoesLogScale(prev => !prev)}
                      style={{
                        background: goesLogScale
                          ? (isLight ? 'rgba(217,119,6,0.12)' : 'rgba(251,191,36,0.2)')
                          : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                        border: `1px solid ${
                          goesLogScale
                            ? (isLight ? '#D97706' : '#FBBF24')
                            : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)')
                        }`,
                        color: goesLogScale
                          ? (isLight ? '#B45309' : '#FBBF24')
                          : (isLight ? '#64748B' : '#94A3B8'),
                        padding: '3px 9px',
                        borderRadius: 2,
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {goesLogScale ? '📊 LOG SCALE' : '📈 LINEAR'}
                    </button>
                    {hasValidGoes && (
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isLight ? '#0284C7' : '#38BDF8', fontWeight: 700 }}>
                        7D PEAK: {fmtProton(peakGoesLow)} {goes?.mode === 'DIFFERENTIAL' ? 'diff-flux' : 'pfu'}
                      </span>
                    )}
                  </div>
                }
              >
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                      <span style={{ color: '#475569', fontSize: 14, fontFamily: 'var(--font-mono)' }}>GOES SGPS — DATA GAP / OFFLINE</span>
                    </div>
                  )}
                </div>
              </SciFiFullscreenOverlay>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#B45309' : '#FBBF24', fontFamily: 'var(--font-mono)' }}>
                        ● {goes?.satellite ?? 'GOES'} Proton {goes?.mode === 'DIFFERENTIAL' ? 'Diff-Flux' : 'Integral Flux'} · 7-Day Window
                      </span>
                      <button
                        onClick={() => setGoesLogScale(prev => !prev)}
                        title="Toggle Logarithmic / Linear scale"
                        style={{
                          background: goesLogScale
                            ? (isLight ? 'rgba(217,119,6,0.12)' : 'rgba(251,191,36,0.2)')
                            : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'),
                          border: `1px solid ${
                            goesLogScale
                              ? (isLight ? '#D97706' : '#FBBF24')
                              : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)')
                          }`,
                          color: goesLogScale
                            ? (isLight ? '#B45309' : '#FBBF24')
                            : (isLight ? '#64748B' : '#94A3B8'),
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          transition: 'all 0.2s',
                        }}
                      >
                        {goesLogScale ? '📊 LOG SCALE' : '📈 LINEAR'}
                      </button>
                      <button
                        onClick={toggleGoesFs}
                        title="Full Screen (F11 style)"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                          border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.15)',
                          color: isLight ? '#475569' : '#94A3B8',
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          transition: 'all 0.2s',
                        }}
                      >
                        <Maximize2 size={12} />
                        <span>FULLSCREEN</span>
                      </button>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      GOES SGPS 13-Channel Energy Spectrum (−3d to +4d)
                    </div>
                  </div>
                  {hasValidGoes && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#475569', fontFamily: 'var(--font-mono)', marginBottom: 1 }}>7D PEAK LOW-E</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? '#0284C7' : '#38BDF8', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                        {fmtProton(peakGoesLow)}
                      </div>
                      <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#475569', fontFamily: 'var(--font-mono)' }}>{goes?.mode === 'DIFFERENTIAL' ? 'diff-flux' : 'pfu'}</div>
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
                      <span style={{ color: '#475569', fontSize: 14, fontFamily: 'var(--font-mono)' }}>GOES SGPS — DATA GAP / OFFLINE</span>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div style={{
                  display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-start', paddingTop: 8,
                  borderTop: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
                  flexWrap: 'wrap'
                }}>
                  {Array.from({ length: 13 }, (_, k) => {
                    const label = chLabels[k]
                    if (!label) return null
                    return (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--font-mono)', color: isLight ? '#475569' : '#64748B' }}>
                        <span style={{ display: 'inline-block', width: 12, height: 2, background: CH_COLORS[k], borderRadius: 1 }} />
                        {label}
                      </span>
                    )
                  })}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'var(--font-mono)', color: isLight ? '#B45309' : '#FBBF24', marginLeft: 'auto' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 0, borderTop: `2px dashed ${isLight ? '#B45309' : '#FBBF24'}` }} />
                    Event Date Marker
                  </span>
                </div>
              </>
            )}
          </div>

        </div>

        {/* ── Footer ── */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 16,
            borderTop: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: isLight ? '#64748B' : '#475569', fontFamily: 'var(--font-mono)' }}>
            <span>● 7-Day Event Analysis Window: [T−3d → T+4d]</span>
            <span>● Tier 1: LRO CRaTER Dosimetry</span>
            <span>● Tier 2: NOAA GOES-16/18 SGPS Differential Flux</span>
          </div>
          <div style={{ fontSize: 14, color: isLight ? '#94A3B8' : '#334155', fontFamily: 'var(--font-mono)' }}>
            Scroll mouse wheel on chart to zoom · Drag to pan · Click event pills to switch
          </div>
        </div>

      </div>
    </div>
  )
})

export default MoonChartSection
