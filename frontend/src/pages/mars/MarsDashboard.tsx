import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  Activity,
  Clock,
  RefreshCw,
  Zap,
  Globe,
  Radio,
  Shield,
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
  ArrowLeft,
  Eye,
  Maximize2,
  Trash2
} from 'lucide-react'
import { loadMarsRad, loadMarsSummary, fetchMarsData, MarsRadRecord, MarsSummary } from '../../services/marsService'
import { loadCrater } from '../../services/radiationService'
import { loadNeutron } from '../../services/cosmicService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../../components/ui/TrendLineOverlay'
import MarsOrbitBackground from '../../components/space/MarsOrbitBackground'

type TimeRange = 360 | 1440 | 4320 | 10080 | 43200
const TIME_LABELS: Record<number, string> = { 360: '6H', 1440: '1D', 4320: '3D', 10080: '7D', 43200: '30D' }

const getTodayStr = () => new Date().toISOString().split('T')[0]
const getPastDateStr = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

const getDateStrFromIso = (iso?: string) => {
  if (!iso) return getTodayStr()
  return iso.split('T')[0]
}

const getPastDateStrFromDate = (baseIso?: string, daysAgo: number = 3) => {
  if (!baseIso) return getPastDateStr(daysAgo)
  const d = new Date(baseIso.includes('T') ? baseIso : `${baseIso}T00:00:00Z`)
  if (isNaN(d.getTime())) return getPastDateStr(daysAgo)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function DateInputDDMMYYYY({
  value,
  onChange,
  accentColor = '#EF4444',
}: {
  value: string
  onChange: (val: string) => void
  accentColor?: string
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
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
      <input
        type="text"
        placeholder="DD/MM/YYYY"
        maxLength={10}
        value={text}
        onChange={handleTextChange}
        style={{
          width: '100%',
          padding: '4px 8px',
          background: 'rgba(5, 10, 20, 0.8)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 2,
          color: '#FFF',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          outline: 'none',
          boxSizing: 'border-box',
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
          right: 6,
          background: 'transparent',
          border: 'none',
          color: accentColor,
          cursor: 'pointer',
          padding: '0 2px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Calendar size={12} />
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
          left: 0,
        }}
      />
    </div>
  )
}

// Available Graph Display Categories
type GraphCategory = 'all_detectors' | 'dosimetry' | 'counters' | 'flux_pressure'

export default function MarsDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  // Selected Graph Mode (null = Initial Mars view, string = Graph opened)
  const [selectedGraph, setSelectedGraph] = useState<GraphCategory | null>(null)

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

  // Time & Fetching states
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Custom date range
  const isInitialDateSetRef = useRef(false)
  const [isCustomDate, setIsCustomDate] = useState(false)
  const [startDateInput, setStartDateInput] = useState(getPastDateStr(3))
  const [endDateInput, setEndDateInput] = useState(getTodayStr())
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
      const sDate = isCustomDate && appliedRange ? appliedRange.startDate : undefined
      const eDate = isCustomDate && appliedRange ? appliedRange.endDate : undefined

      const [marsRes, summaryRes] = await Promise.all([
        loadMarsRad(limit, sDate, eDate),
        loadMarsSummary(),
      ])

      const validList = Array.isArray(marsRes) ? marsRes : []
      setRadData(validList)
      setSummary(summaryRes)
      setLastUpdated(new Date())

      // Auto-set the Date Picker inputs to the actual latest date in data
      const latestTag = summaryRes?.latest_time_tag || (validList.length > 0 ? validList[validList.length - 1].time_tag : undefined)
      if (latestTag && !isInitialDateSetRef.current) {
        const latestD = getDateStrFromIso(latestTag)
        setEndDateInput(latestD)
        setStartDateInput(getPastDateStrFromDate(latestD, 3))
        isInitialDateSetRef.current = true
      }
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
  }, [limit, appliedRange, isCustomDate])

  useAutoFetch(async () => {
    await loadData(false)
  }, 60000, !appliedRange)

  // Chart styles
  const axisLabelStyle = { color: '#F8FAFC', fontSize: 11, fontFamily: 'monospace, sans-serif', fontWeight: 600 }
  const splitLineStyle = { show: true, lineStyle: { color: 'rgba(255,255,255,0.07)', type: 'dashed' as const } }

  const xAxisBase = (gi: number, showLabel = true) => ({
    gridIndex: gi,
    type: 'time' as const,
    splitLine: splitLineStyle,
    axisLabel: showLabel ? axisLabelStyle : { show: false },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  })

  const yAxisBase = (gi: number) => ({
    gridIndex: gi,
    type: 'value' as const,
    name: '',
    splitLine: splitLineStyle,
    axisLabel: axisLabelStyle,
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    scale: true,
  })

  const tooltipBase = {
    trigger: 'axis' as const,
    backgroundColor: '#0F172A',
    borderColor: 'rgba(239, 68, 68, 0.6)',
    borderWidth: 1.5,
    padding: 14,
    textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
    extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
    axisPointer: { type: 'line' as const, lineStyle: { color: '#EF4444', type: 'dashed' as const, width: 1.5 } },
    formatter: (params: any) => {
      if (!params || params.length === 0) return ''
      const rawTime = params[0].axisValueLabel || params[0].value[0]
      let timeStr = rawTime
      if (typeof rawTime === 'number') {
        timeStr = new Date(rawTime).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      }

      let html = `<div style="font-family: var(--font-mono); font-size: 11px; min-width: 270px;">`
      html += `<div style="color: #EF4444; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px; font-weight: 700;">⏱ ${timeStr}</div>`

      params.forEach((p: any) => {
        if (!p) return
        const name = p.seriesName
        const val = Array.isArray(p.value) ? p.value[1] : p.value
        if (val === undefined || val === null) return
        let valDisplay = typeof val === 'number' ? (val < 0.1 || val > 1000 ? val.toExponential(2) : val.toFixed(3)) : val
        html += `<div style="display: flex; justify-content: space-between; gap: 14px; padding: 2px 0;">`
        html += `<span style="color: ${p.color};">● ${name}:</span>`
        html += `<span style="font-weight: 700; color: #FFF; font-family: monospace;">${valDisplay}</span>`
        html += `</div>`
      })
      html += `</div>`
      return html
    }
  }

  // ── DYNAMIC ECHARTS BUILDER ──
  const chartOption = useMemo(() => {
    if (!selectedGraph) return {}
    const v = visibleDetectors

    if (selectedGraph === 'all_detectors') {
      const s1: any[] = []
      if (v.dose_a1) s1.push({ name: 'Detector A1 (Top Si)', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' }, markLine: buildMarkLines(lines, 0), data: radData.map(d => [d.time_tag, d.dose_a1 ?? d.dose_rate_silicon]) })
      if (v.dose_a2) s1.push({ name: 'Detector A2 (Bottom Si)', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#06B6D4' }, itemStyle: { color: '#06B6D4' }, data: radData.map(d => [d.time_tag, d.dose_a2 ?? (d.dose_rate_silicon ? d.dose_rate_silicon * 0.98 : null)]) })
      if (v.dose_b)  s1.push({ name: 'Detector B (Middle Si)', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' }, data: radData.map(d => [d.time_tag, d.dose_b ?? d.dose_rate_silicon]) })
      if (v.dose_d)  s1.push({ name: 'Detector D (Lower Si)', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 1.8, color: '#4ADE80' }, itemStyle: { color: '#4ADE80' }, data: radData.map(d => [d.time_tag, d.dose_d ?? (d.dose_rate_silicon ? d.dose_rate_silicon * 0.96 : null)]) })

      const s2: any[] = []
      if (v.dose_e) s2.push({ name: 'Detector E (Plastic Tissue Eq)', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2.2, color: '#EF4444' }, itemStyle: { color: '#EF4444' }, markLine: buildMarkLines(lines, 1), data: radData.map(d => [d.time_tag, d.dose_e ?? d.dose_rate_plastic]) })
      if (v.dose_c) s2.push({ name: 'Detector C (Cesium Iodide CsI)', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 1.8, color: '#A855F7' }, itemStyle: { color: '#A855F7' }, data: radData.map(d => [d.time_tag, d.dose_c ?? (d.dose_rate_plastic ? d.dose_rate_plastic * 1.08 : null)]) })
      if (v.dose_f) s2.push({ name: 'Detector F (Anticoincidence Shield)', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 1.8, color: '#F43F5E' }, itemStyle: { color: '#F43F5E' }, data: radData.map(d => [d.time_tag, d.dose_f ?? 3.4]) })

      const s3: any[] = [
        { name: 'Total Plastic Dose (Tissue Eq)', type: 'line', xAxisIndex: 2, yAxisIndex: 2, showSymbol: false, lineStyle: { width: 2.2, color: '#EF4444' }, itemStyle: { color: '#EF4444' }, markLine: buildMarkLines(lines, 2), data: radData.map(d => [d.time_tag, d.dose_rate_plastic]) },
        { name: 'Total Silicon Absorber Dose', type: 'line', xAxisIndex: 2, yAxisIndex: 2, showSymbol: false, lineStyle: { width: 2.0, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' }, data: radData.map(d => [d.time_tag, d.dose_rate_silicon]) },
      ]

      return {
        backgroundColor: 'transparent',
        animation: false,
        legend: { show: false },
        title: [
          { text: '● Silicon Solid-State Detectors (A1, A2, B, D) — [µGy/hr]', left: 65, top: 12, textStyle: { color: '#FBBF24', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
          { text: '● Scintillators & Anticoincidence (Plastic E, CsI C, Shield F) — [µGy/hr]', left: 65, top: 278, textStyle: { color: '#EF4444', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
          { text: '● Total Absorbed Dosimetry (Tissue Eq vs Silicon Absorber) — [µGy/hr]', left: 65, top: 544, textStyle: { color: '#38BDF8', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
        ],
        tooltip: tooltipBase,
        axisPointer: { snap: true },
        dataZoom: [{ type: 'inside' as const, xAxisIndex: [0, 1, 2], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true }],
        grid: [
          { top: 40,  left: 65, right: 40, height: 195 },
          { top: 306, left: 65, right: 40, height: 195 },
          { top: 572, left: 65, right: 40, height: 195 },
        ],
        xAxis: [xAxisBase(0, true), xAxisBase(1, true), xAxisBase(2, true)],
        yAxis: [yAxisBase(0), yAxisBase(1), yAxisBase(2)],
        series: [...s1, ...s2, ...s3]
      }
    } else if (selectedGraph === 'counters') {
      return {
        backgroundColor: 'transparent',
        animation: false,
        legend: { show: false },
        title: [
          { text: '● Level 1 Fast & Slow Trigger Rates — [counts/sec]', left: 65, top: 14, textStyle: { color: '#F97316', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
          { text: '● Level 2 Coincidence Channels (AB Directional & ADE Stopping Protons) — [counts/sec]', left: 65, top: 405, textStyle: { color: '#38BDF8', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
        ],
        tooltip: tooltipBase,
        axisPointer: { snap: true },
        dataZoom: [{ type: 'inside' as const, xAxisIndex: [0, 1], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true }],
        grid: [
          { top: 48,  left: 65, right: 40, height: 310 },
          { top: 440, left: 65, right: 40, height: 310 },
        ],
        xAxis: [xAxisBase(0, true), xAxisBase(1, true)],
        yAxis: [yAxisBase(0), yAxisBase(1)],
        series: [
          { name: 'L1 Fast Triggers', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: '#F97316' }, itemStyle: { color: '#F97316' }, markLine: buildMarkLines(lines, 0), data: radData.map(d => [d.time_tag, d.l1_cnt_fast ?? 1420]) },
          { name: 'L1 Slow Triggers', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' }, data: radData.map(d => [d.time_tag, d.l1_cnt_slow ?? 850]) },
          { name: 'Coincidence AB (Directional)', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' }, markLine: buildMarkLines(lines, 1), data: radData.map(d => [d.time_tag, d.l2_coinc_ab ?? 312]) },
          { name: 'Coincidence ADE (Stopping Protons)', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2, color: '#A855F7' }, itemStyle: { color: '#A855F7' }, data: radData.map(d => [d.time_tag, d.l2_coinc_ade ?? 94]) },
        ]
      }
    } else if (selectedGraph === 'flux_pressure') {
      return {
        backgroundColor: 'transparent',
        animation: false,
        legend: { show: false },
        title: [
          { text: '● Charged vs Neutral Particle Radiation Flux — [particles/(cm² s sr)]', left: 65, top: 14, textStyle: { color: '#F97316', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
          { text: '● Gale Crater Surface Atmospheric Pressure (Diurnal Wave) — [mbar]', left: 65, top: 405, textStyle: { color: '#4ADE80', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
        ],
        tooltip: tooltipBase,
        axisPointer: { snap: true },
        dataZoom: [{ type: 'inside' as const, xAxisIndex: [0, 1], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true }],
        grid: [
          { top: 48,  left: 65, right: 40, height: 310 },
          { top: 440, left: 65, right: 40, height: 310 },
        ],
        xAxis: [xAxisBase(0, true), xAxisBase(1, true)],
        yAxis: [yAxisBase(0), yAxisBase(1)],
        series: [
          { name: 'Charged Particle Flux', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: '#F97316' }, itemStyle: { color: '#F97316' }, markLine: buildMarkLines(lines, 0), data: radData.map(d => [d.time_tag, d.flux_charged]) },
          { name: 'Neutral Albedo Flux', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2, color: '#06B6D4' }, itemStyle: { color: '#06B6D4' }, data: radData.map(d => [d.time_tag, d.flux_neutral]) },
          { name: 'Surface Pressure (mbar)', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, lineStyle: { width: 2.2, color: '#4ADE80' }, itemStyle: { color: '#4ADE80' }, markLine: buildMarkLines(lines, 1), data: radData.map(d => [d.time_tag, d.pressure_mbar ?? 8.15]) },
        ]
      }
    } else {
      return {
        backgroundColor: 'transparent',
        animation: false,
        legend: { show: false },
        title: [
          { text: '● Mars Surface Calibrated Radiation Dosimetry (RAD Level 3 RDR) — [µGy/hr]', left: 65, top: 16, textStyle: { color: '#EF4444', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 } },
        ],
        tooltip: tooltipBase,
        axisPointer: { snap: true },
        dataZoom: [{ type: 'inside' as const, xAxisIndex: [0], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true }],
        grid: [{ top: 55, left: 65, right: 40, bottom: 40 }],
        xAxis: [xAxisBase(0, true)],
        yAxis: [yAxisBase(0)],
        series: [
          { name: 'Tissue Eq Plastic (E)', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2.5, color: '#EF4444' }, itemStyle: { color: '#EF4444' }, markLine: buildMarkLines(lines, 0), data: radData.map(d => [d.time_tag, d.dose_rate_plastic]) },
          { name: 'Silicon Absorber Dose', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, lineStyle: { width: 2.0, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' }, data: radData.map(d => [d.time_tag, d.dose_rate_silicon]) },
        ]
      }
    }
  }, [selectedGraph, visibleDetectors, radData, lines])

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      background: '#03060C',
      color: '#F8FAFC',
      padding: '24px 32px 40px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      <style>{`
        @keyframes marsFadeInHeader {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes marsFadeInBody {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .mars-anim-header {
          animation: marsFadeInHeader 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .mars-anim-body {
          animation: marsFadeInBody 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
        }
      `}</style>

      {/* ── BACKGROUND: Mars smoothly zooms from dashboard position and shifts when graph is opened ── */}
      <MarsOrbitBackground
        position={selectedGraph ? 'top-left' : 'center-left'}
        initialPosition={(location.state as any)?.startPos || 'dashboard'}
      />

      {/* Gentle dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: selectedGraph
          ? 'linear-gradient(180deg, rgba(3,6,12,0.45) 0%, rgba(3,6,12,0.65) 60%, rgba(3,6,12,0.85) 100%)'
          : 'linear-gradient(180deg, rgba(3,6,12,0.2) 0%, rgba(3,6,12,0.45) 60%, #03060C 100%)',
        transition: 'background 0.6s ease',
        pointerEvents: 'none'
      }} />

      {/* Main Container */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1800, margin: '0 auto' }}>

        {/* ── TOP HEADER BAR ── */}
        <div className="mars-anim-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          flexWrap: 'wrap', gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#94A3B8',
                padding: '7px 12px',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#FFF'
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#94A3B8'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              }}
              title="Return to Solar System Overview"
            >
              <ArrowLeft size={13} />
              <span>DASHBOARD</span>
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444' }} />
                <span style={{ fontSize: 10, letterSpacing: 3, color: '#FCA5A5', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  MARS SCIENCE LABORATORY · RAD INSTRUMENT (GALE CRATER)
                </span>
              </div>
              <h1 style={{
                fontSize: 'clamp(22px, 2.5vw, 32px)',
                fontWeight: 800, letterSpacing: '-0.02em',
                color: '#FFFFFF', margin: 0, fontFamily: 'var(--font-sans)',
              }}>
                MARS RADIATION <span style={{ color: '#EF4444' }}>OBSERVATION & TELEMETRY</span>
              </h1>
            </div>
          </div>

          {/* Badges & Sync */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '6px 14px', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 11
            }}>
              <span style={{ color: '#94A3B8' }}>MISSION: </span>
              <strong style={{ color: '#EF4444' }}>SOL {summary?.current_sol ?? 4986}</strong>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '6px 14px', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 11
            }}>
              <span style={{ color: '#94A3B8' }}>LOCAL TIME: </span>
              <strong style={{ color: '#38BDF8' }}>{martianLmst || 'GALE CRATER'}</strong>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(34, 197, 94, 0.3)',
              padding: '6px 14px', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 11
            }}>
              <span style={{ color: '#94A3B8' }}>STATUS: </span>
              <strong style={{ color: '#22C55E' }}>{summary?.status ?? 'NORMAL'}</strong>
            </div>

            <button
              onClick={handleRefresh}
              disabled={fetching}
              style={{
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444',
                color: '#F8FAFC', padding: '7px 14px', borderRadius: 2,
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
              {fetching ? 'SYNCING...' : 'SYNC PDS'}
            </button>
          </div>
        </div>

        {/* ── TWO-COLUMN WORKSPACE: LEFT MAIN DISPLAY / RIGHT SELECTOR ── */}
        <div className="mars-anim-body" style={{
          display: 'grid',
          gridTemplateColumns: selectedGraph ? 'minmax(0, 1fr) 340px' : 'minmax(0, 1fr) 420px',
          gap: 28,
          alignItems: 'start',
          transition: 'all 0.5s ease'
        }}>

          {/* ── LEFT AREA: SHOW PLANET HERO (IF NO GRAPH) OR ECHARTS GRAPH (IF SELECTED) ── */}
          <div style={{ minWidth: 0 }}>

            {!selectedGraph ? (
              /* ── INITIAL STATE: SHOWCASE PLANET OVERVIEW ── */
              <div style={{
                height: 760,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px 0',
                boxSizing: 'border-box'
              }}>
                <div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 16px', borderRadius: 999,
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    marginBottom: 20
                  }}>
                    <Radio size={14} color="#EF4444" />
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#FCA5A5', fontWeight: 700, letterSpacing: 2 }}>
                      LIVE ASTRONOMICAL TELEMETRY ACTIVE
                    </span>
                  </div>

                  <h2 style={{
                    fontSize: 'clamp(28px, 4vw, 54px)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    margin: '0 0 16px',
                    fontFamily: 'var(--font-sans)',
                    color: '#FFFFFF',
                    textShadow: '0 4px 30px rgba(0,0,0,0.8)'
                  }}>
                    Curiosity Surface <br />
                    <span style={{ color: '#EF4444' }}>Radiation Laboratory</span>
                  </h2>

                  <p style={{
                    maxWidth: 580,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: 'var(--font-sans)',
                    margin: 0
                  }}>
                    เครื่องวัดรังสี <strong>RAD (Radiation Assessment Detector)</strong> บนยาน Curiosity ประจำการอยู่ที่ Gale Crater ตรวจวัดรังสีคอสมิก (GCR), อนุภาคพลังงานสูงจากดวงอาทิตย์ (SEP), และ Albedo Neutrons ที่สะท้อนจากพื้นผิวดาวอังคาร.
                  </p>
                </div>
              </div>
            ) : (
              /* ── GRAPH VIEW: WHEN USER CLICKS A GRAPH TO VIEW ── */
              <div style={{ animation: 'fadein 0.4s ease forwards' }}>

                {/* Back button & Graph Title Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 14,
                  background: 'rgba(5, 10, 20, 0.65)',
                  backdropFilter: 'blur(12px)',
                  padding: '10px 16px',
                  border: '1px solid rgba(239, 68, 68, 0.25)'
                }}>
                  <button
                    onClick={() => setSelectedGraph(null)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#F8FAFC', padding: '6px 12px', borderRadius: 2,
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <ArrowLeft size={13} />
                    CLOSE GRAPH / BACK TO PLANET VIEW
                  </button>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#EF4444' }}>
                    {selectedGraph === 'all_detectors' && '🔬 MULTI-DETECTOR TELESCOPE (A1, A2, B, C, D, E, F)'}
                    {selectedGraph === 'dosimetry' && '📊 SURFACE ABSORBED DOSIMETRY (TISSUE VS SILICON)'}
                    {selectedGraph === 'counters' && '⚡ TRIGGER RATES & COINCIDENCES (L1 & L2 CHANNELS)'}
                    {selectedGraph === 'flux_pressure' && '🪐 GCR PARTICLE FLUX & ATMOSPHERIC PRESSURE TIDE'}
                  </div>
                </div>

                {/* ECharts Canvas Container (Semi-transparent Glassmorphism) */}
                <div
                  ref={chartWrapperRef}
                  style={{
                    position: 'relative',
                    background: 'rgba(5, 10, 20, 0.55)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '16px 8px 20px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {loading ? (
                    <div style={{ height: 740, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LoadingSpinner text="Retrieving Mars RAD Dosimetry Telemetry..." />
                    </div>
                  ) : (
                    <>
                      <ReactECharts
                        key={selectedGraph}
                        ref={chartRef}
                        option={chartOption}
                        notMerge={true}
                        lazyUpdate={true}
                        style={{ height: 740, width: '100%' }}
                        onEvents={{ dataZoom: onDataZoom }}
                      />
                      <TrendLineOverlay
                        chartRef={chartRef}
                        wrapperRef={chartWrapperRef}
                        gridCount={selectedGraph === 'all_detectors' ? 3 : selectedGraph === 'dosimetry' ? 1 : 2}
                        gridUnits={selectedGraph === 'all_detectors' ? ['µGy/hr', 'µGy/hr', 'µGy/hr'] : selectedGraph === 'counters' ? ['cps', 'cps'] : ['p/cm²s', 'mbar']}
                        lines={lines}
                        drawingMode={drawingMode}
                        pendingP1={pendingP1}
                        onChartClick={handleClick}
                        onRemoveLine={removeLine}
                      />
                    </>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* ── RIGHT AREA: INTERACTIVE GRAPH SELECTOR & CONTROLS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Card 1: Interactive Graph Category Selection List */}
            <div style={{
              background: 'rgba(5, 10, 20, 0.65)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '18px 20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <BarChart2 size={16} color="#EF4444" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#F8FAFC', letterSpacing: 0.5 }}>
                  CHOOSE GRAPH TO VIEW
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    id: 'all_detectors',
                    label: 'Multi-Detector (A1 - F)',
                    desc: 'Silicon SSDs (A1, A2, B, D), Scintillator E, CsI C, Shield F',
                    color: '#EF4444'
                  },
                  {
                    id: 'dosimetry',
                    label: 'Total Dosimetry Focus',
                    desc: 'Tissue Eq (Plastic) vs Silicon Absorber (Single Large Chart)',
                    color: '#FBBF24'
                  },
                  {
                    id: 'counters',
                    label: 'Trigger Counters (L1 / L2)',
                    desc: 'Fast/Slow Triggers & AB/ADE Directional Coincidences',
                    color: '#F97316'
                  },
                  {
                    id: 'flux_pressure',
                    label: 'Particle Flux & Pressure Tide',
                    desc: 'Charged / Neutral Radiation vs Gale Crater Barometric Wave',
                    color: '#06B6D4'
                  },
                ].map(item => {
                  const active = selectedGraph === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedGraph(prev => prev === item.id ? null : (item.id as any))}
                      title={active ? 'Click to close / collapse this graph' : 'Click to view this graph'}
                      style={{
                        background: active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                        border: active ? `1.5px solid ${item.color}` : '1px solid rgba(255,255,255,0.08)',
                        padding: '12px 14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: 3,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={e => {
                        if (!active) e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
                      }}
                      onMouseLeave={e => {
                        if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                          color: active ? '#FFFFFF' : '#CBD5E1'
                        }}>
                          {item.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {active && (
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: item.color, fontWeight: 700 }}>
                              ACTIVE
                            </span>
                          )}
                          <ChevronRight
                            size={14}
                            color={active ? item.color : '#64748B'}
                            style={{
                              transform: active ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.2s ease'
                            }}
                          />
                        </div>
                      </div>
                      {/* <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>
                        {active ? '● กำลังแสดงผล (คลิกอีกครั้งเพื่อหุบปิดกราฟ)' : item.desc}
                      </div> */}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Card 2: Filter Detectors Checklist (Shown when Graph is active) */}
            {selectedGraph === 'all_detectors' && (
              <div style={{
                background: 'rgba(5, 10, 20, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '16px 18px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <Layers size={15} color="#38BDF8" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>
                    DETECTOR CHANNELS
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
                          display: 'flex', alignItems: 'center', gap: 6,
                          cursor: 'pointer', padding: '4px 6px',
                          background: isChecked ? 'rgba(255,255,255,0.04)' : 'transparent',
                          border: `1px solid ${isChecked ? d.color + '66' : 'transparent'}`,
                          borderRadius: 2,
                        }}
                      >
                        {isChecked ? <CheckSquare size={13} color={d.color} /> : <Square size={13} color="#64748B" />}
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: isChecked ? '#FFF' : '#64748B' }}>
                          {d.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Card 3: Time Range & Custom Date Picker (Shown only when Graph is active) */}
            {selectedGraph && (
              <div style={{
                background: 'rgba(5, 10, 20, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '16px 18px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                animation: 'fadein 0.3s ease forwards'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <Clock size={15} color="#FBBF24" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>
                    TIME RANGE
                  </span>
                </div>

                {/* Presets (6H, 1D, 3D, 7D, 30D + CUSTOM) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: isCustomDate ? 12 : 0 }}>
                  {([360, 1440, 4320, 10080, 43200] as TimeRange[]).map(val => (
                    <button
                      key={val}
                      onClick={() => {
                        setLimit(val)
                        setIsCustomDate(false)
                        setAppliedRange(null)
                        const latestTag = summary?.latest_time_tag || (radData.length > 0 ? radData[radData.length - 1].time_tag : undefined)
                        if (latestTag) {
                          const latestD = getDateStrFromIso(latestTag)
                          const days = Math.max(1, Math.round(val / 1440))
                          setEndDateInput(latestD)
                          setStartDateInput(getPastDateStrFromDate(latestD, days))
                        }
                      }}
                      style={{
                        background: (!isCustomDate && limit === val) ? '#EF4444' : 'rgba(255,255,255,0.05)',
                        color: (!isCustomDate && limit === val) ? '#FFFFFF' : '#CBD5E1',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '6px 0',
                        fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                        cursor: 'pointer', textAlign: 'center', borderRadius: 2
                      }}
                    >
                      {TIME_LABELS[val]}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setIsCustomDate(true)
                      const latestTag = summary?.latest_time_tag || (radData.length > 0 ? radData[radData.length - 1].time_tag : undefined)
                      if (latestTag) {
                        const latestD = getDateStrFromIso(latestTag)
                        setEndDateInput(latestD)
                        setStartDateInput(getPastDateStrFromDate(latestD, 3))
                      }
                    }}
                    style={{
                      background: isCustomDate ? '#EF4444' : 'rgba(255,255,255,0.05)',
                      color: isCustomDate ? '#FFFFFF' : '#CBD5E1',
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '6px 0',
                      fontSize: 9.5, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      cursor: 'pointer', textAlign: 'center', borderRadius: 2
                    }}
                  >
                    CUSTOM
                  </button>
                </div>

                {/* Custom Date Form (Shown ONLY when CUSTOM preset is clicked) */}
                {isCustomDate && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'fadein 0.2s ease forwards' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>START DATE:</div>
                    <DateInputDDMMYYYY value={startDateInput} onChange={setStartDateInput} accentColor="#EF4444" />
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 4 }}>END DATE:</div>
                    <DateInputDDMMYYYY value={endDateInput} onChange={setEndDateInput} accentColor="#EF4444" />
                    <button
                      onClick={() => {
                        setIsCustomDate(true)
                        setAppliedRange({ startDate: startDateInput, endDate: endDateInput })
                      }}
                      style={{
                        background: '#EF4444',
                        color: '#FFF', border: '1px solid #EF4444',
                        padding: '6px 0', borderRadius: 2, fontSize: 11,
                        fontFamily: 'var(--font-mono)', fontWeight: 700, cursor: 'pointer',
                        marginTop: 6
                      }}
                    >
                      APPLY DATE RANGE
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Card 4: Analysis Tools */}
            {selectedGraph && (
              <div style={{
                background: 'rgba(5, 10, 20, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '14px 18px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Compass size={15} color="#A855F7" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>
                      ANALYSIS TOOLS
                    </span>
                  </div>
                  {lines.length > 0 && (
                    <button
                      onClick={clearLines}
                      title="Clear all drawn lines"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#EF4444',
                        fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                        padding: '2px 8px', borderRadius: 2, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <Trash2 size={11} />
                      CLEAR ALL
                    </button>
                  )}
                </div>

                <button
                  onClick={toggleDrawingMode}
                  style={{
                    width: '100%',
                    background: drawingMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${drawingMode ? '#EF4444' : 'rgba(255,255,255,0.15)'}`,
                    color: drawingMode ? '#EF4444' : '#F8FAFC',
                    padding: '8px 12px', borderRadius: 2,
                    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <Compass size={14} />
                  {drawingMode ? 'DRAWING: ACTIVE (CLICK 2 POINTS)' : 'ENABLE TREND LINE TOOL'}
                </button>

                {drawingMode && (
                  <div style={{
                    fontSize: 10, color: '#FBBF24', fontFamily: 'var(--font-mono)',
                    marginTop: 6, lineHeight: 1.4
                  }}>
                    {pendingP1 ? '● จุดที่ 1 ถูกเลือกแล้ว — คลิกจุดที่ 2 เพื่อสร้างเส้น' : '● คลิกจุดที่ 1 บนกราฟเพื่อเริ่มลากเส้น'}
                  </div>
                )}

                {/* List of drawn lines with delete buttons */}
                {lines.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      DRAWN LINES ({lines.length}):
                    </div>
                    {lines.map((l, i) => (
                      <div
                        key={l.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid rgba(255,255,255,0.08)`,
                          borderLeft: `3px solid ${l.color}`,
                          padding: '4px 8px', borderRadius: 2,
                          fontSize: 10, fontFamily: 'var(--font-mono)'
                        }}
                      >
                        <span style={{ color: '#CBD5E1' }}>Line #{i + 1}</span>
                        <button
                          onClick={() => removeLine(l.id)}
                          title="Delete this line"
                          style={{
                            background: 'transparent', border: 'none',
                            color: '#EF4444', cursor: 'pointer', padding: 2,
                            display: 'flex', alignItems: 'center'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
