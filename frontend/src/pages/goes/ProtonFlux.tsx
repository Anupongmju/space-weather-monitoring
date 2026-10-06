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
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { formatPowerOf10, formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'
import { useTheme } from '../../context/ThemeContext'

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

function getEnergyColor(energy: string, fluxType: 'integral' | 'differential', index: number = 0): string {
  if (fluxType === 'integral') {
    return INTEGRAL_COLORS[energy] || '#A855F7'
  }
  return DIFFERENTIAL_PALETTE[index % DIFFERENTIAL_PALETTE.length]
}

function formatEnergyKey(k: string): string {
  if (k.startsWith('>=')) {
    const val = k.replace('>=', '').trim()
    return `≥ ${val}`
  }
  return k.replace(/_/g, ' ')
}

function parseEnergyToMeV(eKey: string): number {
  const clean = eKey.replace('>=', '').trim()
  const match = clean.match(/^([\d.]+)\s*(keV|MeV|GeV)?/i)
  if (!match) return 10
  const num = parseFloat(match[1])
  const unit = (match[2] || 'MeV').toUpperCase()
  if (unit === 'KEV') return num / 1000
  if (unit === 'GEV') return num * 1000
  return num
}

function parseEnergyNum(energyStr: string): number {
  const match = energyStr.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

export default function ProtonFlux() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<any[]>([])
  const [raw, setRaw] = useState<any[]>([])
  const [energies, setEnergies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [fluxType, setFluxType] = useState<'integral' | 'differential'>('integral')
  const [viewMode, setViewMode] = useState<'timeSeries' | 'spectrum'>('timeSeries')
  const [spectrumInterval, setSpectrumInterval] = useState<number>(1)
  const [activeTab, setActiveTab] = useState('usage')
  const chartComponentRef = useRef<any>(null)
  const [chartInstance, setChartInstance] = useState<any>(null)

  const pivot = (d: any[]) => {
    const map: Record<string, any> = {}
    d.forEach(r => {
      if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
      map[r.time_tag][r.energy] = r.flux
    })
    return Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }

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

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined
      const d = await loadProton(limit, sDate, eDate)
      if (Array.isArray(d)) {
        setRaw(d)
        const keys = [...new Set(d.map(r => r.energy))].filter(Boolean) as string[]
        setData(pivot(d))
        setEnergies(keys)
      } else {
        setData([])
        setEnergies([])
        setRaw([])
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
      await fetchAndSaveProton()
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

  const { minTs, maxTs } = getTimeDomain(data)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#93C5FD' : (fluxType === 'integral' ? 'rgba(52,152,219,0.5)' : 'rgba(245,158,11,0.5)'),
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#FFF', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#1A6DB5' : '#38BDF8', type: 'dashed', width: 1.5 } },
      formatter: (params: any) => {
        if (!params || !Array.isArray(params) || params.length === 0) return ''
        const rawTime = params[0]?.data?.[0] || params[0]?.axisValue
        const dateStr = formatUTCTime(rawTime, true)
        let res = `<div style="font-family:var(--font-mono);font-size:13px;color: ${isLight ? '#0C1E35' : (fluxType === 'integral' ? '#38BDF8' : '#F59E0B')}; margin-bottom: 6px; font-weight: 700">🕒 ${dateStr}</div>`
        params.forEach((item: any) => {
          if (!item || item.value === undefined || item.value === null) return
          const rawVal = Array.isArray(item.value) ? item.value[1] : item.value
          const val = (rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal)))
            ? Number(rawVal).toExponential(2)
            : 'N/A'
          const dispName = formatEnergyKey(item.seriesName || '')
          res += `<div style="display:flex; justify-content:space-between; gap:16px; margin-top:3px; font-family:var(--font-mono); font-size:12px;">
                    <span style="color:${item.color}">${dispName}:</span>
                    <span style="font-weight:bold; color:${isLight ? '#0F172A' : '#F8FAFC'}">${val} pfu</span>
                  </div>`
        })
        return res
      }
    },
    grid: { top: 35, right: 20, bottom: 45, left: 85 },
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
      splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange)
    },
    yAxis: {
      type: 'log',
      name: 'Proton Flux (pfu)',
      nameLocation: 'middle',
      nameGap: 56,
      nameTextStyle: {
        color: isLight ? '#0284C7' : '#38BDF8',
        fontSize: 14.5,
        fontWeight: 700,
        fontFamily: 'sans-serif'
      },
      splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif', formatter: formatPowerOf10 }
    },
    series: activeEnergies.map((e, idx) => {
      const color = getEnergyColor(e, fluxType, idx)
      const dispName = formatEnergyKey(e)
      return {
        name: dispName,
        type: 'line',
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
        data: data.map(d => [d.time_tag, d[e]]),
        markLine: combineMarkLines(
          idx === 0 ? midnightDividers : [],
          undefined,
          (fluxType === 'integral' && (e === '>=10 MeV' || e === '>=10MeV')) ? [{
            yAxis: 10,
            lineStyle: { color: '#EF4444', type: 'dashed', opacity: 0.85, width: 1.8 },
            label: { formatter: 'S1 Warning (10 pfu)', position: 'end', color: '#EF4444', fontSize: 13, fontWeight: 'bold' }
          }] : []
        )
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
      const validKeys = Object.keys(eMap).filter(k => eMap[k].count > 0)
      if (validKeys.length === 0) continue

      const points = validKeys.map(eKey => {
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
      return `hsl(${normalizedHue}, 85%, ${isLight ? '45%' : '60%'})`
    }

    const series = hourlySpectrumData.map((hData, idx) => {
      const color = getHourColor(idx)
      const hourLabel = `${String(hData.hour).padStart(2, '0')}:00 UTC`

      return {
        name: hourLabel,
        type: 'line',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 11,
        cursor: 'pointer',
        connectNulls: true,
        triggerEvent: true,
        lineStyle: {
          width: 2.2,
          color,
          opacity: isLight ? 0.35 : 0.28,
        },
        emphasis: {
          focus: 'series',
          scale: 2.0,
          lineStyle: {
            width: 5.0,
            color: isLight ? '#D97706' : '#FBBF24',
            opacity: 1,
            shadowBlur: 14,
            shadowColor: isLight ? 'rgba(217, 119, 6, 0.5)' : '#FBBF24'
          },
          itemStyle: {
            color: isLight ? '#D97706' : '#FBBF24',
            borderWidth: 2.5,
            borderColor: '#FFF',
            opacity: 1,
            shadowBlur: 14,
            shadowColor: isLight ? 'rgba(217, 119, 6, 0.6)' : '#FBBF24'
          }
        },
        blur: {
          lineStyle: {
            opacity: isLight ? 0.08 : 0.06
          },
          itemStyle: {
            opacity: 0.05
          }
        },
        itemStyle: {
          color,
          opacity: isLight ? 0.75 : 0.65,
          borderWidth: 1.5,
          borderColor: isLight ? '#FFFFFF' : '#0F172A'
        },
        data: hData.points.map(pt => ({
          value: pt,
          timeTag: hData.timeTag,
          hourLabel
        }))
      }
    })

    return {
      backgroundColor: 'transparent',
      legend: {
        show: true,
        type: 'scroll',
        top: 0,
        right: 20,
        textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' }
      },
      tooltip: {
        trigger: 'item',
        transitionDuration: 0.05,
        confine: true,
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#C084FC' : 'rgba(168, 85, 247, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;' : 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); border-radius: 6px;',
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
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
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'};">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
                <strong style="color:${isLight ? '#7C3AED' : '#38BDF8'};font-family:var(--font-mono);font-size:14px;">🕒 ${timeTag}</strong>
              </div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;color:${isLight ? '#475569' : '#CBD5E1'};font-size:13px;">
                <span>Energy:</span><strong style="color:${isLight ? '#0F172A' : '#FFF'}">${mev} MeV</strong>
                <span>Proton Flux:</span><strong style="color:${isLight ? '#D97706' : '#FBBF24'}">${fluxStr} pfu</strong>
              </div>
            `
          }

          return `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
              <strong style="color:${isLight ? '#7C3AED' : '#38BDF8'};font-family:var(--font-mono);font-size:14px;">🕒 ${seriesName}</strong>
            </div>
          `
        }
      },
      grid: { top: 35, right: 30, bottom: 40, left: 85 },
      xAxis: {
        type: 'log',
        scale: true,
        name: 'Energy (MeV)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600 },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' }
      },
      yAxis: {
        type: 'log',
        scale: true,
        name: 'Proton Flux (pfu)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#7C3AED' : '#A855F7',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'monospace, sans-serif', formatter: formatPowerOf10 }
      },
      series,
    }
  }, [viewMode, hourlySpectrumData, isLight])

  // Custom 2D Cursor-Anchored Zoom & Pan in Log-Log Space for Spectrum Mode
  useEffect(() => {
    if (viewMode !== 'spectrum') return
    const chart = chartInstance || chartComponentRef.current?.getEchartsInstance()
    if (!chart) return

    const zr = chart.getZr()
    if (!zr) return

    let initialXMin = 0.5
    let initialXMax = 600
    let initialYMin = 1e-4
    let initialYMax = 1e5

    const allPoints = hourlySpectrumData.flatMap(h => h.points)
    if (allPoints.length > 0) {
      const allMev = allPoints.map(p => p[0]).filter(v => typeof v === 'number' && v > 0)
      const allFlux = allPoints.map(p => p[1]).filter(v => typeof v === 'number' && v > 0)
      if (allMev.length > 0) {
        initialXMin = Math.max(0.01, Math.min(...allMev) * 0.7)
        initialXMax = Math.max(...allMev) * 1.5
      }
      if (allFlux.length > 0) {
        initialYMin = Math.max(1e-5, Math.min(...allFlux) * 0.4)
        initialYMax = Math.max(...allFlux) * 3.0
      }
    }

    let currentXMin = initialXMin
    let currentXMax = initialXMax
    let currentYMin = initialYMin
    let currentYMax = initialYMax

    const resetView = () => {
      currentXMin = initialXMin
      currentXMax = initialXMax
      currentYMin = initialYMin
      currentYMax = initialYMax
      chart.setOption({
        xAxis: { min: initialXMin, max: initialXMax },
        yAxis: { min: initialYMin, max: initialYMax }
      })
    }

    const handleMouseWheel = (e: any) => {
      const rawEvt = e.event
      if (!rawEvt) return

      if (!chart.containPixel('grid', [e.offsetX, e.offsetY])) return
      rawEvt.preventDefault()
      rawEvt.stopPropagation()

      const dataCoord = chart.convertFromPixel({ gridIndex: 0 }, [e.offsetX, e.offsetY])
      if (!dataCoord || dataCoord[0] <= 0 || dataCoord[1] <= 0) return

      const mouseX = dataCoord[0]
      const mouseY = dataCoord[1]

      const delta = e.wheelDelta || -rawEvt.deltaY
      const factor = delta > 0 ? 0.75 : 1.33

      const logCurXMin = Math.log10(currentXMin)
      const logCurXMax = Math.log10(currentXMax)
      const logCurYMin = Math.log10(currentYMin)
      const logCurYMax = Math.log10(currentYMax)

      const logMouseX = Math.log10(mouseX)
      const logMouseY = Math.log10(mouseY)

      const xSpan = logCurXMax - logCurXMin
      const ySpan = logCurYMax - logCurYMin

      const xRatio = (logMouseX - logCurXMin) / xSpan
      const yRatio = (logMouseY - logCurYMin) / ySpan

      const newXSpan = Math.max(0.08, Math.min(xSpan * factor, 4))
      const newYSpan = Math.max(0.15, Math.min(ySpan * factor, 12))

      const newLogXMin = logMouseX - xRatio * newXSpan
      const newLogXMax = logMouseX + (1 - xRatio) * newXSpan
      const newLogYMin = logMouseY - yRatio * newYSpan
      const newLogYMax = logMouseY + (1 - yRatio) * newYSpan

      currentXMin = Math.pow(10, newLogXMin)
      currentXMax = Math.pow(10, newLogXMax)
      currentYMin = Math.pow(10, newLogYMin)
      currentYMax = Math.pow(10, newLogYMax)

      chart.setOption({
        xAxis: { min: currentXMin, max: currentXMax },
        yAxis: { min: currentYMin, max: currentYMax }
      })
    }

    let isDragging = false
    let lastX = 0
    let lastY = 0

    const handleMouseDown = (e: any) => {
      if (chart.containPixel('grid', [e.offsetX, e.offsetY])) {
        isDragging = true
        lastX = e.offsetX
        lastY = e.offsetY
      }
    }

    const handleMouseMove = (e: any) => {
      if (!isDragging) return
      const dx = e.offsetX - lastX
      const dy = e.offsetY - lastY
      lastX = e.offsetX
      lastY = e.offsetY

      const gridModel = chart.getModel().getComponent('grid', 0)
      const rect = gridModel?.coordinateSystem?.getRect()
      if (!rect) return

      const logCurXMin = Math.log10(currentXMin)
      const logCurXMax = Math.log10(currentXMax)
      const logCurYMin = Math.log10(currentYMin)
      const logCurYMax = Math.log10(currentYMax)

      const xSpan = logCurXMax - logCurXMin
      const ySpan = logCurYMax - logCurYMin

      const dLogX = -(dx / rect.width) * xSpan
      const dLogY = (dy / rect.height) * ySpan

      currentXMin = Math.pow(10, logCurXMin + dLogX)
      currentXMax = Math.pow(10, logCurXMax + dLogX)
      currentYMin = Math.pow(10, logCurYMin + dLogY)
      currentYMax = Math.pow(10, logCurYMax + dLogY)

      chart.setOption({
        xAxis: { min: currentXMin, max: currentXMax },
        yAxis: { min: currentYMin, max: currentYMax }
      })
    }

    const handleMouseUp = () => {
      isDragging = false
    }

    const handleDblClick = () => {
      resetView()
    }

    zr.on('mousewheel', handleMouseWheel)
    zr.on('mousedown', handleMouseDown)
    zr.on('mousemove', handleMouseMove)
    zr.on('mouseup', handleMouseUp)
    zr.on('globalout', handleMouseUp)
    zr.on('dblclick', handleDblClick)

    return () => {
      zr.off('mousewheel', handleMouseWheel)
      zr.off('mousedown', handleMouseDown)
      zr.off('mousemove', handleMouseMove)
      zr.off('mouseup', handleMouseUp)
      zr.off('globalout', handleMouseUp)
      zr.off('dblclick', handleDblClick)
    }
  }, [viewMode, hourlySpectrumData, chartInstance])

  const exportColumns = useMemo((): ExportColumn[] => {
    const base: ExportColumn[] = [
      { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
      { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') }
    ]
    const energyCols = energies.map(e => ({
      key: e,
      label: e.replace(/\s+/g, '_').replace(/>=/g, 'ge_'),
      width: 14
    }))
    return [...base, ...energyCols]
  }, [energies])

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
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#0C1E35' : '#38BDF8',
            margin: 0,
            letterSpacing: -0.5
          }}>
            GOES / PROTON FLUX
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            {fluxType === 'integral' ? 'Integral Proton Flux — Cumulative Energy Thresholds' : 'Differential Proton Flux — Discrete Energy Bandwidths'} (GEO Orbit)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14, color: isLight ? '#1A6DB5' : '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: isLight ? '#1A6DB5' : '#38BDF8', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Dedicated Row 2 Toolbar: View Mode Selector & Date Range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View Mode Toggle (Time Series vs Spectrum 24H) */}
          <div style={{
            display: 'flex', gap: 4,
            background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.75)',
            padding: '3px',
            border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 6
          }}>
            <button
              onClick={() => {
                setViewMode('timeSeries')
                setLimit(1440)
              }}
              style={{
                padding: '6px 14px',
                background: viewMode === 'timeSeries' ? (isLight ? '#FFFFFF' : 'rgba(56, 189, 248, 0.25)') : 'transparent',
                border: 'none',
                borderBottom: viewMode === 'timeSeries' ? `2px solid ${isLight ? '#1A6DB5' : '#38BDF8'}` : '2px solid transparent',
                color: viewMode === 'timeSeries' ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: isLight && viewMode === 'timeSeries' ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
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
                padding: '6px 14px',
                background: viewMode === 'spectrum' ? (isLight ? '#FFFFFF' : 'rgba(168, 85, 247, 0.25)') : 'transparent',
                border: 'none',
                borderBottom: viewMode === 'spectrum' ? `2px solid ${isLight ? '#7C3AED' : '#A855F7'}` : '2px solid transparent',
                color: viewMode === 'spectrum' ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: isLight && viewMode === 'spectrum' ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
                transition: 'all 0.2s ease'
              }}
            >
              SPECTRUM (24H)
            </button>
          </div>

          {/* Data Type Selector Toggle */}
          <div style={{
            display: 'flex', gap: 4,
            background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.65)',
            padding: '3px',
            border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6
          }}>
            <button
              onClick={() => setFluxType('integral')}
              style={{
                padding: '6px 12px',
                background: fluxType === 'integral' ? (isLight ? '#FFFFFF' : 'rgba(56, 189, 248, 0.2)') : 'transparent',
                border: 'none',
                borderBottom: fluxType === 'integral' ? `2px solid ${isLight ? '#1A6DB5' : '#38BDF8'}` : '2px solid transparent',
                color: fluxType === 'integral' ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: isLight && fluxType === 'integral' ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
                transition: 'all 0.2s ease'
              }}
            >
              INTEGRAL
            </button>
            <button
              onClick={() => setFluxType('differential')}
              style={{
                padding: '6px 12px',
                background: fluxType === 'differential' ? (isLight ? '#FFFFFF' : 'rgba(245, 158, 11, 0.2)') : 'transparent',
                border: 'none',
                borderBottom: fluxType === 'differential' ? `2px solid ${isLight ? '#D97706' : '#F59E0B'}` : '2px solid transparent',
                color: fluxType === 'differential' ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: isLight && fluxType === 'differential' ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
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
          accentColor={viewMode === 'spectrum' ? (isLight ? '#7C3AED' : '#A855F7') : (fluxType === 'integral' ? (isLight ? '#1A6DB5' : '#38BDF8') : (isLight ? '#D97706' : '#F59E0B'))}
          loading={loading}
        />
      </div>

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
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {panLoading && (
                <span style={{ fontSize: 13, color: isLight ? '#1A6DB5' : '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              <ExportChartMenu
                chartRef={chartComponentRef}
                data={data}
                columns={exportColumns}
                metadata={{
                  station: 'GOES (GEOSTATIONARY ORBIT)',
                  viewTitle: `GOES PROTON FLUX (${fluxType.toUpperCase()})`,
                  description: 'High-Energy Solar Energetic Protons (SEPs) Flux across Multiple Energy Thresholds',
                  timeRangeText: exportTimeRange,
                  totalRecords: data.length
                }}
                filenameBase={`GOES_PROTON_${fluxType.toUpperCase()}_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                accentColor={isLight ? '#1A6DB5' : '#38BDF8'}
              />
            </div>
          }
        >
          {viewMode === 'timeSeries' && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              {activeEnergies.map((e, idx) => {
                const color = getEnergyColor(e, fluxType, idx)
                return (
                  <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>
                    <div style={{ width: 18, height: 3, background: color, borderRadius: 2 }} />
                    {formatEnergyKey(e)}
                  </div>
                )
              })}
            </div>
          )}
          <ReactECharts
            ref={chartComponentRef}
            option={viewMode === 'spectrum' ? spectrumOption : option}
            notMerge={true}
            style={{ height: 560, width: '100%' }}
            onChartReady={(instance) => {
              onChartReady(instance)
              setChartInstance(instance)
            }}
            onEvents={viewMode === 'timeSeries' ? { datazoom: onDataZoom, dataZoom: onDataZoom } : undefined}
          />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#1A6DB5' : '#38BDF8'}
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
              Proton Flux Energy Bands &amp; Thresholds
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>Proton Flux</strong> measures high-energy proton particle density from GOES satellites in geostationary orbit across distinct energy thresholds (MeV):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: '4px solid #FBBF24',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                background: isLight ? '#FEFCE8' : 'transparent',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>&gt;10 MeV:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>Standard threshold for Solar Radiation Storms (SPE Event)</span>
              </div>
              <div style={{
                borderLeft: '4px solid #FB923C',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                background: isLight ? '#FFF7ED' : 'transparent',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>&gt;50 MeV:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>High energy protons capable of penetrating spacecraft electronics and solar arrays</span>
              </div>
              <div style={{
                borderLeft: '4px solid #F87171',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                background: isLight ? '#FEF2F2' : 'transparent',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>&gt;100 MeV:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>Critical energy level penetrating upper atmosphere and increasing polar route aviation dose</span>
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
              Solar Radiation Storm Impacts
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              Solar radiation storms reach Earth within tens of minutes to hours after a solar flare or CME, directly impacting:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Astronauts &amp; Space Operations</h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  Severe health hazard for astronauts performing Extravehicular Activities (EVA) due to intense ionizing particle radiation.
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFF7ED' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FED7AA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#EA580C', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Commercial Aviation &amp; Satellites</h5>
                <p style={{ color: isLight ? '#9A3412' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  May require rerouting flights away from polar routes and placing sensitive satellite sensors into safe mode.
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
              Technical Specifications of Proton Flux System
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>Spacecraft Platform</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>GOES (Geostationary Operational Environmental Satellite) — NOAA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>Orbit Location</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Geostationary Orbit (GEO)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>Primary Unit</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>pfu (Particle Flux Unit: particles/cm²·s·sr)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>Storm Threshold</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>S1 (Minor) threshold begins at &gt;= 10 pfu for &gt;= 10 MeV band</td>
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
              Data Source &amp; Credits
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 14px 0',
              lineHeight: '1.7'
            }}>
              Real-time observational data provided by international space weather monitoring networks:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#334155' : '#94A3B8' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#1A6DB5' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> National Oceanic and Atmospheric Administration (NOAA)
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#1A6DB5' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>GOES Satellite Network:</strong> Environmental and Space Environment In-situ Sensor Suite (SEISS)
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              fontSize: 13,
              color: isLight ? '#475569' : '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              API Reference: Data ingested via <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#1A6DB5' : '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> (Updated every 1 minute)
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}