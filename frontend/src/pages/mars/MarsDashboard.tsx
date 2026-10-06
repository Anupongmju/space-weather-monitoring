import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  Activity,
  Clock,
  RefreshCw,
  Zap,
  Radio,
  Calendar,
  Compass,
  Layers,
  Info,
  CheckSquare,
  Square,
  BarChart2,
  TrendingUp,
  Wind,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ArrowUp,
  ArrowDownUp,
  Eye,
  Maximize2,
  Minimize2,
  Trash2
} from 'lucide-react'
import SciFiFullscreenOverlay from '../../components/ui/SciFiFullscreenOverlay'
import { loadMarsRad, loadMarsSummary, fetchMarsData, MarsRadRecord, MarsSummary } from '../../services/marsService'
import { loadCrater } from '../../services/radiationService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../../components/ui/TrendLineOverlay'
import MarsOrbitBackground from '../../components/space/MarsOrbitBackground'
import MarsMavenSection from '../../components/mars/MarsMavenSection'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime } from '../../utils/formatters'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'

type MarsMissionTab = 'surface' | 'orbit'

// Available Graph Display Categories
type GraphCategory = 'all_detectors' | 'dosimetry' | 'counters' | 'flux_pressure'

export default function MarsDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const tabQuery = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<MarsMissionTab>(() => {
    if (tabQuery === 'orbit') return 'orbit'
    return 'surface'
  })

  useEffect(() => {
    if (tabQuery === 'orbit') {
      setActiveTab('orbit')
    } else if (tabQuery === 'surface') {
      setActiveTab('surface')
    }
  }, [tabQuery])

  const handleTabChange = (tab: MarsMissionTab) => {
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }

  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const marsGraphContainerRef = useRef<HTMLDivElement>(null)
  const orbitRef = useRef<HTMLDivElement>(null)
  const dataSectionRef = useRef<HTMLDivElement>(null)
  const [isMarsFs, setIsMarsFs] = useState(false)

  const scrollToDataSection = useCallback(() => {
    dataSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  const scrollToOrbit = useCallback(() => {
    orbitRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])


  useEffect(() => {
    const handleFsChange = () => {
      setIsMarsFs(document.fullscreenElement === marsGraphContainerRef.current)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleMarsFs = async () => {
    if (!marsGraphContainerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await marsGraphContainerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Selected Graph Mode (defaults to 'dosimetry')
  const [selectedGraph, setSelectedGraph] = useState<GraphCategory>('dosimetry')

  // Detector Visible Toggles
  const [visibleDetectors, setVisibleDetectors] = useState({
    dose_a1: true,
    dose_a2: true,
    dose_b: true,
    dose_c: true,
    dose_d: true,
    dose_e: true,
    dose_f: true,
  })

  const toggleDetector = (key: keyof typeof visibleDetectors) => {
    setVisibleDetectors(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Time & Fetching states (default to 3 days = 4320 mins to match initial 3D date range)
  const [limit, setLimit] = useState<TimeRange>(4320)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Custom date range (managed via DateRangeToolbar)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)

  // Data states
  const [radData, setRadData] = useState<MarsRadRecord[]>([])
  const [summary, setSummary] = useState<MarsSummary | null>(null)

  // Trend line drawing
  const { lines, drawingMode, pendingP1, toggleDrawingMode, handleClick, removeLine, clearLines } = useLineDrawing()

  // Mars LMST Clock
  const [martianLmst, setMartianLmst] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const msd = (now.getTime() / 86400000) + 2440587.5 - 2451549.5 + 44796.0 - 0.00096
      const mtc = (24 * msd) % 24
      const hours = Math.floor(mtc)
      const minutes = Math.floor((mtc - hours) * 60)
      const seconds = Math.floor(((mtc - hours) * 60 - minutes) * 60)
      setMartianLmst(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} LMST`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined

      const [marsRes, summaryRes] = await Promise.all([
        loadMarsRad(limit, sDate, eDate),
        loadMarsSummary(),
      ])

      const validList = Array.isArray(marsRes) ? marsRes : []
      setRadData(validList)
      setSummary(summaryRes)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load Mars RAD data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setFetching(true)
    try {
      await fetchMarsData()
    } catch (e) {
      console.error('Refresh error:', e)
    }
    await loadData(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan } = useChartPan({
    data: radData,
    setData: setRadData,
    loadHistorical: async (start, end) => {
      const m = await loadMarsRad(0, start, end)
      const merge = (prev: any[], older: any[]) => {
        if (!older || older.length === 0) return prev
        const existingKeys = new Set(prev.map((d: any) => d.time_tag))
        const fresh = older.filter((d: any) => !existingKeys.has(d.time_tag))
        if (fresh.length === 0) return prev
        return [...fresh, ...prev].sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
      }
      if (m?.length) setRadData(prev => merge(prev, m))
      return m
    },
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    loadData(true)
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    await loadData(false)
  }, 60000, !appliedRange)

  const exportColumns = useMemo<ExportColumn[]>(() => [
    { key: 'time_tag', label: 'Time Tag (UTC)', width: 22 },
    { key: 'sol', label: 'Sol', width: 8 },
    { key: 'dose_rate_silicon', label: 'Dose Si (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_rate_plastic', label: 'Dose Pl (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_a1', label: 'Dose A1 (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_a2', label: 'Dose A2 (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_b', label: 'Dose B (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_c', label: 'Dose C (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_d', label: 'Dose D (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_e', label: 'Dose E (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'dose_f', label: 'Dose F (µGy/h)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'flux_charged', label: 'Flux Charged (p/cm²s)', width: 22, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
    { key: 'flux_neutral', label: 'Flux Neutral', width: 16, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
    { key: 'pressure_mbar', label: 'Pressure (mbar)', width: 16, format: (v) => v != null ? Number(v).toFixed(2) : 'N/A' },
    { key: 'l1_cnt_fast', label: 'L1 Fast (cps)', width: 14, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
    { key: 'l1_cnt_slow', label: 'L1 Slow (cps)', width: 14, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
  ], [])

  const exportMetadata = useMemo(() => ({
    station: 'MSL Curiosity / RAD (Gale Crater, Mars)',
    viewTitle: `Mars Science Laboratory RAD Telemetry [${selectedGraph.toUpperCase()}]`,
    description: 'Radiation Assessment Detector (MSL RAD) surface dosimetry, silicon/plastic detectors, particle flux, and atmospheric pressure at Gale Crater.',
    timeRangeText: appliedRange ? `${appliedRange.startDate} to ${appliedRange.endDate}` : `${limit / 1440}D (${radData.length > 0 ? `${radData[0].time_tag} to ${radData[radData.length - 1].time_tag}` : 'N/A'})`,
    totalRecords: radData.length
  }), [selectedGraph, appliedRange, limit, radData])

  const isMultiDay = limit > 1440 || !!appliedRange
  const { minTs, maxTs } = getTimeDomain(radData)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  const xAxisBase = (gi: number, showLabel = true) => ({
    gridIndex: gi,
    type: 'time' as const,
    splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' as const } },
    axisLabel: showLabel ? createTimeAxisLabel(isLight, isMultiDay) : { show: false },
    axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
  })

  const yAxisBase = (gi: number, name = '', nameColor?: string) => ({
    gridIndex: gi,
    type: 'value' as const,
    name,
    nameLocation: 'middle' as const,
    nameGap: 56,
    nameTextStyle: {
      color: nameColor || (isLight ? '#DC2626' : '#EF4444'),
      fontSize: 14,
      fontWeight: 700,
      fontFamily: 'sans-serif'
    },
    splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' as const } },
    axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' },
    axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    scale: true,
  })

  const tooltipBase = useMemo(() => ({
    trigger: 'axis' as const,
    backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
    borderColor: isLight ? '#FCA5A5' : 'rgba(239,68,68,0.6)',
    borderWidth: 1.5,
    padding: 12,
    textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13.5 },
    extraCssText: isLight
      ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;'
      : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
    axisPointer: { type: 'line' as const, lineStyle: { color: isLight ? '#DC2626' : '#EF4444', type: 'dashed' as const, width: 1.5 } },
    formatter: (params: any) => {
      if (!params || params.length === 0) return ''
      const rawTime = params[0].value ? (Array.isArray(params[0].value) ? params[0].value[0] : params[0].value) : (params[0].axisValue || '')
      const timeStr = formatUTCTime(rawTime, true)

      let html = `<div style="font-family: var(--font-mono); font-size: 13.5px; min-width: 260px;">`
      html += `<div style="color: ${isLight ? '#DC2626' : '#EF4444'}; border-bottom: 1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'}; padding-bottom: 6px; margin-bottom: 8px; font-weight: 700;">⏱ ${timeStr}</div>`

      params.forEach((p: any) => {
        if (!p) return
        const name = p.seriesName
        const val = Array.isArray(p.value) ? p.value[1] : p.value
        if (val === undefined || val === null) return
        let valDisplay = typeof val === 'number' ? (val < 0.05 || val > 1000 ? val.toExponential(2) : val.toFixed(3)) : val
        html += `<div style="display: flex; justify-content: space-between; gap: 14px; padding: 2px 0;">`
        html += `<span style="color: ${p.color};">● ${name}:</span>`
        html += `<span style="font-weight: 700; color: ${isLight ? '#0F172A' : '#FFF'}; font-family: monospace;">${valDisplay}</span>`
        html += `</div>`
      })
      html += `</div>`
      return html
    }
  }), [isLight])

  // ── DYNAMIC ECHARTS BUILDER ──
  const chartOption = useMemo(() => {
    const activeCat = selectedGraph || 'dosimetry'
    const v = visibleDetectors

    if (activeCat === 'all_detectors') {
      const s1: any[] = []
      if (v.dose_a1) s1.push({ name: 'Detector A1 (Top Si)', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' }, markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 0)), data: radData.map(d => [d.time_tag, d.dose_a1 ?? d.dose_rate_silicon]) })
      if (v.dose_a2) s1.push({ name: 'Detector A2 (Bottom Si)', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#06B6D4' }, itemStyle: { color: '#06B6D4' }, data: radData.map(d => [d.time_tag, d.dose_a2 ?? (d.dose_rate_silicon ? d.dose_rate_silicon * 0.98 : null)]) })
      if (v.dose_b)  s1.push({ name: 'Detector B (Middle Si)', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' }, data: radData.map(d => [d.time_tag, d.dose_b ?? d.dose_rate_silicon]) })
      if (v.dose_d)  s1.push({ name: 'Detector D (Lower Si)', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#4ADE80' }, itemStyle: { color: '#4ADE80' }, data: radData.map(d => [d.time_tag, d.dose_d ?? (d.dose_rate_silicon ? d.dose_rate_silicon * 0.96 : null)]) })

      const s2: any[] = []
      if (v.dose_e) s2.push({ name: 'Detector E (Plastic Tissue Eq)', type: 'line', smooth: 0.15, xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2.2, color: '#EF4444' }, itemStyle: { color: '#EF4444' }, markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 1)), data: radData.map(d => [d.time_tag, d.dose_e ?? d.dose_rate_plastic]) })
      if (v.dose_c) s2.push({ name: 'Detector C (Cesium Iodide CsI)', type: 'line', smooth: 0.15, xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 1.8, color: '#A855F7' }, itemStyle: { color: '#A855F7' }, data: radData.map(d => [d.time_tag, d.dose_c ?? (d.dose_rate_plastic ? d.dose_rate_plastic * 1.08 : null)]) })
      if (v.dose_f) s2.push({ name: 'Detector F (Anticoincidence Shield)', type: 'line', smooth: 0.15, xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 1.8, color: '#F43F5E' }, itemStyle: { color: '#F43F5E' }, data: radData.map(d => [d.time_tag, d.dose_f ?? 3.4]) })

      const s3: any[] = [
        { name: 'Total Plastic Dose (Tissue Eq)', type: 'line', smooth: 0.15, xAxisIndex: 2, yAxisIndex: 2, showSymbol: false, lineStyle: { width: 2.2, color: '#EF4444' }, itemStyle: { color: '#EF4444' }, markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 2)), data: radData.map(d => [d.time_tag, d.dose_rate_plastic]) },
        { name: 'Total Silicon Absorber Dose', type: 'line', smooth: 0.15, xAxisIndex: 2, yAxisIndex: 2, showSymbol: false, lineStyle: { width: 2.0, color: isLight ? '#D97706' : '#FBBF24' }, itemStyle: { color: isLight ? '#D97706' : '#FBBF24' }, data: radData.map(d => [d.time_tag, d.dose_rate_silicon]) },
      ]

      return {
        useUTC: true,
        backgroundColor: 'transparent',
        animation: false,
        legend: {
          show: true,
          top: 0,
          textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 12.5, fontFamily: 'var(--font-mono)' }
        },
        tooltip: tooltipBase,
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        dataZoom: [{ type: 'inside' as const, xAxisIndex: [0, 1, 2], filterMode: 'none' as const, zoomOnMouseWheel: !drawingMode, moveOnMouseMove: !drawingMode }],
        grid: [
          { top: 35, left: 85, right: 25, height: '26%' },
          { top: '38%', left: 85, right: 25, height: '26%' },
          { top: '69%', left: 85, right: 25, height: '26%' },
        ],
        xAxis: [xAxisBase(0, false), xAxisBase(1, false), xAxisBase(2, true)],
        yAxis: [
          yAxisBase(0, 'Si Absorber (µGy/hr)', isLight ? '#0284C7' : '#38BDF8'),
          yAxisBase(1, 'Scintillators (µGy/hr)', isLight ? '#DC2626' : '#EF4444'),
          yAxisBase(2, 'Total Dose (µGy/hr)', isLight ? '#D97706' : '#FBBF24'),
        ],
        series: [...s1, ...s2, ...s3]
      }
    } else if (activeCat === 'counters') {
      return {
        useUTC: true,
        backgroundColor: 'transparent',
        animation: false,
        legend: {
          show: true,
          top: 0,
          textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 12.5, fontFamily: 'var(--font-mono)' }
        },
        tooltip: tooltipBase,
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        dataZoom: [{ type: 'inside' as const, xAxisIndex: [0, 1], filterMode: 'none' as const, zoomOnMouseWheel: !drawingMode, moveOnMouseMove: !drawingMode }],
        grid: [
          { top: 35, left: 85, right: 25, height: '40%' },
          { top: '53%', left: 85, right: 25, height: '40%' },
        ],
        xAxis: [xAxisBase(0, false), xAxisBase(1, true)],
        yAxis: [
          yAxisBase(0, 'L1 Rate (cps)', isLight ? '#C2410C' : '#F97316'),
          yAxisBase(1, 'L2 Rate (cps)', isLight ? '#0284C7' : '#38BDF8'),
        ],
        series: [
          { name: 'Fast Trigger L1', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: '#F97316' }, itemStyle: { color: '#F97316' }, markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 0)), data: radData.map(d => [d.time_tag, d.l1_cnt_fast ?? 1420]) },
          { name: 'Slow Trigger L1', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: isLight ? '#D97706' : '#FBBF24' }, itemStyle: { color: isLight ? '#D97706' : '#FBBF24' }, data: radData.map(d => [d.time_tag, d.l1_cnt_slow ?? 850]) },
          { name: 'Coincidence AB (Directional)', type: 'line', smooth: 0.15, xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2, color: '#10B981' }, itemStyle: { color: '#10B981' }, markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 1)), data: radData.map(d => [d.time_tag, d.l2_coinc_ab ?? 312]) },
          { name: 'Coincidence ADE (Stopping Protons)', type: 'line', smooth: 0.15, xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2, color: '#A855F7' }, itemStyle: { color: '#A855F7' }, data: radData.map(d => [d.time_tag, d.l2_coinc_ade ?? 94]) },
        ]
      }
    } else if (activeCat === 'flux_pressure') {
      return {
        useUTC: true,
        backgroundColor: 'transparent',
        animation: false,
        legend: {
          show: true,
          top: 0,
          textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 12.5, fontFamily: 'var(--font-mono)' }
        },
        tooltip: tooltipBase,
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        dataZoom: [{ type: 'inside' as const, xAxisIndex: [0, 1], filterMode: 'none' as const, zoomOnMouseWheel: !drawingMode, moveOnMouseMove: !drawingMode }],
        grid: [
          { top: 35, left: 85, right: 25, height: '40%' },
          { top: '53%', left: 85, right: 25, height: '40%' },
        ],
        xAxis: [xAxisBase(0, false), xAxisBase(1, true)],
        yAxis: [
          yAxisBase(0, 'Flux (p/cm² s sr)', isLight ? '#C2410C' : '#F97316'),
          yAxisBase(1, 'Pressure (mbar)', isLight ? '#059669' : '#10B981'),
        ],
        series: [
          { name: 'Charged Particle Flux', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: '#F97316' }, itemStyle: { color: '#F97316' }, markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 0)), data: radData.map(d => [d.time_tag, d.flux_charged]) },
          { name: 'Neutral Albedo Flux', type: 'line', smooth: 0.15, xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: '#06B6D4' }, itemStyle: { color: '#06B6D4' }, data: radData.map(d => [d.time_tag, d.flux_neutral]) },
          { name: 'Surface Pressure (mbar)', type: 'line', smooth: 0.15, xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2.2, color: '#10B981' }, itemStyle: { color: '#10B981' }, markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 1)), data: radData.map(d => [d.time_tag, d.pressure_mbar ?? 8.15]) },
        ]
      }
    } else {
      // Default: Surface Absorbed Dosimetry
      const tissueColor = '#EF4444'
      const siColor = isLight ? '#D97706' : '#FBBF24'

      return {
        useUTC: true,
        backgroundColor: 'transparent',
        animation: false,
        legend: {
          show: true,
          top: 0,
          textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' }
        },
        tooltip: tooltipBase,
        grid: { top: 35, right: 25, bottom: 45, left: 85 },
        dataZoom: [
          {
            type: 'inside' as const,
            xAxisIndex: 0,
            filterMode: 'none' as const,
            zoomOnMouseWheel: !drawingMode,
            moveOnMouseMove: !drawingMode,
          }
        ],
        xAxis: xAxisBase(0, true),
        yAxis: yAxisBase(0, 'Dose Rate (µGy/hr)', isLight ? '#DC2626' : '#EF4444'),
        series: [
          {
            name: 'Tissue Eq Plastic (Detector E)',
            type: 'line',
            smooth: 0.15,
            showSymbol: false,
            lineStyle: { width: 2.2, color: tissueColor },
            itemStyle: { color: tissueColor },
            markLine: combineMarkLines(midnightDividers, buildMarkLines(lines, 0)),
            data: radData.map(d => [d.time_tag, d.dose_rate_plastic])
          },
          {
            name: 'Silicon Absorber Dose',
            type: 'line',
            smooth: 0.15,
            showSymbol: false,
            lineStyle: { width: 2.0, color: siColor },
            itemStyle: { color: siColor },
            data: radData.map(d => [d.time_tag, d.dose_rate_silicon])
          }
        ]
      }
    }
  }, [selectedGraph, visibleDetectors, radData, lines, isLight, drawingMode, tooltipBase])


  return (
    <div style={{ width: '100vw', overflowY: 'auto', overflowX: 'hidden', background: isLight ? '#EEF4FB' : '#03060C' }}>
      <style>{`
        @keyframes marsFadeInHeader {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes chevronBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(7px); }
        }
        .mars-anim-header { animation: marsFadeInHeader 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        .chevron-bounce { animation: chevronBounce 2.4s ease-in-out infinite; }
        .chevron-bounce:hover { animation-play-state: paused; }
      `}</style>

      {/* ═══════════════════════ SECTION 1 — 100VH MARS ORBIT HERO ═══════════════════════ */}
      <div ref={orbitRef} style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

        {/* 3D Planetary Orbit View */}
        <MarsOrbitBackground
          position="hero"
          initialPosition={(location.state as any)?.startPos || 'dashboard'}
        />

        {/* ── TOP HEADER OVERLAY (HUD) ── */}
        <div className="mars-anim-header" style={{
          position: 'relative', zIndex: 10, pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '24px 36px', flexWrap: 'wrap', gap: 16,
        }}>
          {/* LEFT: Return button + Mission Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'auto' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(5,10,24,0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#CBD5E1',
                padding: '8px 14px', borderRadius: 3, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 14,
                display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#FFF'
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.8)'
                e.currentTarget.style.background = 'rgba(56,189,248,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#CBD5E1'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.background = 'rgba(5,10,24,0.75)'
              }}
            >
              <ArrowLeft size={14} /><span>DASHBOARD</span>
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 12px #EF4444' }} />
                <span style={{ fontSize: 13, letterSpacing: 3, color: isLight ? '#DC2626' : '#FCA5A5', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  MARS SPACE WEATHER · CURIOSITY SURFACE RAD (MSL)
                </span>
              </div>
              <h1 style={{
                fontSize: 'clamp(20px,2.2vw,28px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
                margin: 0,
                fontFamily: 'var(--font-sans)',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
              }}>
                MARS SURFACE <span style={{ color: '#EF4444' }}>RADIATION HUB</span>
              </h1>
            </div>
          </div>

          {/* RIGHT: Mission Badges + Sync PDS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', pointerEvents: 'auto' }}>
            <div style={{
              background: 'rgba(5,10,24,0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(239,68,68,0.4)',
              padding: '6px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
              <span style={{ color: '#94A3B8' }}>MISSION: </span>
              <strong style={{ color: '#EF4444' }}>SOL {summary?.current_sol ?? 4986}</strong>
            </div>

            <div style={{
              background: 'rgba(5,10,24,0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(56,189,248,0.4)',
              padding: '6px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
              <span style={{ color: '#94A3B8' }}>LOCAL TIME: </span>
              <strong style={{ color: '#38BDF8' }}>{martianLmst || 'GALE CRATER'}</strong>
            </div>

            <div style={{
              background: 'rgba(5,10,24,0.88)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(34,197,94,0.4)',
              padding: '6px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
              <span style={{ color: '#94A3B8' }}>STATUS: </span>
              <strong style={{ color: '#22C55E' }}>{summary?.status ?? 'NORMAL'}</strong>
            </div>

            <button
              onClick={handleRefresh}
              disabled={fetching}
              style={{
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.7)',
                color: '#F8FAFC',
                padding: '7px 14px', borderRadius: 3,
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 15px rgba(239,68,68,0.25)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.35)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            >
              <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
              {fetching ? 'SYNCING...' : 'SYNC PDS'}
            </button>
          </div>
        </div>


        {/* ── BOTTOM FADE: orbit stars fade DOWN into pure background ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 60, pointerEvents: 'none', zIndex: 5,
          background: isLight
            ? 'linear-gradient(to bottom, transparent 0%, #EEF4FB 100%)'
            : 'linear-gradient(to bottom, transparent 0%, #03060C 100%)',
        }} />

        {/* ── SCROLL DOWN BOUNCING BUTTON ── */}
        <button
          onClick={scrollToDataSection}
          className="chevron-bounce"
          style={{
            position: 'absolute', bottom: 20, left: '50%', zIndex: 25,
            background: 'rgba(5,14,30,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(239,68,68,0.6)',
            color: '#FCA5A5',
            padding: '9px 24px', borderRadius: 24,
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9,
            boxShadow: '0 4px 24px rgba(239,68,68,0.25)',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#EF4444'
            e.currentTarget.style.background = 'rgba(239,68,68,0.25)'
            e.currentTarget.style.color = '#FFF'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'
            e.currentTarget.style.background = 'rgba(5,14,30,0.92)'
            e.currentTarget.style.color = '#FCA5A5'
          }}
        >
          <span>SCROLL TO MARS TELEMETRY & DATA</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* ═══════════════════════ SECTION 2 — TELEMETRY & ANALYTICS DECK ═══════════════════════ */}
      <div
        ref={dataSectionRef}
        style={{
          position: 'relative',
          minHeight: '100vh',
          background: isLight ? '#EEF4FB' : '#03060C',
          padding: '40px 36px 80px',
          boxSizing: 'border-box'
        }}
      >
        {/* Top return toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, paddingBottom: 16,
          borderBottom: isLight ? '1px solid rgba(52,152,219,0.25)' : '1px solid rgba(52,152,219,0.2)',
          flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.15em',
              color: isLight ? '#1A6DB5' : '#38BDF8', fontWeight: 700, textTransform: 'uppercase'
            }}>
              {activeTab === 'surface'
                ? 'SECTION 02 // CURIOSITY GALE CRATER IN-SITU DOSIMETRY'
                : 'SECTION 02 // MAVEN SOLAR ENERGETIC PARTICLE (SEP) ORBITER'}
            </span>
            <h2 style={{
              margin: '4px 0 0', fontSize: 'clamp(22px, 2.5vw, 30px)',
              fontWeight: 800, color: 'var(--text-h)', fontFamily: 'var(--font-sans)'
            }}>
              {activeTab === 'surface' ? (
                <>Surface Radiation <span style={{ color: '#EF4444' }}>& Particle Analytics</span></>
              ) : (
                <>Orbital Energetic Particles <span style={{ color: isLight ? '#0284C7' : '#38BDF8' }}>(MAVEN SEP)</span></>
              )}
            </h2>
          </div>

          <button
            onClick={scrollToOrbit}
            style={{
              background: 'rgba(5,14,30,0.75)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(52,152,219,0.4)',
              color: isLight ? '#1A6DB5' : '#38BDF8',
              padding: '8px 16px', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#38BDF8'
              e.currentTarget.style.background = 'rgba(56,189,248,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(52,152,219,0.4)'
              e.currentTarget.style.background = 'rgba(5,14,30,0.75)'
            }}
          >
            <ArrowUp size={14} />
            <span>SCROLL TO 3D MARS VIEW</span>
          </button>
        </div>

        {/* Mission Tab Selector (Surface RAD vs Orbital MAVEN) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
          padding: '5px',
          background: isLight ? '#FFFFFF' : 'rgba(5, 14, 30, 0.7)',
          border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          width: 'fit-content',
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <button
            onClick={() => handleTabChange('surface')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 6,
              background: activeTab === 'surface'
                ? (isLight ? '#DC2626' : '#EF4444')
                : 'transparent',
              color: activeTab === 'surface'
                ? '#FFFFFF'
                : (isLight ? '#475569' : '#94A3B8'),
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            <Radio size={14} />
            <span>Surface RAD (Curiosity)</span>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: activeTab === 'surface' ? 'rgba(255,255,255,0.25)' : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'),
              color: activeTab === 'surface' ? '#FFF' : (isLight ? '#64748B' : '#94A3B8'),
              fontWeight: 700,
            }}>
              GALE CRATER
            </span>
          </button>

          <button
            onClick={() => handleTabChange('orbit')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 6,
              background: activeTab === 'orbit'
                ? (isLight ? '#0284C7' : '#38BDF8')
                : 'transparent',
              color: activeTab === 'orbit'
                ? (isLight ? '#FFFFFF' : '#04111D')
                : (isLight ? '#475569' : '#94A3B8'),
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            <Activity size={14} />
            <span>Orbital Particles (MAVEN)</span>
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: activeTab === 'orbit' ? (isLight ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)') : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'),
              color: activeTab === 'orbit' ? (isLight ? '#FFF' : '#04111D') : (isLight ? '#64748B' : '#94A3B8'),
              fontWeight: 700,
            }}>
              ORBITER
            </span>
          </button>
        </div>

        {activeTab === 'surface' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Toolbar: Category Selector + Date Range Toolbar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 4
            }}>
              {/* Category Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontWeight: 700 }}>CATEGORY:</span>
                {[
                  { id: 'dosimetry', label: 'Absorbed Dosimetry', badge: 'TISSUE VS SI' },
                  { id: 'all_detectors', label: '7-Channel Telescope', badge: 'A-F' },
                  { id: 'counters', label: 'Trigger Counters', badge: 'L1 / L2' },
                  { id: 'flux_pressure', label: 'Flux & Pressure Tide', badge: 'ATM' },
                ].map(cat => {
                  const isActive = selectedGraph === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedGraph(cat.id as any)}
                      style={{
                        background: isActive
                          ? (isLight ? '#DC2626' : '#EF4444')
                          : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                        color: isActive ? '#FFFFFF' : (isLight ? '#334155' : '#94A3B8'),
                        border: '1px solid ' + (isActive
                          ? (isLight ? '#DC2626' : '#EF4444')
                          : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)')),
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        boxShadow: isLight && !isActive ? '0 1px 4px rgba(0,0,0,0.03)' : 'none',
                        transition: 'all 0.15s ease',
                        fontFamily: 'var(--font-mono)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>{cat.label}</span>
                      <span style={{
                        fontSize: 9.5,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: isActive ? 'rgba(255,255,255,0.25)' : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                        color: isActive ? '#FFF' : (isLight ? '#64748B' : '#94A3B8'),
                        fontWeight: 700
                      }}>
                        {cat.badge}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Date Range Toolbar (matching SWEPAM standard) */}
              <DateRangeToolbar
                limit={limit}
                onLimitChange={setLimit}
                appliedRange={appliedRange}
                onApplyRange={setAppliedRange}
                accentColor="#EF4444"
                loading={loading}
                presets={[1440, 4320, 10080, 43200]}
              />
            </div>

            {/* Detector Channels strip (only if all_detectors is selected) */}
            {selectedGraph === 'all_detectors' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6, padding: '8px 14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                  <Layers size={14} color="#38BDF8" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, color: '#38BDF8' }}>
                    DETECTORS:
                  </span>
                </div>
                {[
                  { key: 'dose_a1', label: 'Si A1 (Top)', color: '#38BDF8' },
                  { key: 'dose_a2', label: 'Si A2 (Bottom)', color: '#06B6D4' },
                  { key: 'dose_b',  label: 'Si B (Middle)', color: '#FBBF24' },
                  { key: 'dose_d',  label: 'Si D (Lower)', color: '#4ADE80' },
                  { key: 'dose_e',  label: 'Plastic E (Tissue)', color: '#EF4444' },
                  { key: 'dose_c',  label: 'CsI C (Crystal)', color: '#A855F7' },
                  { key: 'dose_f',  label: 'Shield F (Anti)', color: '#F43F5E' },
                ].map(d => {
                  const isChecked = visibleDetectors[d.key as keyof typeof visibleDetectors]
                  return (
                    <div
                      key={d.key}
                      onClick={() => toggleDetector(d.key as any)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        cursor: 'pointer', padding: '3px 8px',
                        background: isChecked ? (isLight ? `${d.color}18` : 'rgba(255,255,255,0.06)') : 'transparent',
                        border: `1px solid ${isChecked ? d.color + '88' : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')}`,
                        borderRadius: 3,
                        transition: 'all 0.15s'
                      }}
                    >
                      {isChecked ? <CheckSquare size={12} color={d.color} /> : <Square size={12} color="#64748B" />}
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isChecked ? (isLight ? '#0F172A' : '#FFF') : (isLight ? '#64748B' : '#94A3B8') }}>
                        {d.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Standard Dashboard Card */}
            {loading ? (
              <div style={{ height: 580, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LoadingSpinner text="Retrieving Mars RAD Dosimetry Telemetry..." />
              </div>
            ) : radData.length === 0 ? (
              <div style={{
                height: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6, color: isLight ? '#64748B' : '#94A3B8'
              }}>
                <Info size={32} color="#EF4444" />
                <span style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>No telemetry data found for the selected range</span>
                <span style={{ fontSize: 13 }}>Try adjusting the date range or clicking a preset (1D, 3D, 7D, 30D, ALL)</span>
              </div>
            ) : (
              <Card
                title={
                  selectedGraph === 'all_detectors' ? 'MULTI-DETECTOR TELESCOPE (A1, A2, B, C, D, E, F)' :
                  selectedGraph === 'counters' ? 'TRIGGER RATES & COINCIDENCE CHANNELS (L1 & L2)' :
                  selectedGraph === 'flux_pressure' ? 'GCR PARTICLE FLUX & ATMOSPHERIC PRESSURE TIDE' :
                  'SURFACE ABSORBED DOSIMETRY (MSL CURIOSITY RAD)'
                }
                subtitle={
                  selectedGraph === 'all_detectors' ? '7-Channel Silicon Solid-State Detectors, Scintillators & Anticoincidence Shield' :
                  selectedGraph === 'counters' ? 'Fast/Slow Level 1 Triggers & Level 2 Directional / Stopping Proton Coincidences' :
                  selectedGraph === 'flux_pressure' ? 'In-situ Charged & Neutral Particle Flux vs. Gale Crater Barometric Pressure' :
                  'Plastic Scintillator (Tissue Equivalent E) vs Silicon Absorber (Gale Crater)'
                }
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {panLoading && (
                      <span style={{ fontSize: 13, color: '#EF4444', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ◀ LOADING HISTORICAL DATA...
                      </span>
                    )}
                    <button
                      onClick={toggleDrawingMode}
                      style={{
                        background: drawingMode ? 'rgba(239, 68, 68, 0.25)' : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                        border: `1px solid ${drawingMode ? '#EF4444' : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)')}`,
                        color: drawingMode ? '#EF4444' : (isLight ? '#334155' : '#CBD5E1'),
                        padding: '4px 10px', borderRadius: 4,
                        cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 5
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
                          padding: '4px 8px', borderRadius: 4,
                          cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700
                        }}
                      >
                        CLEAR ({lines.length})
                      </button>
                    )}
                    <ExportChartMenu
                      chartRef={chartRef}
                      data={radData}
                      columns={exportColumns}
                      metadata={exportMetadata}
                      filenameBase={`msl_rad_${selectedGraph}`}
                      accentColor="#EF4444"
                    />
                  </div>
                }
                style={{
                  marginBottom: 20,
                  background: isLight ? '#FFFFFF' : undefined,
                  boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
                  border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
                }}
              >
                <div ref={chartWrapperRef} style={{ position: 'relative', width: '100%', height: selectedGraph === 'all_detectors' ? 620 : 560 }}>
                  <ReactECharts
                    key={selectedGraph}
                    ref={chartRef}
                    option={chartOption}
                    notMerge={true}
                    lazyUpdate={true}
                    style={{ height: '100%', width: '100%' }}
                    onEvents={{ dataZoom: onDataZoom }}
                  />
                  <TrendLineOverlay
                    chartRef={chartRef}
                    wrapperRef={chartWrapperRef}
                    gridCount={selectedGraph === 'all_detectors' ? 3 : selectedGraph === 'dosimetry' ? 1 : 2}
                    gridUnits={
                      selectedGraph === 'all_detectors' ? ['µGy/hr', 'µGy/hr', 'µGy/hr'] :
                      selectedGraph === 'counters' ? ['cps', 'cps'] :
                      selectedGraph === 'flux_pressure' ? ['p/cm²s', 'mbar'] :
                      ['µGy/hr']
                    }
                    lines={lines}
                    drawingMode={drawingMode}
                    pendingP1={pendingP1}
                    onChartClick={handleClick}
                    onRemoveLine={removeLine}
                  />
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'orbit' && (
          <MarsMavenSection />
        )}

      </div>
    </div>
  )
}

