import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  Globe,
  Satellite,
  RefreshCw,
  Maximize2,
  Minimize2,
  BarChart3
} from 'lucide-react'
import SciFiFullscreenOverlay from '../../components/ui/SciFiFullscreenOverlay'
import { loadMag, loadSwepam } from '../../services/aceService'
import { loadProton, loadXray } from '../../services/goesService'
import { loadPsnmData } from '../../services/psnmService'
import { loadMawData } from '../../services/mawService'
import { loadCrater } from '../../services/radiationService'
import { useChartPan } from '../../hooks/useChartPan'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../../components/ui/TrendLineOverlay'
import { formatPowerOf10, formatUTCTime } from '../../utils/formatters'
import { useTheme } from '../../context/ThemeContext'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import DualMonthDatePicker from '../../components/ui/DualMonthDatePicker'

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

export interface CosmicHelioOverviewProps {
  activeView?: 'standard' | 'cosmic'
  onViewChange?: (view: 'standard' | 'cosmic') => void
}

export default function CosmicHelioOverview({ activeView = 'cosmic', onViewChange }: CosmicHelioOverviewProps) {
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

  const [limit, setLimit] = useState<TimeRange>(1440)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [craterLogScale, setCraterLogScale] = useState<boolean>(true)
  const [nmMode, setNmMode] = useState<'percent' | 'rate'>('percent')

  // ── Trend Line Drawing ───────────────────────────────────────────
  const { lines, drawingMode, pendingP1, toggleDrawingMode, handleClick, removeLine, clearLines } = useLineDrawing()
  const GRID_UNITS = [nmMode === 'percent' ? '%' : 'cts', 'ratio', 'cts', 'cGy/day', 'nT', 'nT', 'km/s', 'pfu', 'W/m²']

  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [customBaseStart, setCustomBaseStart] = useState<string>('')
  const [customBaseEnd, setCustomBaseEnd] = useState<string>('')

  // Data states
  const [psnmData, setPsnmData] = useState<any[]>([])
  const [mawData, setMawData] = useState<any[]>([])
  const [craterData, setCraterData] = useState<any[]>([])
  const [magData, setMagData] = useState<any[]>([])
  const [swepamData, setSwepamData] = useState<any[]>([])
  const [protonRaw, setProtonRaw] = useState<any[]>([])
  const [xrayData, setXrayData] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined

      const [psnm, maw, crater, mag, swepam, proton, xray] = await Promise.all([
        loadPsnmData(limit, sDate, eDate),
        loadMawData(limit, sDate, eDate),
        loadCrater(limit, sDate, eDate),
        loadMag(limit, sDate, eDate),
        loadSwepam(limit, sDate, eDate),
        loadProton(limit, sDate, eDate),
        loadXray(limit, sDate, eDate),
      ])

      setPsnmData(Array.isArray(psnm) ? psnm : [])
      setMawData(Array.isArray(maw) ? maw : [])
      setCraterData(Array.isArray(crater) ? crater : [])
      setMagData(Array.isArray(mag) ? mag : [])
      setSwepamData(Array.isArray(swepam) ? swepam : [])
      setProtonRaw(Array.isArray(proton) ? proton : [])
      setXrayData(Array.isArray(xray) ? xray : [])
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to load cosmic-helio analysis data', e)
    } finally {
      setLoading(false)
    }
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data: magData,
    setData: setMagData,
    loadHistorical: async (start, end) => {
      const [olderPsnm, olderMaw, olderCrater, olderMag, olderSwepam, olderProton, olderXray] = await Promise.all([
        loadPsnmData(0, start, end),
        loadMawData(0, start, end),
        loadCrater(0, start, end),
        loadMag(0, start, end),
        loadSwepam(0, start, end),
        loadProton(0, start, end),
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

      if (olderPsnm?.length) setPsnmData(prev => merge(prev, olderPsnm))
      if (olderMaw?.length) setMawData(prev => merge(prev, olderMaw))
      if (olderCrater?.length) setCraterData(prev => merge(prev, olderCrater))
      if (olderSwepam?.length) setSwepamData(prev => merge(prev, olderSwepam))
      if (olderProton?.length) setProtonRaw(prev => merge(prev, olderProton))
      if (olderXray?.length) setXrayData(prev => merge(prev, olderXray))

      return olderMag.length ? olderMag
        : olderSwepam.length ? olderSwepam
          : olderProton.length ? olderProton
            : olderXray.length ? olderXray
              : olderPsnm.length ? olderPsnm
                : olderMaw.length ? olderMaw
                  : olderCrater
    },
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    load()
  }, [limit, appliedRange])

  // Process GOES Integral Protons
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

  // ── Export Configuration ──────────────────────────────────────────
  const exportColumns = useMemo<ExportColumn[]>(() => [
    { key: 'time_tag', label: 'Time (UTC)', width: 22 },
    {
      key: 'psnm_nm',
      label: nmMode === 'percent' ? 'PSNM NM (ΔN/N₀ %)' : 'PSNM NM (cts)',
      width: 18,
      format: (v) => v != null ? (nmMode === 'percent' ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2)}%` : Number(v).toFixed(1)) : 'N/A'
    },
    {
      key: 'maw_nm',
      label: nmMode === 'percent' ? 'Mawson NM (ΔN/N₀ %)' : 'Mawson NM (cts)',
      width: 18,
      format: (v) => v != null ? (nmMode === 'percent' ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2)}%` : Number(v).toFixed(1)) : 'N/A'
    },
    { key: 'psnm_b_nm', label: 'PSNM B/NM', width: 16, format: (v) => v != null ? Number(v).toFixed(4) : 'N/A' },
    { key: 'maw_b_nm', label: 'Mawson B/NM', width: 16, format: (v) => v != null ? Number(v).toFixed(4) : 'N/A' },
    { key: 'psnm_leader', label: 'PSNM Leader (cts)', width: 16, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
    { key: 'maw_leader', label: 'Mawson Leader (cts)', width: 16, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
    { key: 'crater_d12', label: 'CRaTER D12 (cGy/d)', width: 18, format: (v) => v != null ? Number(v).toFixed(4) : 'N/A' },
    { key: 'crater_d34', label: 'CRaTER D34 (cGy/d)', width: 18, format: (v) => v != null ? Number(v).toFixed(4) : 'N/A' },
    { key: 'crater_d56', label: 'CRaTER D56 (cGy/d)', width: 18, format: (v) => v != null ? Number(v).toFixed(4) : 'N/A' },
    { key: 'mag_bt', label: 'ACE Bt (nT)', width: 14, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'mag_bz', label: 'ACE Bz (nT)', width: 14, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'mag_bx_minus_by', label: 'ACE Bx-By (nT)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'sw_speed', label: 'SW Speed (km/s)', width: 16, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
    { key: 'p_10', label: 'Proton >=10MeV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'p_50', label: 'Proton >=50MeV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'p_100', label: 'Proton >=100MeV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'xrs_short', label: 'GOES XRS-A (W/m²)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
    { key: 'xrs_long', label: 'GOES XRS-B (W/m²)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
  ], [nmMode])

  // ── Calculate Shared Time Range ──────────────────────────────────
  const sharedTimeRange = useMemo(() => {
    if (appliedRange?.startDate && appliedRange?.endDate) {
      const min = new Date(appliedRange.startDate).getTime()
      // Include the entire end day (until 23:59:59.999 UTC)
      const max = new Date(appliedRange.endDate).getTime() + 24 * 60 * 60 * 1000 - 1
      if (!isNaN(min) && !isNaN(max)) return { min, max }
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

    checkMax(psnmData)
    checkMax(mawData)
    checkMax(craterData)
    checkMax(magData)
    checkMax(swepamData)
    checkMax(protonPivoted)
    checkMax(xrayData)

    if (globalMaxTs === -Infinity) return { min: undefined, max: undefined }

    const windowMs = (limit || 1440) * 60 * 1000
    const minTs = globalMaxTs - windowMs
    return { min: minTs, max: globalMaxTs }
  }, [psnmData, mawData, craterData, magData, swepamData, protonPivoted, xrayData, limit, appliedRange])

  const defaultStart = appliedRange?.startDate || (psnmData[0]?.time_tag ? psnmData[0].time_tag.substring(0, 10) : '2026-01-15')
  const defaultEnd = appliedRange?.endDate || (psnmData[psnmData.length - 1]?.time_tag ? psnmData[psnmData.length - 1].time_tag.substring(0, 10) : '2026-01-31')

  // Calculate Quiet / Baseline Means for NM Standard (0% Relative Variation Reference)
  // strictly over the custom chosen baseline dates or the entire selected time range
  const psnmBaseline = useMemo(() => {
    if (!psnmData.length) return null
    let minTs: number
    let maxTs: number

    if (customBaseStart) {
      const eDate = customBaseEnd || customBaseStart
      minTs = new Date(`${customBaseStart}T00:00:00Z`).getTime()
      maxTs = new Date(`${eDate}T23:59:59.999Z`).getTime()
    } else {
      minTs = sharedTimeRange?.min ?? -Infinity
      maxTs = sharedTimeRange?.max ?? Infinity
    }

    const valid = psnmData
      .filter(d => {
        if (!d || d.nm_corrected == null || d.nm_corrected <= 0) return false
        const t = new Date(d.time_tag).getTime()
        return !isNaN(t) && t >= minTs && t <= maxTs
      })
      .map(d => d.nm_corrected)

    if (!valid.length) return null
    return valid.reduce((a, b) => a + b, 0) / valid.length
  }, [psnmData, sharedTimeRange, customBaseStart, customBaseEnd])

  const mawBaseline = useMemo(() => {
    if (!mawData.length) return null
    let minTs: number
    let maxTs: number

    if (customBaseStart) {
      const eDate = customBaseEnd || customBaseStart
      minTs = new Date(`${customBaseStart}T00:00:00Z`).getTime()
      maxTs = new Date(`${eDate}T23:59:59.999Z`).getTime()
    } else {
      minTs = sharedTimeRange?.min ?? -Infinity
      maxTs = sharedTimeRange?.max ?? Infinity
    }

    const valid = mawData
      .filter(d => {
        if (!d || d.nm_corrected == null || d.nm_corrected <= 0) return false
        const t = new Date(d.time_tag).getTime()
        return !isNaN(t) && t >= minTs && t <= maxTs
      })
      .map(d => d.nm_corrected)

    if (!valid.length) return null
    return valid.reduce((a, b) => a + b, 0) / valid.length
  }, [mawData, sharedTimeRange, customBaseStart, customBaseEnd])

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

    psnmData.forEach(d => {
      const r = getRow(d.time_tag)
      if (nmMode === 'percent' && psnmBaseline && d.nm_corrected > 0) {
        r.psnm_nm = +(((d.nm_corrected - psnmBaseline) / psnmBaseline) * 100).toFixed(2)
      } else {
        r.psnm_nm = d.nm_corrected
      }
      r.psnm_b_nm = (d.bare_corrected > 0 && d.nm_corrected > 0) ? +(d.bare_corrected / d.nm_corrected).toFixed(4) : null
      r.psnm_leader = d.leader_cor
    })

    mawData.forEach(d => {
      const r = getRow(d.time_tag)
      if (nmMode === 'percent' && mawBaseline && d.nm_corrected > 0) {
        r.maw_nm = +(((d.nm_corrected - mawBaseline) / mawBaseline) * 100).toFixed(2)
      } else {
        r.maw_nm = d.nm_corrected
      }
      r.maw_b_nm = (d.bare_corrected > 0 && d.nm_corrected > 0) ? +(d.bare_corrected / d.nm_corrected).toFixed(4) : null
      r.maw_leader = d.leader_cor
    })

    craterData.forEach(d => {
      const r = getRow(d.time_tag)
      r.crater_d12 = d.d12
      r.crater_d34 = d.d34
      r.crater_d56 = d.d56
    })

    magData.forEach(d => {
      const r = getRow(d.time_tag)
      r.mag_bt = d.bt
      r.mag_bz = d.bz
      if (d.bx != null && d.by != null) {
        r.mag_bx_minus_by = +(d.bx - d.by).toFixed(3)
      }
    })

    swepamData.forEach(d => {
      const r = getRow(d.time_tag)
      r.sw_speed = d.bulk_speed
    })

    protonPivoted.forEach((d: any) => {
      const r = getRow(d.time_tag)
      if (d['>=10 MeV'] != null) r.p_10 = d['>=10 MeV']
      if (d['>=50 MeV'] != null) r.p_50 = d['>=50 MeV']
      if (d['>=100 MeV'] != null) r.p_100 = d['>=100 MeV']
    })

    xrayData.forEach(d => {
      const r = getRow(d.time_tag)
      r.xrs_long = d.flux_long
      r.xrs_short = d.flux_short
    })

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime()
    )
  }, [psnmData, mawData, craterData, magData, swepamData, protonPivoted, xrayData, nmMode, psnmBaseline, mawBaseline])

  const exportMetadata = useMemo(() => ({
    station: 'COSMIC & HELIOSPHERE // 9-TIER TELEMETRY',
    viewTitle: 'Cosmic Rays & Heliosphere Synchronized Telemetry',
    description: 'Multi-station & deep space observation: PSNM & Mawson Neutron Monitors (Standard, Bare, Leader), LRO CRaTER Lunar Radiation, ACE IMF (Bt, Bz, Bx-By), Solar Wind Speed, GOES Protons, and GOES X-Rays.',
    timeRangeText: appliedRange ? `${appliedRange.startDate} to ${appliedRange.endDate}` : `${limit === 1440 ? '24 Hours' : limit === 4320 ? '3 Days' : '7 Days'} (Recent)`,
    totalRecords: exportData.length
  }), [appliedRange, limit, exportData.length])

  // Midnight day divider timestamps
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

  // 9 Grids Layout matching StandardOverview exact proportions:
  const GRIDS = [
    { top: 40,   left: 95, right: 85, height: 125 }, // 0: Standard NM (PSNM vs Mawson)
    { top: 200,  left: 95, right: 85, height: 125 }, // 1: Bare (PSNM vs Mawson)
    { top: 360,  left: 95, right: 85, height: 125 }, // 2: Leader (PSNM vs Mawson)
    { top: 520,  left: 95, right: 85, height: 125 }, // 3: CRaTER Dose Rates
    { top: 680,  left: 95, right: 85, height: 120 }, // 4: ACE IMF Bt & Bz
    { top: 835,  left: 95, right: 85, height: 120 }, // 5: ACE IMF Bx - By
    { top: 990,  left: 95, right: 85, height: 120 }, // 6: ACE SW Speed
    { top: 1145, left: 95, right: 85, height: 130 }, // 7: GOES Integral Proton Flux
    { top: 1310, left: 95, right: 85, height: 130 }, // 8: GOES X-ray Flux
  ]

  const axisLabelStyle = { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'monospace, sans-serif', fontWeight: 600 }
  const splitLineStyle = { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' as const } }

  const buildCombinedMarkLines = (gi: number) => {
    const userLines = buildMarkLines(lines, gi)
    const userData = userLines?.data || []

    const dividerLines = midnightTimestamps.map(ts => ({
      xAxis: ts,
      lineStyle: {
        color: isLight ? 'rgba(2, 132, 199, 0.3)' : 'rgba(56, 189, 248, 0.25)',
        width: 1,
        type: 'solid' as const,
      },
      label: { show: false },
    }))

    const allData: any[] = [...dividerLines, ...userData]

    // Horizontal Zero Baseline line for NM Variation (gi=0)
    if (gi === 0 && nmMode === 'percent') {
      allData.push({
        yAxis: 0,
        lineStyle: {
          color: isLight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.5)',
          type: 'dashed' as const,
          width: 1.5
        },
        label: {
          show: true,
          formatter: '0% Baseline',
          position: 'insideEndTop' as const,
          color: isLight ? '#64748B' : '#94A3B8',
          fontSize: 10,
          fontFamily: 'monospace'
        }
      })
    }

    // Horizontal Zero line for Bz (gi=4) and Bx-By (gi=5)
    if (gi === 4 || gi === 5) {
      allData.push({
        yAxis: 0,
        lineStyle: { color: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)', type: 'dashed' },
        label: { show: false }
      })
    }

    // NOAA Flare Classification Lines for X-Ray (gi=8)
    if (gi === 8) {
      allData.push(
        { yAxis: 1e-7, lineStyle: { color: 'rgba(96, 165, 250, 0.35)', type: 'dashed' }, label: { show: false } },
        { yAxis: 1e-6, lineStyle: { color: 'rgba(56, 189, 248, 0.4)', type: 'dashed' }, label: { show: false } },
        { yAxis: 1e-5, lineStyle: { color: 'rgba(251, 191, 36, 0.5)', type: 'dashed' }, label: { show: false } },
        { yAxis: 1e-4, lineStyle: { color: 'rgba(239, 68, 68, 0.6)', type: 'dashed' }, label: { show: false } }
      )
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
        }
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

  // 1:1 match with StandardOverview yAxisBase styling
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

  // ── ECharts Option Memo (1:1 with StandardOverview design) ──────────
  const option = useMemo(() => {
    return {
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
          if (!params || params.length === 0) return ''

          let hoverTs: number | null = null
          for (let i = 0; i < params.length; i++) {
            const p = params[i]
            if (p && p.axisValue) {
              const t = typeof p.axisValue === 'number' ? p.axisValue : new Date(p.axisValue).getTime()
              if (!isNaN(t)) {
                hoverTs = t
                break
              }
            }
          }
          if (hoverTs === null && params[0]) {
            const raw = params[0].value ? (Array.isArray(params[0].value) ? params[0].value[0] : params[0].value) : ''
            const t = new Date(raw).getTime()
            if (!isNaN(t)) hoverTs = t
          }

          const timeStr = hoverTs ? formatUTCTime(hoverTs, true) : ''

          const groups: Record<string, { label: string; color: string; items: any[] }> = {
            nm: { label: 'NM STANDARD (PSNM & MAWSON)', color: '#818CF8', items: [] },
            bare: { label: 'B/NM RATIO (PSNM & MAWSON)', color: '#34D399', items: [] },
            leader: { label: 'LEADER COUNTER (PSNM & MAWSON)', color: '#A78BFA', items: [] },
            crater: { label: 'CRaTER LUNAR DOSE RATES', color: '#F472B6', items: [] },
            imf_tz: { label: 'IMF Bt & Bz (ACE)', color: '#60A5FA', items: [] },
            imf_diff: { label: 'IMF Bx - By (ACE)', color: '#10B981', items: [] },
            sw_speed: { label: 'SOLAR WIND SPEED', color: '#F59E0B', items: [] },
            proton: { label: 'PROTON FLUX INTEGRAL', color: '#FBBF24', items: [] },
            xray: { label: 'X-RAY FLUX (GOES)', color: '#38BDF8', items: [] },
          }

          params.forEach((p: any) => {
            if (!p) return
            const name = p.seriesName
            const val = Array.isArray(p.value) ? p.value[1] : p.value
            if (val === undefined || val === null) return

            const ptTime = Array.isArray(p.value) && p.value[0] ? new Date(p.value[0]).getTime() : null
            if (hoverTs !== null && ptTime !== null && !isNaN(ptTime)) {
              if (Math.abs(ptTime - hoverTs) > 10 * 60 * 1000) {
                return
              }
            }

            const itemInfo = { name, value: val, color: p.color }

            if (name.includes('PSNM NM') || name.includes('Mawson NM')) {
              groups.nm.items.push(itemInfo)
            } else if (name.includes('PSNM B/NM') || name.includes('Mawson B/NM')) {
              groups.bare.items.push(itemInfo)
            } else if (name.includes('PSNM Leader') || name.includes('Mawson Leader')) {
              groups.leader.items.push(itemInfo)
            } else if (name.includes('CRaTER')) {
              groups.crater.items.push(itemInfo)
            } else if (name === 'Bt' || name === 'Bz') {
              groups.imf_tz.items.push(itemInfo)
            } else if (name === 'Bx - By') {
              groups.imf_diff.items.push(itemInfo)
            } else if (name === 'SW Speed') {
              groups.sw_speed.items.push(itemInfo)
            } else if (name.startsWith('>=') || name.includes('MeV')) {
              groups.proton.items.push(itemInfo)
            } else if (name.includes('Å') || name.includes('XRS')) {
              groups.xray.items.push(itemInfo)
            }
          })

          let html = `<div style="font-family: var(--font-mono); font-size: 14px; min-width: 250px;">`
          html += `<div style="color: #94A3B8; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px;">`
          html += `⏱ ${timeStr}</div>`

          Object.values(groups).forEach(g => {
            if (g.items.length === 0) return
            html += `<div style="color: ${g.color}; font-weight: 700; margin-top: 8px; margin-bottom: 4px; font-size: 13px; letter-spacing: 0.8px; display: flex; align-items: center; gap: 4px;">`
            html += `<span style="display:inline-block; width:8px; height:8px; background:${g.color}; border-radius:2px;"></span>${g.label}</div>`

            g.items.forEach(it => {
              let fVal = typeof it.value === 'number' ? it.value.toFixed(1) : it.value
              if (g.label.includes('NM STANDARD') && nmMode === 'percent') {
                const num = Number(it.value)
                fVal = `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
              } else if (g.label.includes('B/NM')) {
                fVal = Number(it.value).toFixed(4)
              } else if (g.label.includes('LEADER')) {
                fVal = Number(it.value).toFixed(3)
              } else if (g.label.includes('X-RAY') || g.label.includes('PROTON')) {
                fVal = Number(it.value).toExponential(3)
              } else if (g.label.includes('CRaTER')) {
                fVal = Number(it.value).toFixed(4)
              } else if (g.label.includes('Bt') || g.label.includes('Bx')) {
                fVal = Number(it.value).toFixed(2)
              }

              html += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 2px 4px;">`
              html += `<span style="color:#CBD5E1; font-size:12px;">${it.name}:</span>`
              html += `<span style="color:${it.color}; font-weight:700; margin-left:14px; font-size:13px;">${fVal}</span>`
              html += `</div>`
            })
          })

          html += `</div>`
          return html
        }
      },
      axisPointer: {
        link: [{ xAxisIndex: [0, 1, 2, 3, 4, 5, 6, 7, 8] }],
        snap: false,
      },
      dataZoom: [
        {
          type: 'inside' as const,
          xAxisIndex: [0, 1, 2, 3, 4, 5, 6, 7, 8],
          filterMode: 'none' as const,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
        },
      ],
      // Clean per-tier legends matching StandardOverview
      legend: [
        {
          show: true,
          top: 32,
          right: 80,
          icon: 'roundRect',
          itemGap: 12,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
          data: ['PSNM NM', 'Mawson NM'],
        },
        {
          show: true,
          top: 192,
          right: 80,
          icon: 'roundRect',
          itemGap: 12,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
          data: ['PSNM B/NM', 'Mawson B/NM'],
        },
        {
          show: true,
          top: 352,
          right: 80,
          icon: 'roundRect',
          itemGap: 12,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
          data: ['PSNM Leader', 'Mawson Leader'],
        },
        {
          show: true,
          top: 512,
          right: 80,
          icon: 'roundRect',
          itemGap: 12,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
          data: ['CRaTER D12', 'CRaTER D34', 'CRaTER D56'],
        },
        {
          show: true,
          top: 672,
          right: 80,
          icon: 'roundRect',
          itemGap: 12,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
          data: ['Bt', 'Bz'],
        },
        {
          show: true,
          top: 1137,
          right: 80,
          icon: 'roundRect',
          itemGap: 12,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
          data: energyBands,
        },
        {
          show: true,
          top: 1302,
          right: 80,
          icon: 'roundRect',
          itemGap: 14,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 },
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
        { ...xAxisBase(6, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
        { ...xAxisBase(7, false), min: sharedTimeRange?.min, max: sharedTimeRange?.max },
        { ...xAxisBase(8, true),  min: sharedTimeRange?.min, max: sharedTimeRange?.max },
      ],
      yAxis: [
        {
          ...yAxisBase(0, nmMode === 'percent' ? 'NM Variation (%)' : 'NM Standard (cts)', '#A5B4FC'),
          scale: true,
          axisLabel: {
            ...axisLabelStyle,
            color: isLight ? '#475569' : '#CBD5E1',
            formatter: (val: number) => nmMode === 'percent'
              ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%`
              : val.toLocaleString()
          }
        },
        {
          ...yAxisBase(1, 'B/NM (Ratio)', '#34D399'),
          scale: true,
          axisLabel: {
            ...axisLabelStyle,
            color: isLight ? '#475569' : '#CBD5E1',
            formatter: (val: number) => val.toFixed(3)
          }
        },
        {
          ...yAxisBase(2, 'Leader (cts)', '#A78BFA'),
          min: 0.7,
          max: 0.9,
          interval: 0.05,
          axisLabel: {
            ...axisLabelStyle,
            color: isLight ? '#475569' : '#CBD5E1',
            formatter: (val: number) => val.toFixed(2)
          }
        },
        { ...yAxisBase(3, craterLogScale ? 'CRaTER (Log cGy/d)' : 'CRaTER (cGy/d)', '#F472B6', craterLogScale ? 'log' : 'value'), min: craterLogScale ? 0.005 : 'dataMin', scale: true },
        yAxisBase(4, 'Bt & Bz (nT)', '#93C5FD'),
        yAxisBase(5, 'Bx - By (nT)', '#10B981'),
        { ...yAxisBase(6, 'SW Speed (km/s)', '#6EE7B7'), scale: true },
        yAxisBase(7, 'Proton Flux (pfu)', '#FDE047', 'log'),
        { ...yAxisBase(8, 'X-Ray Flux (W/m²)', '#38BDF8', 'log'), min: 1e-9, max: 1e-2 },
        {
          gridIndex: 8,
          type: 'log',
          position: 'right',
          min: 1e-9,
          max: 1e-2,
          splitLine: { show: false },
          axisLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
          axisTick: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
          axisLabel: {
            show: true,
            margin: 10,
            fontSize: 13,
            fontFamily: 'var(--font-mono), monospace',
            fontWeight: 800,
            formatter: (v: number) => {
              const exp = Math.round(Math.log10(v))
              if (exp === -8) return '{classA|A}'
              if (exp === -7) return '{classB|B}'
              if (exp === -6) return '{classC|C}'
              if (exp === -5) return '{classM|M}'
              if (exp === -4) return '{classX|X}'
              if (exp === -3) return '{classX10|X10}'
              return ''
            },
            rich: {
              classA: { color: isLight ? '#64748B' : '#94A3B8', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)' },
              classB: { color: isLight ? '#2563EB' : '#60A5FA', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)' },
              classC: { color: isLight ? '#0284C7' : '#38BDF8', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)' },
              classM: { color: isLight ? '#D97706' : '#FBBF24', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)' },
              classX: { color: isLight ? '#DC2626' : '#EF4444', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)' },
              classX10: { color: isLight ? '#991B1B' : '#F87171', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)' },
            }
          }
        },
      ],
      series: [
        // ── Grid 0: Standard NM (PSNM vs Mawson) ───────────────────
        {
          name: 'PSNM NM',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          lineStyle: { width: 2, color: '#38BDF8' },
          itemStyle: { color: '#38BDF8' },
          data: psnmData.map(d => {
            if (d.nm_corrected == null || d.nm_corrected <= 0) return [d.time_tag, null]
            if (nmMode === 'percent') {
              if (!psnmBaseline) return [d.time_tag, null]
              const pct = ((d.nm_corrected - psnmBaseline) / psnmBaseline) * 100
              return [d.time_tag, Number(pct.toFixed(2))]
            }
            return [d.time_tag, d.nm_corrected]
          }),
          markLine: buildCombinedMarkLines(0),
        },
        {
          name: 'Mawson NM',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          lineStyle: { width: 2, color: '#F59E0B' },
          itemStyle: { color: '#F59E0B' },
          data: mawData.map(d => {
            if (d.nm_corrected == null || d.nm_corrected <= 0) return [d.time_tag, null]
            if (nmMode === 'percent') {
              if (!mawBaseline) return [d.time_tag, null]
              const pct = ((d.nm_corrected - mawBaseline) / mawBaseline) * 100
              return [d.time_tag, Number(pct.toFixed(2))]
            }
            return [d.time_tag, d.nm_corrected]
          }),
        },

        // ── Grid 1: B/NM Ratio (PSNM vs Mawson) ────────────────────
        {
          name: 'PSNM B/NM',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          lineStyle: { width: 2, color: '#34D399' },
          itemStyle: { color: '#34D399' },
          data: psnmData.map(d => {
            if (d.bare_corrected == null || d.nm_corrected == null || d.bare_corrected <= 0 || d.nm_corrected <= 0) {
              return [d.time_tag, null]
            }
            return [d.time_tag, Number((d.bare_corrected / d.nm_corrected).toFixed(4))]
          }),
          markLine: buildCombinedMarkLines(1),
        },
        {
          name: 'Mawson B/NM',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          lineStyle: { width: 2, color: '#EC4899' },
          itemStyle: { color: '#EC4899' },
          data: mawData.map(d => {
            if (d.bare_corrected == null || d.nm_corrected == null || d.bare_corrected <= 0 || d.nm_corrected <= 0) {
              return [d.time_tag, null]
            }
            return [d.time_tag, Number((d.bare_corrected / d.nm_corrected).toFixed(4))]
          }),
        },

        // ── Grid 2: Leader (PSNM vs Mawson) ────────────────────────
        {
          name: 'PSNM Leader',
          type: 'line',
          xAxisIndex: 2,
          yAxisIndex: 2,
          showSymbol: false,
          lineStyle: { width: 2, color: '#A78BFA' },
          itemStyle: { color: '#A78BFA' },
          data: psnmData.map(d => [d.time_tag, d.leader_cor]),
          markLine: buildCombinedMarkLines(2),
        },
        {
          name: 'Mawson Leader',
          type: 'line',
          xAxisIndex: 2,
          yAxisIndex: 2,
          showSymbol: false,
          lineStyle: { width: 2, color: '#F97316' },
          itemStyle: { color: '#F97316' },
          data: mawData.map(d => [d.time_tag, d.leader_cor]),
        },

        // ── Grid 3: CRaTER Dose Rates (D12, D34, D56) ──────────────
        {
          name: 'CRaTER D12',
          type: 'line',
          xAxisIndex: 3,
          yAxisIndex: 3,
          showSymbol: false,
          lineStyle: { width: 1.8, color: '#38BDF8' },
          itemStyle: { color: '#38BDF8' },
          data: craterData.map(d => [d.time_tag, craterLogScale ? safeLog(d.d12) : d.d12]),
          markLine: buildCombinedMarkLines(3),
        },
        {
          name: 'CRaTER D34',
          type: 'line',
          xAxisIndex: 3,
          yAxisIndex: 3,
          showSymbol: false,
          lineStyle: { width: 1.8, color: '#F472B6' },
          itemStyle: { color: '#F472B6' },
          data: craterData.map(d => [d.time_tag, craterLogScale ? safeLog(d.d34) : d.d34]),
        },
        {
          name: 'CRaTER D56',
          type: 'line',
          xAxisIndex: 3,
          yAxisIndex: 3,
          showSymbol: false,
          lineStyle: { width: 1.8, color: '#FBBF24' },
          itemStyle: { color: '#FBBF24' },
          data: craterData.map(d => [d.time_tag, craterLogScale ? safeLog(d.d56) : d.d56]),
        },

        // ── Grid 4: ACE IMF Bt & Bz ────────────────────────────────
        {
          name: 'Bt',
          type: 'line',
          xAxisIndex: 4,
          yAxisIndex: 4,
          showSymbol: false,
          lineStyle: { width: 2, color: '#C084FC' },
          itemStyle: { color: '#C084FC' },
          data: magData.map(d => [d.time_tag, d.bt]),
          markLine: buildCombinedMarkLines(4),
        },
        {
          name: 'Bz',
          type: 'line',
          xAxisIndex: 4,
          yAxisIndex: 4,
          showSymbol: false,
          lineStyle: { width: 2.2, color: '#38BDF8' },
          itemStyle: { color: '#38BDF8' },
          data: magData.map(d => [d.time_tag, d.bz]),
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
        },

        // ── Grid 5: ACE IMF Bx - By ────────────────────────────────
        {
          name: 'Bx - By',
          type: 'line',
          xAxisIndex: 5,
          yAxisIndex: 5,
          showSymbol: false,
          lineStyle: { width: 2, color: '#10B981' },
          itemStyle: { color: '#10B981' },
          data: magData.filter(d => d.bx != null && d.by != null).map(d => [d.time_tag, +(d.bx - d.by).toFixed(3)]),
          markLine: buildCombinedMarkLines(5),
        },

        // ── Grid 6: ACE SW Speed ───────────────────────────────────
        {
          name: 'SW Speed',
          type: 'line',
          xAxisIndex: 6,
          yAxisIndex: 6,
          showSymbol: false,
          lineStyle: { width: 2, color: '#6EE7B7' },
          itemStyle: { color: '#6EE7B7' },
          data: swepamData.map(d => [d.time_tag, d.bulk_speed]),
          markLine: buildCombinedMarkLines(6),
        },

        // ── Grid 7: GOES Integral Proton Flux ──────────────────────
        ...energyBands.map((band, idx) => ({
          name: band,
          type: 'line',
          xAxisIndex: 7,
          yAxisIndex: 7,
          showSymbol: false,
          lineStyle: { width: 1.4, color: PROTON_COLORS[band] || '#CBD5E1' },
          itemStyle: { color: PROTON_COLORS[band] || '#CBD5E1' },
          data: protonPivoted.map((d: any) => [d.time_tag, safeLog(d[band])]),
          markLine: idx === 0 ? buildCombinedMarkLines(7) : undefined,
        })),

        // ── Grid 8: GOES X-ray Flux ────────────────────────────────
        {
          name: '1-8 Å (Long)',
          type: 'line',
          xAxisIndex: 8,
          yAxisIndex: 8,
          showSymbol: false,
          lineStyle: { width: 1.4, color: '#EF4444' },
          itemStyle: { color: '#EF4444' },
          data: xrayData.map(d => [d.time_tag, safeLog(d.flux_long)]),
          markLine: buildCombinedMarkLines(8),
        },
        {
          name: '0.5-4 Å (Short)',
          type: 'line',
          xAxisIndex: 8,
          yAxisIndex: 8,
          showSymbol: false,
          lineStyle: { width: 1.4, color: '#38BDF8' },
          itemStyle: { color: '#38BDF8' },
          data: xrayData.map(d => [d.time_tag, safeLog(d.flux_short)]),
        },
      ]
    }
  }, [
    isLight,
    psnmData,
    mawData,
    craterData,
    magData,
    swepamData,
    protonPivoted,
    energyBands,
    xrayData,
    sharedTimeRange,
    midnightTimestamps,
    lines,
    craterLogScale,
    nmMode,
    psnmBaseline,
    mawBaseline,
    customBaseStart,
    customBaseEnd,
    limit,
    appliedRange,
  ])

  // Explicitly push option updates to the ECharts instance to guarantee instant redraw on mode/option change
  useEffect(() => {
    if (chartRef.current) {
      const inst = chartRef.current.getEchartsInstance?.()
      if (inst && option) {
        inst.setOption(option, true)
      }
    }
  }, [option, nmMode])

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Content area with fluid wide layout matching StandardOverview exactly */}
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

        {/* Seamless Header (1:1 with StandardOverview) */}
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
              COSMIC & HELIOSPHERIC TELEMETRY
            </h1>
            <p style={{ color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
              Synchronized 9-Tier Analytics: PSNM & Mawson (NM, Bare, Leader) · CRaTER Lunar Dose · ACE IMF (Bt, Bz, Bx-By) · SW Speed · Protons · X-Ray
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {panLoading && (
              <span style={{ fontSize: 14, color: '#818CF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            )}

            {/* Trend Line Toolbar */}
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
            <StatusBadge status={mawData.length > 0 || magData.length > 0 ? 'normal' : (loading ? 'info' : 'offline')} />
          </div>
        </div>

        {/* Row 2 Toolbar: DateRangeToolbar, NM Mode Toggle, CRaTER Toggle, FULLSCREEN & Export */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap'
        }}>
          {/* NM Mode Toggle button */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
            border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 4,
            overflow: 'hidden',
            fontFamily: 'var(--font-mono)',
            fontSize: 12
          }}>
            <span style={{ padding: '4px 8px', color: isLight ? '#64748B' : '#94A3B8', fontWeight: 600 }}>NM Mode:</span>
            <button
              onClick={() => setNmMode('percent')}
              style={{
                padding: '4px 8px',
                background: nmMode === 'percent' ? (isLight ? '#4F46E5' : '#818CF8') : 'transparent',
                color: nmMode === 'percent' ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                cursor: 'pointer',
                fontWeight: nmMode === 'percent' ? 700 : 500
              }}
            >
              ΔN/N₀ (%)
            </button>
            <button
              onClick={() => setNmMode('rate')}
              style={{
                padding: '4px 8px',
                background: nmMode === 'rate' ? (isLight ? '#4F46E5' : '#818CF8') : 'transparent',
                color: nmMode === 'rate' ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                cursor: 'pointer',
                fontWeight: nmMode === 'rate' ? 700 : 500
              }}
            >
              CTS
            </button>
          </div>

          {/* Baseline Picker matching Custom DateRangeToolbar (DualMonthDatePicker) */}
          {nmMode === 'percent' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <DualMonthDatePicker
                startDate={customBaseStart || defaultStart}
                endDate={customBaseEnd || defaultEnd}
                onApply={(s, e) => {
                  setCustomBaseStart(s)
                  setCustomBaseEnd(e)
                }}
                accentColor={isLight ? '#4F46E5' : '#818CF8'}
                applyText="BASE"
                compact={true}
                placeholder="DD/MM/YYYY - DD/MM/YYYY"
              />

              {(customBaseStart || customBaseEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomBaseStart('')
                    setCustomBaseEnd('')
                  }}
                  title="รีเซ็ตกลับเป็นค่าเฉลี่ยทั้งช่วงเวลาที่เลือกดู (Reset to Entire Window Average)"
                  style={{
                    padding: '5px 10px',
                    background: isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.2)',
                    border: isLight ? '1px solid #FECACA' : '1px solid rgba(239, 68, 68, 0.35)',
                    color: isLight ? '#DC2626' : '#F87171',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  RESET / ALL
                </button>
              )}

              {psnmBaseline && mawBaseline && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                  border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ color: isLight ? '#64748B' : '#94A3B8', fontWeight: 600 }}>
                    {customBaseStart ? 'Custom Base:' : 'Window Avg:'}
                  </span>
                  <span style={{ color: '#38BDF8', fontWeight: 700 }}>PSNM {psnmBaseline.toFixed(0)}</span>
                  <span style={{ color: isLight ? '#CBD5E1' : '#475569' }}>|</span>
                  <span style={{ color: '#F59E0B', fontWeight: 700 }}>Mawson {mawBaseline.toFixed(0)} cts</span>
                </div>
              )}
            </div>
          )}

          {/* CRaTER Scale Toggle button */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
            border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 4,
            overflow: 'hidden',
            fontFamily: 'var(--font-mono)',
            fontSize: 12
          }}>
            <span style={{ padding: '4px 8px', color: isLight ? '#64748B' : '#94A3B8', fontWeight: 600 }}>CRaTER:</span>
            <button
              onClick={() => setCraterLogScale(true)}
              style={{
                padding: '4px 8px',
                background: craterLogScale ? (isLight ? '#4F46E5' : '#818CF8') : 'transparent',
                color: craterLogScale ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                cursor: 'pointer',
                fontWeight: craterLogScale ? 700 : 500
              }}
            >
              LOG
            </button>
            <button
              onClick={() => setCraterLogScale(false)}
              style={{
                padding: '4px 8px',
                background: !craterLogScale ? (isLight ? '#4F46E5' : '#818CF8') : 'transparent',
                color: !craterLogScale ? '#FFFFFF' : (isLight ? '#475569' : '#94A3B8'),
                border: 'none',
                cursor: 'pointer',
                fontWeight: !craterLogScale ? 700 : 500
              }}
            >
              LIN
            </button>
          </div>

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
          >
            {isOverviewFs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isOverviewFs ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
          </button>

          <ExportChartMenu
            chartRef={chartRef}
            data={exportData}
            columns={exportColumns}
            metadata={exportMetadata}
            filenameBase={`cosmic_helio_overview_${appliedRange ? `${appliedRange.startDate}_${appliedRange.endDate}` : `${limit}m`}`}
            accentColor={isLight ? '#4F46E5' : '#818CF8'}
          />
        </div>

        {/* Translucent & Delicate Chart Canvas Plate (1:1 with StandardOverview) */}
        {loading && mawData.length === 0 && magData.length === 0 ? (
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
                title="COSMIC & HELIOSPHERIC TELEMETRY // 9-TIER SYNCHRONIZED"
                subtitle="Synchronized: PSNM & Mawson NM, Bare, Leader · CRaTER LRO · ACE IMF Bt, Bz, Bx-By · SW Speed · GOES Protons & X-Ray"
                accentColor="#818CF8"
              >
                <div style={{ width: '100%', minHeight: 1480, position: 'relative', paddingRight: 6 }}>
                  <ReactECharts
                    key={`fs-${nmMode}`}
                    ref={chartRef}
                    option={option}
                    style={{ height: 1480, width: '100%' }}
                    notMerge={true}
                    lazyUpdate={false}
                    onChartReady={onChartReady}
                    onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
                  />
                  <TrendLineOverlay
                    chartRef={chartRef}
                    wrapperRef={chartWrapperRef}
                    gridCount={9}
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
                  key={`chart-${nmMode}`}
                  ref={chartRef}
                  option={option}
                  style={{ height: 1480, width: '100%' }}
                  notMerge={true}
                  lazyUpdate={false}
                  onChartReady={onChartReady}
                  onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
                />

                <TrendLineOverlay
                  chartRef={chartRef}
                  wrapperRef={chartWrapperRef}
                  gridCount={9}
                  gridUnits={GRID_UNITS}
                  lines={lines}
                  drawingMode={drawingMode}
                  pendingP1={pendingP1}
                  onChartClick={handleClick}
                  onRemoveLine={removeLine}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
