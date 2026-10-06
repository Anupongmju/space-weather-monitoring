import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'react-i18next'
import { X, ExternalLink, Activity, Compass, ShieldAlert, Mountain, RefreshCw } from 'lucide-react'
import {
  NeutronStation,
  getRigidityColor,
  getShieldingDescription,
  getGLE77Data,
  getGLE77MarkerStyle
} from '../../services/neutronStationsData'
import { loadNeutron, fetchAndSaveNeutron } from '../../services/cosmicService'
import { formatUTCTime } from '../../utils/formatters'

interface StationDetailDrawerProps {
  station: NeutronStation | null
  onClose: () => void
  onNavigateToFullTelemetry?: (stationId: string) => void
}

export default function StationDetailDrawer({
  station,
  onClose,
  onNavigateToFullTelemetry
}: StationDetailDrawerProps) {
  const { t } = useTranslation()
  const [telemetry, setTelemetry] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!station) return
    let isMounted = true
    setLoading(true)

    loadNeutron(station.id, 1440)
      .then(res => {
        if (!isMounted) return
        if (Array.isArray(res) && res.length > 0) {
          setTelemetry(res)
        } else {
          setTelemetry([])
        }
      })
      .catch(() => {
        if (!isMounted) return
        setTelemetry([])
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [station])

  if (!station) return null

  const color = getRigidityColor(station.cutoffRigidity)
  const shielding = getShieldingDescription(station.cutoffRigidity)

  const latestPoint = telemetry[telemetry.length - 1]
  const validPoints = telemetry.filter(p => p && p.count_rate > 0)
  const avgCount = validPoints.length
    ? validPoints.reduce((acc, p) => acc + p.count_rate, 0) / validPoints.length
    : 0
  const latestPct = avgCount && latestPoint?.count_rate
    ? (((latestPoint.count_rate - avgCount) / avgCount) * 100)
    : 0

  const handleRefresh = async () => {
    if (!station) return
    setFetching(true)
    try {
      await fetchAndSaveNeutron(station.id, 24)
      const fresh = await loadNeutron(station.id, 1440)
      if (Array.isArray(fresh) && fresh.length) setTelemetry(fresh)
    } catch (e) {
      console.warn('Failed live fetch for station:', e)
    } finally {
      setFetching(false)
    }
  }

  const chartOption = {
    useUTC: true,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#090d16',
      borderColor: color,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: '#F8FAFC', fontSize: 14, fontFamily: 'monospace' },
      axisPointer: {
        type: 'line',
        lineStyle: { color: `${color}80`, width: 1, type: 'dashed' }
      },
      formatter: (params: any) => {
        const p = params[0]
        if (!p || !p.value) return ''
        const rawTime = p.value[0]
        const timeStr = formatUTCTime(rawTime, true)
        const val = typeof p.value[1] === 'number' ? p.value[1].toFixed(1) : p.value[1]
        const pct = avgCount && typeof p.value[1] === 'number'
          ? (((p.value[1] - avgCount) / avgCount) * 100)
          : 0

        return `<div style="font-family:monospace;font-size: 13px;line-height:1.6;padding:2px 4px">
          <div style="color:#94A3B8;font-size: 12px;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:2px">
            🕒 <b style="color:#38BDF8">${timeStr}</b>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:${color}">●</span> Count Rate: <b style="color:#FFF">${val}</b> counts/min
          </div>
          <div style="color:${pct >= 0 ? '#22C55E' : '#EF4444'};font-size: 13px;margin-top:2px">
            Variation: <b>${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</b>
          </div>
        </div>`
      }
    },
    grid: { top: 12, right: 12, bottom: 25, left: 52 },
    xAxis: {
      type: 'time',
      splitLine: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#64748B', fontSize: 12, fontFamily: 'monospace' }
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
      axisLabel: {
        color: '#64748B',
        fontSize: 12,
        fontFamily: 'monospace',
        formatter: (val: number) => val.toLocaleString()
      }
    },
    series: [
      {
        name: station.name,
        type: 'line',
        showSymbol: false,
        smooth: true,
        data: telemetry.map(t => [t.time_tag, t.count_rate]),
        lineStyle: { width: 2, color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}00` }
            ]
          }
        }
      }
    ]
  }

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      width: 'min(420px, calc(100vw - 32px))',
      maxHeight: 'calc(100vh - 90px)',
      background: 'rgba(7, 12, 23, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${color}40`,
      borderTop: `3px solid ${color}`,
      boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 30px ${color}15`,
      zIndex: 100,
      borderRadius: 4,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: `${color}20`,
              color: color,
              border: `1px solid ${color}60`,
              padding: '2px 6px',
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              borderRadius: 2
            }}>
              {station.id}
            </span>
            <span style={{ color: '#94A3B8', fontSize: 15, fontFamily: 'monospace' }}>
              {station.country}
            </span>
          </div>
          <h3 style={{
            margin: 0,
            color: '#F8FAFC',
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 16,
            fontWeight: 700
          }}>
            {station.name}
          </h3>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            transition: 'color 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Cutoff Rigidity */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 12px',
            borderRadius: 3
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 13, fontFamily: 'monospace' }}>
              <ShieldAlert size={12} color={color} /> {t('cosmic.cutoff_rc').toUpperCase()} (Rc)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Orbitron', monospace", color }}>
                {station.cutoffRigidity.toFixed(2)}
              </span>
              <span style={{ fontSize: 14, color: '#94A3B8', fontFamily: 'monospace' }}>GV</span>
            </div>
          </div>

          {/* Altitude */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 12px',
            borderRadius: 3
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 13, fontFamily: 'monospace' }}>
              <Mountain size={12} color="#38BDF8" /> {t('cosmic.altitude').toUpperCase()} (ASL)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: '#38BDF8' }}>
                {station.altitude.toLocaleString()}
              </span>
              <span style={{ fontSize: 14, color: '#94A3B8', fontFamily: 'monospace' }}>m</span>
            </div>
          </div>
        </div>

        {/* Coordinates Banner */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 12px',
          borderRadius: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'monospace',
          fontSize: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
            <Compass size={13} color="#94A3B8" />
            <span>{t('cosmic.coords').toUpperCase()}</span>
          </div>
          <span style={{ color: '#F8FAFC', fontWeight: 600 }}>
            {station.lat >= 0 ? `${station.lat.toFixed(2)}°N` : `${Math.abs(station.lat).toFixed(2)}°S`},{' '}
            {station.lon >= 0 ? `${station.lon.toFixed(2)}°E` : `${Math.abs(station.lon).toFixed(2)}°W`}
          </span>
        </div>

        {/* Shielding Explanation Card */}
        <div style={{
          background: `${color}0D`,
          borderLeft: `3px solid ${color}`,
          padding: '10px 12px',
          borderRadius: '0 3px 3px 0'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'monospace', marginBottom: 2 }}>
            🛡️ {shielding.level}
          </div>
          <div style={{ fontSize: 14, color: '#CBD5E1', lineHeight: '1.5' }}>
            {shielding.desc}
          </div>
        </div>

        {/* GLE#77 Event Response Card */}
        {(() => {
          const gleData = getGLE77Data(station.id, station.cutoffRigidity)
          const gStyle = getGLE77MarkerStyle(gleData.tier)
          const tierEmoji = gleData.tier === 'very_high' ? '🟡' : gleData.tier === 'moderate' ? '🟠' : gleData.tier === 'low' ? '🔴' : '⚫'
          return (
            <div style={{
              background: gleData.tier === 'very_high' ? 'rgba(250, 204, 21, 0.08)' :
                          gleData.tier === 'moderate'  ? 'rgba(251, 146, 60, 0.08)' :
                          gleData.tier === 'low'       ? 'rgba(239, 68, 68, 0.08)' :
                                                         'rgba(15, 23, 42, 0.6)',
              border: `1px solid ${gStyle.color}40`,
              borderLeft: `3px solid ${gStyle.color}`,
              padding: '10px 12px',
              borderRadius: '0 3px 3px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: gStyle.color, fontFamily: 'monospace' }}>
                  {tierEmoji} GLE#77 {t('cosmic.event_peak')}
                </span>
                <span style={{
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "'Orbitron', monospace",
                  color: gStyle.color
                }}>
                  {gleData.increasePercent > 0 ? `+${gleData.increasePercent.toFixed(1)}%` : '0.0%'}
                </span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F1F5F9', fontFamily: 'monospace' }}>
                {gleData.tierLabel}
              </div>
              {gleData.notes && (
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>
                  {gleData.notes}
                </div>
              )}
            </div>
          )
        })()}

        {/* Live Telemetry Section */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={13} color={color} />
              <span style={{ fontSize: 14, fontFamily: "'Orbitron', monospace", color: '#F8FAFC', fontWeight: 600 }}>
                {t('cosmic.telemetry')}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={fetching}
              style={{
                background: 'transparent',
                border: 'none',
                color: fetching ? '#64748B' : color,
                fontSize: 13,
                fontFamily: 'monospace',
                cursor: fetching ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <RefreshCw size={11} className={fetching ? 'animate-spin' : ''} />
              {fetching ? '...' : t('common.refresh').toUpperCase()}
            </button>
          </div>

          {/* Sparkline / Count Rate Chart */}
          <div>
            {/* Clean Chart Container */}
            <div style={{
              background: '#040711',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              padding: '6px 4px'
            }}>
              {loading ? (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 14, fontFamily: 'monospace' }}>
                  {t('cosmic.loading_telemetry')}
                </div>
              ) : telemetry.length > 0 ? (
                <ReactECharts option={chartOption} style={{ height: 140, width: '100%' }} notMerge={true} />
              ) : (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 14, fontFamily: 'monospace' }}>
                  {t('common.no_data').toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Station Details / Description */}
        <div style={{
          fontSize: 14,
          color: '#94A3B8',
          lineHeight: '1.6',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 12
        }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{t('cosmic.detector')}:</span> {station.detectorType}
          </div>
          {station.institute && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#F8FAFC', fontWeight: 600 }}>Institute:</span> {station.institute}
            </div>
          )}
          {station.description && (
            <div style={{ color: '#CBD5E1', fontStyle: 'normal' }}>
              {station.description}
            </div>
          )}
        </div>

        {/* Link to Full Multi-Station Monitor */}
        {onNavigateToFullTelemetry && (
          <button
            onClick={() => onNavigateToFullTelemetry(station.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 14px',
              background: `${color}18`,
              border: `1px solid ${color}60`,
              color: '#FFF',
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 3,
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${color}35`
              e.currentTarget.style.borderColor = color
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${color}18`
              e.currentTarget.style.borderColor = `${color}60`
            }}
          >
            <span>OPEN MULTI-STATION TELEMETRY</span>
            <ExternalLink size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
