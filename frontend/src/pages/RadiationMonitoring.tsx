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
import { loadStereo, loadSolar1, loadCrater, loadAceEpam, loadAceSis, fetchAllRadiation } from '../services/radiationService'
import { loadProton, loadElectron } from '../services/goesService'
import { loadNeutron } from '../services/cosmicService'
import { useAutoFetch } from '../hooks/useAutoFetch'
import { useChartPan } from '../hooks/useChartPan'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import InstrumentInfoGuide from '../components/ui/InstrumentInfoGuide'
import { useLineDrawing } from '../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../components/ui/TrendLineOverlay'
import { formatPowerOf10 } from '../utils/formatters'

const GOES_PROTON_COLORS: Record<string, string> = {
  '>=1 MeV': '#60A5FA',   // Bright Blue
  '>=5 MeV': '#34D399',   // Bright Emerald
  '>=10 MeV': '#FBBF24',  // Bright Amber
  '>=30 MeV': '#F97316',  // Bright Orange
  '>=50 MeV': '#38BDF8',  // Bright Cyan
  '>=60 MeV': '#A855F7',  // Bright Purple
  '>=100 MeV': '#EF4444', // Bright Red
  '>=500 MeV': '#EC4899', // Bright Pink
}

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
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="DD/MM/YYYY"
        maxLength={10}
        value={text}
        onChange={handleTextChange}
        style={{
          width: 95,
          padding: '3px 6px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: `1px solid ${accentColor}66`,
          color: '#F8FAFC',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          textAlign: 'center',
          borderRadius: 2,
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => {
          const el = dateInputRef.current as any;
          if (el) {
            if (typeof el.showPicker === 'function') {
              el.showPicker();
            } else {
              el.focus();
            }
          }
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: accentColor,
          cursor: 'pointer',
          padding: '0 4px',
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

export default function RadiationMonitoring() {
  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  const [activeMainTab, setActiveMainTab] = useState<'protons' | 'electrons' | 'cosmic'>('protons')
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
  const [aceEpamData, setAceEpamData] = useState<any[]>([])
  const [aceSisData, setAceSisData] = useState<any[]>([])
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

      const [stereo, solar1, epam, sis, crater, gProton, gElectron, sopo, oulu] = await Promise.all([
        loadStereo(limit, sDate, eDate),
        loadSolar1(limit, sDate, eDate),
        loadAceEpam(limit, sDate, eDate),
        loadAceSis(limit, sDate, eDate),
        loadCrater(limit, sDate, eDate),
        loadProton(limit, sDate, eDate),
        loadElectron(limit, sDate, eDate),
        loadNeutron('SOPO', limit, sDate, eDate),
        loadNeutron('OULU', limit, sDate, eDate),
      ])

      setStereoData(Array.isArray(stereo) ? stereo : [])
      setSolar1Data(Array.isArray(solar1) ? solar1 : [])
      setAceEpamData(Array.isArray(epam) ? epam : [])
      setAceSisData(Array.isArray(sis) ? sis : [])
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
    data: activeMainTab === 'cosmic' ? craterData : stereoData,
    setData: activeMainTab === 'cosmic' ? setCraterData : setStereoData,
    loadHistorical: async (start, end) => {
      const [st, s1, ep, si, cr, gp, ge, sp, ou] = await Promise.all([
        loadStereo(0, start, end),
        loadSolar1(0, start, end),
        loadAceEpam(0, start, end),
        loadAceSis(0, start, end),
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
      if (ep?.length) setAceEpamData(prev => merge(prev, ep))
      if (si?.length) setAceSisData(prev => merge(prev, si))
      if (cr?.length) setCraterData(prev => merge(prev, cr))
      if (gp?.length) setGoesProtonData(prev => merge(prev, pivotGoes(gp)))
      if (ge?.length) setGoesElectronData(prev => merge(prev, pivotGoes(ge)))
      if (sp?.length) setSopoData(prev => merge(prev, sp))
      if (ou?.length) setOuluData(prev => merge(prev, ou))

      return activeMainTab === 'cosmic' ? (cr.length ? cr : ou) : (st.length ? st : s1)
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

  const yAxisBase = (gi: number, type: 'value' | 'log' = 'value') => ({
    gridIndex: gi,
    type,
    splitLine: splitLineStyle,
    axisLabel: {
      ...axisLabelStyle,
      color: '#F8FAFC',
      ...(type === 'log' ? { formatter: formatPowerOf10 } : {}),
    },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    scale: true,
  })

  // Helper to sanitize positive log values (stripping noise floor < 0.01 pfu)
  const safeLog = (val: any, minThreshold = 0.01) => {
    if (val === null || val === undefined) return null
    const n = Number(val)
    return !isNaN(n) && n >= minThreshold ? n : null
  }

  // Calculate independent tier window range
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
  const epamRange = useMemo(() => getIndependentTierRange(aceEpamData, limit), [aceEpamData, limit])
  const sisRange = useMemo(() => getIndependentTierRange(aceSisData, limit), [aceSisData, limit])
  const goesRange = useMemo(() => getIndependentTierRange(goesProtonData, limit), [goesProtonData, limit])
  const craterRange = useMemo(() => getIndependentTierRange(craterData, limit), [craterData, limit])
  const nmdbRange = useMemo(() => getIndependentTierRange(ouluData, limit), [ouluData, limit])

  const goesProtonEnergies = useMemo(() => {
    const set = new Set<string>()
    goesProtonData.forEach(d => {
      Object.keys(d).forEach(k => {
        if (k !== 'time_tag' && d[k] != null) set.add(k)
      })
    })
    const list = Array.from(set).sort((a, b) => {
      const numA = parseFloat(a.replace(/[^0-9.]/g, '')) || 0
      const numB = parseFloat(b.replace(/[^0-9.]/g, '')) || 0
      return numA - numB
    })
    return list.length > 0 ? list : ['>=1 MeV', '>=5 MeV', '>=10 MeV', '>=30 MeV', '>=50 MeV', '>=60 MeV', '>=100 MeV', '>=500 MeV']
  }, [goesProtonData])

  const tooltipBase = (headerColor: string) => ({
    trigger: 'axis' as const,
    backgroundColor: '#0F172A',
    borderColor: `${headerColor}99`,
    borderWidth: 1.5,
    padding: 14,
    textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
    extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
    axisPointer: { type: 'line' as const, lineStyle: { color: headerColor, type: 'dashed' as const, width: 1.5 } },
    formatter: (params: any) => {
      if (!params || params.length === 0) return ''
      const rawTime = params[0].axisValueLabel || params[0].value[0]
      let timeStr = rawTime
      if (typeof rawTime === 'number') {
        timeStr = new Date(rawTime).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      }

      let html = `<div style="font-family: var(--font-mono); font-size: 11px; min-width: 260px;">`
      html += `<div style="color: ${headerColor}; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px; font-weight: 700;">⏱ ${timeStr}</div>`

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
  })

  // ── TAB 1: SPACE PROTONS OPTION (5 TIERS: STEREO, Solar-1, ACE EPAM, ACE SIS, GOES-18) ──
  const protonsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    title: [
      { text: '● STEREO Proton (pfu)', left: 75, top: 18, textStyle: { color: '#F59E0B', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● Solar-1 STIS Ions (pfu)', left: 75, top: 298, textStyle: { color: '#F97316', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● ACE EPAM Ions (pfu)', left: 75, top: 578, textStyle: { color: '#EC4899', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● ACE SIS High-Energy Proton (pfu)', left: 75, top: 858, textStyle: { color: '#38BDF8', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● GOES-18 SEISS Proton (pfu)', left: 75, top: 1138, textStyle: { color: '#FBBF24', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
    ],
    tooltip: tooltipBase('#F59E0B'),
    axisPointer: { snap: true },
    dataZoom: [
      {
        type: 'inside' as const,
        xAxisIndex: [0, 1, 2, 3, 4],
        filterMode: 'none' as const,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      }
    ],
    grid: [
      { top: 45,   left: 75, right: 65, height: 200 },
      { top: 325,  left: 75, right: 65, height: 200 },
      { top: 605,  left: 75, right: 65, height: 200 },
      { top: 885,  left: 75, right: 65, height: 200 },
      { top: 1165, left: 75, right: 65, height: 200 },
    ],
    xAxis: [
      { ...xAxisBase(0, true), min: stereoRange.min, max: stereoRange.max },
      { ...xAxisBase(1, true), min: solar1Range.min, max: solar1Range.max },
      { ...xAxisBase(2, true), min: epamRange.min, max: epamRange.max },
      { ...xAxisBase(3, true), min: sisRange.min, max: sisRange.max },
      { ...xAxisBase(4, true), min: goesRange.min, max: goesRange.max },
    ],
    yAxis: [
      yAxisBase(0, 'log'),
      yAxisBase(1, 'log'),
      yAxisBase(2, 'log'),
      yAxisBase(3, 'log'),
      yAxisBase(4, 'log'),
    ],
    series: [
      // STEREO Proton
      {
        name: 'STEREO Pro (84-92 keV)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' },
        markLine: buildMarkLines(lines, 0),
        data: stereoData.map(d => [d.time_tag, safeLog(d.pro_b02)])
      },
      {
        name: 'STEREO Pro (110-118 keV)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#EF4444' }, itemStyle: { color: '#EF4444' },
        data: stereoData.map(d => [d.time_tag, safeLog(d.pro_b05)])
      },
      {
        name: 'STEREO Pro (192-219 keV)', type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#DC2626' }, itemStyle: { color: '#DC2626' },
        data: stereoData.map(d => [d.time_tag, safeLog(d.pro_b10)])
      },
      // Solar-1 STIS Ions (8 Channels: p1 - p8)
      {
        name: 'Solar-1 p1: 47–68 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#EC4899' }, itemStyle: { color: '#EC4899' },
        markLine: buildMarkLines(lines, 1),
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p1)])
      },
      {
        name: 'Solar-1 p2: 68–117 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F97316' }, itemStyle: { color: '#F97316' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p2)])
      },
      {
        name: 'Solar-1 p3: 116–180 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p3)])
      },
      {
        name: 'Solar-1 p4: 180–342 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#EAB308' }, itemStyle: { color: '#EAB308' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p4)])
      },
      {
        name: 'Solar-1 p5: 342–537 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#22C55E' }, itemStyle: { color: '#22C55E' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p5)])
      },
      {
        name: 'Solar-1 p6: 537–1061 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#06B6D4' }, itemStyle: { color: '#06B6D4' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p6)])
      },
      {
        name: 'Solar-1 p7: 1061–1847 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#3B82F6' }, itemStyle: { color: '#3B82F6' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p7)])
      },
      {
        name: 'Solar-1 p8: 1847–5263 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#A855F7' }, itemStyle: { color: '#A855F7' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.p8)])
      },
      // ACE EPAM Ions (Tier 2: p47_65, p112_187, p310_580, p761_1220)
      {
        name: 'ACE EPAM P (47–65 keV)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#EC4899' }, itemStyle: { color: '#EC4899' },
        markLine: buildMarkLines(lines, 2),
        data: aceEpamData.map(d => [d.time_tag, safeLog(d.p47_65)])
      },
      {
        name: 'ACE EPAM P (112–187 keV)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F97316' }, itemStyle: { color: '#F97316' },
        data: aceEpamData.map(d => [d.time_tag, safeLog(d.p112_187)])
      },
      {
        name: 'ACE EPAM P (310–580 keV)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#22C55E' }, itemStyle: { color: '#22C55E' },
        data: aceEpamData.map(d => [d.time_tag, safeLog(d.p310_580)])
      },
      {
        name: 'ACE EPAM P (761–1220 keV)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#3B82F6' }, itemStyle: { color: '#3B82F6' },
        data: aceEpamData.map(d => [d.time_tag, safeLog(d.p761_1220)])
      },
      // ACE SIS High Energy Proton (Tier 3: p10, p30)
      {
        name: 'ACE SIS (>10 MeV)', type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#38BDF8' }, itemStyle: { color: '#38BDF8' },
        markLine: buildMarkLines(lines, 3),
        data: aceSisData.map(d => [d.time_tag, safeLog(d.p10)])
      },
      {
        name: 'ACE SIS (>30 MeV)', type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' },
        data: aceSisData.map(d => [d.time_tag, safeLog(d.p30)])
      },
      // GOES Proton (Tier 4 - All Energies)
      ...goesProtonEnergies.map((e, idx) => ({
        name: `GOES Proton ${e}`,
        type: 'line',
        xAxisIndex: 4,
        yAxisIndex: 4,
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 1.8, color: GOES_PROTON_COLORS[e] || '#94A3B8' },
        itemStyle: { color: GOES_PROTON_COLORS[e] || '#94A3B8' },
        markLine: idx === 0 ? buildMarkLines(lines, 4) : undefined,
        data: goesProtonData.map(d => [d.time_tag, safeLog(d[e] ?? d[e.replace(' ', '')])])
      }))
    ]
  }), [stereoData, solar1Data, aceEpamData, aceSisData, goesProtonData, goesProtonEnergies, epamRange, sisRange, stereoRange, solar1Range, goesRange, limit, lines])

  // ── TAB 2: SPACE ELECTRONS OPTION (4 TIERS: STEREO, Solar-1, ACE EPAM, GOES-18) ──
  const electronsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    title: [
      { text: '● STEREO Electron (pfu)', left: 75, top: 18, textStyle: { color: '#38BDF8', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● Solar-1 STIS Electrons (pfu)', left: 75, top: 298, textStyle: { color: '#22C55E', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● ACE EPAM Electrons (pfu)', left: 75, top: 578, textStyle: { color: '#F43F5E', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● GOES-18 SEISS Electron (pfu)', left: 75, top: 858, textStyle: { color: '#A855F7', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
    ],
    tooltip: tooltipBase('#38BDF8'),
    axisPointer: { snap: true },
    dataZoom: [
      {
        type: 'inside' as const,
        xAxisIndex: [0, 1, 2, 3],
        filterMode: 'none' as const,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      }
    ],
    grid: [
      { top: 45,  left: 75, right: 65, height: 200 },
      { top: 325, left: 75, right: 65, height: 200 },
      { top: 605, left: 75, right: 65, height: 200 },
      { top: 885, left: 75, right: 65, height: 200 },
    ],
    xAxis: [
      { ...xAxisBase(0, true), min: stereoRange.min, max: stereoRange.max },
      { ...xAxisBase(1, true), min: solar1Range.min, max: solar1Range.max },
      { ...xAxisBase(2, true), min: epamRange.min, max: epamRange.max },
      { ...xAxisBase(3, true), min: goesRange.min, max: goesRange.max },
    ],
    yAxis: [
      yAxisBase(0, 'log'),
      yAxisBase(1, 'log'),
      yAxisBase(2, 'log'),
      yAxisBase(3, 'log'),
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
      // Solar-1 STIS Electrons (4 Channels: de1 - de4)
      {
        name: 'Solar-1 de1: 47–63 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F43F5E' }, itemStyle: { color: '#F43F5E' },
        markLine: buildMarkLines(lines, 1),
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de1)])
      },
      {
        name: 'Solar-1 de2: 63–104 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#FB923C' }, itemStyle: { color: '#FB923C' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de2)])
      },
      {
        name: 'Solar-1 de3: 104–169 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#FBBF24' }, itemStyle: { color: '#FBBF24' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de3)])
      },
      {
        name: 'Solar-1 de4: 169–333 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#4ADE80' }, itemStyle: { color: '#4ADE80' },
        data: solar1Data.map(d => [d.time_tag, safeLog(d.de4)])
      },
      // ACE EPAM Electrons (Tier 2: e38_53, e175_315)
      {
        name: 'ACE EPAM Ele (38–53 keV)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#F43F5E' }, itemStyle: { color: '#F43F5E' },
        markLine: buildMarkLines(lines, 2),
        data: aceEpamData.map(d => [d.time_tag, safeLog(d.e38_53)])
      },
      {
        name: 'ACE EPAM Ele (175–315 keV)', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, connectNulls: true, lineStyle: { width: 1.8, color: '#FB923C' }, itemStyle: { color: '#FB923C' },
        data: aceEpamData.map(d => [d.time_tag, safeLog(d.e175_315)])
      },
      // GOES Electron (Tier 3)
      {
        name: 'GOES Electron ≥2.0 MeV', type: 'line', xAxisIndex: 3, yAxisIndex: 3,
        showSymbol: false, connectNulls: true, lineStyle: { width: 2, color: '#A855F7' }, itemStyle: { color: '#A855F7' },
        markLine: buildMarkLines(lines, 3),
        data: goesElectronData.map(d => [d.time_tag, safeLog(d['>=2 MeV'] ?? d['>=2.0 MeV'] ?? d['>=2MeV'])])
      }
    ]
  }), [stereoData, solar1Data, aceEpamData, goesElectronData, epamRange, stereoRange, solar1Range, goesRange, limit, lines])

  // ── TAB 3: COSMIC & LUNAR RADIATION OPTION (3 TIERS) ──
  const cosmicOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    title: [
      { text: '● LRO CRaTER Dose Rate (Paired D1-D6)', left: 75, top: 18, textStyle: { color: '#F43F5E', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● LRO CRaTER Dose Rate (Single Detectors)', left: 75, top: 298, textStyle: { color: '#FB923C', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● Ground Neutron Monitors (SOPO & OULU)', left: 75, top: 578, textStyle: { color: '#38BDF8', fontSize: 13, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
    ],
    tooltip: tooltipBase('#F43F5E'),
    axisPointer: { snap: true },
    dataZoom: [
      {
        type: 'inside' as const,
        xAxisIndex: [0, 1, 2],
        filterMode: 'none' as const,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      }
    ],
    grid: [
      { top: 45,  left: 75, right: 65, height: 200 },
      { top: 325, left: 75, right: 65, height: 200 },
      { top: 605, left: 75, right: 65, height: 200 },
    ],
    xAxis: [
      { ...xAxisBase(0, true), min: craterRange.min, max: craterRange.max },
      { ...xAxisBase(1, true), min: craterRange.min, max: craterRange.max },
      { ...xAxisBase(2, true), min: nmdbRange.min, max: nmdbRange.max },
    ],
    yAxis: [
      yAxisBase(0),
      yAxisBase(1),
      yAxisBase(2),
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
  }), [craterData, sopoData, ouluData, lines])

  const GRID_UNITS_TIERS = activeMainTab === 'cosmic' ? ['cGy/day', 'cGy/day', 'cts/sec'] : ['intensity', 'pfu', 'pfu']

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
              onClick={() => setActiveMainTab('protons')}
              style={{
                padding: '8px 18px', background: activeMainTab === 'protons' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                border: 'none', borderBottom: activeMainTab === 'protons' ? '2px solid #F59E0B' : '2px solid transparent',
                color: activeMainTab === 'protons' ? '#F59E0B' : '#94A3B8',
                fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              SPACE PROTONS
            </button>
            <button
              onClick={() => setActiveMainTab('electrons')}
              style={{
                padding: '8px 18px', background: activeMainTab === 'electrons' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: 'none', borderBottom: activeMainTab === 'electrons' ? '2px solid #38BDF8' : '2px solid transparent',
                color: activeMainTab === 'electrons' ? '#38BDF8' : '#94A3B8',
                fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              SPACE ELECTRONS
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
              option={activeMainTab === 'protons' ? protonsOption : (activeMainTab === 'electrons' ? electronsOption : cosmicOption)}
              style={{ height: activeMainTab === 'protons' ? 1420 : (activeMainTab === 'electrons' ? 1140 : 860), width: '100%' }}
              onChartReady={onChartReady}
              onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
            />

            <TrendLineOverlay
              chartRef={chartRef}
              wrapperRef={chartWrapperRef}
              gridCount={activeMainTab === 'protons' ? 5 : (activeMainTab === 'electrons' ? 4 : 3)}
              gridUnits={activeMainTab === 'protons' ? ['pfu', 'pfu', 'pfu', 'pfu', 'pfu'] : (activeMainTab === 'electrons' ? ['pfu', 'pfu', 'pfu', 'pfu'] : ['cGy/day', 'cGy/day', 'cts/sec'])}
              lines={lines}
              drawingMode={drawingMode}
              pendingP1={pendingP1}
              onChartClick={handleClick}
              onRemoveLine={removeLine}
            />

            {/* Divider lines between tiers */}
            {(activeMainTab === 'protons' ? [290, 570, 850, 1130] : (activeMainTab === 'electrons' ? [290, 570, 850] : [290, 570])).map(top => (
              <div key={top} style={{ position: 'absolute', left: 75, right: 65, top, height: 1, background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            ))}
          </div>
        )}

        {/* Footer info & Data Sources */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
            {activeMainTab === 'protons' ? (
              <>
                <span>● Tier 1: STEREO HET (84–219 keV)</span>
                <span>● Tier 2: Solar-1 STIS Ions (47–5263 keV)</span>
                <span>● Tier 3: ACE EPAM Ions (47–1220 keV)</span>
                <span>● Tier 4: ACE SIS Proton (&gt;10, &gt;30 MeV)</span>
                <span>● Tier 5: GOES-18 SEISS Proton (≥1 – ≥500 MeV)</span>
              </>
            ) : activeMainTab === 'electrons' ? (
              <>
                <span>● Tier 1: STEREO HET (45–195 keV)</span>
                <span>● Tier 2: Solar-1 STIS Electrons (47–333 keV)</span>
                <span>● Tier 3: ACE EPAM Electrons (38–315 keV)</span>
                <span>● Tier 4: GOES-18 SEISS Electron (≥2.0 MeV)</span>
              </>
            ) : (
              <>
                <span>● Tier 1: LRO CRaTER Paired (D1-D6)</span>
                <span>● Tier 2: LRO CRaTER Single</span>
                <span>● Tier 3: NMDB Oulu Neutron</span>
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
