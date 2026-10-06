import React, { useEffect, useState, useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  RefreshCw,
  Calendar,
  Compass,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { loadMarsMaven, loadMarsRad, MarsMavenRecord, MarsRadRecord } from '../../services/marsService'
import LoadingSpinner from '../ui/LoadingSpinner'
import StatusBadge from '../ui/StatusBadge'
import Card from '../ui/Card'
import ExportChartMenu from '../ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../ui/TrendLineOverlay'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime, formatPowerOf10 } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'

function DateInputDDMMYYYY({
  value,
  onChange,
  accentColor = '#F97316',
  isLight = false,
}: {
  value: string
  onChange: (val: string) => void
  accentColor?: string
  isLight?: boolean
}) {
  const isoToDdMmYyyy = (iso: string) => {
    if (!iso) return ''
    const parts = iso.split('-')
    if (parts.length !== 3) return iso
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const [text, setText] = useState(() => isoToDdMmYyyy(value))
  const dateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(isoToDdMmYyyy(value))
  }, [value])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value
    setText(val)

    const cleaned = val.replace(/\D/g, '')
    if (cleaned.length === 8) {
      const day = cleaned.slice(0, 2)
      const month = cleaned.slice(2, 4)
      const year = cleaned.slice(4, 8)
      const iso = `${year}-${month}-${day}`
      onChange(iso)
    }
  }

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value
    if (iso) {
      onChange(iso)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="DD/MM/YYYY"
        maxLength={10}
        value={text}
        onChange={handleTextChange}
        style={{
          width: 96,
          padding: '4px 8px',
          background: isLight ? '#FFFFFF' : 'rgba(5, 10, 20, 0.8)',
          border: isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(249, 115, 22, 0.4)',
          color: isLight ? '#0F172A' : '#F8FAFC',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          borderRadius: 4,
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => {
          if (dateInputRef.current) {
            const el = dateInputRef.current as any
            if (typeof el.showPicker === 'function') {
              el.showPicker()
            } else {
              el.focus()
            }
          }
        }}
        style={{
          position: 'absolute',
          right: 4,
          background: 'transparent',
          border: 'none',
          color: accentColor,
          cursor: 'pointer',
          padding: '0 2px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Calendar size={13} />
      </button>
      <input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={handleNativeDateChange}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          bottom: 0,
          right: 0,
        }}
      />
    </div>
  )
}

