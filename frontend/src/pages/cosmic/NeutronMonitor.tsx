import { useEffect, useState, useRef, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Map as MapIcon, RefreshCw, CheckSquare, Square, Sparkles, Search, Layers } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveNeutron, loadNeutron, STATIONS } from '../../services/cosmicService'
import { NEUTRON_STATIONS } from '../../services/neutronStationsData'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'

const KEY_STATION_IDS = ['PSNM', 'OULU', 'SOPO', 'JUNG1', 'THUL', 'MOSC', 'KIEL2']

const STATION_STATUS_MAP: Record<string, 'active' | 'offline'> = {
  BKSN: 'active',
  CALM: 'active',
  JUNG1: 'active',
  LMKS: 'active',
  ...NEUTRON_STATIONS.reduce((acc, s) => {
    acc[s.id] = s.status
    return acc
  }, {} as Record<string, 'active' | 'offline'>)
}

const STATION_COLORS: Record<string, string> = STATIONS.reduce((acc, s, i) => {
  const hue = (i * 137.508) % 360
  acc[s.id] = `hsl(${Math.floor(hue)}, 82%, 60%)`
  return acc
}, {} as Record<string, string>)

export default function NeutronMonitor() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const initialStation = (location.state as any)?.targetStation || searchParams.get('station') || 'OULU'

  const [data, setData] = useState<Record<string, any[]>>({})
  const [active, setActive] = useState<Record<string, boolean>>(() => {
    return STATIONS.reduce((acc, s) => ({ ...acc, [s.id]: s.id === initialStation }), {})
  })
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [hours, setHours] = useState(24)
  const [viewMode, setViewMode] = useState<'variation' | 'rate'>('variation')
  const [stationSearch, setStationSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'offline'>('active')
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef<any>(null)

  const exportData = useMemo(() => {
    const activeStations = Object.keys(active).filter(s => active[s])
    if (!activeStations.length) return []
    const map = new Map<string, any>()
    activeStations.forEach(st => {
      const arr = data[st] || []
      arr.forEach(d => {
        const item = map.get(d.time_tag) || { time_tag: d.time_tag }
        item[st] = d.value
        map.set(d.time_tag, item)
      })
    })
    return Array.from(map.values()).sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }, [active, data])

  const exportColumns = useMemo((): ExportColumn[] => {
    const base: ExportColumn[] = [
      { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
      { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') }
    ]
    const activeStations = Object.keys(active).filter(s => active[s])
    const stCols = activeStations.map(st => ({
      key: st,
      label: `${st}_(${viewMode === 'variation' ? 'Var_%' : 'Counts'})`,
      width: 14
    }))
    return [...base, ...stCols]
  }, [active, viewMode])

  const exportTimeRange = appliedRange
    ? `${appliedRange.startDate} to ${appliedRange.endDate}`
    : `Past ${limit / 1440} Day(s)`

  // When arriving from map page with a target station
  useEffect(() => {
    const target = (location.state as any)?.targetStation || searchParams.get('station')
    if (target) {
      setActive({ [target]: true })
    }
  }, [location.state, searchParams])

  const handleLimitChange = (newLimit: TimeRange) => {
    setLimit(newLimit)
    if (newLimit >= 10080) {
      setHours(168)
    } else if (newLimit >= 4320) {
      setHours(72)
    } else {
      setHours(24)
    }
  }

  // Load telemetry data for active stations
  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const activeStations = STATIONS.filter(s => active[s.id])
    if (activeStations.length === 0) {
      setLoading(false)
      return
    }

    try {
      const results = await Promise.all(
        activeStations.map(async s => {
          let d = await loadNeutron(s.id, limit, appliedRange?.startDate, appliedRange?.endDate)
          const targetPoints = limit > 1440 ? Math.floor(limit * 0.6) : 30
          // If no local records exist or points are fewer than requested window, fetch from NMDB
          if ((!Array.isArray(d) || d.length < targetPoints) && !appliedRange) {
            try {
              const fetchH = Math.max(hours, Math.ceil(limit / 60))
              await fetchAndSaveNeutron(s.id, fetchH)
              d = await loadNeutron(s.id, limit)
            } catch (e) {
              console.warn(`Failed auto-fetch for station ${s.id}:`, e)
            }
          }
          return { id: s.id, data: Array.isArray(d) ? d : [] }
        })
      )
      const newData = { ...data }
      results.forEach(r => { newData[r.id] = r.data })
      setData(newData)
    } catch (e) {
      console.error('Failed to load neutron data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [active, limit, appliedRange])

  useAutoFetch(async () => {
    if (appliedRange) return // do not auto-poll during custom date inspection
    const activeStations = STATIONS.filter(s => active[s.id])
    for (const s of activeStations) {
      const d = await loadNeutron(s.id, limit)
      setData(prev => ({ ...prev, [s.id]: d }))
    }
  }, 60000)

  const handleStationClick = (id: string) => {
    if (isMultiSelect) {
      setActive(prev => ({ ...prev, [id]: !prev[id] }))
    } else {
      setActive({ [id]: true })
    }
  }

  const selectKeyStations = () => {
    setIsMultiSelect(true)
    const next: Record<string, boolean> = {}
    STATIONS.forEach(s => {
      next[s.id] = KEY_STATION_IDS.includes(s.id)
    })
    setActive(next)
  }

  const selectAllStations = () => {
    setIsMultiSelect(true)
    const next: Record<string, boolean> = {}
    STATIONS.forEach(s => { next[s.id] = true })
    setActive(next)
  }

  const clearAllStations = () => {
    const next: Record<string, boolean> = {}
    STATIONS.forEach(s => { next[s.id] = false })
    setActive(next)
  }

  const activeCount = Object.values(active).filter(Boolean).length

  const activeStationsTotal = STATIONS.filter(s => (STATION_STATUS_MAP[s.id] || 'offline') === 'active').length
  const offlineStationsTotal = STATIONS.filter(s => (STATION_STATUS_MAP[s.id] || 'offline') === 'offline').length

  const filteredStations = STATIONS.filter(s => {
    const status = STATION_STATUS_MAP[s.id] || 'offline'
    if (statusFilter !== 'all' && status !== statusFilter) return false
    const q = stationSearch.toLowerCase().trim()
    if (!q) return true
    return (
      s.id.toLowerCase().includes(q) ||
      s.label.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q)
    )
  })

  // Build ECharts series
  const series = STATIONS
    .filter(s => active[s.id] && data[s.id]?.length > 0)
    .map(s => {
      const stationData = data[s.id]
      const validPoints = stationData.filter((d: any) => d && d.count_rate > 0)
      const baseline = validPoints.length > 0
        ? validPoints.reduce((sum: number, d: any) => sum + d.count_rate, 0) / validPoints.length
        : null

      const color = STATION_COLORS[s.id] || (isLight ? '#7C3AED' : '#A855F7')

      return {
        name: `${s.label} (${s.id})`,
        type: 'line',
        smooth: 0.15,
        showSymbol: false,
        connectNulls: true,
        triggerEvent: true,
        lineStyle: { width: 2.2, color },
        itemStyle: { color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 3.5 }
        },
        blur: {
          lineStyle: { opacity: 0.15 }
        },
        data: stationData.map((d: any) => {
          if (!d.count_rate || d.count_rate <= 0) return [d.time_tag, null]
          if (viewMode === 'rate') {
            return [d.time_tag, Number(d.count_rate.toFixed(2))]
          }
          if (!baseline || baseline === 0) return [d.time_tag, null]
          const pct = ((d.count_rate - baseline) / baseline) * 100
          return [d.time_tag, Number(pct.toFixed(2))]
        }),
      }
    })

  const allPoints = Object.values(data).flat()
  const { minTs, maxTs } = getTimeDomain(allPoints)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)
  const isMultiDay = limit > 1440 || !!appliedRange

  if (series.length > 0 && midnightDividers.length > 0) {
    (series[0] as any).markLine = combineMarkLines(midnightDividers)
  }

  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    legend: {
      show: true,
      top: 0,
      textStyle: {
        color: isLight ? '#334155' : '#CBD5E1',
        fontSize: 13,
        fontFamily: 'var(--font-mono)'
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#C084FC' : 'rgba(192, 132, 252, 0.6)',
      borderWidth: 1.5,
      padding: 14,
      extraCssText: isLight
        ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;'
        : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      textStyle: {
        color: isLight ? '#0F172A' : '#F8FAFC',
        fontFamily: 'var(--font-mono)',
        fontSize: 13
      },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: isLight ? '#7C3AED' : '#C084FC',
          type: 'dashed',
          width: 1.5
        }
      },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const rawTime = params[0]?.data?.[0] || params[0]?.axisValue
        const timeStr = formatUTCTime(rawTime, true)

        let html = `
          <div style="font-family:var(--font-mono);font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};font-weight:700;color:${isLight ? '#7C3AED' : '#C084FC'}">
            🕒 ${timeStr}
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-family:var(--font-mono);">
        `

        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          let valStr = 'N/A'
          let valColor = isLight ? '#0F172A' : '#F8FAFC'
          if (typeof val === 'number') {
            if (viewMode === 'variation') {
              valStr = val > 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`
              valColor = val < -3 ? '#EF4444' : (val > 0 ? (isLight ? '#059669' : '#34D399') : (isLight ? '#0F172A' : '#F8FAFC'))
            } else {
              valStr = `${val.toFixed(2)} cts/s`
              valColor = isLight ? '#0284C7' : '#38BDF8'
            }
          }

          html += `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
              <span style="display:flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
                <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
              </span>
              <strong style="color:${valColor};">${valStr}</strong>
            </div>
          `
        })

        html += `</div>`
        return html
      }
    },
    grid: { top: 38, right: 30, bottom: 45, left: 75 },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      }
    ],
    xAxis: {
      type: 'time',
      splitLine: {
        show: true,
        lineStyle: {
          color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
          type: 'dashed'
        }
      },
      axisLine: {
        lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }
      },
      axisLabel: createTimeAxisLabel(isLight, isMultiDay)
    },
    yAxis: {
      type: 'value',
      scale: true,
      name: viewMode === 'variation' ? '% VARIATION' : 'COUNTS / SEC',
      nameLocation: 'middle',
      nameGap: 52,
      nameTextStyle: {
        color: isLight ? '#7C3AED' : '#C084FC',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
          type: 'dashed'
        }
      },
      axisLine: {
        lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }
      },
      axisLabel: {
        color: isLight ? '#475569' : '#CBD5E1',
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        formatter: viewMode === 'variation' ? '{value}%' : '{value}'
      }
    },
    series,
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(124, 58, 237, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#5B21B6' : '#C084FC',
            margin: 0,
            letterSpacing: -0.5
          }}>
            COSMIC RAY / NEUTRON MONITOR
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            NMDB Network · Global Secondary Neutron Station Telemetry & Cosmic Ray Modulation
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link
            to="/cosmic/map"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              background: isLight ? '#EFF6FF' : 'rgba(56, 189, 248, 0.12)',
              border: `1px solid ${isLight ? '#BFDBFE' : 'rgba(56, 189, 248, 0.4)'}`,
              color: isLight ? '#1D4ED8' : '#38BDF8',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: 6,
              transition: 'all 0.15s'
            }}
          >
            <MapIcon size={15} />
            <span>GLOBAL EARTH MAP</span>
          </Link>
          <StatusBadge status={series.length ? 'normal' : 'offline'} />
          <button
            onClick={() => load(true)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: 'transparent', border: 'none',
              color: isLight ? '#7C3AED' : '#C084FC', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'REFRESHING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* Row 2 Toolbar: Mode Selector + Date Range Picker */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20
      }}>
        {/* Metric Switcher Toggle (% Variation vs Count Rate) */}
        <div style={{
          display: 'flex',
          background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
          padding: 3,
          borderRadius: 8,
          border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={() => setViewMode('variation')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              border: 'none',
              background: viewMode === 'variation'
                ? (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.15)')
                : 'transparent',
              color: viewMode === 'variation'
                ? (isLight ? '#6D28D9' : '#C084FC')
                : (isLight ? '#64748B' : '#94A3B8'),
              borderRadius: 6,
              cursor: 'pointer',
              boxShadow: viewMode === 'variation' && isLight ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
              transition: 'all 0.15s ease'
            }}
          >
            % VARIATION (RELATIVE)
          </button>
          <button
            onClick={() => setViewMode('rate')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              border: 'none',
              background: viewMode === 'rate'
                ? (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.15)')
                : 'transparent',
              color: viewMode === 'rate'
                ? (isLight ? '#6D28D9' : '#C084FC')
                : (isLight ? '#64748B' : '#94A3B8'),
              borderRadius: 6,
              cursor: 'pointer',
              boxShadow: viewMode === 'rate' && isLight ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
              transition: 'all 0.15s ease'
            }}
          >
            COUNT RATE (COUNTS/S)
          </button>
        </div>

        <DateRangeToolbar
          limit={limit}
          onLimitChange={handleLimitChange}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#7C3AED' : '#C084FC'}
          loading={loading}
          presets={[1440, 4320, 10080]}
        />
      </div>

      {/* 2-Column Split Layout: Left 30% (Station Selector & Remote Fetch) | Right 70% (Metrics & Chart) */}
      <div
        className="neutron-split-layout"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 20,
          alignItems: 'flex-start',
          width: '100%',
          marginBottom: 24
        }}
      >
        {/* LEFT COLUMN (30%): Stations Sidebar */}
        <div
          className="neutron-left-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: '30%',
            minWidth: 280,
            maxWidth: 360,
            flexShrink: 0,
            boxSizing: 'border-box',
            position: 'sticky',
            top: 20
          }}
        >
          {/* Station Selector Card */}
          <div style={{
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 8,
            padding: '14px',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {/* Header & Quick Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span style={{
                fontSize: 12,
                color: isLight ? '#6D28D9' : '#C084FC',
                fontFamily: 'var(--font-mono)',
                letterSpacing: 0.5,
                fontWeight: 700
              }}>
                STATIONS ({activeCount}/{STATIONS.length})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Multi-Select Toggle Function */}
                <button
                  onClick={() => setIsMultiSelect(!isMultiSelect)}
                  title={isMultiSelect ? "Switch back to Single Select (Click station = select only that one)" : "Enable Multi-Select mode"}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 7px',
                    background: isMultiSelect
                      ? (isLight ? '#7C3AED' : '#9333EA')
                      : (isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)'),
                    border: `1px solid ${isMultiSelect ? '#7C3AED' : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)')}`,
                    color: isMultiSelect ? '#FFFFFF' : (isLight ? '#475569' : '#CBD5E1'),
                    borderRadius: 4, cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Layers size={11} />
                  <span>{isMultiSelect ? 'MULTI ON' : '+ MULTI'}</span>
                </button>

                {/* Quick actions for multi-select */}
                {isMultiSelect && (
                  <>
                    <button
                      onClick={selectKeyStations}
                      title="Select Key Stations"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        padding: '3px 6px',
                        background: isLight ? '#F5F3FF' : 'rgba(124, 58, 237, 0.15)',
                        border: `1px solid ${isLight ? '#DDD6FE' : 'rgba(124, 58, 237, 0.35)'}`,
                        color: isLight ? '#6D28D9' : '#C084FC',
                        borderRadius: 4, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700
                      }}
                    >
                      <Sparkles size={10} />
                      <span>KEY</span>
                    </button>
                    <button
                      onClick={selectAllStations}
                      title="Select All"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        padding: '3px 6px',
                        background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'}`,
                        color: isLight ? '#334155' : '#CBD5E1',
                        borderRadius: 4, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700
                      }}
                    >
                      <CheckSquare size={10} />
                      <span>ALL</span>
                    </button>
                    <button
                      onClick={clearAllStations}
                      title="Clear All"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        padding: '3px 6px',
                        background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'}`,
                        color: isLight ? '#64748B' : '#94A3B8',
                        borderRadius: 4, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700
                      }}
                    >
                      <Square size={10} />
                      <span>CLEAR</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px',
              background: isLight ? '#F8FAFC' : '#0F172A',
              border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 6
            }}>
              <Search size={13} style={{ color: isLight ? '#94A3B8' : '#64748B', flexShrink: 0 }} />
              <input
                type="text"
                value={stationSearch}
                onChange={e => setStationSearch(e.target.value)}
                placeholder="Search station or city..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: isLight ? '#0F172A' : '#F8FAFC',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  width: '100%'
                }}
              />
            </div>

            {/* Status Filter Segment Tabs (ALL / ACTIVE / OFFLINE) */}
            <div style={{
              display: 'flex',
              background: isLight ? '#F1F5F9' : 'rgba(0,0,0,0.3)',
              padding: 3,
              borderRadius: 6,
              border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}`,
              gap: 3
            }}>
              {[
                { key: 'active', label: 'ACTIVE', count: activeStationsTotal, color: '#10B981' },
                { key: 'offline', label: 'OFFLINE', count: offlineStationsTotal, color: '#64748B' },
                { key: 'all', label: 'ALL', count: STATIONS.length, color: isLight ? '#6D28D9' : '#C084FC' }
              ].map(tab => {
                const isSelected = statusFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key as any)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '5px 4px',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      border: 'none',
                      borderBottom: isSelected && !isLight ? '2px solid #C084FC' : '2px solid transparent',
                      background: isSelected
                        ? (isLight ? '#FFFFFF' : 'rgba(124, 58, 237, 0.25)')
                        : 'transparent',
                      color: isSelected
                        ? (isLight ? '#6D28D9' : '#C084FC')
                        : (isLight ? '#64748B' : '#94A3B8'),
                      borderRadius: 4,
                      cursor: 'pointer',
                      boxShadow: isSelected && isLight ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 10,
                      background: isSelected
                        ? (isLight ? 'rgba(109, 40, 217, 0.12)' : 'rgba(192, 132, 252, 0.2)')
                        : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                      color: isSelected
                        ? (isLight ? '#6D28D9' : '#E9D5FF')
                        : (isLight ? '#64748B' : '#94A3B8')
                    }}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Station List */}
            <div
              className="station-grid-scroll"
              style={{
                maxHeight: 540,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                paddingRight: 4
              }}
            >
              {filteredStations.map(s => {
                const isOn = active[s.id]
                const color = STATION_COLORS[s.id]
                const isStationOnline = (STATION_STATUS_MAP[s.id] || 'offline') === 'active'

                return (
                  <button
                    key={s.id}
                    onClick={() => handleStationClick(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: isOn
                        ? (isLight ? `${color}18` : `${color}20`)
                        : (isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)'),
                      border: `1px solid ${isOn ? color : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)')}`,
                      borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: isOn && isLight ? `0 1px 4px ${color}20` : undefined,
                      width: '100%'
                    }}
                  >
                    <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                      <div style={{
                        fontSize: 12.5,
                        fontFamily: 'var(--font-mono)',
                        color: isOn ? color : (isLight ? '#475569' : '#94A3B8'),
                        fontWeight: isOn ? 800 : 600,
                        letterSpacing: 0.5
                      }}>
                        {s.id}
                        <span style={{
                          fontSize: 11,
                          color: isLight ? '#64748B' : '#94A3B8',
                          fontWeight: 400,
                          marginLeft: 6
                        }}>
                          {s.label}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 10.5,
                        color: isLight ? '#94A3B8' : '#64748B',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {s.country}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 6 }}>
                      {/* LIVE vs OFFLINE Status Pill */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 5px',
                        borderRadius: 4,
                        background: isStationOnline
                          ? (isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)')
                          : (isLight ? 'rgba(148, 163, 184, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                        border: `1px solid ${isStationOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`
                      }}>
                        <span style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: isStationOnline ? '#10B981' : '#64748B',
                          boxShadow: isStationOnline ? '0 0 5px #10B981' : 'none'
                        }} />
                        <span style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: isStationOnline ? (isLight ? '#059669' : '#34D399') : (isLight ? '#64748B' : '#94A3B8'),
                          letterSpacing: 0.3
                        }}>
                          {isStationOnline ? 'LIVE' : 'OFFLINE'}
                        </span>
                      </div>

                      {/* Active Indicator Dot (when selected) */}
                      {isOn && (
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: color,
                          boxShadow: `0 0 6px ${color}`,
                          transition: 'all 0.15s'
                        }} />
                      )}
                    </div>
                  </button>
                )
              })}
              {filteredStations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                  No station found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (70%): Chart */}
        <div
          className="neutron-right-col"
          style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}
        >
          {/* Main Chart */}
          {loading && series.length === 0 ? <LoadingSpinner /> : (
            <Card
              title={viewMode === 'variation' ? "NEUTRON COUNT RATE — MULTI STATION VARIATION" : "NEUTRON COUNT RATE — ABSOLUTE FLUX"}
              subtitle="SECONDARY NEUTRON FLUX (PRESSURE CORRECTED · NMDB NETWORK)"
              style={{
                background: isLight ? '#FFFFFF' : undefined,
                boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
                border: isLight ? '1px solid rgba(124, 58, 237, 0.18)' : undefined,
              }}
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ExportChartMenu
                    chartRef={chartRef}
                    data={exportData}
                    columns={exportColumns}
                    metadata={{
                      station: 'NMDB COSMIC RAY NETWORK',
                      viewTitle: viewMode === 'variation' ? 'MULTI-STATION RELATIVE VARIATION (%)' : 'MULTI-STATION ABSOLUTE COUNT RATE',
                      description: 'Secondary Cosmic Ray Neutron Monitor Flux (Pressure Corrected · NMDB Worldwide Stations)',
                      timeRangeText: exportTimeRange,
                      totalRecords: exportData.length
                    }}
                    filenameBase={`NMDB_MULTI_STATION_${viewMode.toUpperCase()}_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                    accentColor={isLight ? '#7C3AED' : '#C084FC'}
                  />
                </div>
              }
            >
              {series.length === 0 ? (
                <div style={{ padding: '70px 20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, color: isLight ? '#64748B' : '#94A3B8', letterSpacing: 0.5 }}>
                  <div style={{ color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: 8, fontWeight: 700, fontSize: 16 }}>
                    NO REAL-TIME BROADCAST DATA FOR SELECTED STATION(S)
                  </div>
                  <div style={{ color: isLight ? '#64748B' : '#64748B', fontSize: 13, maxWidth: 500, margin: '0 auto' }}>
                    Please select an active station from the network list on the left or click "FETCH" to poll live NMDB telemetry.
                  </div>
                </div>
              ) : (
                <ReactECharts
                  ref={chartRef}
                  key={`${viewMode}-${limit}-${appliedRange ? 'custom' : 'preset'}`}
                  option={option}
                  style={{ height: 530, width: '100%' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#7C3AED' : '#C084FC'}
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
              การวัดค่ารังสีคอสมิกและอนุภาคนิวตรอน (Cosmic Ray & Neutron Flux)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>Neutron Monitor</strong> ตรวจวัดปริมาณอนุภาคนิวตรอนทุติยภูมิ (Secondary Neutrons) ที่เกิดจากรังสีคอสมิกพลังงานสูงพุ่งชนโมเลกุลในชั้นบรรยากาศโลก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
                paddingLeft: 14,
                background: isLight ? '#F5F3FF' : 'transparent',
                padding: '8px 14px',
                borderRadius: '0 6px 6px 0'
              }}>
                <span style={{ color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>% Variation: </span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13 }}>
                  อัตราการเปลี่ยนแปลงเป็นเปอร์เซ็นต์เทียบกับค่าเฉลี่ยฐานปกติ (Baseline 0%) ของแต่ละสถานี
                </span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 14,
                background: isLight ? '#F0F9FF' : 'transparent',
                padding: '8px 14px',
                borderRadius: '0 6px 6px 0'
              }}>
                <span style={{ color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>ความสัมพันธ์กับกิจกรรมสุริยะ: </span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13 }}>
                  ปริมาณรังสีคอสมิกจะแปรผกผันกับกิจกรรมของดวงอาทิตย์ เมื่อพายุสุริยะพัดผ่าน โครงสร้างสนามแม่เหล็กจะปัดรังสีคอสมิกออกไป ทำให้นิวตรอนลดลง
                </span>
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
              ปรากฏการณ์ Forbush Decrease (การลดลงของฟอร์บุช)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              ตัวชี้วัดสำคัญในการเฝ้าระวังผลกระทบของพายุสุริยะต่อโลก:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.08)',
                padding: 16, borderRadius: 6,
                border: `1px solid ${isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.25)'}`
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  Forbush Decrease (ลดลง &ge; 3%)
                </h5>
                <p style={{ color: isLight ? '#7F1D1D' : '#FCA5A5', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  เมื่อเกิดการดิ่งลงอย่างฉับพลันของปริมาณนิวตรอนเกิน 3% ขึ้นไป บ่งชี้ว่ามวลสารโคโรนา (CME) กำลังเข้าปะทะและห่อหุ้มสนามแม่เหล็กโลก
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.08)',
                padding: 16, borderRadius: 6,
                border: `1px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.25)'}`
              }}>
                <h5 style={{ color: '#D97706', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  กลไกสนามแม่เหล็ก CME บังรังสี
                </h5>
                <p style={{ color: isLight ? '#78350F' : '#FCD34D', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  โครงสร้างเมฆพลาสมาและสนามแม่เหล็กที่หนาแน่นของ CME ทำหน้าที่เป็นเกราะกำบังปัดรังสีคอสมิกจากนอกระบบสุริยะไม่ให้เข้ามาถึงโลก
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
              รายละเอียดเครือข่ายสถานีตรวจนิวตรอน (NMDB Network)
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8', width: '35%' }}>PSNM (ไทย)</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>ยอดดอยอินทนนท์ สถานีที่มีค่า Cutoff Rigidity สูงที่สุดในโลก (16.8 GV)</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>OULU (ฟินแลนด์)</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>ละติจูดสูงใกล้ขั้วโลกเหนือ ตรวจวัดการเปลี่ยนแปลงของรังสีคอสมิกพลังงานต่ำได้ไว</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>JUNG1 (สวิตเซอร์แลนด์)</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>ยอดเขา Jungfraujoch สูง 3,470m ตรวจวัดบนบรรยากาศเบาบาง</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>SOPO / THUL</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>สถานีขั้วโลกใต้ (South Pole) และขั้วโลกเหนือ (Thule, Greenland)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>หน่วยวัดปริมาณ</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>counts/min (จำนวนอนุภาคนิวตรอนชนท่อตรวจวัดต่อหนึ่งนาที)</td>
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
              เชื่อมต่ออัตโนมัติกับฐานข้อมูลเครือข่ายความร่วมมือสถานีตรวจวัดนิวตรอนระดับโลก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
                paddingLeft: 12,
                color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>NMDB Network: </strong>
                Real-Time Database for High-Resolution Neutron Monitor Data
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
                paddingLeft: 12,
                color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>สถานีวิจัยสากล: </strong>
                Oulu, Doi Inthanon (PSNM), Kiel, Jungfraujoch, Moscow, South Pole และสถาบันวิทยาศาสตร์ที่เกี่ยวข้อง
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: isLight ? '#FFFBEB' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isLight ? '#FDE68A' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 6,
              fontSize: 13,
              color: isLight ? '#B45309' : '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              API Data Reference: Real-time queries via <a href="https://www.nmdb.eu/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#1D4ED8' : '#38BDF8', textDecoration: 'underline' }}>NMDB Nest services</a>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}