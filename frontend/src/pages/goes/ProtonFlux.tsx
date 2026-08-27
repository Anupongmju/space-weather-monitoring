import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveProton, loadProton } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { formatPowerOf10 } from '../../utils/formatters'

const INTEGRAL_COLORS: Record<string, string> = {
  '>=1 MeV': '#3B82F6',
  '>=5 MeV': '#22C55E',
  '>=10 MeV': '#F59E0B',
  '>=30 MeV': '#EAB308',
  '>=50 MeV': '#3498DB',
  '>=60 MeV': '#F97316',
  '>=100 MeV': '#EF4444',
  '>=500 MeV': '#A855F7'
}

const DIFFERENTIAL_PALETTE = [
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#FB923C', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#38BDF8', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
]

const DIFFERENTIAL_COLORS: Record<string, string> = {
  '1-2 MeV': '#EC4899',
  '1-5 MeV': '#EC4899',
  '2-3 MeV': '#F43F5E',
  '2-4 MeV': '#FB923C',
  '4-7 MeV': '#F59E0B',
  '5-10 MeV': '#F59E0B',
  '6-11 MeV': '#EAB308',
  '10-30 MeV': '#84CC16',
  '12-23 MeV': '#84CC16',
  '26-38 MeV': '#10B981',
  '30-50 MeV': '#06B6D4',
  '41-77 MeV': '#06B6D4',
  '50-100 MeV': '#3B82F6',
  '81-98 MeV': '#3B82F6',
  '96-118 MeV': '#6366F1',
  '100-200 MeV': '#8B5CF6',
  '115-138 MeV': '#8B5CF6',
  '153-229 MeV': '#A855F7',
  '200-500 MeV': '#D946EF',
  '267-390 MeV': '#D946EF'
}

const parseEnergyNum = (energyStr: string): number => {
  if (!energyStr) return 0
  const match = energyStr.match(/(\d+(\.\d+)?)/)
  return match ? parseFloat(match[1]) : 0
}

export const formatEnergyKey = (key: string): string => {
  if (!key) return key
  // Match keV range like "1020-1860 keV" or "1020 - 1860 keV"
  const kevRangeMatch = key.match(/^(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)\s*keV$/i)
  if (kevRangeMatch) {
    const lowKeV = parseFloat(kevRangeMatch[1])
    const highKeV = parseFloat(kevRangeMatch[3])
    const lowMeV = +(lowKeV / 1000).toPrecision(3)
    const highMeV = +(highKeV / 1000).toPrecision(3)
    return `${lowMeV}–${highMeV} MeV`
  }

  // Match single keV like "1020 keV"
  const kevSingleMatch = key.match(/^(\d+(\.\d+)?)\s*keV$/i)
  if (kevSingleMatch) {
    const valKeV = parseFloat(kevSingleMatch[1])
    const valMeV = +(valKeV / 1000).toPrecision(3)
    return `${valMeV} MeV`
  }

  return key
}

const parseEnergyToMeV = (energyStr: string): number => {
  if (!energyStr) return 1
  const clean = energyStr.trim()

  // Match keV range like "1020-1860 keV"
  const kevRange = clean.match(/^(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)\s*keV$/i)
  if (kevRange) {
    const low = parseFloat(kevRange[1]) / 1000
    const high = parseFloat(kevRange[3]) / 1000
    return (low + high) / 2
  }

  // Match single keV like "1020 keV"
  const kevSingle = clean.match(/^(\d+(\.\d+)?)\s*keV$/i)
  if (kevSingle) {
    return parseFloat(kevSingle[1]) / 1000
  }

  // Match MeV range like "10-30 MeV"
  const mevRange = clean.match(/^(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)\s*MeV$/i)
  if (mevRange) {
    const low = parseFloat(mevRange[1])
    const high = parseFloat(mevRange[3])
    return (low + high) / 2
  }

  // Match >= number MeV like ">=10 MeV"
  const geMev = clean.match(/^>=\s*(\d+(\.\d+)?)\s*MeV$/i)
  if (geMev) return parseFloat(geMev[1])

  const num = clean.match(/(\d+(\.\d+)?)/)
  return num ? parseFloat(num[1]) : 1
}