export default function MarsCorrelationSection() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [activePreset, setActivePreset] = useState<string>('7D')
  const [startDate, setStartDate] = useState('2024-05-08')
  const [endDate, setEndDate] = useState('2024-05-15')
  const [appliedRange, setAppliedRange] = useState({ start: '2024-05-08', end: '2024-05-15' })

  const [mavenData, setMavenData] = useState<MarsMavenRecord[]>([])
  const [radData, setRadData] = useState<MarsRadRecord[]>([])
  const [loading, setLoading] = useState(false)

  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  const { lines, clearLines, drawingMode, toggleDrawingMode, pendingP1, handleClick, removeLine } = useLineDrawing(chartRef)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mavenRows, radRows] = await Promise.all([
        loadMarsMaven(500, appliedRange.start, appliedRange.end),
        loadMarsRad(1440, appliedRange.start, appliedRange.end)
      ])
      setMavenData(Array.isArray(mavenRows) ? mavenRows : [])
      setRadData(Array.isArray(radRows) ? radRows : [])
    } catch (e) {
      console.error('Failed to load correlation data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [appliedRange])

  const handlePresetSelect = (preset: string) => {
    setActivePreset(preset)
    const baseEnd = endDate || '2024-05-15'
    const endD = new Date(baseEnd.includes('T') ? baseEnd : `${baseEnd}T00:00:00Z`)

    let startD = new Date(endD)
    if (preset === '1D') {
      startD.setDate(endD.getDate() - 1)
    } else if (preset === '3D') {
      startD.setDate(endD.getDate() - 3)
    } else if (preset === '7D') {
      startD.setDate(endD.getDate() - 7)
    } else if (preset === '30D') {
      startD.setDate(endD.getDate() - 30)
    } else if (preset === 'ALL') {
      setStartDate('2014-11-01')
      setEndDate('2025-11-14')
      setAppliedRange({ start: '2014-11-01', end: '2025-11-14' })
      return
    }

    const sStr = startD.toISOString().split('T')[0]
    setStartDate(sStr)
    setAppliedRange({ start: sStr, end: baseEnd })
  }

  const handleCustomRange = () => {
    setActivePreset('')
    setAppliedRange({ start: startDate, end: endDate })
  }

  const exportColumns = useMemo<ExportColumn[]>(() => [
    { key: 'time_tag', label: 'Time Tag (UTC)', width: 22 },
    { key: 'maven_ion_20', label: 'MAVEN Ion 20 (Flux)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'maven_ion_12', label: 'MAVEN Ion 12 (Flux)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'maven_ele_8', label: 'MAVEN Ele 8 (Flux)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'rad_dose_si', label: 'RAD Dose Si (µGy/h)', width: 18, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'rad_dose_pl', label: 'RAD Dose Pl (µGy/h)', width: 18, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'rad_dose_e', label: 'RAD Dose E (µGy/h)', width: 18, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'rad_flux_charged', label: 'RAD Charged Flux', width: 18, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
  ], [])

  const exportData = useMemo(() => {
    const map = new Map<string, any>()
    const getRow = (t: string) => {
      let r = map.get(t)
      if (!r) {
        r = { time_tag: t }
        map.set(t, r)
      }
      return r
    }
    mavenData.forEach(d => {
      if (!d.time_tag) return
      const r = getRow(d.time_tag)
      r.maven_ion_20 = d.ion_20
      r.maven_ion_12 = d.ion_12
      r.maven_ele_8 = d.ele_8
    })
    radData.forEach(d => {
      if (!d.time_tag) return
      const r = getRow(d.time_tag)
      r.rad_dose_si = d.dose_rate_silicon
      r.rad_dose_pl = d.dose_rate_plastic
      r.rad_dose_e = d.dose_e
      r.rad_flux_charged = d.flux_charged
    })
    return Array.from(map.values()).sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }, [mavenData, radData])

  const exportMetadata = useMemo(() => ({
    station: 'Mars Multi-Platform Correlation (MAVEN Orbit & MSL Gale Crater)',
    viewTitle: 'Synchronized Orbit-to-Surface Radiation Telemetry',
    description: 'Cross-comparison of MAVEN SEP particle flux in Mars orbit against MSL Curiosity RAD surface dosimetry.',
    timeRangeText: `${appliedRange.start} to ${appliedRange.end}`,
    totalRecords: exportData.length
  }), [appliedRange, exportData.length])

  // Combined synchronized dual-grid chart option matching platform standards
  const chartOption = useMemo(() => {
    if (!mavenData.length && !radData.length) return {}

    const allPoints = [...mavenData, ...radData]
    const { minTs, maxTs } = getTimeDomain(allPoints)
    const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)
    const isMultiDay = activePreset !== '1D'

    return {
      useUTC: true,
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: { color: isLight ? '#0284C7' : '#38BDF8', type: 'dashed' }
        },
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#38BDF8' : 'rgba(56, 189, 248, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 13, fontFamily: 'monospace' },
        extraCssText: isLight
          ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
          : 'box-shadow: 0 20px 40px rgba(0,0,0,0.85); border-radius: 6px;',
        formatter: (params: any[]) => {
          if (!params || !params.length) return ''
          const rawTime = params[0].value ? params[0].value[0] : (params[0].axisValueLabel || params[0].axisValue || '')
          const timeStr = formatUTCTime(rawTime, true)
          let out = `<div style="font-weight:700;margin-bottom:6px;color:${isLight ? '#C2410C' : '#F97316'};border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'};padding-bottom:4px;">⏱ ${timeStr}</div>`
          params.forEach(p => {
            if (p.value?.[1] != null) {
              const val = typeof p.value[1] === 'number'
                ? p.seriesName?.includes('MAVEN') ? p.value[1].toExponential(2) : p.value[1].toFixed(2)
                : p.value[1]
              out += `<div style="display:flex;justify-content:space-between;gap:16px;padding:2px 0;">
                <span style="color:${p.color}">● ${p.seriesName}:</span>
                <strong style="color:${isLight ? '#0F172A' : '#FFF'}">${val}</strong>
              </div>`
            }
          })
          return out
        }
      },
      legend: {
        type: 'scroll',
        top: 4,
        textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' },
        pageTextStyle: { color: isLight ? '#0F172A' : '#FFFFFF' }
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }]
      },
      grid: [
        {
          left: 80,
          right: 30,
          top: 38,
          height: '38%'
        },
        {
          left: 80,
          right: 30,
          top: '52%',
          height: '38%'
        }
      ],
      xAxis: [
        {
          type: 'time',
          gridIndex: 0,
          axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
          axisLabel: { show: false },
          splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(52,152,219,0.12)', type: 'dashed' } }
        },
        {
          type: 'time',
          gridIndex: 1,
          axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
          axisLabel: createTimeAxisLabel(isLight, isMultiDay),
          splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(52,152,219,0.12)', type: 'dashed' } }
        }
      ],
      yAxis: [
        {
          gridIndex: 0,
          type: 'log',
          name: 'MAVEN Orbit Flux [1/(cm²·s·sr·MeV)]',
          nameLocation: 'middle',
          nameGap: 56,
          nameTextStyle: {
            color: isLight ? '#475569' : '#94A3B8',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)'
          },
          axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
          axisLabel: {
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 11.5,
            fontFamily: 'monospace, sans-serif',
            formatter: formatPowerOf10
          },
          splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(52,152,219,0.12)', type: 'dashed' } }
        },
        {
          gridIndex: 1,
          type: 'value',
          name: 'Curiosity Surface Dose [µGy/hr]',
          nameLocation: 'middle',
          nameGap: 56,
          nameTextStyle: {
            color: isLight ? '#475569' : '#94A3B8',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)'
          },
          axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
          axisLabel: {
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 11.5,
            fontFamily: 'monospace, sans-serif'
          },
          splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(52,152,219,0.12)', type: 'dashed' } }
        }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1] }
      ],
      series: [
        {
          name: 'MAVEN ~100 keV Ions (Orbit)',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          smooth: 0.15,
          itemStyle: { color: '#EF4444' },
          lineStyle: { width: 2.0, color: '#EF4444' },
          areaStyle: { color: 'rgba(239, 68, 68, 0.08)' },
          markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 0)),
          data: mavenData.map(d => [d.time_tag, d.ion_12 > 0 ? d.ion_12 : null])
        },
        {
          name: 'MAVEN ~2 MeV Ions (Orbit)',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          smooth: 0.15,
          itemStyle: { color: '#38BDF8' },
          lineStyle: { width: 2.0, color: '#38BDF8' },
          areaStyle: { color: 'rgba(56, 189, 248, 0.08)' },
          data: mavenData.map(d => [d.time_tag, d.ion_24 > 0 ? d.ion_24 : null])
        },
        {
          name: 'Curiosity Silicon Dose (Surface)',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          smooth: 0.15,
          itemStyle: { color: '#FBBF24' },
          lineStyle: { width: 2.0, color: '#FBBF24' },
          areaStyle: { color: 'rgba(251, 191, 36, 0.08)' },
          markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 1)),
          data: radData.map(d => [d.time_tag, d.dose_rate_silicon])
        },
        {
          name: 'Curiosity Plastic Dose (Surface)',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          smooth: 0.15,
          itemStyle: { color: '#EC4899' },
          lineStyle: { width: 2.0, color: '#EC4899' },
          areaStyle: { color: 'rgba(236, 72, 153, 0.08)' },
          data: radData.map(d => [d.time_tag, d.dose_rate_plastic])
        }
      ]
    }
  }, [mavenData, radData, lines, isLight])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── TIME RANGE & PRESETS TOOLBAR ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
        background: isLight ? '#FFFFFF' : 'rgba(5, 14, 30, 0.65)',
        padding: '10px 16px',
        borderRadius: 6,
        border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(52,152,219,0.18)',
        boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
      }}>
        {/* Left: Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: isLight ? '#1A6DB5' : '#38BDF8',
            letterSpacing: '0.06em'
          }}>
            PRESETS:
          </span>
          {['1D', '3D', '7D', '30D', 'ALL'].map(p => {
            const isSelected = activePreset === p
            return (
              <button
                key={p}
                onClick={() => handlePresetSelect(p)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 12.5,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #F97316' : isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                  background: isSelected ? 'rgba(249, 115, 22, 0.2)' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                  color: isSelected ? (isLight ? '#C2410C' : '#F97316') : (isLight ? '#475569' : '#94A3B8'),
                  transition: 'all 0.15s'
                }}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Right: Date range & Apply */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: isLight ? '#64748B' : '#94A3B8', fontWeight: 600 }}>FROM:</span>
          <DateInputDDMMYYYY
            value={startDate}
            onChange={val => { setStartDate(val); setActivePreset(''); }}
            accentColor="#F97316"
            isLight={isLight}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: isLight ? '#64748B' : '#94A3B8', fontWeight: 600 }}>TO:</span>
          <DateInputDDMMYYYY
            value={endDate}
            onChange={val => { setEndDate(val); setActivePreset(''); }}
            accentColor="#F97316"
            isLight={isLight}
          />
          <button
            onClick={handleCustomRange}
            style={{
              padding: '5px 14px',
              fontSize: 12.5,
              fontFamily: 'var(--font-mono)',
              background: 'rgba(249, 115, 22, 0.2)',
              color: isLight ? '#C2410C' : '#F97316',
              border: '1px solid rgba(249, 115, 22, 0.5)',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 700,
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)'}
          >
            APPLY
          </button>
        </div>
      </div>

      {/* ── CARD CONTAINER ── */}
      <Card
        title="MARS CROSS-ENVIRONMENT CORRELATION"
        subtitle="MAVEN Exosphere Orbit Flux vs. Curiosity Gale Crater Surface Dosimetry"
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StatusBadge status={mavenData.length > 0 && radData.length > 0 ? 'normal' : loading ? 'info' : 'offline'} />

            <button
              onClick={loadData}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.15)',
                color: isLight ? '#334155' : '#CBD5E1',
                borderRadius: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'SYNCING...' : 'REFRESH'}</span>
            </button>

            <button
              onClick={toggleDrawingMode}
              style={{
                background: drawingMode ? 'rgba(249, 115, 22, 0.25)' : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                border: `1px solid ${drawingMode ? '#F97316' : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)')}`,
                color: drawingMode ? '#F97316' : (isLight ? '#334155' : '#CBD5E1'),
                padding: '5px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Compass size={13} />
              <span>{drawingMode ? 'DRAWING' : 'TREND LINE'}</span>
            </button>

            {lines.length > 0 && (
              <button
                onClick={clearLines}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#EF4444',
                  padding: '5px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                CLEAR ({lines.length})
              </button>
            )}
            <ExportChartMenu
              chartRef={chartRef}
              data={exportData}
              columns={exportColumns}
              metadata={exportMetadata}
              filenameBase="mars_orbit_surface_correlation"
              accentColor="#F97316"
            />
          </div>
        }
        style={{
          marginBottom: 20,
          background: isLight ? '#FFFFFF' : undefined,
          boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
          border: isLight ? '1px solid rgba(249, 115, 22, 0.25)' : undefined,
        }}
      >
        <div
          ref={chartWrapperRef}
          style={{
            position: 'relative',
            width: '100%',
            height: 560
          }}
        >
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(5, 14, 30, 0.85)',
                zIndex: 10
              }}
            >
              <LoadingSpinner text="Retrieving Synchronized Mars Orbit & Surface Data..." />
            </div>
          )}

          {mavenData.length > 0 || radData.length > 0 ? (
            <>
              <ReactECharts
                ref={chartRef}
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
              <TrendLineOverlay
                chartRef={chartRef}
                wrapperRef={chartWrapperRef}
                gridCount={2}
                gridUnits={['1/(cm²·s·sr·MeV)', 'µGy/hr']}
                lines={lines}
                drawingMode={drawingMode}
                pendingP1={pendingP1}
                onChartClick={handleClick}
                onRemoveLine={removeLine}
              />
            </>
          ) : !loading ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: isLight ? '#94A3B8' : '#64748B',
                gap: 8,
                fontFamily: 'var(--font-sans)'
              }}
            >
              <Info size={32} color="#38BDF8" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>
                No synchronized telemetry available for {appliedRange.start} to {appliedRange.end}
              </span>
              <span style={{ fontSize: 12.5 }}>
                Curiosity RAD and MAVEN both operated concurrently from late 2014 through present. Try clicking a preset (1D, 3D, 7D, 30D, ALL).
              </span>
            </div>
          ) : null}
        </div>
      </Card>

      {/* ── ATMOSPHERIC ATTENUATION INSIGHT NOTE ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 18px',
          borderRadius: 6,
          background: isLight ? '#FFF7ED' : 'rgba(249, 115, 22, 0.08)',
          borderLeft: '4px solid #F97316',
          border: isLight ? '1px solid rgba(249, 115, 22, 0.25)' : '1px solid rgba(249, 115, 22, 0.15)',
          borderLeftWidth: 4,
          fontSize: 13,
          lineHeight: 1.6,
          color: isLight ? '#334155' : '#CBD5E1',
          fontFamily: 'var(--font-sans)',
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
        }}
      >
        <ShieldAlert size={18} color="#F97316" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: isLight ? '#C2410C' : '#FB923C' }}>Planetary Heliophysics Insight:</strong> เมื่อพายุสุริยะระดับรุนแรง (Interplanetary CME หรือ Solar Proton Event) พุ่งชนดาวอังคาร ยาน MAVEN ในวงโคจรจะตรวจพบฟลักซ์โปรตอนพลังงานสูงพุ่งขึ้นทันที 3–4 เท่า (Orders of magnitude). เมื่ออนุภาคเหล่านี้พุ่งทะลุเข้าสู่ชั้นบรรยากาศดาวอังคารที่เบาบาง (~6 mbar) อนุภาคพลังงานต่ำจะถูกดูดกลืน ขณะที่อนุภาคพลังงานสูงเกิน ~150 MeV จะเกิดปฏิกิริยาสร้าง Albedo Neutrons และทะลุลงสู่ก้นหลุม Gale Crater ส่งผลให้ Curiosity RAD ตรวจวัดพบการเพิ่มขึ้นของรังสีระดับพื้นผิว (Ground Level Enhancement - GLE) พร้อมกัน!
        </div>
      </div>
    </div>
  )
}
