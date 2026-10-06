import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  Activity,
  Clock,
  RefreshCw,
  Zap,
  Radio,
  Wind,
  Layers,
  Database,
  Globe,
  Satellite,
  Calendar,
  Maximize2,
  Minimize2,
  BarChart3
} from 'lucide-react'
import SciFiFullscreenOverlay from '../../components/ui/SciFiFullscreenOverlay'
import OrbitBackground from '../../components/space/OrbitBackground'
import { loadMag, loadSwepam } from '../../services/aceService'
import { loadProton, loadXray } from '../../services/goesService'
import { loadNeutron } from '../../services/cosmicService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import StatusBadge from '../../components/ui/StatusBadge'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../../components/ui/TrendLineOverlay'
import { formatPowerOf10, formatUTCTime } from '../../utils/formatters'
import { useTheme } from '../../context/ThemeContext'
import DateRangeToolbar, { TimeRange, TIME_LABELS } from '../../components/ui/DateRangeToolbar'

const PROTON_COLORS: Record<string, string> = {
  '>=1 MeV': '#60A5FA',   // Bright Blue
  '>=5 MeV': '#34D399',   // Bright Emerald
  '>=10 MeV': '#FBBF24',  // Bright Amber
  '>=30 MeV': '#F59E0B',  // Bright Orange
  '>=50 MeV': '#38BDF8',  // Bright Sky Blue
  '>=60 MeV': '#F97316',  // Bright Orange-Red
  '>=100 MeV': '#F87171', // Bright Red
  '>=500 MeV': '#C084FC', // Bright Purple
}



export interface StandardOverviewProps {
  activeView?: 'standard' | 'cosmic'
  onViewChange?: (view: 'standard' | 'cosmic') => void
}

