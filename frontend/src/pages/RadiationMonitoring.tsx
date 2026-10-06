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
  Calendar,
  Maximize2,
  Minimize2
} from 'lucide-react'
import SciFiFullscreenOverlay from '../components/ui/SciFiFullscreenOverlay'
import { loadStereo, loadSolar1, loadCrater, loadAceEpam, loadAceSis, fetchAllRadiation } from '../services/radiationService'
import { loadProton, loadElectron } from '../services/goesService'
import { loadNeutron } from '../services/cosmicService'
import { useAutoFetch } from '../hooks/useAutoFetch'
import { useChartPan } from '../hooks/useChartPan'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import InstrumentInfoGuide from '../components/ui/InstrumentInfoGuide'
import StatusBadge from '../components/ui/StatusBadge'
import ExportChartMenu from '../components/ui/ExportChartMenu'
import { ExportColumn } from '../utils/exportHelpers'
import { useLineDrawing } from '../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../components/ui/TrendLineOverlay'
import { formatPowerOf10, formatUTCTime } from '../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines } from '../utils/chartHelpers'
import { useTheme } from '../context/ThemeContext'
import DateRangeToolbar, { TimeRange, TIME_LABELS } from '../components/ui/DateRangeToolbar'

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

export default function RadiationMonitoring() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const [isRadFs, setIsRadFs] = useState(false)

  useEffect(() => {
    const handleFsChange = () => {
      setIsRadFs(document.fullscreenElement === chartWrapperRef.current)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleRadFs = async () => {
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

  const [activeMainTab, setActiveMainTab] = useState<'protons' | 'electrons' | 'cosmic'>('protons')
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeGuideTab, setActiveGuideTab] = useState('usage')

  // Date range state
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
      const rawEnergy = (r.energy || '').trim()
      // Filter out keV channels (differential) so GOES Proton is purely Integral (int)
      if (rawEnergy.toLowerCase().includes('kev')) {
        return
      }
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
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined

      const [stereo, solar1, epam, sis, crater, gProton, gElectron, sopo, oulu] = await Promise.all([
        loadStereo(limit, sDate, eDate).catch(e => { console.warn('Stereo load failed:', e); return [] }),
        loadSolar1(limit, sDate, eDate).catch(e => { console.warn('Solar1 load failed:', e); return [] }),
        loadAceEpam(limit, sDate, eDate).catch(e => { console.warn('AceEpam load failed:', e); return [] }),
        loadAceSis(limit, sDate, eDate).catch(e => { console.warn('AceSis load failed:', e); return [] }),
        loadCrater(limit, sDate, eDate).catch(e => { console.warn('Crater load failed:', e); return [] }),
        loadProton(limit, sDate, eDate).catch(e => { console.warn('Proton load failed:', e); return [] }),
        loadElectron(limit, sDate, eDate).catch(e => { console.warn('Electron load failed:', e); return [] }),
        loadNeutron('SOPO', limit, sDate, eDate).catch(e => { console.warn('Neutron SOPO load failed:', e); return [] }),
        loadNeutron('OULU', limit, sDate, eDate).catch(e => { console.warn('Neutron OULU load failed:', e); return [] }),
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
        loadStereo(0, start, end).catch(e => { console.warn('Stereo hist failed:', e); return [] }),
        loadSolar1(0, start, end).catch(e => { console.warn('Solar1 hist failed:', e); return [] }),
        loadAceEpam(0, start, end).catch(e => { console.warn('AceEpam hist failed:', e); return [] }),
        loadAceSis(0, start, end).catch(e => { console.warn('AceSis hist failed:', e); return [] }),
        loadCrater(0, start, end).catch(e => { console.warn('Crater hist failed:', e); return [] }),
        loadProton(0, start, end).catch(e => { console.warn('Proton hist failed:', e); return [] }),
        loadElectron(0, start, end).catch(e => { console.warn('Electron hist failed:', e); return [] }),
        loadNeutron('SOPO', 0, start, end).catch(e => { console.warn('Neutron SOPO hist failed:', e); return [] }),
        loadNeutron('OULU', 0, start, end).catch(e => { console.warn('Neutron OULU hist failed:', e); return [] }),
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
  }, [limit, appliedRange, activeMainTab])

  useAutoFetch(async () => {
    await loadData(false)
  }, 60000, !appliedRange)

  const exportColumns = useMemo<ExportColumn[]>(() => {
    if (activeMainTab === 'protons') {
      return [
        { key: 'time_tag', label: 'Time (UTC)', width: 22 },
        { key: 'goes_p1', label: 'GOES >=1MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'goes_p5', label: 'GOES >=5MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'goes_p10', label: 'GOES >=10MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'goes_p30', label: 'GOES >=30MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'goes_p50', label: 'GOES >=50MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'goes_p100', label: 'GOES >=100MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'solar1_p1', label: 'SOLAR1 47-68keV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'solar1_p4', label: 'SOLAR1 180-342keV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'solar1_p8', label: 'SOLAR1 1.8-5.2MeV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'ace_sis_p10', label: 'ACE SIS >10MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'ace_sis_p30', label: 'ACE SIS >30MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'stereo_pro_b02', label: 'STEREO 84-92keV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
      ]
    } else if (activeMainTab === 'electrons') {
      return [
        { key: 'time_tag', label: 'Time (UTC)', width: 22 },
        { key: 'goes_e2', label: 'GOES >=2MeV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'solar1_e1', label: 'SOLAR1 e1 27-41keV (pfu)', width: 22, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'solar1_e2', label: 'SOLAR1 e2 40-66keV (pfu)', width: 22, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'solar1_e3', label: 'SOLAR1 e3 64-161keV (pfu)', width: 22, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'solar1_e4', label: 'SOLAR1 e4 150-316keV (pfu)', width: 22, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'ace_e38_53', label: 'ACE 38-53keV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'ace_e175_315', label: 'ACE 175-315keV (pfu)', width: 18, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
        { key: 'stereo_ele_b01', label: 'STEREO 55-65keV (pfu)', width: 20, format: (v) => v != null ? Number(v).toExponential(3) : 'N/A' },
      ]
    } else {
      return [
        { key: 'time_tag', label: 'Time (UTC)', width: 22 },
        { key: 'crater_d12', label: 'CRaTER D1&2 (cGy/day)', width: 20, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
        { key: 'crater_d34', label: 'CRaTER D3&4 (cGy/day)', width: 20, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
        { key: 'crater_d56', label: 'CRaTER D5&6 (cGy/day)', width: 20, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
        { key: 'sopo_count', label: 'South Pole (cts/sec)', width: 20, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
        { key: 'oulu_count', label: 'Oulu NM (cts/sec)', width: 18, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
      ]
    }
  }, [activeMainTab])

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

    if (activeMainTab === 'protons') {
      goesProtonData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.goes_p1 = d['>=1 MeV']
        r.goes_p5 = d['>=5 MeV']
        r.goes_p10 = d['>=10 MeV']
        r.goes_p30 = d['>=30 MeV']
        r.goes_p50 = d['>=50 MeV']
        r.goes_p100 = d['>=100 MeV']
      })
      solar1Data.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.solar1_p1 = d.p1
        r.solar1_p4 = d.p4
        r.solar1_p8 = d.p8
      })
      aceSisData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.ace_sis_p10 = d.p10
        r.ace_sis_p30 = d.p30
      })
      stereoData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.stereo_pro_b02 = d.pro_b02
      })
    } else if (activeMainTab === 'electrons') {
      goesElectronData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.goes_e2 = d['>=2 MeV'] ?? d['>=2.0 MeV'] ?? d['>=2MeV']
      })
      solar1Data.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.solar1_e1 = d.e1
        r.solar1_e2 = d.e2
        r.solar1_e3 = d.e3
        r.solar1_e4 = d.e4
      })
      aceEpamData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.ace_e38_53 = d.e38_53
        r.ace_e175_315 = d.e175_315
      })
      stereoData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.stereo_ele_b01 = d.ele_b01
      })
    } else {
      craterData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.crater_d12 = d.d12
        r.crater_d34 = d.d34
        r.crater_d56 = d.d56
      })
      sopoData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.sopo_count = d.count_rate
      })
      ouluData.forEach(d => {
        if (!d.time_tag) return
        const r = getRow(d.time_tag)
        r.oulu_count = d.count_rate
      })
    }

    return Array.from(map.values()).sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }, [activeMainTab, goesProtonData, solar1Data, aceSisData, stereoData, goesElectronData, aceEpamData, craterData, sopoData, ouluData])

  const exportMetadata = useMemo(() => ({
    station: `HELIOSPHERIC RADIATION // ${activeMainTab.toUpperCase()}`,
    viewTitle: `Heliospheric Radiation Suite (${activeMainTab.toUpperCase()})`,
    description: `Synchronized Multi-tier Telemetry: GOES, STEREO-A, SOLAR-1, ACE, LRO CRaTER, NMDB.`,
    timeRangeText: appliedRange ? `${appliedRange.startDate} to ${appliedRange.endDate}` : `${TIME_LABELS[limit]} (Recent)`,
    totalRecords: exportData.length
  }), [activeMainTab, appliedRange, limit, exportData.length])

  // Shared styles
  const axisLabelStyle = { color: isLight ? '#475569' : '#CBD5E1', fontSize: 14.5, fontFamily: 'monospace, sans-serif', fontWeight: 600 }
  const splitLineStyle = { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' as const } }

  const xAxisBase = (gi: number, showLabel: boolean) => ({
    gridIndex: gi,
    type: 'time' as const,
    splitLine: splitLineStyle,
    axisLabel: showLabel ? createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange) : { show: false },
    axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
  })

  const getTierDividers = (range: { min?: number; max?: number }) => {
    const midnights = getMidnightTimestamps(range.min, range.max)
    return getMidnightDividerMarkLines(midnights, isLight)
  }

  const yAxisBase = (gi: number, name = '', type: 'value' | 'log' = 'value') => ({
    gridIndex: gi,
    name,
    nameLocation: 'middle' as const,
    nameGap: 52,
    nameTextStyle: {
      color: isLight ? '#0F172A' : '#CBD5E1',
      fontSize: 12,
      fontWeight: 700,
      fontFamily: 'sans-serif'
    },
    type,
    splitLine: splitLineStyle,
    axisLabel: {
      ...axisLabelStyle,
      ...(type === 'log' ? { formatter: formatPowerOf10 } : {}),
    },
    axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    scale: true,
  })

  // Helper to sanitize positive log values (stripping noise floor < 0.01 pfu)
  const safeLog = (val: any, minThreshold = 0.01) => {
    if (val === null || val === undefined) return null
    const n = Number(val)
    return !isNaN(n) && n >= minThreshold ? n : null
  }

  // Calculate independent time domains
  const getIndependentTierRange = (data: any[], windowMinutes: number, paddingRatio = 0.2, timeKey = 'time_tag') => {
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
        if (k !== 'time_tag' && d[k] != null && !k.toLowerCase().includes('kev')) {
          set.add(k)
        }
      })
    })
    const parseToMeV = (e: string) => {
      const match = e.match(/[\d.]+/)
      return match ? parseFloat(match[0]) : 0
    }
    const list = Array.from(set).sort((a, b) => parseToMeV(a) - parseToMeV(b))
    return list.length > 0 ? list : ['>=1 MeV', '>=5 MeV', '>=10 MeV', '>=30 MeV', '>=50 MeV', '>=60 MeV', '>=100 MeV', '>=500 MeV']
  }, [goesProtonData])

  const tooltipBase = (headerColor: string) => ({
    trigger: 'axis' as const,
    backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
    borderColor: `${headerColor}99`,
    borderWidth: 1.5,
    padding: 12,
    textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 14.5 },
    extraCssText: isLight
      ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
      : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
    axisPointer: { type: 'line' as const, lineStyle: { color: headerColor, type: 'dashed' as const, width: 1.5 } },
    formatter: (params: any) => {
      if (!params || params.length === 0) return ''
      const rawTime = params[0].value ? params[0].value[0] : (params[0].axisValue || '')
      const timeStr = formatUTCTime(rawTime, true)

      let html = `<div style="font-family: var(--font-mono); font-size: 14.5px; min-width: 260px;">`
      html += `<div style="color: ${headerColor}; border-bottom: 1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'}; padding-bottom: 6px; margin-bottom: 8px; font-weight: 700; font-size: 14.5px;">⏱ ${timeStr}</div>`

      params.forEach((p: any) => {
        if (!p) return
        const name = p.seriesName
        const val = Array.isArray(p.value) ? p.value[1] : p.value
        if (val === undefined || val === null) return

        let valDisplay = typeof val === 'number' ? (val < 0.01 || val > 10000 ? val.toExponential(2) : val.toFixed(2)) : val
        html += `<div style="display: flex; justify-content: space-between; gap: 16px; padding: 2px 0;">`
        html += `<span style="color: ${p.color};">● ${name}:</span>`
        html += `<span style="font-weight: 700; color: ${isLight ? '#0F172A' : '#FFF'}; font-family: monospace;">${valDisplay}</span>`
        html += `</div>`
      })
      html += `</div>`
      return html
    }
  })

  // ── TAB 1: SPACE PROTONS OPTION (5 TIERS: STEREO, Solar-1, ACE EPAM, ACE SIS, GOES-18) ──
  const protonsOption = useMemo(() => ({
    useUTC: true,
    backgroundColor: 'transparent',
    animation: false,
    title: [
      { text: '● STEREO Proton (pfu)', left: 75, top: 18, textStyle: { color: isLight ? '#D97706' : '#F59E0B', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● Solar-1 STIS Ions (pfu)', left: 75, top: 298, textStyle: { color: isLight ? '#EA580C' : '#F97316', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● ACE EPAM Ions (pfu)', left: 75, top: 578, textStyle: { color: isLight ? '#DB2777' : '#EC4899', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● ACE SIS High-Energy Proton (pfu)', left: 75, top: 858, textStyle: { color: isLight ? '#0284C7' : '#38BDF8', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● GOES-18 SEISS Proton (pfu)', left: 75, top: 1138, textStyle: { color: isLight ? '#B45309' : '#FBBF24', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
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
      yAxisBase(0, 'STEREO-A Pro (pfu)', 'log'),
      yAxisBase(1, 'Solar-1 STIS (pfu)', 'log'),
      yAxisBase(2, 'ACE EPAM (pfu)', 'log'),
      yAxisBase(3, 'ACE SIS (pfu)', 'log'),
      yAxisBase(4, 'GOES-18 (pfu)', 'log'),
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
  }), [stereoData, solar1Data, aceEpamData, aceSisData, goesProtonData, goesProtonEnergies, epamRange, sisRange, stereoRange, solar1Range, goesRange, limit, lines, isLight])

  // ── TAB 2: SPACE ELECTRONS OPTION (4 TIERS: STEREO, Solar-1, ACE EPAM, GOES-18) ──
  const electronsOption = useMemo(() => ({
    useUTC: true,
    backgroundColor: 'transparent',
    animation: false,
    title: [
      { text: '● STEREO Electron (pfu)', left: 75, top: 18, textStyle: { color: isLight ? '#0284C7' : '#38BDF8', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● Solar-1 STIS Electrons (pfu)', left: 75, top: 298, textStyle: { color: isLight ? '#059669' : '#22C55E', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● ACE EPAM Electrons (pfu)', left: 75, top: 578, textStyle: { color: isLight ? '#E11D48' : '#F43F5E', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● GOES-18 SEISS Electron (pfu)', left: 75, top: 858, textStyle: { color: isLight ? '#7C3AED' : '#A855F7', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
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
      yAxisBase(0, 'STEREO-A Ele (pfu)', 'log'),
      yAxisBase(1, 'Solar-1 STIS (pfu)', 'log'),
      yAxisBase(2, 'ACE EPAM (pfu)', 'log'),
      yAxisBase(3, 'GOES-18 (pfu)', 'log'),
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
  }), [stereoData, solar1Data, aceEpamData, goesElectronData, epamRange, stereoRange, solar1Range, goesRange, limit, lines, isLight])

  // ── TAB 3: COSMIC & LUNAR RADIATION OPTION (3 TIERS) ──
  const cosmicOption = useMemo(() => ({
    useUTC: true,
    backgroundColor: 'transparent',
    animation: false,
    title: [
      { text: '● LRO CRaTER Dose Rate (Paired D1-D6)', left: 75, top: 18, textStyle: { color: isLight ? '#E11D48' : '#F43F5E', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● LRO CRaTER Dose Rate (Single Detectors)', left: 75, top: 298, textStyle: { color: isLight ? '#D97706' : '#FB923C', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
      { text: '● Ground Neutron Monitors (SOPO & OULU)', left: 75, top: 578, textStyle: { color: isLight ? '#0284C7' : '#38BDF8', fontSize: 15, fontFamily: 'var(--font-mono), monospace', fontWeight: 700 } },
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
      yAxisBase(0, 'CRaTER Paired (cGy/day)'),
      yAxisBase(1, 'CRaTER Single (cGy/day)'),
      yAxisBase(2, 'NMDB Neutron (cts/sec)'),
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
  }), [craterData, sopoData, ouluData, lines, isLight])

  const GRID_UNITS_TIERS = activeMainTab === 'cosmic' ? ['cGy/day', 'cGy/day', 'cts/sec'] : ['intensity', 'pfu', 'pfu']

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>

        {/* Seamless Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 16, paddingBottom: 16,
          borderBottom: isLight ? '1px solid rgba(26, 109, 181, 0.15)' : '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 27,
              fontWeight: 700, color: isLight ? '#0C1E35' : '#F8FAFC', margin: 0, letterSpacing: -0.5
            }}>
              SPACE RADIATION & PARTICLE MONITORING
            </h1>
            <p style={{ color: isLight ? '#475569' : '#CBD5E1', fontSize: 14.5, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
              Heliospheric Space Particle Flux & Lunar Surface Radiation Dosimetry
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {panLoading && (
              <span style={{ fontSize: 14.5, color: '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            )}
            {/* Trend Line Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {drawingMode && (
                <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: pendingP1 ? '#FBBF24' : '#A78BFA', fontWeight: 600 }}>
                  {pendingP1 ? '● P1 SET — CLICK P2' : '○ CLICK P1 ON ANY CHART'}
                </span>
              )}
              <button
                onClick={toggleDrawingMode}
                style={{
                  padding: '5px 12px',
                  background: drawingMode
                    ? (isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(167,139,250,0.2)')
                    : (isLight ? '#F1F5F9' : 'transparent'),
                  border: `1px solid ${drawingMode ? (isLight ? '#7C3AED' : '#A78BFA') : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)')}`,
                  color: drawingMode ? (isLight ? '#7C3AED' : '#A78BFA') : (isLight ? '#475569' : '#94A3B8'),
                  fontFamily: 'var(--font-mono)', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', borderRadius: 4
                }}
              >
                {drawingMode ? '╱ DRAWING ON' : '╱ DRAW LINE'}
              </button>
              {lines.length > 0 && (
                <button
                  onClick={clearLines}
                  style={{
                    padding: '5px 12px', background: isLight ? '#FEF2F2' : 'transparent', border: `1px solid ${isLight ? '#FECACA' : 'rgba(248,113,113,0.4)'}`,
                    color: isLight ? '#DC2626' : '#F87171', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 4
                  }}
                >
                  CLEAR ({lines.length})
                </button>
              )}
            </div>

            <button
              onClick={handleRefresh} disabled={fetching}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                background: 'transparent', border: 'none', color: isLight ? '#0284C7' : '#38BDF8',
                fontFamily: 'var(--font-mono)', fontSize: 14.5, fontWeight: 600, cursor: fetching ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={14} style={{ animation: fetching ? 'spin 1s linear infinite' : 'none' }} />
              {fetching ? 'SYNCING...' : 'REFRESH'}
            </button>
            <StatusBadge status={stereoData.length > 0 || goesProtonData.length > 0 ? 'normal' : (loading ? 'info' : 'offline')} />
          </div>
        </div>

        {/* Main Tab Bar & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{
            display: 'flex',
            gap: 6,
            background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.75)',
            padding: '4px',
            border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6
          }}>
            <button
              onClick={() => setActiveMainTab('protons')}
              style={{
                padding: '8px 18px',
                background: activeMainTab === 'protons'
                  ? (isLight ? '#FFFFFF' : 'rgba(245, 158, 11, 0.25)')
                  : 'transparent',
                border: 'none',
                borderBottom: activeMainTab === 'protons' ? `2px solid ${isLight ? '#D97706' : '#F59E0B'}` : '2px solid transparent',
                color: activeMainTab === 'protons'
                  ? (isLight ? '#B45309' : '#F59E0B')
                  : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: isLight && activeMainTab === 'protons' ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                transition: 'all 0.15s ease'
              }}
            >
              SPACE PROTONS
            </button>
            <button
              onClick={() => setActiveMainTab('electrons')}
              style={{
                padding: '8px 18px',
                background: activeMainTab === 'electrons'
                  ? (isLight ? '#FFFFFF' : 'rgba(56, 189, 248, 0.25)')
                  : 'transparent',
                border: 'none',
                borderBottom: activeMainTab === 'electrons' ? `2px solid ${isLight ? '#0284C7' : '#38BDF8'}` : '2px solid transparent',
                color: activeMainTab === 'electrons'
                  ? (isLight ? '#0369A1' : '#38BDF8')
                  : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: isLight && activeMainTab === 'electrons' ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                transition: 'all 0.15s ease'
              }}
            >
              SPACE ELECTRONS
            </button>
            <button
              onClick={() => setActiveMainTab('cosmic')}
              style={{
                padding: '8px 18px',
                background: activeMainTab === 'cosmic'
                  ? (isLight ? '#FFFFFF' : 'rgba(244, 63, 94, 0.25)')
                  : 'transparent',
                border: 'none',
                borderBottom: activeMainTab === 'cosmic' ? `2px solid ${isLight ? '#E11D48' : '#F43F5E'}` : '2px solid transparent',
                color: activeMainTab === 'cosmic'
                  ? (isLight ? '#BE123C' : '#F43F5E')
                  : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: isLight && activeMainTab === 'cosmic' ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                transition: 'all 0.15s ease'
              }}
            >
              COSMIC & LUNAR RADIATION
            </button>
          </div>

          {/* Time Preset Pills & Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <DateRangeToolbar
              limit={limit}
              onLimitChange={setLimit}
              appliedRange={appliedRange}
              onApplyRange={setAppliedRange}
              accentColor={isLight ? '#0284C7' : '#38BDF8'}
              loading={loading || fetching}
              presets={[1440, 4320, 10080]}
            />
            <button
              onClick={toggleRadFs}
              title={isRadFs ? 'Exit Full Screen (ESC)' : 'Full Screen (F11 style)'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isLight ? '#334155' : '#94A3B8', fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer', borderRadius: 4,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = isLight ? '#0284C7' : '#38BDF8'
                e.currentTarget.style.color = isLight ? '#0284C7' : '#38BDF8'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)'
                e.currentTarget.style.color = isLight ? '#334155' : '#94A3B8'
              }}
            >
              <Maximize2 size={14} />
              <span>FULLSCREEN</span>
            </button>
            <ExportChartMenu
              chartRef={chartRef}
              data={exportData}
              columns={exportColumns}
              metadata={exportMetadata}
              filenameBase={`radiation_${activeMainTab}_${limit}m`}
              accentColor={activeMainTab === 'protons' ? '#F59E0B' : (activeMainTab === 'electrons' ? '#38BDF8' : '#F43F5E')}
            />
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
              position: 'relative',
              width: '100%',
              ...(isRadFs ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: '#020617',
                zIndex: 99999,
                overflow: 'hidden',
              } : {
                background: isLight ? '#FFFFFF' : 'rgba(10, 15, 30, 0.45)',
                border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255, 255, 255, 0.06)',
                padding: '16px 0',
                backdropFilter: 'blur(8px)',
                boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.06)' : '0 12px 30px rgba(0, 0, 0, 0.4)',
                borderRadius: 8
              })
            }}
          >
            {isRadFs ? (
              <SciFiFullscreenOverlay
                isFullscreen={true}
                onClose={toggleRadFs}
                scrollable={true}
                title={`HELIOSPHERIC RADIATION // ${activeMainTab.toUpperCase()}`}
                subtitle="Synchronized Multi-tier Telemetry (GOES, STEREO-A, SOLAR-1, ACE, LRO, South Pole)"
                accentColor={activeMainTab === 'protons' ? '#F59E0B' : activeMainTab === 'electrons' ? '#38BDF8' : '#F43F5E'}
                extra={
                  <div style={{ display: 'flex', gap: 4, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.08)', padding: '2px', borderRadius: 4 }}>
                    <button
                      onClick={() => setActiveMainTab('protons')}
                      style={{
                        padding: '3px 10px',
                        background: activeMainTab === 'protons' ? '#F59E0B' : 'transparent',
                        color: activeMainTab === 'protons' ? '#000' : (isLight ? '#334155' : '#94A3B8'),
                        border: 'none', borderRadius: 3, fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer'
                      }}
                    >
                      PROTONS (5T)
                    </button>
                    <button
                      onClick={() => setActiveMainTab('electrons')}
                      style={{
                        padding: '3px 10px',
                        background: activeMainTab === 'electrons' ? '#38BDF8' : 'transparent',
                        color: activeMainTab === 'electrons' ? '#000' : (isLight ? '#334155' : '#94A3B8'),
                        border: 'none', borderRadius: 3, fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer'
                      }}
                    >
                      ELECTRONS (4T)
                    </button>
                    <button
                      onClick={() => setActiveMainTab('cosmic')}
                      style={{
                        padding: '3px 10px',
                        background: activeMainTab === 'cosmic' ? '#F43F5E' : 'transparent',
                        color: activeMainTab === 'cosmic' ? '#FFF' : (isLight ? '#334155' : '#94A3B8'),
                        border: 'none', borderRadius: 3, fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer'
                      }}
                    >
                      COSMIC (3T)
                    </button>
                  </div>
                }
              >
                <div style={{ width: '100%', minHeight: activeMainTab === 'protons' ? 1420 : (activeMainTab === 'electrons' ? 1140 : 860), position: 'relative' }}>
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
                  {/* Divider lines between tiers in Fullscreen */}
                  {(activeMainTab === 'protons' ? [290, 570, 850, 1130] : (activeMainTab === 'electrons' ? [290, 570, 850] : [290, 570])).map(top => (
                    <div key={top} style={{ position: 'absolute', left: 75, right: 65, top, height: 1, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                  ))}
                </div>
              </SciFiFullscreenOverlay>
            ) : (
              <>
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
                  <div key={top} style={{ position: 'absolute', left: 75, right: 65, top, height: 1, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                ))}
              </>
            )}
          </div>
        )}

        {/* Footer info & Data Sources */}
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
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, color: isLight ? '#475569' : '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <Clock size={13} />
              Synced: {formatUTCTime(lastUpdated)}
            </div>
          )}
        </div>

        {/* Refined Instrument Info Guide */}
        <div style={{ marginTop: 32 }}>
          <InstrumentInfoGuide
            activeTab={activeGuideTab}
            onTabChange={setActiveGuideTab}
            accentColor={activeMainTab === 'protons' ? '#F59E0B' : activeMainTab === 'electrons' ? '#38BDF8' : '#F43F5E'}
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
                  color: isLight ? '#0C1E35' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 17,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  การติดตามรังสีและอนุภาคในอวกาศแบบหลายระดับ (Multi-tier Radiation Telemetry)
                </h4>
                <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 14.5, margin: '0 0 16px 0', lineHeight: '1.7' }}>
                  หน้านี้รวบรวมข้อมูลฟลักซ์อนุภาคพลังงานสูง (High-Energy Particle Flux) และปริมาณรังสีดูดกลืน (Radiation Dosimetry) เชื่อมโยงจากจุด L1 ในอวกาศ (ACE, STEREO), วงโคจรค้างฟ้าโลก (GOES-18), วงโคจรรอบดวงจันทร์ (LRO CRaTER) จนถึงสถานีตรวจวัดนิวตรอนบนพื้นผิวโลก (South Pole & Oulu):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ borderLeft: `3px solid ${activeMainTab === 'protons' ? '#F59E0B' : (activeMainTab === 'electrons' ? '#38BDF8' : '#F43F5E')}`, paddingLeft: 12, fontSize: 14.5, color: isLight ? '#334155' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>การจำแนกประเภทอนุภาค: </strong>
                    สลับระหว่าง Space Protons (ไอออนบวกและโปรตอนสุริยะ), Space Electrons (อิเล็กตรอนพลังงานสูงที่ส่งผลต่อการสะสมประจุของดาวเทียม), และ Cosmic & Lunar Radiation (รังสีคอสมิกและอัตราปริมาณรังสีบนดวงจันทร์)
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'impacts' && (
              <div>
                <h4 style={{
                  color: isLight ? '#0C1E35' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 17,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  ผลกระทบต่อภารกิจอวกาศและมนุษย์อวกาศ
                </h4>
                <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 14.5, margin: 0, lineHeight: '1.7' }}>
                  พายุอนุภาคพลังงานสูงจากดวงอาทิตย์ (Solar Particle Events - SPE) ก่อให้เกิดอันตรายถึงชีวิตต่อนักบินอวกาศนอกสนามแม่เหล็กโลก (เช่น ในภารกิจสำรวจดวงจันทร์ Artemis) และทำให้เกิดความเสียหายถาวรต่อแผงโซลาร์เซลล์รวมถึงอุปกรณ์อิเล็กทรอนิกส์ของดาวเทียม
                </p>
              </div>
            )}

            {activeGuideTab === 'details' && (
              <div>
                <h4 style={{
                  color: isLight ? '#0C1E35' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 17,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  ยานอวกาศและอุปกรณ์ตรวจวัดในระบบ
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                      <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#94A3B8', width: '30%' }}>STEREO-A (HET)</td>
                      <td style={{ padding: '8px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>High Energy Telescope ตรวจจับโปรตอนและอิเล็กตรอนในวงโคจรรอบดวงอาทิตย์</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                      <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#94A3B8' }}>ACE (EPAM & SIS)</td>
                      <td style={{ padding: '8px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>Electron, Proton, and Alpha Monitor & Solar Isotope Spectrometer ประจำจุด L1</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                      <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#94A3B8' }}>GOES-18 (SEISS)</td>
                      <td style={{ padding: '8px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>Space Environment In-Situ Suite วงโคจรค้างฟ้า 35,786 กม.</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', color: isLight ? '#64748B' : '#94A3B8' }}>LRO (CRaTER)</td>
                      <td style={{ padding: '8px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>Cosmic Ray Telescope for the Effects of Radiation วัดรังสีเนื้อเยื่อมนุษย์รอบดวงจันทร์</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeGuideTab === 'credits' && (
              <div>
                <h4 style={{
                  color: isLight ? '#0C1E35' : '#F8FAFC',
                  margin: '0 0 14px 0',
                  fontSize: 17,
                  fontFamily: "'Orbitron', var(--font-sans), monospace",
                  fontWeight: 700
                }}>
                  แหล่งที่มาของข้อมูล & เครดิต
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  <div style={{ borderLeft: '3px solid #38BDF8', paddingLeft: 12, color: isLight ? '#475569' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>NASA & NOAA SWPC: </strong>
                    STEREO Science Center, ACE Science Center, NOAA GOES SEISS, LRO CRaTER Project
                  </div>
                  <div style={{ borderLeft: '3px solid #7C3AED', paddingLeft: 12, color: isLight ? '#475569' : '#CBD5E1' }}>
                    <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>NMDB: </strong>
                    Neutron Monitor Database (Oulu & South Pole monitoring stations)
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
