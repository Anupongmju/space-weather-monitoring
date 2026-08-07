import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  Activity,
  Clock,
  RefreshCw,
  Zap,
  Wind,
  Layers,
  Globe,
  Satellite,
  Calendar
} from 'lucide-react'
import { loadStereo, loadSolar1, loadCrater, fetchAllRadiation } from '../services/radiationService'
import { loadProton, loadElectron } from '../services/goesService'
import { loadNeutron } from '../services/cosmicService'
import { useAutoFetch } from '../hooks/useAutoFetch'
import { useChartPan } from '../hooks/useChartPan'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import InstrumentInfoGuide from '../components/ui/InstrumentInfoGuide'
import { useLineDrawing } from '../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../components/ui/TrendLineOverlay'

type TimeRange = 360 | 1440 | 4320 | 10080
const TIME_LABELS: Record<number, string> = { 360: '6H', 1440: '1D', 4320: '3D', 10080: '7D' }

const getTodayStr = () => new Date().toISOString().split('T')[0]
const getPastDateStr = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function DateInputDDMMYYYY({
  value,
  onChange,
  accentColor = '#38BDF8',
}: {
  value: string
  onChange: (val: string) => void
  accentColor?: string
}) {
  const hiddenRef = useRef<HTMLInputElement>(null)

  const formatDisplay = (iso: string) => {
    if (!iso) return ''
    const parts = iso.split('-')
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso
  }

  const parseDisplay = (disp: string) => {
    const parts = disp.split('/')
    if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
    return null
  }

  const [inputText, setInputText] = useState(formatDisplay(value))
  useEffect(() => { setInputText(formatDisplay(value)) }, [value])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputText(raw)
    const iso = parseDisplay(raw)
    if (iso && !isNaN(new Date(iso).getTime())) onChange(iso)
  }

  const openPicker = () => {
    try { hiddenRef.current?.showPicker() } catch { hiddenRef.current?.focus() }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="DD/MM/YYYY"
        value={inputText}
        onChange={handleTextChange}
        style={{
          width: 115, background: 'rgba(2, 6, 23, 0.9)', color: '#F8FAFC',
          border: '1px solid rgba(255, 255, 255, 0.2)', padding: '3px 24px 3px 8px',
          fontSize: 11, fontFamily: 'var(--font-mono)', outline: 'none', textAlign: 'center'
        }}
      />
      <button
        type="button" onClick={openPicker}
        style={{ position: 'absolute', right: 4, background: 'transparent', border: 'none', color: accentColor, cursor: 'pointer' }}
      >
        <Calendar size={13} />
      </button>
      <input
        ref={hiddenRef} type="date" value={value}
        onChange={e => e.target.value && onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />
    </div>
  )
}