export default function StandardOverview({ activeView = 'standard', onViewChange }: StandardOverviewProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const [isOverviewFs, setIsOverviewFs] = useState(false)

  useEffect(() => {
    const handleFsChange = () => {
      setIsOverviewFs(document.fullscreenElement === chartWrapperRef.current)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleOverviewFs = async () => {
    if (!chartWrapperRef.current) return
    try {
      if (!document.fullscreenElement) {
        await chartWrapperRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const initialZoomDispatchedRef = useRef(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── Trend Line Drawing ───────────────────────────────────────────
  const { lines, drawingMode, pendingP1, toggleDrawingMode, handleClick, removeLine, clearLines } = useLineDrawing()
  const GRID_UNITS = ['cts/min', 'ratio', 'nT', 'nT', 'km/s', 'pfu', 'W/m²']

  const [activeGuideTab, setActiveGuideTab] = useState('usage')
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)

  const [magData, setMagData] = useState<any[]>([])
  const [swepamData, setSwepamData] = useState<any[]>([])
  const [protonRaw, setProtonRaw] = useState<any[]>([])
  const [ouluData, setOuluData] = useState<any[]>([])
  const [sopoData, setSopoData] = useState<any[]>([])
  const [sopbData, setSopbData] = useState<any[]>([])
  const [xrayData, setXrayData] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined

      const [mag, swepam, proton, oulu, sopo, sopb, xray] = await Promise.all([
        loadMag(limit, sDate, eDate),
        loadSwepam(limit, sDate, eDate),
        loadProton(limit, sDate, eDate),
        loadNeutron('OULU', limit, sDate, eDate),
        loadNeutron('SOPO', limit, sDate, eDate),
        loadNeutron('SOPB', limit, sDate, eDate),
        loadXray(limit, sDate, eDate),
      ])
      setMagData(mag)
      setSwepamData(swepam)
      setProtonRaw(proton)
      setOuluData(oulu)
      setSopoData(sopo)
      setSopbData(sopb)
      setXrayData(xray)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to load analysis data', e)
    } finally {
      setLoading(false)
    }
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data: magData,
    setData: setMagData,
    loadHistorical: async (start, end) => {
      const [olderMag, olderSwepam, olderProton, olderOulu, olderSopo, olderSopb, olderXray] = await Promise.all([
        loadMag(0, start, end),
        loadSwepam(0, start, end),
        loadProton(0, start, end),
        loadNeutron('OULU', 0, start, end),
        loadNeutron('SOPO', 0, start, end),
        loadNeutron('SOPB', 0, start, end),
        loadXray(0, start, end),
      ])

      const merge = (prev: any[], older: any[], key = 'time_tag') => {
        if (!older || older.length === 0) return prev
        const existingKeys = new Set(prev.map((d: any) => d[key]))
        const fresh = older.filter((d: any) => !existingKeys.has(d[key]))
        if (fresh.length === 0) return prev
        return [...fresh, ...prev].sort(
          (a: any, b: any) => new Date(a[key]).getTime() - new Date(b[key]).getTime()
        )
      }

      if (olderSwepam?.length) setSwepamData(prev => merge(prev, olderSwepam))
      if (olderProton?.length) setProtonRaw(prev => merge(prev, olderProton))
      if (olderOulu?.length) setOuluData(prev => merge(prev, olderOulu))
      if (olderSopo?.length) setSopoData(prev => merge(prev, olderSopo))
      if (olderSopb?.length) setSopbData(prev => merge(prev, olderSopb))
      if (olderXray?.length) setXrayData(prev => merge(prev, olderXray))

      return olderMag.length ? olderMag
        : olderSwepam.length ? olderSwepam
          : olderProton.length ? olderProton
            : olderXray.length ? olderXray
              : olderOulu.length ? olderOulu
                : olderSopo.length ? olderSopo
                  : olderSopb.length ? olderSopb
                    : []
    },
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    load()
  }, [limit, appliedRange])



  const sopbSopoRatioData = useMemo(() => {
    const sopoMap = new Map<string, number>()
    sopoData.forEach((d: any) => {
      if (d.count_rate > 0) {
        sopoMap.set(d.time_tag, d.count_rate)
      }
    })

    return sopbData
      .filter((d: any) => d.count_rate > 0 && sopoMap.has(d.time_tag))
      .map((d: any) => {
        const sopoVal = sopoMap.get(d.time_tag)!
        return [d.time_tag, d.count_rate / sopoVal]
      })
  }, [sopbData, sopoData])

  const integralProtonRaw = useMemo(() => {
    return protonRaw.filter((r: any) => r.energy && r.energy.startsWith('>='))
  }, [protonRaw])

  const protonPivoted = useMemo(() => {
    const map: Record<string, any> = {}
    integralProtonRaw.forEach(r => {
      if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
      map[r.time_tag][r.energy] = r.flux
    })
    return Object.values(map).sort(
      (a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime()
    )
  }, [integralProtonRaw])

  const energyBands = useMemo(() => {
    const customOrder = ['>=1 MeV', '>=5 MeV', '>=10 MeV', '>=30 MeV', '>=50 MeV', '>=60 MeV', '>=100 MeV', '>=500 MeV']
    const present = new Set(integralProtonRaw.map(r => r.energy))
    const ordered = customOrder.filter(e => present.has(e))
    const remaining = [...present].filter(e => !customOrder.includes(e)).sort()
    return [...ordered, ...remaining]
  }, [integralProtonRaw])

  const safeLog = (val: any) => {
    if (val === null || val === undefined) return null
    const n = Number(val)
    return !isNaN(n) && n > 0 ? n : null
  }

  const exportColumns = useMemo<ExportColumn[]>(() => [
    { key: 'time_tag', label: 'Time (UTC)', width: 22 },
    { key: 'mag_bt', label: 'ACE Bt (nT)', width: 14, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'mag_bz', label: 'ACE Bz (nT)', width: 14, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'sw_speed', label: 'SW Speed (km/s)', width: 16, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
    { key: 'sw_density', label: 'SW Density (p/cm³)', width: 18, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'sw_temp', label: 'SW Temp (K)', width: 14, format: (v) => v != null ? Number(v).toFixed(0) : 'N/A' },
    { key: 'p_10', label: 'Proton >=10MeV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'p_50', label: 'Proton >=50MeV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'p_100', label: 'Proton >=100MeV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'xrs_short', label: 'GOES XRS-A (W/m²)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'xrs_long', label: 'GOES XRS-B (W/m²)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'oulu_cr', label: 'Oulu CR (cts/min)', width: 18, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
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
    magData.forEach(d => {
      if (!d.time_tag) return
      const r = getRow(d.time_tag)
      r.mag_bt = d.bt
      r.mag_bz = d.bz
    })
    swepamData.forEach(d => {
      if (!d.time_tag) return
      const r = getRow(d.time_tag)
      r.sw_speed = d.speed
      r.sw_density = d.density
      r.sw_temp = d.temperature
    })
    protonPivoted.forEach(d => {
      if (!d.time_tag) return
      const r = getRow(d.time_tag)
      r.p_10 = d['>=10 MeV']
      r.p_50 = d['>=50 MeV']
      r.p_100 = d['>=100 MeV']
    })
    xrayData.forEach(d => {
      if (!d.time_tag) return
      const r = getRow(d.time_tag)
      r.xrs_short = d.flux_short ?? d.xrsa
      r.xrs_long = d.flux_long ?? d.xrsb
    })
    ouluData.forEach(d => {
      if (!d.time_tag) return
      const r = getRow(d.time_tag)
      r.oulu_cr = d.count_rate
    })
    return Array.from(map.values()).sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }, [magData, swepamData, protonPivoted, xrayData, ouluData])

  const exportMetadata = useMemo(() => ({
    station: 'SPACE WEATHER OVERVIEW // 7-TIER TELEMETRY',
    viewTitle: 'Synchronized Space Weather Overview Telemetry',
    description: 'Cross-platform real-time overview: ACE Magnetic Field (Bt, Bz), SWEPAM Solar Wind Plasma, GOES Proton Flux, GOES X-Ray Flux, and Ground Neutron Monitors.',
    timeRangeText: appliedRange ? `${appliedRange.startDate} to ${appliedRange.endDate}` : `${TIME_LABELS[limit]} (Recent)`,
    totalRecords: exportData.length
  }), [appliedRange, limit, exportData.length])

  // Calculate unified synchronized time range across all datasets
  const sharedTimeRange = useMemo(() => {
    if (appliedRange?.startDate && appliedRange?.endDate) {
      const minTs = new Date(appliedRange.startDate).getTime()
      const maxTs = new Date(appliedRange.endDate).getTime() + 24 * 60 * 60 * 1000
      return { min: minTs, max: maxTs }
    }

    let globalMaxTs = -Infinity

    const checkMax = (arr: any[], key = 'time_tag') => {
      if (!arr || !arr.length) return
      for (let i = arr.length - 1; i >= Math.max(0, arr.length - 50); i--) {
        const item = arr[i]
        const raw = Array.isArray(item) ? item[0] : item[key]
        if (raw) {
          const t = new Date(raw).getTime()
          if (!isNaN(t) && t > globalMaxTs) {
            globalMaxTs = t
          }
        }
      }
    }

    checkMax(xrayData)
    checkMax(magData)
    checkMax(swepamData)
    checkMax(protonPivoted)
    checkMax(ouluData)
    checkMax(sopoData)

    if (globalMaxTs === -Infinity) return { min: undefined, max: undefined }

    const windowMs = (limit || 1440) * 60 * 1000
    const minTs = globalMaxTs - windowMs
    return { min: minTs, max: globalMaxTs }
  }, [xrayData, magData, swepamData, protonPivoted, ouluData, sopoData, limit, appliedRange])

  // Midnight (00:00 UTC) timestamps within the shared time range to draw day divider lines
  const midnightTimestamps = useMemo(() => {
    if (!sharedTimeRange?.min || !sharedTimeRange?.max) return []
    const midnights: number[] = []
    const start = new Date(sharedTimeRange.min)
    start.setUTCHours(0, 0, 0, 0)
    let curr = start.getTime()
    while (curr <= sharedTimeRange.max) {
      if (curr > sharedTimeRange.min + 60000 && curr < sharedTimeRange.max - 60000) {
        midnights.push(curr)
      }
      curr += 24 * 60 * 60 * 1000
    }
    return midnights
  }, [sharedTimeRange])

  const GRIDS = [
    { top: 40, left: 95, right: 85, height: 125 },
    { top: 205, left: 95, right: 85, height: 125 },
    { top: 370, left: 95, right: 85, height: 125 },
    { top: 535, left: 95, right: 85, height: 120 },
    { top: 695, left: 95, right: 85, height: 120 },
    { top: 855, left: 95, right: 85, height: 130 },
    { top: 1025, left: 95, right: 85, height: 130 },
  ]

  const axisLabelStyle = { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'monospace, sans-serif', fontWeight: 600 }
  const splitLineStyle = { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' as const } }

  const buildCombinedMarkLines = (gi: number) => {
    const userLines = buildMarkLines(lines, gi)
    const userData = userLines?.data || []

    const dividerLines = midnightTimestamps.map(ts => {
      const d = new Date(ts)
      const day = d.getUTCDate().toString().padStart(2, '0')
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
      const weekday = d.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' })

      return {
        xAxis: ts,
        lineStyle: {
          color: isLight ? 'rgba(2, 132, 199, 0.3)' : 'rgba(56, 189, 248, 0.25)',
          width: 1,
          type: 'solid' as const,
        },
        label: { show: false },
      }
    })

    const allData: any[] = [...dividerLines, ...userData]
    if (gi === 3) {
      allData.push({
        yAxis: 0,
        lineStyle: { color: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)', type: 'dashed' },
        label: { show: false }
      })
    }

    if (allData.length === 0) return undefined

    return {
      silent: true,
      symbol: ['none', 'none'],
      data: allData,
    }
  }

  const xAxisBase = (gi: number, showLabel: boolean) => {
    const isMultiDay = (limit && limit > 1440) || !!appliedRange

    const bottomAxisLabel = {
      show: true,
      color: isLight ? '#475569' : '#CBD5E1',
      fontSize: 11,
      fontFamily: 'monospace, sans-serif',
      formatter: (value: number) => {
        const d = new Date(value)
        if (isNaN(d.getTime())) return ''

        const hours = d.getUTCHours().toString().padStart(2, '0')
        const mins = d.getUTCMinutes().toString().padStart(2, '0')
        const timeStr = `${hours}:${mins}`

        const day = d.getUTCDate().toString().padStart(2, '0')
        const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
        const weekday = d.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' })

        if (hours === '00' && mins === '00') {
          return `{midnightDate|${weekday} ${day} ${month}}\n{midnightTime|00:00 UTC}`
        }

        if (isMultiDay) {
          return `{time|${timeStr}}\n{date|${day} ${month}}`
        }

        return `{time|${timeStr}}`
      },
      rich: {
        midnightDate: {
          color: isLight ? '#0284C7' : '#38BDF8',
          fontWeight: 700,
          fontSize: 12,
          fontFamily: 'var(--font-mono), monospace',
          lineHeight: 16,
          align: 'center',
        },
        midnightTime: {
          color: isLight ? '#0369A1' : '#7DD3FC',
          fontWeight: 600,
          fontSize: 10,
          fontFamily: 'var(--font-mono), monospace',
          lineHeight: 14,
          align: 'center',
        },
        time: {
          color: isLight ? '#1E293B' : '#F1F5F9',
          fontWeight: 600,
          fontSize: 11,
          fontFamily: 'var(--font-mono), monospace',
          lineHeight: 15,
          align: 'center',
        },
        date: {
          color: isLight ? '#64748B' : '#94A3B8',
          fontWeight: 500,
          fontSize: 10,
          fontFamily: 'var(--font-mono), monospace',
          lineHeight: 14,
          align: 'center',
        },
      }
    }

    return {
      gridIndex: gi,
      type: 'time' as const,
      splitLine: splitLineStyle,
      axisLabel: showLabel ? bottomAxisLabel : { show: false },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    }
  }

  const yAxisBase = (gi: number, name: string, color: string, type: 'value' | 'log' = 'value') => {
    const textColor = isLight ? (
      color === '#A5B4FC' ? '#4F46E5' :
      color === '#93C5FD' ? '#2563EB' :
      color === '#FDBA74' ? '#D97706' :
      color === '#E879F9' ? '#C026D3' :
      color === '#6EE7B7' ? '#059669' :
      color === '#FDE047' ? '#D97706' :
      color === '#38BDF8' ? '#0284C7' : color
    ) : color

    return {
      gridIndex: gi,
      type,
      name,
      nameLocation: 'middle' as const,
      nameGap: 55,
      nameTextStyle: { color: textColor, fontSize: 13, fontFamily: 'sans-serif', fontWeight: 700 },
      splitLine: splitLineStyle,
      axisLabel: {
        ...axisLabelStyle,
        color: isLight ? '#475569' : '#CBD5E1',
        ...(type === 'log' ? { formatter: formatPowerOf10 } : {}),
      },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    }
  }

  const option = useMemo(() => ({
    useUTC: true,
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#6366F1' : 'rgba(99, 102, 241, 0.6)',
      borderWidth: 1.5,
      padding: 12,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight
        ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
        : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: {
        type: 'line' as const,
        lineStyle: { color: '#818CF8', type: 'dashed' as const, width: 1.5 },
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return '';

        // Find actual hovered timestamp from axisValue or params
        let hoverTs: number | null = null;
        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          if (p && p.axisValue) {
            const t = typeof p.axisValue === 'number' ? p.axisValue : new Date(p.axisValue).getTime();
            if (!isNaN(t)) {
              hoverTs = t;
              break;
            }
          }
        }
        if (hoverTs === null && params[0]) {
          const raw = params[0].value ? (Array.isArray(params[0].value) ? params[0].value[0] : params[0].value) : '';
          const t = new Date(raw).getTime();
          if (!isNaN(t)) hoverTs = t;
        }

        const timeStr = hoverTs ? formatUTCTime(hoverTs, true) : '';

        const groups: Record<string, { label: string; color: string; items: any[] }> = {
          cosmic: { label: 'COSMIC RAY (OULU & SOPO)', color: '#818CF8', items: [] },
          sopb_sopo: { label: 'SOUTH POLE RATIO (SOPB / SOPO)', color: '#E879F9', items: [] },
          imf_tz: { label: 'IMF Bt & Bz (ACE/DSCOVR)', color: '#60A5FA', items: [] },
          imf_xy: { label: 'IMF Bx - By (GSE)', color: '#FB923C', items: [] },
          sw_speed: { label: 'SOLAR WIND SPEED', color: '#34D399', items: [] },
          proton: { label: 'PROTON FLUX INTEGRAL', color: '#FBBF24', items: [] },
          xray: { label: 'X-RAY FLUX (GOES)', color: '#38BDF8', items: [] },
        };

        params.forEach((p: any) => {
          if (!p) return;
          const name = p.seriesName;
          const val = Array.isArray(p.value) ? p.value[1] : p.value;
          if (val === undefined || val === null) return;

          // Check if this point's timestamp matches the hovered cursor time (within 5 minutes).
          // If a dataset hasn't updated to this time yet (e.g. Cosmic Ray), do not show stale old values at the cursor!
          const ptTime = Array.isArray(p.value) && p.value[0] ? new Date(p.value[0]).getTime() : null;
          if (hoverTs !== null && ptTime !== null && !isNaN(ptTime)) {
            if (Math.abs(ptTime - hoverTs) > 5 * 60 * 1000) {
              return;
            }
          }

          const itemInfo = { name, value: val, color: p.color };

          if (name === 'OULU' || name === 'SOPO') {
            groups.cosmic.items.push(itemInfo);
          } else if (name === 'SOPB / SOPO') {
            groups.sopb_sopo.items.push(itemInfo);
          } else if (name === 'Bt' || name === 'Bz') {
            groups.imf_tz.items.push(itemInfo);
          } else if (name === 'Bx - By' || name === 'Bx' || name === 'By') {
            groups.imf_xy.items.push(itemInfo);
          } else if (name === 'SW Speed') {
            groups.sw_speed.items.push(itemInfo);
          } else if (name.startsWith('>=') || name.includes('MeV')) {
            groups.proton.items.push(itemInfo);
          } else if (name.includes('Å') || name.toLowerCase().includes('x-ray') || name.includes('Long') || name.includes('Short')) {
            groups.xray.items.push(itemInfo);
          }
        });

        let html = `<div style="font-family: var(--font-mono); font-size: 14px; min-width: 240px;">`;
        html += `<div style="color: #94A3B8; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px;">`;
        html += `⏱ ${timeStr}</div>`;

        Object.values(groups).forEach(g => {
          if (g.items.length === 0) return;

          html += `<div style="color: ${g.color}; font-weight: 700; margin-top: 8px; margin-bottom: 4px; font-size: 13px; letter-spacing: 0.8px; display: flex; align-items: center; gap: 4px;">`;
          html += `<span style="display:inline-block; width:8px; height:8px; background:${g.color}; border-radius:2px;"></span>${g.label}</div>`;

          g.items.forEach(item => {
            let valDisplay = typeof item.value === 'number' ? item.value.toFixed(1) : item.value;
            if (item.name === 'SOPB / SOPO' && typeof item.value === 'number') {
              valDisplay = item.value.toFixed(4);
            } else if ((g.label.includes('PROTON') || g.label.includes('X-RAY')) && typeof item.value === 'number') {
              valDisplay = item.value.toExponential(2);
            }
            html += `<div style="display: flex; justify-content: space-between; gap: 20px; padding: 2px 0 2px 10px; color: #E2E8F0;">`;
            html += `<span style="display:flex; align-items:center; gap:6px;"><span style="color: ${item.color}; font-size: 15px;">●</span>${item.name}</span>`;
            html += `<span style="font-weight: 700; color: #FFFFFF; font-family: monospace;">${valDisplay}</span>`;
            html += `</div>`;
          });
        });

        html += `</div>`;
        return html;
      }
    },
    axisPointer: {
      link: [{ xAxisIndex: [0, 1, 2, 3, 4, 5, 6] }],
      snap: false,
    },
    dataZoom: [
      {
        type: 'inside' as const,
        xAxisIndex: [0, 1, 2, 3, 4, 5, 6],
        filterMode: 'none' as const,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: true,
      },
    ],
    legend: [
      {
        show: true,
        top: 847,
        right: 80,
        icon: 'roundRect',
        itemGap: 12,
        itemWidth: 10,
        itemHeight: 4,
        textStyle: {
          color: isLight ? '#475569' : '#CBD5E1',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        },
        data: energyBands,
      },
      {
        show: true,
        top: 1017,
        right: 80,
        icon: 'roundRect',
        itemGap: 14,
        itemWidth: 10,
        itemHeight: 4,
        textStyle: {
          color: isLight ? '#475569' : '#CBD5E1',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        },
        data: ['1-8 Å (Long)', '0.5-4 Å (Short)'],
      }
    ],
    grid: GRIDS,
    xAxis: [
      { ...xAxisBase(0, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
      { ...xAxisBase(1, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
      { ...xAxisBase(2, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
      { ...xAxisBase(3, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
      { ...xAxisBase(4, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
      { ...xAxisBase(5, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
      { ...xAxisBase(6, true), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
    ],
    yAxis: [
      yAxisBase(0, 'Cosmic Ray (cts/min)', '#A5B4FC'),
      { ...yAxisBase(1, 'SP B / NM', '#E879F9'), scale: true },
      yAxisBase(2, 'Bt & Bz (nT)', '#93C5FD'),
      yAxisBase(3, 'Bx - By (nT)', '#FDBA74'),
      { ...yAxisBase(4, 'SW Speed (km/s)', '#6EE7B7'), scale: true },
      yAxisBase(5, 'Proton Flux (pfu)', '#FDE047', 'log'),
      { ...yAxisBase(6, 'X-Ray Flux (W/m²)', '#38BDF8', 'log'), min: 1e-9, max: 1e-2 },
    ],
    series: [
      {
        name: 'OULU',
        type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, lineStyle: { width: 2.2, color: '#818CF8' },
        itemStyle: { color: '#818CF8' },
        markLine: buildCombinedMarkLines(0),
        data: ouluData.filter((d: any) => d.count_rate > 0).map((d: any) => [d.time_tag, d.count_rate]),
      },
      {
        name: 'SOPO',
        type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, lineStyle: { width: 2, color: '#FB923C' },
        itemStyle: { color: '#FB923C' },
        data: sopoData.filter((d: any) => d.count_rate > 0).map((d: any) => [d.time_tag, d.count_rate]),
      },
      {
        name: 'SOPB / SOPO',
        type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true,
        lineStyle: { width: 2, color: '#E879F9' },
        itemStyle: { color: '#E879F9' },
        markLine: buildCombinedMarkLines(1),
        data: sopbSopoRatioData,
      },
      {
        name: 'Bt',
        type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, lineStyle: { width: 2, color: '#C084FC' },
        itemStyle: { color: '#C084FC' },
        markLine: buildCombinedMarkLines(2),
        data: magData.map((d: any) => [d.time_tag, d.bt]),
      },
      {
        name: 'Bz',
        type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, lineStyle: { width: 2.2, color: '#38BDF8' },
        itemStyle: { color: '#38BDF8' },
        data: magData.map((d: any) => [d.time_tag, d.bz]),
        areaStyle: {
          origin: 'auto',
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(56, 189, 248, 0.3)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.03)' },
            ]
          }
        },
        markLine: {
          data: [{ yAxis: 0 }],
          lineStyle: { color: 'rgba(239, 68, 68, 0.6)', type: 'dashed', width: 1.2 },
          symbol: ['none', 'none'],
          label: { show: false },
        },
      },
      {
        name: 'Bx - By',
        type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, lineStyle: { width: 2, color: '#FB923C' },
        itemStyle: { color: '#FB923C' },
        data: magData.map((d: any) => [d.time_tag, (d.bx != null && d.by != null) ? d.bx - d.by : null]),
        markLine: buildCombinedMarkLines(3),
      },
      {
        name: 'SW Speed',
        type: 'line', xAxisIndex: 4, yAxisIndex: 4,
        showSymbol: false, lineStyle: { width: 2.2, color: '#34D399' },
        itemStyle: { color: '#34D399' },
        markLine: buildCombinedMarkLines(4),
        data: swepamData.map((d: any) => [d.time_tag, d.bulk_speed]),
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(52, 211, 153, 0.3)' },
              { offset: 1, color: 'rgba(52, 211, 153, 0.02)' },
            ]
          }
        },
      },
      ...energyBands.map((e: string, idx: number) => ({
        name: e,
        type: 'line', xAxisIndex: 5, yAxisIndex: 5,
        showSymbol: false, connectNulls: true,
        lineStyle: { width: 1.8, color: PROTON_COLORS[e] || '#94A3B8' },
        itemStyle: { color: PROTON_COLORS[e] || '#94A3B8' },
        markLine: idx === 0 ? buildCombinedMarkLines(5) : undefined,
        endLabel: {
          show: true,
          formatter: (params: any) => params.seriesName,
          color: PROTON_COLORS[e] || '#94A3B8',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          distance: 6,
        },
        data: protonPivoted.map((d: any) => [d.time_tag, safeLog(d[e])]),
      })),
      {
        name: '1-8 Å (Long)',
        type: 'line', xAxisIndex: 6, yAxisIndex: 6,
        showSymbol: false, connectNulls: true,
        lineStyle: { width: 1.8, color: isLight ? '#0284C7' : '#38BDF8' },
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        markLine: buildCombinedMarkLines(6),
        data: xrayData.map((d: any) => [d.time_tag, safeLog(d.flux_long)]),
      },
      {
        name: '0.5-4 Å (Short)',
        type: 'line', xAxisIndex: 6, yAxisIndex: 6,
        showSymbol: false, connectNulls: true,
        lineStyle: { width: 1.8, color: isLight ? '#059669' : '#22C55E' },
        itemStyle: { color: isLight ? '#059669' : '#22C55E' },
        data: xrayData.map((d: any) => [d.time_tag, safeLog(d.flux_short)]),
      },
    ],
  }), [ouluData, sopoData, sopbSopoRatioData, magData, swepamData, protonPivoted, energyBands, xrayData, sharedTimeRange, midnightTimestamps, lines, isLight, limit, appliedRange])

  const PANEL_LABELS = [
    { y: 45, label: 'COSMIC RAY', target: 'OULU & SOPO (NMDB)', color: '#A5B4FC', icon: Globe },
    { y: 210, label: 'SOPB / SOPO', target: 'SOUTH POLE RATIO', color: '#E879F9', icon: Layers },
    { y: 375, label: 'IMF Bt & Bz', target: 'L1 ACE / DSCOVR', color: '#93C5FD', icon: Zap },
    { y: 540, label: 'IMF Bx - By', target: 'GSE COORDINATE', color: '#FDBA74', icon: Activity },
    { y: 700, label: 'SW SPEED', target: 'L1 SWEPAM PLASMA', color: '#6EE7B7', icon: Wind },
    { y: 860, label: 'PROTON FLUX', target: 'GOES GEO SATELLITES', color: '#FDE047', icon: Satellite },
    { y: 1030, label: 'X-RAY FLUX', target: 'GOES X-RAY SENSORS', color: '#38BDF8', icon: Radio },
  ]

  const latestMag = magData[magData.length - 1]
  const latestSwepam = swepamData[swepamData.length - 1]
  const latestOulu = ouluData.filter((d: any) => d.count_rate > 0).slice(-1)[0]
  const latestRatio = sopbSopoRatioData.length ? sopbSopoRatioData[sopbSopoRatioData.length - 1][1] : null

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Content area with fluid wide layout */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>

        {/* Navigation Tabs between Standard Analysis & Cosmic-Helio */}
        {onViewChange && (
          <div style={{
            display: 'inline-flex',
            gap: 6,
            background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.75)',
            padding: '4px',
            border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6,
            marginBottom: 20
          }}>
            <button
              onClick={() => onViewChange('standard')}
              style={{
                padding: '6px 16px',
                background: activeView === 'standard' ? (isLight ? '#FFFFFF' : 'rgba(99, 102, 241, 0.25)') : 'transparent',
                border: 'none',
                borderBottom: activeView === 'standard' ? `2px solid ${isLight ? '#4F46E5' : '#818CF8'}` : '2px solid transparent',
                color: activeView === 'standard' ? (isLight ? '#4338CA' : '#818CF8') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease'
              }}
            >
              <Globe size={13} /> STANDARD OVERVIEW
            </button>
            <button
              onClick={() => onViewChange('cosmic')}
              style={{
                padding: '6px 16px',
                background: activeView === 'cosmic' ? (isLight ? '#FFFFFF' : 'rgba(129, 140, 248, 0.25)') : 'transparent',
                border: 'none',
                borderBottom: activeView === 'cosmic' ? `2px solid ${isLight ? '#4F46E5' : '#818CF8'}` : '2px solid transparent',
                color: activeView === 'cosmic' ? (isLight ? '#4338CA' : '#818CF8') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease'
              }}
            >
              <Satellite size={13} /> COSMIC & HELIOSPHERE (9-TIER)
            </button>
            <Link
              to="/custom-studio"
              style={{
                padding: '6px 16px',
                background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)',
                textDecoration: 'none',
                border: isLight ? '1px solid rgba(2, 132, 199, 0.2)' : '1px solid rgba(56, 189, 248, 0.25)',
                color: isLight ? '#0284C7' : '#38BDF8',
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isLight ? 'rgba(2, 132, 199, 0.16)' : 'rgba(56, 189, 248, 0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)'
              }}
            >
              <BarChart3 size={13} /> CUSTOM STUDIO 📊
            </Link>
          </div>
        )}

        {/* Seamless Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 16,
          borderBottom: isLight ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 26,
              fontWeight: 700,
              color: isLight ? '#3730A3' : '#F8FAFC',
              margin: 0,
              letterSpacing: -0.5
            }}>
              SPACE WEATHER OVERVIEW
            </h1>
            <p style={{ color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
              Synchronized 7-Tier Analytics: Cosmic Ray · Polar Ratio · Magnetic Field · Solar Wind · Proton Flux · X-Ray Flux
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {panLoading && (
              <span style={{ fontSize: 14, color: '#818CF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            )}
            {/* ── Trend Line Toolbar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {drawingMode && (
                <span style={{
                  fontSize: 13, fontFamily: 'var(--font-mono)', color: pendingP1 ? '#FBBF24' : '#A78BFA',
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
                  background: drawingMode
                    ? (isLight ? 'rgba(99, 102, 241, 0.15)' : 'rgba(167,139,250,0.2)')
                    : (isLight ? '#F1F5F9' : 'transparent'),
                  border: `1px solid ${drawingMode ? (isLight ? '#6366F1' : '#A78BFA') : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)')}`,
                  color: drawingMode ? (isLight ? '#4F46E5' : '#A78BFA') : (isLight ? '#475569' : '#94A3B8'),
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: 0.5,
                  transition: 'all 0.2s', borderRadius: 4,
                }}
              >
                {drawingMode ? '╱ DRAWING ON' : '╱ DRAW LINE'}
              </button>
              {lines.length > 0 && (
                <button
                  onClick={clearLines}
                  style={{
                    padding: '4px 10px', background: isLight ? '#FEF2F2' : 'transparent',
                    border: `1px solid ${isLight ? '#FECACA' : 'rgba(248,113,113,0.4)'}`, color: isLight ? '#DC2626' : '#F87171',
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: 0.5, borderRadius: 4,
                  }}
                >
                  CLEAR ({lines.length})
                </button>
              )}
            </div>

            <button
              onClick={load}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'transparent',
                border: 'none',
                color: isLight ? '#4F46E5' : '#818CF8',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'SYNCING...' : 'REFRESH'}
            </button>
            <StatusBadge status={ouluData.length > 0 || magData.length > 0 ? 'normal' : (loading ? 'info' : 'offline')} />
          </div>
        </div>



        {/* Row 2 Toolbar (Below Header Line): DateRangeToolbar, FULLSCREEN & Export */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap'
        }}>
          <DateRangeToolbar
            limit={limit}
            onLimitChange={setLimit}
            appliedRange={appliedRange}
            onApplyRange={setAppliedRange}
            accentColor={isLight ? '#4F46E5' : '#818CF8'}
            loading={loading}
            presets={[1440, 4320, 10080]}
          />

          <button
            onClick={toggleOverviewFs}
            title={isOverviewFs ? 'Exit Full Screen (ESC)' : 'Full Screen (F11 style)'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isLight ? '#334155' : '#94A3B8',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              borderRadius: 4,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = isLight ? '#4F46E5' : '#818CF8'
              e.currentTarget.style.color = isLight ? '#4F46E5' : '#818CF8'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.color = isLight ? '#334155' : '#94A3B8'
            }}
          >
            <Maximize2 size={13} />
            <span>FULLSCREEN</span>
          </button>

          <ExportChartMenu
            chartRef={chartRef}
            data={exportData}
            columns={exportColumns}
            metadata={exportMetadata}
            filenameBase={`space_weather_overview_${limit}m`}
            accentColor="#818CF8"
          />
        </div>

        {/* Translucent & Delicate Chart Canvas Plate */}
        {loading && magData.length === 0 ? (
          <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <div
            ref={chartWrapperRef}
            style={{
              position: 'relative',
              width: '100%',
              ...(isOverviewFs ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: '#020617',
                zIndex: 99999,
                overflow: 'hidden',
              } : {
                background: isLight ? '#FFFFFF' : '#0B0F19',
                border: isLight ? '1px solid rgba(99, 102, 241, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px 0',
                boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.06)' : '0 12px 30px rgba(0, 0, 0, 0.4)',
                borderRadius: 8
              })
            }}
          >
            {isOverviewFs ? (
              <SciFiFullscreenOverlay
                isFullscreen={true}
                onClose={toggleOverviewFs}
                scrollable={true}
                title="SPACE WEATHER OVERVIEW // 7-TIER TELEMETRY"
                subtitle="Synchronized Real-Time Analysis: ACE Mag, Solar Wind, GOES Protons & X-Ray, Cosmic Rays"
                accentColor="#818CF8"
              >
                <div style={{ width: '100%', minHeight: 1200, position: 'relative', paddingRight: 6 }}>
                  <ReactECharts
                    ref={chartRef}
                    option={option}
                    style={{ height: 1200, width: '100%' }}
                    notMerge={true}
                    lazyUpdate={false}
                    onChartReady={onChartReady}
                    onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
                  />
                  <TrendLineOverlay
                    chartRef={chartRef}
                    wrapperRef={chartWrapperRef}
                    gridCount={7}
                    gridUnits={GRID_UNITS}
                    lines={lines}
                    drawingMode={drawingMode}
                    pendingP1={pendingP1}
                    onChartClick={handleClick}
                    onRemoveLine={removeLine}
                  />
                </div>
              </SciFiFullscreenOverlay>
            ) : (
              <>
                <ReactECharts
                  ref={chartRef}
                  option={option}
                  style={{ height: 1200, width: '100%' }}
                  notMerge={true}
                  lazyUpdate={false}
                  onChartReady={onChartReady}
                  onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
                />

                <TrendLineOverlay
                  chartRef={chartRef}
                  wrapperRef={chartWrapperRef}
                  gridCount={7}
                  gridUnits={GRID_UNITS}
                  lines={lines}
                  drawingMode={drawingMode}
                  pendingP1={pendingP1}
                  onChartClick={handleClick}
                  onRemoveLine={removeLine}
                />

                {/* Horizontal Panel Dividers */}
                {[195, 360, 525, 685, 845, 1015].map(top => (
                  <div key={top} style={{
                    position: 'absolute',
                    left: 95,
                    right: 85,
                    top,
                    height: 1,
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.08)',
                    pointerEvents: 'none'
                  }} />
                ))}
              </>
            )}
          </div>
        )}

        {/* Footer Data Sources & Channels */}
        <div style={{
          marginTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          paddingTop: 16,
          borderTop: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: isLight ? '#475569' : '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
            <span><strong style={{ color: isLight ? '#4F46E5' : '#818CF8' }}>OULU</strong> Oulu, Finland</span>
            <span><strong style={{ color: isLight ? '#EA580C' : '#FB923C' }}>SOPO</strong> South Pole, Antarctica</span>
            <span><strong style={{ color: isLight ? '#C026D3' : '#E879F9' }}>SOPB/SOPO</strong> Polar Ratio</span>
            <span><strong style={{ color: isLight ? '#2563EB' : '#93C5FD' }}>ACE</strong> L1 Orbit Sensors</span>
            <span><strong style={{ color: isLight ? '#D97706' : '#FBBF24' }}>GOES</strong> NOAA Satellites</span>
          </div>

          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <Clock size={12} />
              Synced: {formatUTCTime(lastUpdated)}
            </div>
          )}
        </div>

        {/* Refined Instrument Info Guide */}
        <div style={{ marginTop: 32 }}>
          <InstrumentInfoGuide
            activeTab={activeGuideTab}
            onTabChange={setActiveGuideTab}
            accentColor="#818CF8"
            tabs={[
              { id: 'usage', label: '01. USAGE (การใช้งาน)' },
              { id: 'impacts', label: '02. IMPACTS (ผลกระทบ)' },
              { id: 'details', label: '03. DETAILS (ข้อมูลอุปกรณ์)' },
              { id: 'credits', label: '04. DATA SOURCE & CREDITS (แหล่งข้อมูล)' }
            ]}
          >
            {activeGuideTab === 'usage' && (
              <div>
                <h4 style={{
                  color: isLight ? '#1E1B4B' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 15,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  ภาพรวมสภาพอวกาศแบบประสานเวลา 6 มิติ (Synchronized Space Weather Analytics)
                </h4>
                <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', lineHeight: '1.7' }}>
                  หน้านี้แสดงข้อมูลสภาพอวกาศแบบ Real-Time จากแหล่งตรวจวัดอวกาศและพื้นผิวโลกที่สำคัญ 6 ระดับ โดยจัดแกนเวลาให้ตรงกัน (Synchronized Timeline) เพื่อให้ตรวจพบความสัมพันธ์ระหว่างการระเบิดบนดวงอาทิตย์กับผลกระทบต่อโลกได้อย่างแม่นยำ:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ borderLeft: '3px solid #818CF8', paddingLeft: 12, fontSize: 13, color: isLight ? '#334155' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>1. Cosmic Ray & Polar Ratio: </strong>
                    ฟลักซ์รังสีคอสมิกจากนอกระบบสุริยะ และอัตราส่วนขั้วโลกใต้ บ่งชี้การลดลงแบบฟอร์บุช (Forbush Decrease) เมื่อพายุสุริยะพัดผ่านโลก
                  </div>
                  <div style={{ borderLeft: '3px solid #60A5FA', paddingLeft: 12, fontSize: 13, color: isLight ? '#334155' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>2. Interplanetary Magnetic Field (Bt, Bz, Bx, By): </strong>
                    สนามแม่เหล็กระหว่างดาวเคราะห์ ณ จุด L1 หากค่า <strong>Bz ติดลบลงลึก (ชี้ลงใต้)</strong> จะเกิดการเชื่อมต่อกับสนามแม่เหล็กโลกและทำให้เกิดพายุแม่เหล็กโลก (Geomagnetic Storm)
                  </div>
                  <div style={{ borderLeft: '3px solid #34D399', paddingLeft: 12, fontSize: 13, color: isLight ? '#334155' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>3. Solar Wind Speed & Proton Flux: </strong>
                    ความเร็วพลาสมาลมสุริยะและฟลักซ์โปรตอนพลังงานสูงจากดาวเทียม GOES วงโคจรค้างฟ้า
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'impacts' && (
              <div>
                <h4 style={{
                  color: isLight ? '#1E1B4B' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 15,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  ผลกระทบต่อโครงสร้างพื้นฐานและเทคโนโลยี
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                      <td style={{ padding: '10px 0', color: isLight ? '#4F46E5' : '#818CF8', width: '28%', fontWeight: 700 }}>Bz &lt; -10 nT ต่อเนื่อง</td>
                      <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC' }}>เสี่ยงเกิดพายุแม่เหล็กโลกระดับ G2 ถึง G5 รบกวนระบบส่งจ่ายไฟฟ้า หม้อแปลงไฟแรงสูง และเกิดแสงออโรร่าละติจูดต่ำ</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                      <td style={{ padding: '10px 0', color: isLight ? '#059669' : '#34D399', width: '28%', fontWeight: 700 }}>Solar Wind &gt; 600 km/s</td>
                      <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC' }}>ลมสุริยะความเร็วสูง (HSS) จากหลุมโคโรนา บีบอัดแมกนีโตสเฟียร์ของโลก ทำให้ดาวเทียมเกิดแรงฉุดและสะสมประจุไฟฟ้าสถิต</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 0', color: isLight ? '#D97706' : '#FBBF24', width: '28%', fontWeight: 700 }}>Proton Flux &gt; 10 pfu</td>
                      <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC' }}>พายุรังสีสุริยะ (Solar Radiation Storm - S1+) เกิดการดูดกลืนคลื่นวิทยุแถบขั้วโลก (Polar Cap Absorption - PCA) กระทบการบินข้ามขั้วโลกและการสื่อสาร HF</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeGuideTab === 'details' && (
              <div>
                <h4 style={{
                  color: isLight ? '#1E1B4B' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 15,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  อุปกรณ์และเครือข่ายเซนเซอร์ที่ตรวจวัด
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <div style={{ padding: '12px 16px', background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                    <div style={{ fontWeight: 700, color: isLight ? '#4F46E5' : '#818CF8', fontSize: 13, marginBottom: 4 }}>ACE / DSCOVR (L1 Point)</div>
                    <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', lineHeight: 1.6 }}>ตรวจวัดสนามแม่เหล็ก MAG (Bt, Bx, By, Bz) และพลาสมา SWEPAM (Speed, Density, Temp) ล่วงหน้าก่อนปะทะโลก 30-60 นาที</div>
                  </div>
                  <div style={{ padding: '12px 16px', background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                    <div style={{ fontWeight: 700, color: isLight ? '#059669' : '#34D399', fontSize: 13, marginBottom: 4 }}>NMDB (Oulu & South Pole)</div>
                    <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', lineHeight: 1.6 }}>หอตรวจวัดนิวตรอนบนพื้นผิวโลก ตรวจจับอนุภาครองจากการชนของรังสีคอสมิกพลังงานสูงในชั้นบรรยากาศ</div>
                  </div>
                  <div style={{ padding: '12px 16px', background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                    <div style={{ fontWeight: 700, color: isLight ? '#D97706' : '#FBBF24', fontSize: 13, marginBottom: 4 }}>NOAA GOES-16/18 (SEISS)</div>
                    <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', lineHeight: 1.6 }}>เซนเซอร์ตรวจจับฟลักซ์โปรตอนพลังงานสูง (1 MeV ถึง &gt;500 MeV) ณ ระดับวงโคจรค้างฟ้าประจำวันตลอด 24 ชม.</div>
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'credits' && (
              <div>
                <h4 style={{
                  color: isLight ? '#1E1B4B' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 15,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  แหล่งที่มาของข้อมูล & เครดิต
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ borderLeft: '3px solid #818CF8', paddingLeft: 12, color: isLight ? '#475569' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>NOAA Space Weather Prediction Center (SWPC): </strong>
                    ACE Real-Time Solar Wind (RTSW), DSCOVR, GOES SEISS
                  </div>
                  <div style={{ borderLeft: '3px solid #E879F9', paddingLeft: 12, color: isLight ? '#475569' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>Neutron Monitor Database (NMDB): </strong>
                    University of Oulu, Finland & University of Delaware / Bartol Research Institute (South Pole)
                  </div>
                </div>
              </div>
            )}
          </InstrumentInfoGuide>
        </div>
      </div>
    </div>
  )
}



