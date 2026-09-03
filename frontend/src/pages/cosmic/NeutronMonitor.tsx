import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Map, RefreshCw, CheckSquare, Square, Sparkles } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveNeutron, loadNeutron, STATIONS } from '../../services/cosmicService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { useTheme } from '../../context/ThemeContext'

const KEY_STATION_IDS = ['PSNM', 'OULU', 'SOPO', 'JUNG1', 'THUL', 'MOSC', 'KIEL2']

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
  const [fetching, setFetching] = useState(false)
  const [fetchStation, setFetchStation] = useState(initialStation)
  const [limit, setLimit] = useState<TimeRange>(360)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [hours, setHours] = useState(24)
  const [activeTab, setActiveTab] = useState('usage')

  // When arriving from map page with a target station
  useEffect(() => {
    const target = (location.state as any)?.targetStation || searchParams.get('station')
    if (target) {
      setActive({ [target]: true })
      setFetchStation(target)
    }
  }, [location.state, searchParams])

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
          // If no local records exist for this active station, attempt live fetch from NMDB
          if ((!Array.isArray(d) || d.length === 0) && !appliedRange) {
            try {
              await fetchAndSaveNeutron(s.id, hours)
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

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveNeutron(fetchStation, hours)
      const d = await loadNeutron(fetchStation, limit, appliedRange?.startDate, appliedRange?.endDate)
      setData(prev => ({ ...prev, [fetchStation]: d }))
      setActive(prev => ({ ...prev, [fetchStation]: true }))
    } catch (e) {
      console.error('Failed fetching remote telemetry:', e)
    } finally {
      setFetching(false)
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

  const toggleStation = (id: string) => {
    setActive(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const selectKeyStations = () => {
    const next: Record<string, boolean> = {}
    STATIONS.forEach(s => {
      next[s.id] = KEY_STATION_IDS.includes(s.id)
    })
    setActive(next)
  }

  const selectAllStations = () => {
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
        showSymbol: false,
        connectNulls: true,
        triggerEvent: true,
        lineStyle: { width: 2.2, color },
        itemStyle: { color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 4.0 }
        },
        blur: {
          lineStyle: { opacity: 0.15 }
        },
        data: stationData.map((d: any) => {
          if (!baseline || baseline === 0 || !d.count_rate || d.count_rate <= 0) return [d.time_tag, null]
          const pct = ((d.count_rate - baseline) / baseline) * 100
          return [d.time_tag, Number(pct.toFixed(2))]
        }),
      }
    })

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#C084FC' : 'rgba(192, 132, 252, 0.6)',
      borderWidth: 1.5,
      padding: 12,
      extraCssText: isLight
        ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
        : 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); border-radius: 6px;',
      textStyle: {
        color: isLight ? '#0F172A' : '#F8FAFC',
        fontFamily: 'var(--font-mono)',
        fontSize: 13
      },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const time = params[0]?.axisValueLabel || params[0]?.name || ''
        const timeStr = time ? new Date(time).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : ''

        let html = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
            <strong style="color:${isLight ? '#7C3AED' : '#C084FC'};font-family:var(--font-mono);font-size:13px;">🕒 ${timeStr}</strong>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr auto;gap:4px 12px;align-items:center;font-size:12px;font-family:var(--font-mono);">
        `

        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          const valStr = typeof val === 'number' ? (val > 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`) : 'N/A'
          const valColor = typeof val === 'number' ? (val < -3 ? '#EF4444' : (val > 0 ? (isLight ? '#059669' : '#34D399') : (isLight ? '#0F172A' : '#F8FAFC'))) : '#94A3B8'

          html += `
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
            <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
            <strong style="color:${valColor};text-align:right;">${valStr}</strong>
          `
        })

        html += `</div>`
        return html
      }
    },
    legend: { show: false },
    grid: { top: 25, right: 30, bottom: 45, left: 85 },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 22,
        bottom: 10,
        fillerColor: isLight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(192, 132, 252, 0.15)',
        borderColor: isLight ? 'rgba(124, 58, 237, 0.25)' : 'rgba(192, 132, 252, 0.3)',
        handleStyle: { color: isLight ? '#7C3AED' : '#C084FC' },
        textStyle: { color: isLight ? '#475569' : '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' },
        dataBackground: {
          lineStyle: { color: isLight ? '#7C3AED' : '#C084FC' },
          areaStyle: { color: isLight ? 'rgba(124, 58, 237, 0.2)' : 'rgba(192, 132, 252, 0.2)' }
        }
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
      axisLabel: {
        color: isLight ? '#475569' : '#CBD5E1',
        fontSize: 13,
        fontFamily: 'var(--font-mono)'
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      name: '% VARIATION',
      nameLocation: 'middle',
      nameGap: 52,
      nameTextStyle: {
        color: isLight ? '#7C3AED' : '#C084FC',
        fontSize: 16,
        fontWeight: 800,
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
        fontSize: 13,
        fontFamily: 'var(--font-mono)',
        formatter: '{value}%'
      }
    },
    series,
  }

  const activeStationList = STATIONS.filter(s => active[s.id] && data[s.id]?.length)

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
            <Map size={15} />
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

      {/* Row 2 Toolbar: Date Range Picker */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#7C3AED' : '#C084FC'}
          loading={loading}
        />
      </div>

      {/* Modern Station Selector Toolbar */}
      <div style={{
        marginBottom: 20,
        background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
        border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 8,
        padding: '14px 16px',
        boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 13,
              color: isLight ? '#6D28D9' : '#C084FC',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
              fontWeight: 700
            }}>
              ACTIVE MONITORING STATIONS ({activeCount}/{STATIONS.length})
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={selectKeyStations}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: isLight ? '#F5F3FF' : 'rgba(124, 58, 237, 0.15)',
                border: `1px solid ${isLight ? '#DDD6FE' : 'rgba(124, 58, 237, 0.35)'}`,
                color: isLight ? '#6D28D9' : '#C084FC',
                borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600
              }}
            >
              <Sparkles size={13} />
              <span>KEY NETWORK STATIONS</span>
            </button>
            <button
              onClick={selectAllStations}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'}`,
                color: isLight ? '#334155' : '#CBD5E1',
                borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600
              }}
            >
              <CheckSquare size={13} />
              <span>SELECT ALL</span>
            </button>
            <button
              onClick={clearAllStations}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'}`,
                color: isLight ? '#64748B' : '#94A3B8',
                borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600
              }}
            >
              <Square size={13} />
              <span>CLEAR</span>
            </button>
          </div>
        </div>

        {/* Station grid chips */}
        <div
          className="station-grid-scroll"
          style={{
            maxHeight: 180, overflowY: 'auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6,
            padding: '4px'
          }}
        >
          {STATIONS.map(s => {
            const isOn = active[s.id]
            const color = STATION_COLORS[s.id]
            return (
              <button
                key={s.id}
                onClick={() => toggleStation(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px',
                  background: isOn
                    ? (isLight ? `${color}18` : `${color}20`)
                    : (isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)'),
                  border: `1px solid ${isOn ? color : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)')}`,
                  borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: isOn && isLight ? `0 1px 4px ${color}20` : undefined
                }}
              >
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    color: isOn ? color : (isLight ? '#475569' : '#94A3B8'),
                    fontWeight: isOn ? 800 : 500,
                    letterSpacing: 0.5
                  }}>
                    {s.id}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: isLight ? '#64748B' : '#64748B',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 105
                  }}>
                    {s.label}
                  </div>
                </div>
                <div style={{
                  flexShrink: 0,
                  width: 7, height: 7, borderRadius: '50%',
                  background: isOn ? color : (isLight ? '#CBD5E1' : '#334155'),
                  boxShadow: isOn ? `0 0 6px ${color}` : 'none',
                  transition: 'all 0.15s',
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Fetch controls */}
      <div style={{
        display: 'flex', gap: 14, marginBottom: 20,
        padding: '10px 16px',
        background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
        border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 8, flexWrap: 'wrap', alignItems: 'center',
        boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
      }}>
        <span style={{
          fontSize: 12,
          color: isLight ? '#6D28D9' : '#C084FC',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.5,
          fontWeight: 700
        }}>
          FETCH REMOTE NMDB TELEMETRY:
        </span>
        <select
          value={fetchStation}
          onChange={e => setFetchStation(e.target.value)}
          style={{
            background: isLight ? '#F8FAFC' : '#0F172A',
            border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 6,
            color: isLight ? '#0F172A' : '#F8FAFC',
            padding: '6px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer'
          }}
        >
          {STATIONS.map(s => <option key={s.id} value={s.id}>{s.label} ({s.id}) — {s.country}</option>)}
        </select>
        <select
          value={hours}
          onChange={e => setHours(Number(e.target.value))}
          style={{
            background: isLight ? '#F8FAFC' : '#0F172A',
            border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 6,
            color: isLight ? '#0F172A' : '#F8FAFC',
            padding: '6px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer'
          }}
        >
          <option value={6}>6 hours</option>
          <option value={24}>24 hours</option>
          <option value={72}>72 hours</option>
          <option value={168}>7 days</option>
        </select>
        <button
          onClick={fetch_}
          disabled={fetching}
          style={{
            padding: '6px 16px',
            background: isLight ? '#7C3AED' : '#C084FC',
            border: 'none',
            borderRadius: 6,
            color: '#FFFFFF',
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
            cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1,
            boxShadow: isLight ? '0 2px 6px rgba(124, 58, 237, 0.25)' : undefined
          }}
        >
          {fetching ? 'FETCHING DATA...' : 'FETCH REMOTE'}
        </button>
      </div>

      {/* Telemetry Metrics Strip */}
      {activeStationList.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 20
        }}>
          {activeStationList.map(s => {
            const sData = data[s.id] || []
            const latest = sData[sData.length - 1]
            const color = STATION_COLORS[s.id]
            const valid = sData.filter((d: any) => d && d.count_rate > 0)
            const base = valid.length > 0
              ? valid.reduce((sum: number, d: any) => sum + d.count_rate, 0) / valid.length
              : null
            const pct = (base && latest?.count_rate)
              ? ((latest.count_rate - base) / base) * 100
              : null

            return (
              <div
                key={s.id}
                style={{
                  padding: '12px 16px',
                  background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                  border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 6,
                  boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.03)' : undefined
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
                    {s.id}
                  </span>
                  <span style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
                  <div>
                    <span style={{
                      fontSize: 20,
                      fontWeight: 700,
                      fontFamily: "'Orbitron', var(--font-sans), monospace",
                      color: isLight ? '#0F172A' : '#F8FAFC'
                    }}>
                      {latest?.count_rate ? latest.count_rate.toFixed(1) : '—'}
                    </span>
                    <span style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
                      counts/min
                    </span>
                  </div>
                  {pct !== null && (
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: pct < -3 ? '#EF4444' : (pct > 0 ? (isLight ? '#059669' : '#34D399') : (isLight ? '#475569' : '#94A3B8'))
                    }}>
                      {pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main Chart */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="NEUTRON COUNT RATE — MULTI STATION VARIATION"
          subtitle="SECONDARY NEUTRON FLUX VARIATION RELATIVE TO BASELINE (NMDB NETWORK)"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(124, 58, 237, 0.18)' : undefined,
          }}
        >
          {series.length === 0 ? (
            <div style={{ padding: '70px 20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, color: isLight ? '#64748B' : '#94A3B8', letterSpacing: 0.5 }}>
              <div style={{ color: isLight ? '#0F172A' : '#F8FAFC', marginBottom: 8, fontWeight: 700, fontSize: 16 }}>
                NO REAL-TIME BROADCAST DATA FOR SELECTED STATION(S)
              </div>
              <div style={{ color: isLight ? '#64748B' : '#64748B', fontSize: 13, maxWidth: 500, margin: '0 auto' }}>
                Please select an active station from the network list above or click "FETCH REMOTE" to poll live NMDB telemetry.
              </div>
            </div>
          ) : (
            <ReactECharts
              option={option}
              style={{ height: 520, width: '100%' }}
              notMerge={true}
            />
          )}
        </Card>
      )}

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