export default function RadiationMonitoring() {
  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  const [activeMainTab, setActiveMainTab] = useState<'particles' | 'cosmic'>('particles')
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeGuideTab, setActiveGuideTab] = useState('usage')

  // Date range picker states
  const [isCustomDate, setIsCustomDate] = useState(false)
  const [startDateInput, setStartDateInput] = useState(getPastDateStr(3))
  const [endDateInput, setEndDateInput] = useState(getTodayStr())
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)

  // Trend line drawing
  const { lines, drawingMode, pendingP1, toggleDrawingMode, handleClick, removeLine, clearLines } = useLineDrawing()

  // Data states
  const [stereoData, setStereoData] = useState<any[]>([])
  const [solar1Data, setSolar1Data] = useState<any[]>([])
  const [goesProtonData, setGoesProtonData] = useState<any[]>([])
  const [goesElectronData, setGoesElectronData] = useState<any[]>([])
  const [craterData, setCraterData] = useState<any[]>([])
  const [sopoData, setSopoData] = useState<any[]>([])
  const [ouluData, setOuluData] = useState<any[]>([])

  const normEnergy = (e: string) => {
    if (!e) return ''
    let s = e.trim()
    if (!s.startsWith('>=')) s = '>=' + s
    return s.replace(/>=\s+/, '>=')
  }

  const pivotGoes = (d: any[]) => {
    const map: Record<string, any> = {}
    d.forEach(r => {
      if (!r || !r.time_tag) return
      if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
      const key = normEnergy(r.energy)
      const flux = floatVal(r.flux)
      map[r.time_tag][key] = flux > 0 ? flux : null
    })
    return Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }

  const floatVal = (v: any) => {
    if (v === null || v === undefined) return 0
    const f = float(v)
    return isNaN(f) ? 0 : f
  }
  function float(v: any) { return Number(v) }

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = isCustomDate && appliedRange ? appliedRange.startDate : undefined
      const eDate = isCustomDate && appliedRange ? appliedRange.endDate : undefined

      const [stereo, solar1, crater, gProton, gElectron, sopo, oulu] = await Promise.all([
        loadStereo(limit, sDate, eDate),
        loadSolar1(limit, sDate, eDate),
        loadCrater(limit, sDate, eDate),
        loadProton(limit, sDate, eDate),
        loadElectron(limit, sDate, eDate),
        loadNeutron('SOPO', limit, sDate, eDate),
        loadNeutron('OULU', limit, sDate, eDate),
      ])

      setStereoData(Array.isArray(stereo) ? stereo : [])
      setSolar1Data(Array.isArray(solar1) ? solar1 : [])
      setCraterData(Array.isArray(crater) ? crater : [])
      setGoesProtonData(Array.isArray(gProton) ? pivotGoes(gProton) : [])
      setGoesElectronData(Array.isArray(gElectron) ? pivotGoes(gElectron) : [])
      setSopoData(Array.isArray(sopo) ? sopo : [])
      setOuluData(Array.isArray(oulu) ? oulu : [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load radiation data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setFetching(true)
    try {
      await fetchAllRadiation()
    } catch (e) {
      console.error('Refresh error:', e)
    }
    await loadData(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data: stereoData.length ? stereoData : craterData,
    setData: activeMainTab === 'particles' ? setStereoData : setCraterData,
    loadHistorical: async (start, end) => {
      const [st, s1, cr, gp, ge, sp, ou] = await Promise.all([
        loadStereo(0, start, end),
        loadSolar1(0, start, end),
        loadCrater(0, start, end),
        loadProton(0, start, end),
        loadElectron(0, start, end),
        loadNeutron('SOPO', 0, start, end),
        loadNeutron('OULU', 0, start, end),
      ])

      const merge = (prev: any[], older: any[], key = 'time_tag') => {
        if (!older || older.length === 0) return prev
        const existingKeys = new Set(prev.map((d: any) => d[key]))
        const fresh = older.filter((d: any) => !existingKeys.has(d[key]))
        if (fresh.length === 0) return prev
        return [...fresh, ...prev].sort((a: any, b: any) => new Date(a[key]).getTime() - new Date(b[key]).getTime())
      }

      if (st?.length) setStereoData(prev => merge(prev, st))
      if (s1?.length) setSolar1Data(prev => merge(prev, s1))
      if (cr?.length) setCraterData(prev => merge(prev, cr))
      if (gp?.length) setGoesProtonData(prev => merge(prev, pivotGoes(gp)))
      if (ge?.length) setGoesElectronData(prev => merge(prev, pivotGoes(ge)))
      if (sp?.length) setSopoData(prev => merge(prev, sp))
      if (ou?.length) setOuluData(prev => merge(prev, ou))

      return activeMainTab === 'particles' ? (st.length ? st : s1) : (cr.length ? cr : ou)
    },
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    loadData(true)
  }, [limit, appliedRange, isCustomDate, activeMainTab])

  useAutoFetch(async () => {
    await loadData(false)
  }, 60000, !appliedRange)

  // Shared styles
  const axisLabelStyle = { color: '#F8FAFC', fontSize: 13, fontFamily: 'monospace, sans-serif', fontWeight: 600 }
  const splitLineStyle = { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' as const } }

  const xAxisBase = (gi: number, showLabel: boolean) => ({
    gridIndex: gi,
    type: 'time' as const,
    splitLine: splitLineStyle,
    axisLabel: showLabel ? axisLabelStyle : { show: false },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  })

  const yAxisBase = (gi: number, name: string, color: string, type: 'value' | 'log' = 'value') => ({
    gridIndex: gi,
    type,
    name,
    nameLocation: 'middle' as const,
    nameGap: 55,
    nameTextStyle: { color, fontSize: 13, fontFamily: 'sans-serif', fontWeight: 700 },
    splitLine: splitLineStyle,
    axisLabel: { ...axisLabelStyle, color: '#F8FAFC' },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  })

  // Helper to sanitize positive log values
  const safeLog = (val: any) => {
    if (val === null || val === undefined) return null
    const n = Number(val)
    return !isNaN(n) && n > 0 ? n : null
  }

  // Helper to sanitize linear values
  const safeLinear = (val: any, maxVal = 5000) => {
    if (val === null || val === undefined) return null
    const n = Number(val)
    return !isNaN(n) && n >= 0 && n < maxVal ? n : null
  }

  // Calculate independent tier window range based strictly on each dataset's own latest timestamp and window limit
  const getIndependentTierRange = (data: any[], windowMinutes: number, timeKey = 'time_tag', paddingRatio = 0.25) => {
    if (!data || data.length === 0) return { min: undefined, max: undefined }
    const validTimes = data.map(d => new Date(d[timeKey]).getTime()).filter(t => !isNaN(t))
    if (validTimes.length === 0) return { min: undefined, max: undefined }

    const maxTs = Math.max(...validTimes)
    const windowMs = (windowMinutes || 1440) * 60 * 1000
    const minTs = maxTs - windowMs
    const paddedMax = minTs + (windowMs / (1 - paddingRatio))
    return { min: minTs, max: paddedMax }
  }

  const stereoRange = useMemo(() => getIndependentTierRange(stereoData, limit), [stereoData, limit])
  const solar1Range = useMemo(() => getIndependentTierRange(solar1Data, limit), [solar1Data, limit])
  const goesRange = useMemo(() => getIndependentTierRange(goesProtonData, limit), [goesProtonData, limit])
  const craterRange = useMemo(() => getIndependentTierRange(craterData, limit), [craterData, limit])
  const nmdbRange = useMemo(() => getIndependentTierRange(ouluData, limit), [ouluData, limit])

  // ── TAB 1: SPACE PROTONS & ELECTRONS OPTION (4 TIERS) ──
  const particlesOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: '#0F172A',
      borderColor: 'rgba(56, 189, 248, 0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line' as const, lineStyle: { color: '#38BDF8', type: 'dashed' as const, width: 1.5 } },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const rawTime = params[0].axisValueLabel || params[0].value[0]
        let timeStr = rawTime
        if (typeof rawTime === 'number') {
          timeStr = new Date(rawTime).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        }

        let html = `<div style="font-family: var(--font-mono); font-size: 11px; min-width: 260px;">`
        html += `<div style="color: #38BDF8; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px; font-weight: 700;">⏱ ${timeStr}</div>`

        params.forEach((p: any) => {
          if (!p) return
          const name = p.seriesName
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          if (val === undefined || val === null) return

          let valDisplay = typeof val === 'number' ? (val < 0.01 || val > 10000 ? val.toExponential(2) : val.toFixed(2)) : val
          html += `<div style="display: flex; justify-content: space-between; gap: 16px; padding: 2px 0;">`
          html += `<span style="color: ${p.color};">● ${name}:</span>`
          html += `<span style="font-weight: 700; color: #FFF; font-family: monospace;">${valDisplay}</span>`
          html += `</div>`
        })
        html += `</div>`
        return html
      }
    },
    axisPointer: { snap: true },
    dataZoom: [
      { type: 'inside' as const, xAxisIndex: [0], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'inside' as const, xAxisIndex: [1], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'inside' as const, xAxisIndex: [2], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'inside' as const, xAxisIndex: [3], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'inside' as const, xAxisIndex: [4], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'inside' as const, xAxisIndex: [5], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
    ],
    grid: [
      { top: 35,  left: 95, right: 85, height: 130 },
      { top: 210, left: 95, right: 85, height: 130 },
      { top: 385, left: 95, right: 85, height: 130 },
      { top: 560, left: 95, right: 85, height: 130 },
      { top: 735, left: 95, right: 85, height: 130 },
      { top: 910, left: 95, right: 85, height: 130 },
    ],
    xAxis: [
      { ...xAxisBase(0, true), min: stereoRange.min, max: stereoRange.max },
      { ...xAxisBase(1, true), min: stereoRange.min, max: stereoRange.max },
      { ...xAxisBase(2, true), min: solar1Range.min, max: solar1Range.max },
      { ...xAxisBase(3, true), min: solar1Range.min, max: solar1Range.max },
      { ...xAxisBase(4, true), min: goesRange.min,   max: goesRange.max },
      { ...xAxisBase(5, true), min: goesRange.min,   max: goesRange.max },
    ],
    yAxis: [
      yAxisBase(0, 'STEREO Electron', '#38BDF8', 'log'),
      yAxisBase(1, 'STEREO Proton', '#F59E0B', 'log'),
      yAxisBase(2, 'Solar-1 Ions (pfu)', '#38BDF8', 'log'),
      yAxisBase(3, 'Solar-1 Electrons (pfu)', '#22C55E', 'log'),
      yAxisBase(4, 'GOES-18 Proton (pfu)', '#FBBF24', 'log'),
      yAxisBase(5, 'GOES-18 Electron (pfu)', '#A855F7', 'log'),
    ],
    series: [
      // STEREO Electron
      {
        name: 'STEREO Ele (45-55 keV)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' },
        markLine: buildMarkLines(lines, 0),
        data: stereoData.map(d => [d.time_tag, safeLog(d.ele_b02)])
      },
      {
        name: 'STEREO Ele (75-85 keV)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#0EA5E9' }, itemStyle: { color: '#0EA5E9' },
        data: stereoData.map(d => [d.time_tag, safeLog(d.ele_b05)])
      },
      {
        name: 'STEREO Ele (165-195 keV)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#0284C7' }, itemStyle: { color: '#0284C7' },
        data: stereoData.map(d => [d.time_tag, safeLog(d.ele_b10)])
      },
      // STEREO Proton
      {
        name: 'STEREO Pro (84-92 keV)', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' },
        markLine: buildMarkLines(lines, 1),
        data: stereoData.map(d => [d.time_tag, safeLog(d.pro_b02)])
      },
      {
        name: 'STEREO Pro (110-118 keV)', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#EF4444' }, itemStyle: { color: '#EF4444' },
        data: stereoData.map(d => [d.time_tag, safeLog(d.pro_b05)])
      },
      {
        name: 'STEREO Pro (192-219 keV)', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#DC2626' }, itemStyle: { color: '#DC2626' },
        data: stereoData.map(d => [d.time_tag, safeLog(d.pro_b10)])
      },
      // Solar-1 Ions (8 Channels: p1 - p8)
      {
        name: 'p1: 47–68 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#EC4899' }, itemStyle: { color: '#EC4899' },
        markLine: buildMarkLines(lines, 2),
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p1)])
      },
      {
        name: 'p2: 68–117 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F97316' }, itemStyle: { color: '#F97316' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p2)])
      },
      {
        name: 'p3: 116–180 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p3)])
      },
      {
        name: 'p4: 180–342 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#EAB308' }, itemStyle: { color: '#EAB308' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p4)])
      },
      {
        name: 'p5: 342–537 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#22C55E' }, itemStyle: { color: '#22C55E' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p5)])
      },
      {
        name: 'p6: 537–1061 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#06B6D4' }, itemStyle: { color: '#06B6D4' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p6)])
      },
      {
        name: 'p7: 1061–1847 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#3B82F6' }, itemStyle: { color: '#3B82F6' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p7)])
      },
      {
        name: 'p8: 1847–5263 keV', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#A855F7' }, itemStyle: { color: '#A855F7' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p8)])
      },

      // Solar-1 Electrons (4 Channels: de1 - de4)
      {
        name: 'de1: 47–63 keV', type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F43F5E' }, itemStyle: { color: '#F43F5E' },
        markLine: buildMarkLines(lines, 3),
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de1)])
      },
      {
        name: 'de2: 63–104 keV', type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#FB923C' }, itemStyle: { color: '#FB923C' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de2)])
      },
      {
        name: 'de3: 104–169 keV', type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de3)])
      },
      {
        name: 'de4: 169–333 keV', type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#4ADE80' }, itemStyle: { color: '#4ADE80' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de4)])
      },
      // GOES Proton (Tier 4)
      {
        name: 'GOES Proton ≥10 MeV', type: 'line', xAxisIndex: 4, yAxisIndex: 4,
        showSymbol: false, connectNulls: true, lineStyle: { width: 2, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' },
        markLine: buildMarkLines(lines, 4),
        data: goesProtonData.map(d => [d.time_tag, safeLog(d['>=10 MeV'] ?? d['>=10MeV'])])
      },
      {
        name: 'GOES Proton ≥50 MeV', type: 'line', xAxisIndex: 4, yAxisIndex: 4,
        showSymbol: false, connectNulls: true, lineStyle: { width: 2, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' },
        data: goesProtonData.map(d => [d.time_tag, safeLog(d['>=50 MeV'] ?? d['>=50MeV'])])
      },
      {
        name: 'GOES Proton ≥100 MeV', type: 'line', xAxisIndex: 4, yAxisIndex: 4,
        showSymbol: false, connectNulls: true, lineStyle: { width: 2, color: '#EF4444' }, itemStyle: { color: '#EF4444' },
        data: goesProtonData.map(d => [d.time_tag, safeLog(d['>=100 MeV'] ?? d['>=100MeV'])])
      },
      // GOES Electron (Tier 5)
      {
        name: 'GOES Electron ≥2.0 MeV', type: 'line', xAxisIndex: 5, yAxisIndex: 5,
        showSymbol: false, connectNulls: true, lineStyle: { width: 2, color: '#A855F7' }, itemStyle: { color: '#A855F7' },
        markLine: buildMarkLines(lines, 5),
        data: goesElectronData.map(d => [d.time_tag, safeLog(d['>=2 MeV'] ?? d['>=2.0 MeV'] ?? d['>=2MeV'])])
      }
    ]
  }), [stereoData, solar1Data, goesProtonData, goesElectronData, limit, zoomRange, lines])

  // ── TAB 2: COSMIC & LUNAR RADIATION OPTION (3 TIERS) ──
  const cosmicOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: '#0F172A',
      borderColor: 'rgba(244, 63, 94, 0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line' as const, lineStyle: { color: '#F43F5E', type: 'dashed' as const, width: 1.5 } },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const rawTime = params[0].axisValueLabel || params[0].value[0]
        let timeStr = rawTime
        if (typeof rawTime === 'number') {
          timeStr = new Date(rawTime).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        }

        let html = `<div style="font-family: var(--font-mono); font-size: 11px; min-width: 260px;">`
        html += `<div style="color: #F43F5E; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px; font-weight: 700;">⏱ ${timeStr}</div>`

        params.forEach((p: any) => {
          if (!p) return
          const name = p.seriesName
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          if (val === undefined || val === null) return

          let valDisplay = typeof val === 'number' ? val.toFixed(4) : val
          html += `<div style="display: flex; justify-content: space-between; gap: 16px; padding: 2px 0;">`
          html += `<span style="color: ${p.color};">● ${name}:</span>`
          html += `<span style="font-weight: 700; color: #FFF; font-family: monospace;">${valDisplay}</span>`
          html += `</div>`
        })
        html += `</div>`
        return html
      }
    },
    axisPointer: { snap: true },
    dataZoom: [
      { type: 'inside' as const, xAxisIndex: [0], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'inside' as const, xAxisIndex: [1], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'inside' as const, xAxisIndex: [2], filterMode: 'none' as const, zoomOnMouseWheel: true, moveOnMouseMove: true },
    ],
    grid: [
      { top: 35,  left: 95, right: 85, height: 200 },
      { top: 280, left: 95, right: 85, height: 200 },
      { top: 530, left: 95, right: 85, height: 200 },
    ],
    xAxis: [
      { ...xAxisBase(0, true), min: craterRange.min, max: craterRange.max },
      { ...xAxisBase(1, true), min: craterRange.min, max: craterRange.max },
      { ...xAxisBase(2, true), min: nmdbRange.min,   max: nmdbRange.max },
    ],
    yAxis: [
      yAxisBase(0, 'CRaTER Paired (cGy/day)', '#F43F5E'),
      yAxisBase(1, 'CRaTER Single (cGy/day)', '#FB923C'),
      yAxisBase(2, 'NMDB Neutron (cts/sec)', '#38BDF8'),
    ],
    series: [
      // CRaTER Paired
      {
        name: 'D1&2 (Thin Silicon)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, lineStyle: { width: 2, color: '#F43F5E' }, itemStyle: { color: '#F43F5E' },
        markLine: buildMarkLines(lines, 0),
        data: craterData.map(d => [d.time_tag, d.d12])
      },
      {
        name: 'D3&4 (Thick Silicon)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, lineStyle: { width: 2, color: '#FB923C' }, itemStyle: { color: '#FB923C' },
        data: craterData.map(d => [d.time_tag, d.d34])
      },
      {
        name: 'D5&6 (Tissue Eq)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, lineStyle: { width: 2, color: '#A855F7' }, itemStyle: { color: '#A855F7' },
        data: craterData.map(d => [d.time_tag, d.d56])
      },
      // CRaTER Single Detectors D1 - D6
      {
        name: 'D1 Detector', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, lineStyle: { width: 1.5, color: '#F43F5E' }, itemStyle: { color: '#F43F5E' },
        markLine: buildMarkLines(lines, 1),
        data: craterData.map(d => [d.time_tag, d.d1])
      },
      {
        name: 'D2 Detector', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, lineStyle: { width: 1.5, color: '#FB923C' }, itemStyle: { color: '#FB923C' },
        data: craterData.map(d => [d.time_tag, d.d2])
      },
      {
        name: 'D3 Detector', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, lineStyle: { width: 1.5, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' },
        data: craterData.map(d => [d.time_tag, d.d3])
      },
      {
        name: 'D4 Detector', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, lineStyle: { width: 1.5, color: '#34D399' }, itemStyle: { color: '#34D399' },
        data: craterData.map(d => [d.time_tag, d.d4])
      },
      {
        name: 'D5 Detector', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, lineStyle: { width: 1.5, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' },
        data: craterData.map(d => [d.time_tag, d.d5])
      },
      {
        name: 'D6 Detector', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, lineStyle: { width: 1.5, color: '#A855F7' }, itemStyle: { color: '#A855F7' },
        data: craterData.map(d => [d.time_tag, d.d6])
      },
      // NMDB Neutron Monitors
      {
        name: 'SOPO (South Pole, Antarctica)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, lineStyle: { width: 2, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' },
        markLine: buildMarkLines(lines, 2),
        data: sopoData.filter((d: any) => d.count_rate > 0).map((d: any) => [d.time_tag, d.count_rate])
      },
      {
        name: 'OULU (Finland)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, lineStyle: { width: 2, color: '#22C55E' }, itemStyle: { color: '#22C55E' },
        data: ouluData.filter((d: any) => d.count_rate > 0).map((d: any) => [d.time_tag, d.count_rate])
      }
    ]
  }), [craterData, sopoData, ouluData, zoomRange, lines])

  const GRID_UNITS_TAB1 = ['intensity', 'intensity', 'pfu', 'pfu', 'pfu', 'pfu']
  const GRID_UNITS_TAB2 = ['cGy/day', 'cGy/day', 'cts/sec']

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Seamless Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 16, paddingBottom: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 26,
              fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: -0.5
            }}>
              SPACE RADIATION & PARTICLE MONITORING
            </h1>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
              Heliospheric Space Particle Flux & Lunar Surface Radiation Dosimetry
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {panLoading && (
              <span style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            )}
            {/* Trend Line Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {drawingMode && (
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: pendingP1 ? '#FBBF24' : '#A78BFA', fontWeight: 600 }}>
                  {pendingP1 ? '● P1 SET — CLICK P2' : '○ CLICK P1 ON ANY CHART'}
                </span>
              )}
              <button
                onClick={toggleDrawingMode}
                style={{
                  padding: '4px 10px', background: drawingMode ? 'rgba(167,139,250,0.2)' : 'transparent',
                  border: `1px solid ${drawingMode ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`,
                  color: drawingMode ? '#A78BFA' : '#94A3B8', fontFamily: 'var(--font-mono)', fontSize: 10,
                  fontWeight: 600, cursor: 'pointer', borderRadius: 2
                }}
              >
                {drawingMode ? '╱ DRAWING ON' : '╱ DRAW LINE'}
              </button>
              {lines.length > 0 && (
                <button
                  onClick={clearLines}
                  style={{
                    padding: '4px 10px', background: 'transparent', border: '1px solid rgba(248,113,113,0.4)',
                    color: '#F87171', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, cursor: 'pointer', borderRadius: 2
                  }}
                >
                  CLEAR ({lines.length})
                </button>
              )}
            </div>

            <button
              onClick={handleRefresh} disabled={fetching}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                background: 'transparent', border: 'none', color: '#38BDF8',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, cursor: fetching ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={13} style={{ animation: fetching ? 'spin 1s linear infinite' : 'none' }} />
              {fetching ? 'SYNCING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Main Tab Bar & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, background: 'rgba(15, 23, 42, 0.65)', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={() => setActiveMainTab('particles')}
              style={{
                padding: '8px 18px', background: activeMainTab === 'particles' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: 'none', borderBottom: activeMainTab === 'particles' ? '2px solid #38BDF8' : '2px solid transparent',
                color: activeMainTab === 'particles' ? '#38BDF8' : '#94A3B8',
                fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              SPACE PROTONS & ELECTRONS
            </button>
            <button
              onClick={() => setActiveMainTab('cosmic')}
              style={{
                padding: '8px 18px', background: activeMainTab === 'cosmic' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
                border: 'none', borderBottom: activeMainTab === 'cosmic' ? '2px solid #F43F5E' : '2px solid transparent',
                color: activeMainTab === 'cosmic' ? '#F43F5E' : '#94A3B8',
                fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              COSMIC & LUNAR RADIATION
            </button>
          </div>

          {/* Time Preset Pills & Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(15, 23, 42, 0.65)', padding: '3px 6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {([360, 1440, 4320, 10080] as TimeRange[]).map(v => (
                <button
                  key={v}
                  onClick={() => { setIsCustomDate(false); setAppliedRange(null); setLimit(v); }}
                  style={{
                    padding: '4px 10px', background: (!isCustomDate && limit === v) ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    border: 'none', borderBottom: (!isCustomDate && limit === v) ? '2px solid #38BDF8' : '2px solid transparent',
                    color: (!isCustomDate && limit === v) ? '#F8FAFC' : '#94A3B8', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {TIME_LABELS[v]}
                </button>
              ))}
              <button
                onClick={() => setIsCustomDate(prev => !prev)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                  background: isCustomDate ? 'rgba(56, 189, 248, 0.25)' : 'transparent', border: 'none',
                  borderBottom: isCustomDate ? '2px solid #38BDF8' : '2px solid transparent',
                  color: isCustomDate ? '#F8FAFC' : '#94A3B8', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Calendar size={13} /> CUSTOM
              </button>
            </div>

            {isCustomDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(15, 23, 42, 0.85)', padding: '4px 12px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>FROM:</span>
                  <DateInputDDMMYYYY value={startDateInput} onChange={setStartDateInput} accentColor="#38BDF8" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>TO:</span>
                  <DateInputDDMMYYYY value={endDateInput} onChange={setEndDateInput} accentColor="#38BDF8" />
                </div>
                <button
                  onClick={() => startDateInput && endDateInput && setAppliedRange({ startDate: startDateInput, endDate: endDateInput })}
                  style={{ padding: '4px 12px', background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)', color: '#FFF', border: 'none', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  APPLY
                </button>
              </div>
            )}
          </div>
        </div>



        {/* Multi-tier Synchronized Frameless Plate */}
        {loading && stereoData.length === 0 && craterData.length === 0 ? (
          <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <div
            ref={chartWrapperRef}
            style={{
              position: 'relative', width: '100%', background: 'rgba(10, 15, 30, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.06)', padding: '16px 0',
              backdropFilter: 'blur(8px)', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)'
            }}
          >
            <ReactECharts
              ref={chartRef}
              notMerge={true}
              option={activeMainTab === 'particles' ? particlesOption : cosmicOption}
              style={{ height: activeMainTab === 'particles' ? 1140 : 810, width: '100%' }}
              onChartReady={onChartReady}
              onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
            />

            <TrendLineOverlay
              chartRef={chartRef}
              wrapperRef={chartWrapperRef}
              gridCount={activeMainTab === 'particles' ? 6 : 3}
              gridUnits={activeMainTab === 'particles' ? GRID_UNITS_TAB1 : GRID_UNITS_TAB2}
              lines={lines}
              drawingMode={drawingMode}
              pendingP1={pendingP1}
              onChartClick={handleClick}
              onRemoveLine={removeLine}
            />

            {/* Divider lines between tiers */}
            {(activeMainTab === 'particles' ? [210, 385, 560, 735, 910] : [300, 560]).map(top => (
              <div key={top} style={{ position: 'absolute', left: 95, right: 85, top, height: 1, background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            ))}
          </div>
        )}

        {/* Footer info & Data Sources */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
            {activeMainTab === 'particles' ? (
              <>
                <span><strong style={{ color: '#38BDF8' }}>STEREO A</strong> Uni Kiel SEPT</span>
                <span><strong style={{ color: '#22C55E' }}>Solar-1</strong> NOAA SWPC RTSW</span>
                <span><strong style={{ color: '#A855F7' }}>GOES-18</strong> Primary GOES Satellite</span>
              </>
            ) : (
              <>
                <span><strong style={{ color: '#F43F5E' }}>CRaTER</strong> LRO Lunar Radiation</span>
                <span><strong style={{ color: '#38BDF8' }}>SOPO</strong> South Pole Station</span>
                <span><strong style={{ color: '#22C55E' }}>OULU</strong> Finland Station</span>
              </>
            )}
          </div>

          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <Clock size={12} />
              Synced: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>


      </div>
    </div>
  )
}