const getEnergyColor = (e: string, fluxType: 'integral' | 'differential', idx: number) => {
  if (fluxType === 'integral') {
    return INTEGRAL_COLORS[e] || DIFFERENTIAL_PALETTE[idx % DIFFERENTIAL_PALETTE.length]
  }
  return DIFFERENTIAL_COLORS[e] || DIFFERENTIAL_COLORS[formatEnergyKey(e)] || DIFFERENTIAL_PALETTE[idx % DIFFERENTIAL_PALETTE.length]
}

export default function ProtonFlux(){
    const [raw,setRaw] = useState<any[]>([])
    const [data,setData] =useState<any[]>([])
    const [energies,setEnergies] =useState<any[]>([])
    const [fluxType, setFluxType] = useState<'integral' | 'differential'>('integral')
    const [viewMode, setViewMode] = useState<'timeSeries' | 'spectrum'>('timeSeries')
    const spectrumInterval = 1
    const [loading,setLoading] =useState(true)
    const [fetching,setFetching] =useState(false)
    const [limit, setLimit] = useState<TimeRange>(360)
    const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
    const [activeTab, setActiveTab] = useState('usage')
    const chartRef = useRef<any>(null)

  // Helper: pivot raw proton rows → [{time_tag, '>= 1 MeV': x, ...}]
  const pivot = (d: any[]) => {
    const map: Record<string, any> = {}
    d.forEach(r => {
      if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
      map[r.time_tag][r.energy] = r.flux
    })
    return Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }

    const load = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        try {
          const sDate = appliedRange ? appliedRange.startDate : undefined
          const eDate = appliedRange ? appliedRange.endDate : undefined
          const d = await loadProton(limit, sDate, eDate)
          if (Array.isArray(d)) {
            setRaw(d)
            const keys = [...new Set(d.map(r => r.energy))].filter(Boolean)
            setData(pivot(d))
            setEnergies(keys)
          }
        } catch (err) {
          console.error('Failed to load proton data:', err)
        } finally {
          if (showLoading) setLoading(false)
        }
    }

    
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveProton()
    } catch(e) {}
    await load(false)
    setFetching(false)
  }

  // Historical pan: load older raw rows, pivot then prepend
  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData: (newPivoted: any[]) => setData(newPivoted),
    loadHistorical: async (start, end) => {
      const older = await loadProton(0, start, end)
      return pivot(older)
    },
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

    const activeEnergies = useMemo(() => {
      const intList = energies.filter(e => e.startsWith('>='))
      const diffList = energies.filter(e => !e.startsWith('>='))

      if (fluxType === 'integral') {
        const list = intList.length > 0 ? intList : energies
        return list.slice().sort((a, b) => parseEnergyNum(a) - parseEnergyNum(b))
      } else {
        const list = diffList.length > 0 ? diffList : energies
        return list.slice().sort((a, b) => parseEnergyNum(a) - parseEnergyNum(b))
      }
    }, [energies, fluxType])

    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#16161F',
        borderColor: fluxType === 'integral' ? 'rgba(52,152,219,0.3)' : 'rgba(245,158,11,0.3)',
        textStyle: { color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: 11 },
        formatter: (params: any) => {
          if (!params || !Array.isArray(params) || params.length === 0) return ''
          const title = params[0]?.axisValueLabel || params[0]?.name || ''
          let res = `<div style="color: ${fluxType === 'integral' ? '#3498DB' : '#F59E0B'}; margin-bottom: 6px; font-weight: 700">${title}</div>`
          params.forEach((item: any) => {
            if (!item || item.value === undefined || item.value === null) return
            const rawVal = Array.isArray(item.value) ? item.value[1] : item.value
            const val = (rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal)))
              ? Number(rawVal).toExponential(2)
              : 'N/A'
            const dispName = formatEnergyKey(item.seriesName || '')
            res += `<div style="display:flex; justify-space-between; gap:16px;">
                      <span style="color:${item.color}">${dispName}:</span>
                      <span style="font-weight:bold">${val} pfu</span>
                    </div>`
          })
          return res
        }
      },
      grid: { top: 30, right: 20, bottom: 30, left: 50 },
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
        axisLabel: { color: '#606075', fontSize: 10 }
      },
      yAxis: {
        type: 'log',
        splitLine: { show: true, lineStyle: { color: 'rgba(52,152,219,0.06)', type: 'dashed' } },
        axisLabel: { color: '#606075', fontSize: 10, formatter: formatPowerOf10 }
      },
      series: activeEnergies.map((e, idx) => {
        const color = getEnergyColor(e, fluxType, idx)
        const dispName = formatEnergyKey(e)
        return {
          name: dispName,
          type: 'line',
          showSymbol: false,
          connectNulls: true,
          lineStyle: { width: 1.8, color },
          itemStyle: { color },
          data: data.map(d => [d.time_tag, d[e]]),
          markLine: (fluxType === 'integral' && (e === '>=10 MeV' || e === '>=10MeV')) ? {
              data: [{ yAxis: 10, name: 'S1' }],
              lineStyle: { color: '#EF4444', type: 'dashed', opacity: 0.7, width: 1.5 },
              symbol: ['none', 'none'],
              label: { formatter: 'S1 Warning (10 pfu)', position: 'end', color: '#EF4444', fontSize: 10, fontWeight: 'bold' }
          } : undefined
        }
      })
    }

  const hourlySpectrumData = useMemo(() => {
    if (!raw || raw.length === 0) return []

    const filteredRaw = raw.filter(r => {
      if (!r.energy || r.flux === null || r.flux === undefined || r.flux <= 0) return false
      if (fluxType === 'integral') return r.energy.startsWith('>=')
      return !r.energy.startsWith('>=')
    })

    const hourBuckets: Record<number, Record<string, { sum: number; count: number }>> = {}
    const hourSampleTimes: Record<number, string> = {}
    for (let h = 0; h < 24; h++) hourBuckets[h] = {}

    filteredRaw.forEach(r => {
      const dt = new Date(r.time_tag)
      if (isNaN(dt.getTime())) return
      const h = dt.getUTCHours()
      if (!hourSampleTimes[h]) {
        hourSampleTimes[h] = r.time_tag
      }
      const eKey = r.energy
      if (!hourBuckets[h][eKey]) hourBuckets[h][eKey] = { sum: 0, count: 0 }
      hourBuckets[h][eKey].sum += Number(r.flux)
      hourBuckets[h][eKey].count += 1
    })

    const result = []
    for (let h = 0; h < 24; h += spectrumInterval) {
      const eMap = hourBuckets[h]
      const points = Object.keys(eMap).map(eKey => {
        const avgFlux = eMap[eKey].sum / eMap[eKey].count
        const mev = parseEnergyToMeV(eKey)
        return { eKey, mev, flux: avgFlux }
      })
      .sort((a, b) => a.mev - b.mev)
      .map(p => [p.mev, p.flux])

      const timeTag = hourSampleTimes[h] || `${String(h).padStart(2, '0')}:00 UTC`

      result.push({ hour: h, timeTag, points })
    }
    return result
  }, [raw, fluxType, spectrumInterval])

  const spectrumOption = useMemo(() => {
    if (viewMode !== 'spectrum') return {}

    const totalLines = hourlySpectrumData.length
    const getHourColor = (idx: number) => {
      const hue = Math.round(210 - (idx / Math.max(1, totalLines - 1)) * 280)
      const normalizedHue = (hue + 360) % 360
      return `hsl(${normalizedHue}, 85%, 60%)`
    }

    const series = hourlySpectrumData.map((hData, idx) => {
      const color = getHourColor(idx)
      const hourLabel = `${String(hData.hour).padStart(2, '0')}:00 UTC`

      return {
        name: hourLabel,
        type: 'line',
        showSymbol: true,
        symbolSize: 8,
        connectNulls: true,
        triggerLineEvent: true,
        lineStyle: {
          width: 2.5,
          color,
          opacity: 0.85,
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 4.5,
            color: '#FBBF24',
            opacity: 1,
            shadowBlur: 10,
            shadowColor: '#FBBF24'
          },
          itemStyle: {
            color: '#FBBF24',
            borderWidth: 2,
            borderColor: '#FFF'
          }
        },
        itemStyle: { color },
        data: hData.points.map(pt => ({
          value: pt,
          timeTag: hData.timeTag,
          hourLabel
        })),
      }
    })

    return {
      backgroundColor: 'transparent',
      legend: {
        show: true,
        type: 'scroll',
        top: 10,
        right: 20,
        textStyle: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0F172A',
        borderColor: 'rgba(168, 85, 247, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        extraCssText: 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); border-radius: 6px;',
        textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
        formatter: (params: any) => {
          if (!params) return ''
          const color = params.color || '#A855F7'
          const seriesName = params.seriesName || ''
          const dataObj = params.data || {}
          const val = dataObj.value || params.value
          const timeTag = dataObj.timeTag ? new Date(dataObj.timeTag).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : seriesName

          if (Array.isArray(val) && val.length >= 2) {
            const mev = val[0]
            const flux = val[1]
            const fluxStr = (typeof flux === 'number' && flux > 0) ? flux.toExponential(2) : 'N/A'
            return `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.12);">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
                <strong style="color:#38BDF8;font-family:'Orbitron', monospace;font-size:12px;">🕒 ${timeTag}</strong>
              </div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;color:#CBD5E1;font-size:11px;">
                <span>Energy:</span><strong style="color:#FFF">${mev} MeV</strong>
                <span>Proton Flux:</span><strong style="color:#FBBF24">${fluxStr} pfu</strong>
              </div>
            `
          }

          return `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
              <strong style="color:#38BDF8;font-family:'Orbitron', monospace;font-size:12px;">🕒 ${seriesName}</strong>
            </div>
          `
        }
      },
      grid: { top: 40, right: 30, bottom: 40, left: 60 },
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
        type: 'log',
        name: 'Energy (MeV)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' }
      },
      yAxis: {
        type: 'log',
        name: 'Proton Flux (pfu)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)', formatter: formatPowerOf10 }
      },
      series,
    }
  }, [viewMode, hourlySpectrumData])

    const latest = data[data.length - 1]

    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 18, fontWeight: 700, color: '#38BDF8', margin: 0, letterSpacing: 0.5 }}>
              GOES / PROTON FLUX
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
              {fluxType === 'integral' ? 'Integral Proton Flux — Cumulative Energy Thresholds' : 'Differential Proton Flux — Discrete Energy Bandwidths'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {panLoading && (
              <span style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            )}
            <StatusBadge status={data.length ? 'normal' : 'offline'} />
            <button
              onClick={fetch_}
              disabled={fetching}
              style={{
                padding: '4px 10px', background: 'transparent', border: 'none',
                color: '#38BDF8', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
              }}
            >
              {fetching ? 'FETCHING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Dedicated Row 2 Toolbar: View Mode Selector & Date Range */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* View Mode Toggle (Time Series vs Spectrum 24H) */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(15, 23, 42, 0.75)', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <button
                onClick={() => {
                  setViewMode('timeSeries')
                  setLimit(360)
                }}
                style={{
                  padding: '5px 14px',
                  background: viewMode === 'timeSeries' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                  border: 'none',
                  borderBottom: viewMode === 'timeSeries' ? '2px solid #38BDF8' : '2px solid transparent',
                  color: viewMode === 'timeSeries' ? '#F8FAFC' : '#94A3B8',
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                TIME SERIES
              </button>
              <button
                onClick={() => {
                  setViewMode('spectrum')
                  setLimit(1440)
                }}
                style={{
                  padding: '5px 14px',
                  background: viewMode === 'spectrum' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  border: 'none',
                  borderBottom: viewMode === 'spectrum' ? '2px solid #A855F7' : '2px solid transparent',
                  color: viewMode === 'spectrum' ? '#F8FAFC' : '#94A3B8',
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                SPECTRUM (24H)
              </button>
            </div>

            {/* Data Type Selector Toggle */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(15, 23, 42, 0.65)', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                onClick={() => setFluxType('integral')}
                style={{
                  padding: '5px 12px',
                  background: fluxType === 'integral' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: 'none',
                  borderBottom: fluxType === 'integral' ? '2px solid #38BDF8' : '2px solid transparent',
                  color: fluxType === 'integral' ? '#F8FAFC' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                INTEGRAL
              </button>
              <button
                onClick={() => setFluxType('differential')}
                style={{
                  padding: '5px 12px',
                  background: fluxType === 'differential' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  border: 'none',
                  borderBottom: fluxType === 'differential' ? '2px solid #F59E0B' : '2px solid transparent',
                  color: fluxType === 'differential' ? '#F8FAFC' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                DIFFERENTIAL
              </button>
            </div>
          </div>

          <DateRangeToolbar
            limit={limit}
            onLimitChange={setLimit}
            appliedRange={appliedRange}
            onApplyRange={setAppliedRange}
            accentColor={viewMode === 'spectrum' ? '#A855F7' : (fluxType === 'integral' ? '#38BDF8' : '#F59E0B')}
            loading={loading}
          />
        </div>

        {/* Transparent Telemetry Metrics Strip */}
        {latest && fluxType === 'integral' && viewMode === 'timeSeries' && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
            gap: 24, marginBottom: 24, padding: '0 8px', background: 'transparent', border: 'none'
          }}>
            {[
              { label: '≥ 10 MeV (SPE THRESHOLD)', value: (latest['>=10 MeV'] ?? latest['>=10MeV'])?.toExponential(2), color: '#FBBF24', unit: 'pfu' },
              { label: '≥ 50 MeV (HIGH ENERGY)', value: (latest['>=50 MeV'] ?? latest['>=50MeV'])?.toExponential(2), color: '#FB923C', unit: 'pfu' },
              { label: '≥ 100 MeV (CRITICAL)', value: (latest['>=100 MeV'] ?? latest['>=100MeV'])?.toExponential(2), color: '#F87171', unit: 'pfu' },
            ].map((s, idx) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                    {s.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: s.color }}>
                      {s.value ?? '—'}
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

        {loading ? <LoadingSpinner /> : (
          <Card
            title={
              viewMode === 'spectrum'
                ? `PROTON ENERGY SPECTRUM (24H OVERLAY — ${fluxType.toUpperCase()})`
                : (fluxType === 'integral' ? 'INTEGRAL PROTON FLUX' : 'DIFFERENTIAL PROTON FLUX')
            }
            subtitle={
              viewMode === 'spectrum'
                ? 'ENERGY DEPENDENCE J(E) VS E (LOG-LOG SCALE)'
                : undefined
            }
            extra={panLoading ? (
              <span style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            ) : null}
          >
            {viewMode === 'timeSeries' && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                {activeEnergies.map((e, idx) => {
                  const color = getEnergyColor(e, fluxType, idx)
                  return (
                    <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'var(--font-mono)', color }}>
                      <div style={{ width: 16, height: 2, background: color }} />
                      {formatEnergyKey(e)}
                    </div>
                  )
                })}
              </div>
            )}
            <ReactECharts
              option={viewMode === 'spectrum' ? spectrumOption : option}
              notMerge={true}
              style={{ height: 380, width: '100%' }}
              onChartReady={onChartReady}
              onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
            />
          </Card>
        )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#38BDF8"
        tabs={[
          { id: 'usage', label: 'Usage' },
          { id: 'impacts', label: 'Impacts' },
          { id: 'details', label: 'Details' },
          { id: 'credits', label: 'Data Source & Credits' }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              Proton Flux Energy Bands & Thresholds
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Proton Flux</strong> measures high-energy proton particle density from GOES satellites in geostationary orbit across distinct energy thresholds (MeV):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #FBBF24', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;10 MeV:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>Standard threshold for Solar Radiation Storms (SPE Event)</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;50 MeV:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>High energy protons capable of penetrating spacecraft electronics and solar arrays</span>
              </div>
              <div style={{ borderLeft: '2px solid #F87171', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;100 MeV:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>Critical energy level penetrating upper atmosphere and increasing polar route aviation dose</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              Solar Radiation Storm Impacts
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              Solar radiation storms reach Earth within tens of minutes to hours after a solar flare or CME, directly impacting:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Astronauts & Space Operations</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  Severe health hazard for astronauts performing Extravehicular Activities (EVA) due to intense ionizing particle radiation.
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Commercial Aviation & Satellites</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  May require rerouting flights away from polar routes and placing sensitive satellite sensors into safe mode.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              Technical Specifications of Proton Flux System
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>Spacecraft Platform</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>GOES (Geostationary Operational Environmental Satellite) — NOAA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>Orbit Location</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Geostationary Orbit (GEO)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>Primary Unit</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>pfu (Particle Flux Unit: particles/cm²·s·sr)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>Storm Threshold</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>S1 (Minor) threshold begins at &gt;= 10 pfu for &gt;= 10 MeV band</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              Data Source & Credits
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 14px 0', lineHeight: '1.7' }}>
              Real-time observational data provided by international space weather monitoring networks:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> National Oceanic and Atmospheric Administration (NOAA)
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>GOES Satellite Network:</strong> Environmental and Space Environment In-situ Sensor Suite (SEISS)
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
              API Reference: Data ingested via <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> (Updated every 1 minute)
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}