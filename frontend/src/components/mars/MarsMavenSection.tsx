import React, { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  Calendar,
  Layers,
  Zap,
  Info,
  RefreshCw,
  Compass,
  HelpCircle,
  BarChart2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { loadMarsMaven, MarsMavenRecord, MAVEN_ION_CHANNELS, MAVEN_ELE_CHANNELS } from '../../services/marsService'
import LoadingSpinner from '../ui/LoadingSpinner'
import StatusBadge from '../ui/StatusBadge'
import Card from '../ui/Card'
import ExportChartMenu from '../ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../ui/TrendLineOverlay'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime, formatPowerOf10 } from '../../utils/formatters'
import DateRangeToolbar, { TimeRange } from '../ui/DateRangeToolbar'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'

// Key Representative Channels for fast viewing
const KEY_ION_KEYS = ['ion_1', 'ion_6', 'ion_12', 'ion_16', 'ion_20', 'ion_24', 'ion_28']
const KEY_ELE_KEYS = ['ele_1', 'ele_4', 'ele_8', 'ele_12', 'ele_15']

export default function MarsMavenSection() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  const { lines, setLines, drawingMode, toggleDrawingMode, pendingP1, handleClick, removeLine, clearLines } = useLineDrawing(chartRef)

  // View Mode: 'ions' | 'electrons' | 'both'
  const [particleType, setParticleType] = useState<'ions' | 'electrons' | 'both'>('ions')
  const [energyBand, setEnergyBand] = useState<'all' | 'key' | 'low' | 'mid' | 'high'>('key')

  // Selected Channels
  const [selectedIons, setSelectedIons] = useState<string[]>(KEY_ION_KEYS)
  const [selectedEles, setSelectedEles] = useState<string[]>(KEY_ELE_KEYS)
  const [showChannels, setShowChannels] = useState(true)

  // Date range states (TimeRange like SWEPAM)
  const [limit, setLimit] = useState<TimeRange>(10080)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)

  // Data states
  const [data, setData] = useState<MarsMavenRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chart' | 'guide'>('chart')

  const fetchData = async () => {
    setLoading(true)
    try {
      let sDate = appliedRange?.startDate
      let eDate = appliedRange?.endDate
      let days = limit === 1440 ? 1 : limit === 4320 ? 3 : limit === 10080 ? 7 : 30

      if (!sDate || !eDate) {
        const baseEnd = '2024-05-15'
        const endD = new Date(baseEnd)
        const startD = new Date(endD)
        startD.setDate(endD.getDate() - days)
        sDate = startD.toISOString().split('T')[0]
        eDate = baseEnd
      }

      const rows = await loadMarsMaven(days * 24, sDate, eDate)
      setData(Array.isArray(rows) ? rows : [])
    } catch (err) {
      console.error('Failed to load MAVEN data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [limit, appliedRange])

  // Energy Band shortcuts
  const handleBandSelect = (band: 'all' | 'key' | 'low' | 'mid' | 'high') => {
    setEnergyBand(band)
    if (band === 'key') {
      setSelectedIons(KEY_ION_KEYS)
      setSelectedEles(KEY_ELE_KEYS)
    } else if (band === 'all') {
      setSelectedIons(MAVEN_ION_CHANNELS.map(c => c.key))
      setSelectedEles(MAVEN_ELE_CHANNELS.map(c => c.key))
    } else if (band === 'low') {
      setSelectedIons(MAVEN_ION_CHANNELS.filter(c => c.band === 'low').map(c => c.key))
    } else if (band === 'mid') {
      setSelectedIons(MAVEN_ION_CHANNELS.filter(c => c.band === 'mid').map(c => c.key))
    } else if (band === 'high') {
      setSelectedIons(MAVEN_ION_CHANNELS.filter(c => c.band === 'high').map(c => c.key))
    }
  }

  const toggleIon = (key: string) => {
    setSelectedIons(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const toggleEle = (key: string) => {
    setSelectedEles(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const exportColumns = useMemo<ExportColumn[]>(() => {
    const cols: ExportColumn[] = [
      { key: 'time_tag', label: 'Time Tag (UTC)', width: 22 },
      { key: 'year', label: 'Year', width: 6 },
      { key: 'doy', label: 'DOY', width: 6 },
      { key: 'hour', label: 'Hour', width: 6 },
    ]
    if (particleType === 'ions' || particleType === 'both') {
      MAVEN_ION_CHANNELS.forEach(c => {
        if (selectedIons.includes(c.key)) {
          cols.push({
            key: c.key,
            label: `Ion ${c.label}`,
            width: 18,
            format: (v) => v != null ? Number(v).toExponential(3) : 'N/A'
          })
        }
      })
    }
    if (particleType === 'electrons' || particleType === 'both') {
      MAVEN_ELE_CHANNELS.forEach(c => {
        if (selectedEles.includes(c.key)) {
          cols.push({
            key: c.key,
            label: `Ele ${c.label}`,
            width: 18,
            format: (v) => v != null ? Number(v).toExponential(3) : 'N/A'
          })
        }
      })
    }
    return cols
  }, [particleType, selectedIons, selectedEles])

  const exportMetadata = useMemo(() => ({
    station: 'MAVEN Spacecraft / SEP (Mars Orbit)',
    viewTitle: `MAVEN Solar Energetic Particle Telemetry [${particleType.toUpperCase()}]`,
    description: 'Solar Energetic Particle (SEP) instrument data in Mars elliptical orbit, measuring solar wind ions and electrons.',
    timeRangeText: appliedRange ? `${appliedRange.startDate} to ${appliedRange.endDate}` : `${limit / 1440}D (${data.length > 0 ? `${data[0].time_tag} to ${data[data.length - 1].time_tag}` : 'N/A'})`,
    totalRecords: data.length
  }), [particleType, appliedRange, limit, data])

  // Build Chart Series
  const chartOption = useMemo(() => {
    if (!data.length) return {}

    const series: any[] = []
    const ionColorScale = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#EC4899'
    ]
    const eleColorScale = [
      '#38BDF8', '#818CF8', '#A78BFA', '#C084FC', '#F472B6'
    ]

    const { minTs, maxTs } = getTimeDomain(data)
    const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)
    const isMultiDay = limit > 1440 || !!appliedRange

    if (particleType === 'ions' || particleType === 'both') {
      selectedIons.forEach((key, idx) => {
        const meta = MAVEN_ION_CHANNELS.find(c => c.key === key)
        const name = meta ? `Ion ${meta.range}` : key
        const color = ionColorScale[idx % ionColorScale.length]

        series.push({
          name,
          type: 'line',
          smooth: 0.15,
          showSymbol: false,
          lineStyle: { width: 1.8, color },
          itemStyle: { color },
          markLine: idx === 0 ? combineMarkLines(midnightDividers, buildMarkLines(lines, 0)) : undefined,
          data: data.map(d => [d.time_tag, d[key] != null && d[key] > 0 ? d[key] : null])
        })
      })
    }

    if (particleType === 'electrons' || particleType === 'both') {
      selectedEles.forEach((key, idx) => {
        const meta = MAVEN_ELE_CHANNELS.find(c => c.key === key)
        const name = meta ? `Ele ${meta.range}` : key
        const color = eleColorScale[idx % eleColorScale.length]

        series.push({
          name,
          type: 'line',
          smooth: 0.15,
          showSymbol: false,
          lineStyle: { width: 1.8, type: 'dashed', color },
          itemStyle: { color },
          markLine: (idx === 0 && series.length === 0) ? combineMarkLines(midnightDividers, buildMarkLines(lines, 0)) : undefined,
          data: data.map(d => [d.time_tag, d[key] != null && d[key] > 0 ? d[key] : null])
        })
      })
    }

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
          const rawTime = params[0].value ? params[0].value[0] : params[0].axisValue
          const timeStr = formatUTCTime(rawTime, true)
          let out = `<div style="font-weight:700;margin-bottom:6px;color:${isLight ? '#0369A1' : '#38BDF8'};border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'};padding-bottom:4px;">⏱ ${timeStr}</div>`
          params.slice(0, 8).forEach(p => {
            if (p.value[1] != null) {
              const valFormatted = Number(p.value[1]).toExponential(2)
              out += `<div style="display:flex;justify-content:space-between;gap:12px;padding:2px 0;">
                <span style="color:${p.color}">● ${p.seriesName}:</span>
                <strong style="color:${isLight ? '#0F172A' : '#FFF'}">${valFormatted}</strong>
              </div>`
            }
          })
          if (params.length > 8) {
            out += `<div style="color:#94A3B8;font-size:11px;margin-top:4px;">+ ${params.length - 8} more channels...</div>`
          }
          return out
        }
      },
      legend: {
        type: 'scroll',
        top: 4,
        textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' },
        pageTextStyle: { color: isLight ? '#0F172A' : '#FFFFFF' }
      },
      grid: {
        left: 80,
        right: 30,
        top: 40,
        bottom: 45
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: createTimeAxisLabel(isLight, isMultiDay),
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(52,152,219,0.12)', type: 'dashed' } }
      },
      yAxis: {
        type: 'log',
        logBase: 10,
        name: 'Flux [1/(cm²·s·sr·MeV)]',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: { color: isLight ? '#475569' : '#94A3B8', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: {
          color: isLight ? '#475569' : '#CBD5E1',
          fontSize: 12,
          fontFamily: 'monospace, sans-serif',
          formatter: formatPowerOf10
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(52,152,219,0.12)', type: 'dashed' } }
      },
      dataZoom: [
        { type: 'inside' }
      ],
      series
    }
  }, [data, selectedIons, selectedEles, particleType, lines, isLight])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── CONTROLS TOOLBAR: SPECIES, ENERGY BAND & DATE RANGE (SWEPAM STYLE) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
      }}>
        {/* Left: Species & Band */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Species */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: isLight ? '#1A6DB5' : '#38BDF8', letterSpacing: '0.06em' }}>
              SPECIES:
            </span>
            {(['ions', 'electrons', 'both'] as const).map(type => {
              const active = particleType === type
              return (
                <button
                  key={type}
                  onClick={() => setParticleType(type)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    borderRadius: 4,
                    border: active ? '1px solid #38BDF8' : isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                    background: active ? 'rgba(56, 189, 248, 0.2)' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                    color: active ? (isLight ? '#0284C7' : '#38BDF8') : (isLight ? '#475569' : '#94A3B8'),
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 500,
                    transition: 'all 0.15s'
                  }}
                >
                  {type === 'ions' ? 'Ions (19 keV – 7 MeV)' : type === 'electrons' ? 'Electrons (20 – 227 keV)' : 'Both'}
                </button>
              )
            })}
          </div>

          {/* Band */}
          {particleType !== 'electrons' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: isLight ? '#DC2626' : '#EF4444', letterSpacing: '0.06em' }}>
                BAND:
              </span>
              {(['key', 'all', 'low', 'mid', 'high'] as const).map(b => {
                const active = energyBand === b
                return (
                  <button
                    key={b}
                    onClick={() => handleBandSelect(b)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      borderRadius: 3,
                      border: active ? '1px solid #EF4444' : isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                      background: active ? 'rgba(239, 68, 68, 0.2)' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                      color: active ? '#EF4444' : (isLight ? '#475569' : '#94A3B8'),
                      cursor: 'pointer',
                      fontWeight: active ? 700 : 500,
                      transition: 'all 0.15s'
                    }}
                  >
                    {b.toUpperCase()}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: DateRangeToolbar (matching SWEPAM standard) */}
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#0284C7' : '#38BDF8'}
          loading={loading}
          presets={[1440, 4320, 10080, 43200]}
        />
      </div>

      {/* ── MAIN CARD CONTAINER ── */}
      <Card
        title="MAVEN SEP · ORBITAL ENERGETIC PARTICLES"
        subtitle="NASA MAVEN Mission · Solar Energetic Particle Spectrometer · Exosphere Flux (2015–2025)"
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Guide vs Spectrum toggle */}
            <div style={{
              display: 'inline-flex',
              background: isLight ? '#F1F5F9' : 'rgba(5, 10, 24, 0.8)',
              padding: 3,
              borderRadius: 4,
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.1)'
            }}>
              <button
                onClick={() => setActiveTab('chart')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: activeTab === 'chart' ? (isLight ? '#FFFFFF' : 'rgba(56, 189, 248, 0.25)') : 'transparent',
                  color: activeTab === 'chart' ? (isLight ? '#0284C7' : '#38BDF8') : (isLight ? '#64748B' : '#94A3B8'),
                  fontWeight: 700
                }}
              >
                <BarChart2 size={12} />
                <span>SPECTRUM PLOT</span>
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: activeTab === 'guide' ? (isLight ? '#FFFFFF' : 'rgba(56, 189, 248, 0.25)') : 'transparent',
                  color: activeTab === 'guide' ? (isLight ? '#0284C7' : '#38BDF8') : (isLight ? '#64748B' : '#94A3B8'),
                  fontWeight: 700
                }}
              >
                <HelpCircle size={12} />
                <span>MISSION GUIDE</span>
              </button>
            </div>

            <StatusBadge status={data.length > 0 ? 'normal' : loading ? 'info' : 'offline'} />

            <button
              onClick={fetchData}
              title="Refresh Data"
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

            {activeTab === 'chart' && (
              <>
                <button
                  onClick={toggleDrawingMode}
                  style={{
                    background: drawingMode ? 'rgba(56, 189, 248, 0.25)' : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                    border: `1px solid ${drawingMode ? '#38BDF8' : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)')}`,
                    color: drawingMode ? '#38BDF8' : (isLight ? '#334155' : '#CBD5E1'),
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
                  data={data}
                  columns={exportColumns}
                  metadata={exportMetadata}
                  filenameBase={`maven_sep_${particleType}`}
                  accentColor="#EF4444"
                />
              </>
            )}
          </div>
        }
        style={{
          marginBottom: 20,
          background: isLight ? '#FFFFFF' : undefined,
          boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
          border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
        }}
      >
        {activeTab === 'chart' ? (
          <div>
            {/* Chart Area */}
            <div
              ref={chartWrapperRef}
              style={{
                position: 'relative',
                width: '100%',
                height: 520,
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
                  <LoadingSpinner text="Retrieving MAVEN Orbital Particle Telemetry..." />
                </div>
              )}

              {data.length > 0 ? (
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
                    gridCount={1}
                    gridUnits={['1/(cm²·s·sr·MeV)']}
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
                    No MAVEN particle data found for {appliedRange ? `${appliedRange.startDate} to ${appliedRange.endDate}` : 'the selected period'}
                  </span>
                  <span style={{ fontSize: 12.5 }}>
                    Please select a date between 2015-01-01 and 2025-11-14 or click a preset (1D, 3D, 7D, 30D).
                  </span>
                </div>
              ) : null}
            </div>

            {/* Active Channels Toggle Accordion */}
            <div style={{
              marginTop: 18,
              borderTop: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
              paddingTop: 14
            }}>
              <div
                onClick={() => setShowChannels(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginBottom: showChannels ? 12 : 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={14} color="#EF4444" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, color: isLight ? '#334155' : '#CBD5E1' }}>
                    ACTIVE CHANNELS CONFIGURATION ({selectedIons.length} Ions / {selectedEles.length} Electrons)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLight ? '#64748B' : '#94A3B8', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  <span>{showChannels ? 'COLLAPSE' : 'EXPAND'}</span>
                  {showChannels ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {showChannels && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Ion channels */}
                  {(particleType === 'ions' || particleType === 'both') && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#EF4444', marginBottom: 8 }}>
                        <span>ACTIVE ION CHANNELS ({selectedIons.length}/28):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {MAVEN_ION_CHANNELS.map(c => {
                          const active = selectedIons.includes(c.key)
                          return (
                            <button
                              key={c.key}
                              onClick={() => toggleIon(c.key)}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontFamily: 'var(--font-mono)',
                                borderRadius: 3,
                                border: `1px solid ${active ? '#EF4444' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}`,
                                background: active ? 'rgba(239, 68, 68, 0.15)' : isLight ? '#F8FAFC' : 'transparent',
                                color: active ? '#EF4444' : isLight ? '#64748B' : '#94A3B8',
                                cursor: 'pointer',
                                fontWeight: active ? 700 : 500,
                                transition: 'all 0.1s'
                              }}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Electron channels */}
                  {(particleType === 'electrons' || particleType === 'both') && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#38BDF8', marginBottom: 8 }}>
                        <Zap size={13} color="#38BDF8" />
                        <span>ACTIVE ELECTRON CHANNELS ({selectedEles.length}/15):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {MAVEN_ELE_CHANNELS.map(c => {
                          const active = selectedEles.includes(c.key)
                          return (
                            <button
                              key={c.key}
                              onClick={() => toggleEle(c.key)}
                              style={{
                                padding: '3px 8px',
                                fontSize: 11,
                                fontFamily: 'var(--font-mono)',
                                borderRadius: 3,
                                border: `1px solid ${active ? '#38BDF8' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}`,
                                background: active ? 'rgba(56, 189, 248, 0.15)' : isLight ? '#F8FAFC' : 'transparent',
                                color: active ? (isLight ? '#0284C7' : '#38BDF8') : isLight ? '#64748B' : '#94A3B8',
                                cursor: 'pointer',
                                fontWeight: active ? 700 : 500,
                                transition: 'all 0.1s'
                              }}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Mission Guide Tab */
          <div
            style={{
              padding: '10px 4px',
              lineHeight: 1.7,
              fontSize: 13.5,
              color: isLight ? '#334155' : '#CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              fontFamily: 'var(--font-sans)'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, color: isLight ? '#0284C7' : '#38BDF8', fontFamily: 'var(--font-sans)' }}>
              About MAVEN Solar Energetic Particle (SEP) Instrument
            </div>
            <p style={{ margin: 0 }}>
              The <strong>MAVEN (Mars Atmosphere and Volatile EvolutioN)</strong> spacecraft was launched by NASA in November 2013 and entered Martian orbit in September 2014. One of its premier science investigations is measuring how solar activity, Coronal Mass Ejections (CMEs), and Solar Energetic Particles (SEPs) drive the loss of Mars’ atmospheric ions into space.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              <div style={{ background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>ION MEASUREMENTS</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>Measures protons and heavy solar ions across <strong>28 discrete energy channels</strong> from 19.7 keV/n to 7.2 MeV/n. These particles penetrate down to the Martian thermosphere and drive auroral activity.</div>
              </div>
              <div style={{ background: isLight ? '#F8FAFC' : 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontWeight: 700, color: isLight ? '#0284C7' : '#38BDF8', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>ELECTRON MEASUREMENTS</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>Measures solar energetic electrons across <strong>15 energy channels</strong> from 20.1 keV to 227.3 keV. Fast-moving electrons serve as early warnings of arriving shock fronts ahead of slower CME ion clouds.</div>
              </div>
            </div>
            <div style={{ background: isLight ? '#F0FDF4' : 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38BDF8', padding: '14px 18px', borderRadius: 4, fontSize: 13, color: isLight ? '#0F172A' : '#F8FAFC' }}>
              <strong>Comparison with MSL Curiosity:</strong> While Curiosity RAD detects radiation on the Martian ground after attenuation through the ~6 mbar CO₂ atmosphere, MAVEN detects unshielded space particles directly in orbit. Comparing both instruments allows scientists to quantify Martian atmospheric shielding efficiency!
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
