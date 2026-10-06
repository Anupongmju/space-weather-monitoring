// frontend/src/components/studio/SynchronizedMultiTierCanvas.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  Maximize2,
  Minimize2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Radio,
  Wind,
  Globe,
  Satellite,
  Compass,
  Mountain,
  Snowflake,
  Sun,
  Moon,
  Flame,
  Plus,
  Columns,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { ChartId, StudioCardConfig, CHART_CATALOG, ChartCatalogItem, POPULAR_STATIONS } from './studioTypes'
import DateRangeToolbar, { TimeRange, TIME_LABELS } from '../ui/DateRangeToolbar'
import { useTheme } from '../../context/ThemeContext'
import { formatPowerOf10, formatUTCTime } from '../../utils/formatters'
import {
  createTimeAxisLabel,
  getMidnightTimestamps,
  getMidnightDividerMarkLines,
  combineMarkLines,
  getTimeDomain,
} from '../../utils/chartHelpers'
import LoadingSpinner from '../ui/LoadingSpinner'
import ExportChartMenu from '../ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../ui/TrendLineOverlay'

// Services
import { loadXray, loadProton, loadElectron, loadGoesMag } from '../../services/goesService'
import { loadSwepam, loadMag, loadEpam, loadSis } from '../../services/aceService'
import { loadPsnmData } from '../../services/psnmService'
import { loadMawData } from '../../services/mawService'
import { loadNeutron } from '../../services/cosmicService'
import { loadMonthlySunspot } from '../../services/sunspotService'
import { loadCrater, loadSolar1Plasma, loadSolar1Mag, loadSolar1, loadStereo } from '../../services/radiationService'
import { loadMarsRad, loadMarsMaven } from '../../services/marsService'

export interface SynchronizedMultiTierCanvasProps {
  cards: StudioCardConfig[]
  limit: TimeRange
  appliedRange: { startDate: string; endDate: string } | null
  onLimitChange?: (limit: TimeRange) => void
  onApplyRange?: (range: { startDate: string; endDate: string } | null) => void
  viewMode?: 'synchronized' | 'grid'
  onViewModeChange?: (mode: 'synchronized' | 'grid') => void
  onMoveCard: (index: number, direction: 'up' | 'down') => void
  onRemoveCard: (instanceId: string) => void
  onStationChange?: (instanceId: string, station: string) => void
  onOpenCatalog: () => void
}

const TIER_HEIGHT = 140
const TIER_GAP = 30
const TOP_PADDING = 40

const PROTON_COLORS: Record<string, string> = {
  '>=1 MeV': '#60A5FA',
  '>=5 MeV': '#34D399',
  '>=10 MeV': '#FBBF24',
  '>=30 MeV': '#F59E0B',
  '>=50 MeV': '#38BDF8',
  '>=60 MeV': '#F97316',
  '>=100 MeV': '#F87171',
  '>=500 MeV': '#C084FC',
}

const ELECTRON_COLORS: Record<string, string> = {
  '>=0.8 MeV': '#A855F7',
  '>=2 MeV': '#38BDF8',
  '>=2.0 MeV': '#38BDF8',
  '>=4 MeV': '#FB923C',
  '>=4.0 MeV': '#FB923C',
}

const DIFFERENTIAL_PALETTE = [
  '#EC4899', '#F43F5E', '#FB923C', '#F59E0B', '#EAB308',
  '#84CC16', '#10B981', '#06B6D4', '#38BDF8', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF'
]

export default function SynchronizedMultiTierCanvas({
  cards,
  limit,
  appliedRange,
  onLimitChange,
  onApplyRange,
  viewMode,
  onViewModeChange,
  onMoveCard,
  onRemoveCard,
  onStationChange,
  onOpenCatalog,
}: SynchronizedMultiTierCanvasProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      if (chartRef.current?.getEchartsInstance) {
        chartRef.current.getEchartsInstance().resize()
      }
    }, 150)
  }

  // Trend line drawing
  const { lines, drawingMode, pendingP1, toggleDrawingMode, handleClick, removeLine, clearLines } = useLineDrawing()

  // Telemetry state store for all active tiers
  const [telemetry, setTelemetry] = useState<Record<string, any[]>>({})

  // Fetch all active tier datasets
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const sDate = appliedRange?.startDate
    const eDate = appliedRange?.endDate
    const fetchLimit = limit ? Math.max(limit + 180, Math.round(limit * 1.05)) : 1440

    const fetchAllActiveTiers = async () => {
      const promises: Promise<[string, string, any[]]>[] = cards.map(async (card): Promise<[string, string, any[]]> => {
        const { chartId, instanceId, station } = card
        try {
          switch (chartId) {
            case 'goes-xray': {
              const d = await loadXray(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'goes-proton': {
              const raw = await loadProton(fetchLimit, sDate, eDate)
              if (Array.isArray(raw) && raw.length > 0 && (raw[0] as any).energy) {
                const map: Record<string, any> = {}
                raw.forEach((r: any) => {
                  if (!r || !r.time_tag) return
                  const eKey = (r.energy || '').trim()
                  // Keep only integral channels (>= 1 MeV, >= 5 MeV, etc.)
                  if (!eKey.startsWith('>=')) return
                  if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
                  map[r.time_tag][eKey] = r.flux > 0 ? r.flux : null
                })
                return [instanceId, chartId, Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())]
              }
              return [instanceId, chartId, Array.isArray(raw) ? raw : []]
            }
            case 'goes-electron': {
              const raw = await loadElectron(fetchLimit, sDate, eDate)
              if (Array.isArray(raw) && raw.length > 0 && (raw[0] as any).energy) {
                const map: Record<string, any> = {}
                raw.forEach((r: any) => {
                  if (!r || !r.time_tag) return
                  if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
                  const eKey = (r.energy || '').trim()
                  map[r.time_tag][eKey] = r.flux > 0 ? r.flux : null
                })
                return [instanceId, chartId, Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())]
              }
              return [instanceId, chartId, Array.isArray(raw) ? raw : []]
            }
            case 'goes-mag': {
              const d = await loadGoesMag(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'ace-swepam': {
              const d = await loadSwepam(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'ace-mag': {
              const d = await loadMag(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'ace-epam': {
              const d = await loadEpam(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'ace-sis': {
              const d = await loadSis(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'solar1-plasma': {
              const d = await loadSolar1Plasma(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'solar1-mag': {
              const d = await loadSolar1Mag(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'solar1-particles': {
              const d = await loadSolar1(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'stereo-particles': {
              const d = await loadStereo(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'neutron-monitor': {
              const stn = (station || 'OULU').toUpperCase()
              if (stn === 'PSNM') {
                const d = await loadPsnmData(fetchLimit, sDate, eDate)
                return [instanceId, chartId, Array.isArray(d) ? d : []]
              } else if (stn === 'MAWSON' || stn === 'MAW') {
                const d = await loadMawData(fetchLimit, sDate, eDate)
                return [instanceId, chartId, Array.isArray(d) ? d : []]
              } else {
                const d = await loadNeutron(stn, fetchLimit, sDate, eDate)
                return [instanceId, chartId, Array.isArray(d) ? d : []]
              }
            }
            case 'psnm-neutron': {
              const d = await loadPsnmData(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'maw-neutron': {
              const d = await loadMawData(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'global-neutron': {
              const [oulu, sopo] = await Promise.all([
                loadNeutron('OULU', fetchLimit, sDate, eDate).catch(() => []),
                loadNeutron('SOPO', fetchLimit, sDate, eDate).catch(() => []),
              ])
              const map: Record<string, any> = {}
              oulu.forEach((d: any) => {
                if (!d.time_tag) return
                map[d.time_tag] = { time_tag: d.time_tag, oulu: d.count_rate }
              })
              sopo.forEach((d: any) => {
                if (!d.time_tag) return
                if (!map[d.time_tag]) map[d.time_tag] = { time_tag: d.time_tag }
                map[d.time_tag].sopo = d.count_rate
              })
              return [instanceId, chartId, Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())]
            }
            case 'sunspot-number': {
              const d = await loadMonthlySunspot({ limit: 120 })
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'moon-crater': {
              const d = await loadCrater(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'mars-rad': {
              const d = await loadMarsRad(fetchLimit, sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            case 'mars-maven': {
              const d = await loadMarsMaven(Math.min(fetchLimit, 720), sDate, eDate)
              return [instanceId, chartId, Array.isArray(d) ? d : []]
            }
            default:
              return [instanceId, chartId, []]
          }
        } catch {
          return [instanceId, chartId, []]
        }
      })

      try {
        const results = await Promise.all(promises)
        if (!isMounted) return
        const nextTelemetry: Record<string, any[]> = {}
        results.forEach(([instId, chartId, data]) => {
          nextTelemetry[instId] = data
          if (!nextTelemetry[chartId]) {
            nextTelemetry[chartId] = data
          }
        })
        setTelemetry(nextTelemetry)
      } catch (err) {
        console.error('Failed to load multi-tier telemetry:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAllActiveTiers()

    return () => {
      isMounted = false
    }
  }, [cards, limit, appliedRange])

  // Compute shared global time range (minTs, maxTs) across all active datasets
  const sharedTimeRange: { min: number | undefined; max: number | undefined } = useMemo(() => {
    // If custom date range is applied
    if (appliedRange?.startDate && appliedRange?.endDate) {
      const minTs = new Date(appliedRange.startDate).getTime()
      const maxTs = new Date(appliedRange.endDate).getTime() + 24 * 60 * 60 * 1000
      return { min: minTs, max: maxTs }
    }

    // Special case: single sunspot tier
    if (cards.length === 1 && cards[0].chartId === 'sunspot-number') {
      const data = telemetry['sunspot-number']
      if (data && data.length > 0) {
        const domain = getTimeDomain(data)
        return { min: domain.minTs, max: domain.maxTs }
      }
    }

    // Rolling window mode: anchor to the latest timestamp across all datasets
    let globalMaxTs = -Infinity
    Object.values(telemetry).forEach(dataset => {
      if (Array.isArray(dataset) && dataset.length > 0) {
        const dDomain = getTimeDomain(dataset)
        if (dDomain.maxTs && dDomain.maxTs > globalMaxTs) {
          globalMaxTs = dDomain.maxTs
        }
      }
    })

    if (globalMaxTs === -Infinity) return { min: undefined, max: undefined }

    // Lock visible window to exactly `limit` minutes (1D, 3D, 7D, etc.) up to globalMaxTs
    const windowMs = (limit || 1440) * 60 * 1000
    const minTs = globalMaxTs - windowMs
    return { min: minTs, max: globalMaxTs }
  }, [telemetry, limit, appliedRange, cards])

  // Midnight timestamps for vertical divider markLines
  const midnightTimestamps = useMemo(() => {
    if (!sharedTimeRange.min || !sharedTimeRange.max) return []
    return getMidnightTimestamps(sharedTimeRange.min, sharedTimeRange.max)
  }, [sharedTimeRange])

  // Total canvas height based on number of tiers
  const totalChartHeight = useMemo(() => {
    if (cards.length === 0) return 400
    return TOP_PADDING + cards.length * (TIER_HEIGHT + TIER_GAP) + 30
  }, [cards.length])

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === chartWrapperRef.current)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Build ECharts Options for Synchronized Multi-Tier Canvas
  const option = useMemo(() => {
    if (cards.length === 0) return null

    const axisLabelColor = isLight ? '#475569' : '#CBD5E1'
    const splitLineColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
    const axisLineColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'

    const GRIDS = cards.map((_, i) => ({
      top: TOP_PADDING + i * (TIER_HEIGHT + TIER_GAP),
      left: 110,
      right: 90,
      height: TIER_HEIGHT,
    }))

    const xAxisBase = (gi: number, isBottom: boolean) => ({
      gridIndex: gi,
      type: 'time' as const,
      splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' as const } },
      axisLine: { lineStyle: { color: axisLineColor } },
      axisLabel: isBottom
        ? createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange)
        : { show: false },
      min: sharedTimeRange.min,
      max: sharedTimeRange.max,
    })

    const yAxisBase = (gi: number, name: string, color: string, type: 'value' | 'log' = 'value', min?: number, max?: number) => ({
      gridIndex: gi,
      type,
      name,
      nameLocation: 'middle' as const,
      nameGap: 56,
      nameTextStyle: {
        color: isLight ? color : color,
        fontSize: 14.5,
        fontWeight: 700,
        fontFamily: 'sans-serif',
      },
      splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' as const } },
      axisLine: { lineStyle: { color: axisLineColor } },
      axisLabel: {
        color: axisLabelColor,
        fontSize: 13,
        fontFamily: 'monospace, sans-serif',
        ...(type === 'log' ? { formatter: (v: number) => formatPowerOf10(v) } : {}),
      },
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
    })

    const buildDividerLines = (gi: number) => {
      const userLines = buildMarkLines(lines, gi)
      const userData = userLines?.data || []
      const dividers = getMidnightDividerMarkLines(midnightTimestamps, isLight)
      return combineMarkLines(dividers, userLines)
    }

    const xAxisList: any[] = []
    const yAxisList: any[] = []
    const seriesList: any[] = []

    const safeLog = (val: any) => {
      if (val === null || val === undefined) return null
      const n = Number(val)
      return !isNaN(n) && n > 0 ? n : null
    }

    cards.forEach((card, gi) => {
      const isBottom = gi === cards.length - 1
      xAxisList.push(xAxisBase(gi, isBottom))

      const data = telemetry[card.instanceId] || telemetry[card.chartId] || []
      const dividers = buildDividerLines(gi)

      switch (card.chartId) {
        // 1. GOES X-ray
        case 'goes-xray': {
          yAxisList.push(
            { ...yAxisBase(gi, 'X-Ray Flux (W/m²)', isLight ? '#0284C7' : '#38BDF8', 'log'), min: 1e-9, max: 1e-2 }
          )
          seriesList.push(
            {
              name: '1-8 Å (Long)',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              connectNulls: true,
              lineStyle: { width: 1.8, color: isLight ? '#0284C7' : '#38BDF8' },
              itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, safeLog(d.flux_long ?? d.xrsb_flux ?? d.flux_b)]),
            },
            {
              name: '0.5-4 Å (Short)',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              connectNulls: true,
              lineStyle: { width: 1.8, color: isLight ? '#059669' : '#22C55E' },
              itemStyle: { color: isLight ? '#059669' : '#22C55E' },
              data: data.map(d => [d.time_tag, safeLog(d.flux_short ?? d.xrsa_flux ?? d.flux_a)]),
            }
          )
          break
        }

        // 2. GOES Proton (Integral Only)
        case 'goes-proton': {
          yAxisList.push(yAxisBase(gi, 'Proton Flux (pfu)', '#F59E0B', 'log', 1e-2, 1e5))
          const standardOrder = ['>=1 MeV', '>=5 MeV', '>=10 MeV', '>=30 MeV', '>=50 MeV', '>=60 MeV', '>=100 MeV', '>=500 MeV']
          const presentKeys = new Set<string>()
          data.forEach(d => {
            Object.keys(d).forEach(k => {
              if (k.startsWith('>=') && d[k] !== null && d[k] !== undefined) {
                presentKeys.add(k)
              }
            })
          })
          const ordered = standardOrder.filter(e => presentKeys.has(e))
          const protonBands = ordered.length > 0 ? ordered : standardOrder

          protonBands.forEach((band, idx) => {
            const color = PROTON_COLORS[band] || '#F59E0B'
            seriesList.push({
              name: band,
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              connectNulls: true,
              lineStyle: { width: band === '>=10 MeV' ? 2 : 1.6, color },
              itemStyle: { color },
              markLine: idx === 0 ? dividers : undefined,
              data: data.map(d => [
                d.time_tag,
                safeLog(
                  d[band] ??
                  (band === '>=10 MeV' ? d.flux_p10 : band === '>=50 MeV' ? d.flux_p50 : band === '>=100 MeV' ? d.flux_p100 : null)
                ),
              ]),
            })
          })
          break
        }

        // 3. GOES Electron
        case 'goes-electron': {
          yAxisList.push(yAxisBase(gi, 'Electron (flux)', '#38BDF8', 'log'))
          const standardOrder = ['>=0.8 MeV', '>=2 MeV', '>=2.0 MeV', '>=4 MeV', '>=4.0 MeV']
          const presentKeys = new Set<string>()
          data.forEach(d => {
            Object.keys(d).forEach(k => {
              if (k !== 'time_tag' && d[k] !== null && d[k] !== undefined) {
                presentKeys.add(k)
              }
            })
          })
          const ordered = standardOrder.filter(e => presentKeys.has(e))
          const remaining = Array.from(presentKeys).filter(e => !standardOrder.includes(e)).sort()
          const electronBands = ordered.length > 0 || remaining.length > 0
            ? [...ordered, ...remaining]
            : ['>=0.8 MeV', '>=2 MeV']

          electronBands.forEach((band, idx) => {
            const color = ELECTRON_COLORS[band] || (idx === 0 ? '#A855F7' : idx === 1 ? '#38BDF8' : '#FB923C')
            seriesList.push({
              name: band,
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              connectNulls: true,
              lineStyle: { width: 1.8, color },
              itemStyle: { color },
              markLine: idx === 0 ? dividers : undefined,
              data: data.map(d => [
                d.time_tag,
                safeLog(
                  d[band] ??
                  (band.includes('0.8') ? d['>=0.8 MeV'] ?? d.e800 : null) ??
                  (band.includes('2') ? d['>=2 MeV'] ?? d['>=2.0 MeV'] ?? d.e2000 : null) ??
                  (band.includes('4') ? d['>=4 MeV'] ?? d['>=4.0 MeV'] ?? d.e4000 : null)
                ),
              ]),
            })
          })
          break
        }

        // 4. GOES Magnetometer
        case 'goes-mag': {
          yAxisList.push(yAxisBase(gi, 'GOES MAG (nT)', '#34D399', 'value'))
          seriesList.push(
            {
              name: 'Hp (Parallel)',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.hp]),
            },
            {
              name: 'Total Ht',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#EF4444' },
              itemStyle: { color: '#EF4444' },
              data: data.map(d => [d.time_tag, d.total]),
            }
          )
          break
        }

        // 5. ACE SWEPAM Solar Wind
        case 'ace-swepam': {
          yAxisList.push(yAxisBase(gi, 'SW Speed (km/s)', '#06B6D4', 'value'))
          seriesList.push(
            {
              name: 'Solar Wind Speed',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#06B6D4' },
              itemStyle: { color: '#06B6D4' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.bulk_speed ?? d.proton_speed]),
            },
            {
              name: 'Proton Density',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.6, color: '#F97316' },
              itemStyle: { color: '#F97316' },
              data: data.map(d => [d.time_tag, d.proton_density]),
            }
          )
          break
        }

        // 6. ACE MAG Field
        case 'ace-mag': {
          yAxisList.push(yAxisBase(gi, 'IMF Bt & Bz (nT)', '#818CF8', 'value'))
          seriesList.push(
            {
              name: 'Bt (Total)',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#C084FC' },
              itemStyle: { color: '#C084FC' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.bt]),
            },
            {
              name: 'Bz (Southward)',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: data.map(d => [d.time_tag, d.bz]),
              areaStyle: {
                color: 'rgba(56, 189, 248, 0.15)',
              },
            }
          )
          break
        }

        // 7. ACE EPAM Particles
        case 'ace-epam': {
          yAxisList.push(yAxisBase(gi, 'EPAM Flux', '#FB923C', 'log'))
          seriesList.push(
            {
              name: 'e 38-53 keV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#FB923C' },
              itemStyle: { color: '#FB923C' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, safeLog(d.e38_53)]),
            },
            {
              name: 'p 47-65 keV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: data.map(d => [d.time_tag, safeLog(d.p47_65)]),
            }
          )
          break
        }

        // Neutron Monitor (Selectable station)
        case 'neutron-monitor': {
          const stn = (card.station || 'OULU').toUpperCase()
          const label = `${stn} (cts/s)`
          yAxisList.push(yAxisBase(gi, label, '#A855F7', 'value'))
          if (stn === 'PSNM') {
            seriesList.push(
              {
                name: 'PSNM NM-64 Corrected',
                type: 'line',
                xAxisIndex: gi,
                yAxisIndex: gi,
                showSymbol: false,
                lineStyle: { width: 2.2, color: '#A855F7' },
                itemStyle: { color: '#A855F7' },
                markLine: dividers,
                data: data.map(d => [d.time_tag, d.nm_corrected ?? d.count_rate]),
              },
              {
                name: 'PSNM Bare Corrected',
                type: 'line',
                xAxisIndex: gi,
                yAxisIndex: gi,
                showSymbol: false,
                lineStyle: { width: 1.6, color: '#34D399' },
                itemStyle: { color: '#34D399' },
                data: data.map(d => [d.time_tag, d.bare_corrected]),
              }
            )
          } else {
            seriesList.push(
              {
                name: `${stn} Count Rate`,
                type: 'line',
                xAxisIndex: gi,
                yAxisIndex: gi,
                showSymbol: false,
                lineStyle: { width: 2.2, color: '#A855F7' },
                itemStyle: { color: '#A855F7' },
                markLine: dividers,
                data: data.map(d => [d.time_tag, d.count_rate ?? d.nm_corrected]),
              }
            )
          }
          break
        }

        // 8. PSNM Neutron Monitor
        case 'psnm-neutron': {
          yAxisList.push(yAxisBase(gi, 'PSNM (cts/s)', '#A855F7', 'value'))
          seriesList.push(
            {
              name: '18-NM-64 Corrected',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#A855F7' },
              itemStyle: { color: '#A855F7' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.nm_corrected]),
            },
            {
              name: 'Bare Corrected',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.6, color: '#34D399' },
              itemStyle: { color: '#34D399' },
              data: data.map(d => [d.time_tag, d.bare_corrected]),
            }
          )
          break
        }

        // 9. Mawson Station Neutron Monitor
        case 'maw-neutron': {
          yAxisList.push(yAxisBase(gi, 'Mawson (cts/s)', '#6366F1', 'value'))
          seriesList.push(
            {
              name: 'Mawson NM Corrected',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#6366F1' },
              itemStyle: { color: '#6366F1' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.nm_corrected]),
            }
          )
          break
        }

        // 10. Global Neutron Comparison
        case 'global-neutron': {
          yAxisList.push(yAxisBase(gi, 'NMDB (cts/s)', '#EC4899', 'value'))
          seriesList.push(
            {
              name: 'OULU',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#EC4899' },
              itemStyle: { color: '#EC4899' },
              markLine: dividers,
              data: data.filter(d => d.oulu !== undefined).map(d => [d.time_tag, d.oulu]),
            },
            {
              name: 'SOPO',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: data.filter(d => d.sopo !== undefined).map(d => [d.time_tag, d.sopo]),
            }
          )
          break
        }

        // 11. International Sunspot Number
        case 'sunspot-number': {
          yAxisList.push(yAxisBase(gi, 'Sunspot SSN', '#FBBF24', 'value'))
          seriesList.push({
            name: 'Sunspot Number',
            type: 'line',
            xAxisIndex: gi,
            yAxisIndex: gi,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2.2, color: '#FBBF24' },
            itemStyle: { color: '#FBBF24' },
            markLine: dividers,
            data: data.map(d => [d.time_tag, d.sunspot_number]),
          })
          break
        }

        // 12. Moon CRaTER
        case 'moon-crater': {
          yAxisList.push(yAxisBase(gi, 'CRaTER (cGy/day)', '#F59E0B', 'value'))
          seriesList.push(
            {
              name: 'D1&2 (Thin Silicon)',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#F43F5E' },
              itemStyle: { color: '#F43F5E' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.d12]),
            },
            {
              name: 'D3&4 (Thick Silicon)',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#FB923C' },
              itemStyle: { color: '#FB923C' },
              data: data.map(d => [d.time_tag, d.d34]),
            }
          )
          break
        }

        // 13. Mars Curiosity RAD
        case 'mars-rad': {
          yAxisList.push(yAxisBase(gi, 'Mars RAD (μGy/d)', '#F87171', 'value'))
          seriesList.push(
            {
              name: 'Silicon Dose Rate',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#F87171' },
              itemStyle: { color: '#F87171' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.dose_rate_silicon]),
            },
            {
              name: 'Plastic Dose Rate',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: data.map(d => [d.time_tag, d.dose_rate_plastic]),
            }
          )
          break
        }

        // 14. Mars MAVEN
        case 'mars-maven': {
          yAxisList.push(yAxisBase(gi, 'MAVEN Flux', '#E11D48', 'log'))
          seriesList.push(
            {
              name: 'Ion 19.7-21.1 keV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#E11D48' },
              itemStyle: { color: '#E11D48' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.ion_1]),
            },
            {
              name: 'Ele 20.1-21.5 keV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: data.map(d => [d.time_tag, d.ele_1]),
            }
          )
          break
        }

        // ACE SIS
        case 'ace-sis': {
          yAxisList.push(yAxisBase(gi, 'SIS (pfu)', '#10B981', 'log'))
          seriesList.push(
            {
              name: 'ACE > 10 MeV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#10B981' },
              itemStyle: { color: '#10B981' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, safeLog(d.p10)]),
            },
            {
              name: 'ACE > 30 MeV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: data.map(d => [d.time_tag, safeLog(d.p30)]),
            }
          )
          break
        }

        // SOLAR-1 Plasma
        case 'solar1-plasma': {
          yAxisList.push(yAxisBase(gi, 'S1 SW Speed', '#F59E0B', 'value'))
          seriesList.push(
            {
              name: 'SOLAR-1 Speed',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#F59E0B' },
              itemStyle: { color: '#F59E0B' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.proton_speed]),
            },
            {
              name: 'SOLAR-1 Density',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#06B6D4' },
              itemStyle: { color: '#06B6D4' },
              data: data.map(d => [d.time_tag, d.proton_density]),
            }
          )
          break
        }

        // SOLAR-1 MAG
        case 'solar1-mag': {
          yAxisList.push(yAxisBase(gi, 'S1 MAG (nT)', '#EC4899', 'value'))
          seriesList.push(
            {
              name: 'SOLAR-1 Bt',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#EC4899' },
              itemStyle: { color: '#EC4899' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, d.bt]),
            },
            {
              name: 'SOLAR-1 Bz',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#EF4444' },
              itemStyle: { color: '#EF4444' },
              data: data.map(d => [d.time_tag, d.bz]),
            }
          )
          break
        }

        // SOLAR-1 STIS Particles
        case 'solar1-particles': {
          yAxisList.push(yAxisBase(gi, 'STIS (pfu)', '#F97316', 'log'))
          seriesList.push(
            {
              name: 'p1: 47–68 keV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#EA580C' },
              itemStyle: { color: '#EA580C' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, safeLog(d.p1)]),
            },
            {
              name: 'p8: 1.8–5.2 MeV',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#EC4899' },
              itemStyle: { color: '#EC4899' },
              data: data.map(d => [d.time_tag, safeLog(d.p8)]),
            }
          )
          break
        }

        // STEREO-A Particles
        case 'stereo-particles': {
          yAxisList.push(yAxisBase(gi, 'STEREO (flux)', '#6366F1', 'log'))
          seriesList.push(
            {
              name: 'Ion B02',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 2, color: '#6366F1' },
              itemStyle: { color: '#6366F1' },
              markLine: dividers,
              data: data.map(d => [d.time_tag, safeLog(d.ion_b02)]),
            },
            {
              name: 'Ion B05',
              type: 'line',
              xAxisIndex: gi,
              yAxisIndex: gi,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: data.map(d => [d.time_tag, safeLog(d.ion_b05)]),
            }
          )
          break
        }

        default: {
          yAxisList.push(yAxisBase(gi, 'Telemetry', '#38BDF8', 'value'))
          seriesList.push({
            name: 'Data',
            type: 'line',
            xAxisIndex: gi,
            yAxisIndex: gi,
            showSymbol: false,
            data: data.map(d => [d.time_tag, d.value ?? 0]),
          })
          break
        }
      }
    })

    return {
      useUTC: true,
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(11, 15, 25, 0.96)',
        borderColor: isLight ? '#0284C7' : '#38BDF8',
        borderWidth: 1.5,
        padding: 12,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 12.5 },
        extraCssText: isLight
          ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.12); border-radius: 8px;'
          : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
        axisPointer: {
          type: 'line' as const,
          lineStyle: { color: '#38BDF8', type: 'dashed' as const, width: 1.5 },
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

          // Build ordered groups matching active tiers
          const groups: {
            tierIndex: number
            label: string
            color: string
            unit: string
            items: { name: string; value: any; color: string }[]
          }[] = cards.map((card, gi) => {
            const cat = CHART_CATALOG.find(x => x.id === card.chartId) || CHART_CATALOG[0]
            return {
              tierIndex: gi,
              label: `${cat.title.toUpperCase()} (${cat.tag})`,
              color: isLight ? cat.lightAccentColor : cat.accentColor,
              unit: cat.yAxisUnit,
              items: [],
            }
          })

          params.forEach((p: any) => {
            if (!p) return
            const sDef = seriesList[p.seriesIndex]
            const gi = sDef ? sDef.xAxisIndex : 0
            const val = Array.isArray(p.value) ? p.value[1] : p.value
            if (val === undefined || val === null) return

            // Avoid showing stale data from datasets updated at a different time
            const ptTime = Array.isArray(p.value) && p.value[0] ? new Date(p.value[0]).getTime() : null
            if (hoverTs !== null && ptTime !== null && !isNaN(ptTime)) {
              if (Math.abs(ptTime - hoverTs) > 10 * 60 * 1000) {
                return
              }
            }

            if (groups[gi]) {
              groups[gi].items.push({
                name: p.seriesName,
                value: val,
                color: p.color || groups[gi].color,
              })
            }
          })

          let html = `<div style="font-family: var(--font-mono); font-size: 12px; min-width: 250px;">`
          html += `<div style="color: ${isLight ? '#0369A1' : '#38BDF8'}; border-bottom: 1px solid ${
            isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'
          }; padding-bottom: 5px; margin-bottom: 6px; font-weight: 700; letter-spacing: 0.5px;">`
          html += `⏱ ${timeStr}</div>`

          groups.forEach(g => {
            if (g.items.length === 0) return

            html += `<div style="color: ${g.color}; font-weight: 700; margin-top: 6px; margin-bottom: 2px; font-size: 11.5px; letter-spacing: 0.8px; display: flex; align-items: center; gap: 5px;">`
            html += `<span style="display:inline-block; width:7px; height:7px; background:${g.color}; border-radius:2px;"></span>${g.label}</div>`

            g.items.forEach(item => {
              let valDisplay = '—'
              if (typeof item.value === 'number') {
                valDisplay = (item.value !== 0 && (Math.abs(item.value) < 0.001 || Math.abs(item.value) > 10000))
                  ? item.value.toExponential(2)
                  : item.value.toFixed(item.value % 1 === 0 ? 1 : 2)
              } else if (item.value != null) {
                valDisplay = String(item.value)
              }

              html += `<div style="display: flex; justify-content: space-between; gap: 20px; padding: 1px 0 1px 8px; color: ${
                isLight ? '#334155' : '#E2E8F0'
              }; font-size: 11.5px; line-height: 1.35;">`
              html += `<span style="display:flex; align-items:center; gap:5px;"><span style="color: ${item.color}; font-size: 12px;">●</span>${item.name}</span>`
              html += `<span style="font-weight: 700; color: ${isLight ? '#0F172A' : '#FFFFFF'}; font-family: monospace;">${valDisplay}</span>`
              html += `</div>`
            })
          })

          html += `</div>`
          return html
        },
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        snap: false,
      },
      dataZoom: [
        {
          type: 'inside' as const,
          xAxisIndex: Array.from({ length: cards.length }, (_, i) => i),
          filterMode: 'none' as const,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      legend: cards.map((c, i) => {
        let seriesNames: string[] = []
        switch (c.chartId) {
          case 'goes-xray': seriesNames = ['1-8 Å (Long)', '0.5-4 Å (Short)']; break
          case 'goes-proton': {
            const data = telemetry['goes-proton'] || []
            const standardOrder = ['>=1 MeV', '>=5 MeV', '>=10 MeV', '>=30 MeV', '>=50 MeV', '>=60 MeV', '>=100 MeV', '>=500 MeV']
            const presentKeys = new Set<string>()
            data.forEach(d => {
              Object.keys(d).forEach(k => {
                if (k.startsWith('>=') && d[k] !== null && d[k] !== undefined) presentKeys.add(k)
              })
            })
            const ordered = standardOrder.filter(e => presentKeys.has(e))
            seriesNames = ordered.length > 0 ? ordered : standardOrder
            break
          }
          case 'goes-electron': {
            const data = telemetry['goes-electron'] || []
            const standardOrder = ['>=0.8 MeV', '>=2 MeV', '>=2.0 MeV', '>=4 MeV', '>=4.0 MeV']
            const presentKeys = new Set<string>()
            data.forEach(d => {
              Object.keys(d).forEach(k => {
                if (k !== 'time_tag' && d[k] !== null && d[k] !== undefined) presentKeys.add(k)
              })
            })
            const ordered = standardOrder.filter(e => presentKeys.has(e))
            const remaining = Array.from(presentKeys).filter(e => !standardOrder.includes(e)).sort()
            seriesNames = ordered.length > 0 || remaining.length > 0 ? [...ordered, ...remaining] : ['>=0.8 MeV', '>=2 MeV']
            break
          }
          case 'goes-mag': seriesNames = ['Hp (Parallel)', 'Total Ht']; break
          case 'ace-swepam': seriesNames = ['Solar Wind Speed', 'Proton Density']; break
          case 'ace-mag': seriesNames = ['Bt (Total)', 'Bz (Southward)']; break
          case 'ace-epam': seriesNames = ['e 38-53 keV', 'p 47-65 keV']; break
          case 'ace-sis': seriesNames = ['ACE > 10 MeV', 'ACE > 30 MeV']; break
          case 'solar1-plasma': seriesNames = ['SOLAR-1 Speed', 'SOLAR-1 Density']; break
          case 'solar1-mag': seriesNames = ['SOLAR-1 Bt', 'SOLAR-1 Bz']; break
          case 'solar1-particles': seriesNames = ['p1: 47–68 keV', 'p8: 1.8–5.2 MeV']; break
          case 'stereo-particles': seriesNames = ['Ion B02', 'Ion B05']; break
          case 'psnm-neutron': seriesNames = ['18-NM-64 Corrected', 'Bare Corrected']; break
          case 'maw-neutron': seriesNames = ['Mawson NM Corrected']; break
          case 'global-neutron': seriesNames = ['Oulu NM', 'South Pole NM']; break
          case 'sunspot-number': seriesNames = ['Sunspot Number']; break
          case 'moon-crater': seriesNames = ['D1&2 (Thin Silicon)', 'D3&4 (Thick Silicon)']; break
          case 'mars-rad': seriesNames = ['Silicon Dose Rate', 'Plastic Dose Rate']; break
          case 'mars-maven': seriesNames = ['Ion 19.7-21.1 keV', 'Ele 20.1-21.5 keV']; break
        }
        return {
          show: true,
          top: GRIDS[i].top - 20,
          right: 80,
          icon: 'roundRect',
          itemGap: 12,
          itemWidth: 10,
          itemHeight: 4,
          textStyle: {
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          },
          data: seriesNames,
        }
      }),
      grid: GRIDS,
      xAxis: xAxisList,
      yAxis: yAxisList,
      series: seriesList,
    }
  }, [cards, telemetry, isLight, limit, appliedRange, sharedTimeRange, midnightTimestamps, lines])

  // Build combined export data
  const exportData = useMemo(() => {
    const timeMap = new Map<string, any>()
    cards.forEach(card => {
      const data = telemetry[card.chartId] || []
      data.forEach((row: any) => {
        if (!row || !row.time_tag) return
        if (!timeMap.has(row.time_tag)) {
          timeMap.set(row.time_tag, { time_tag: row.time_tag })
        }
        const entry = timeMap.get(row.time_tag)
        Object.assign(entry, row)
      })
    })

    return Array.from(timeMap.values())
      .filter((row: any) => {
        if (!sharedTimeRange.min || !sharedTimeRange.max) return true
        const t = new Date(row.time_tag).getTime()
        return t >= sharedTimeRange.min && t <= sharedTimeRange.max
      })
      .sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }, [cards, telemetry, sharedTimeRange])

  const exportColumns = useMemo((): ExportColumn[] => {
    const cols: ExportColumn[] = [{ label: 'UTC Time', key: 'time_tag', width: 22 }]
    cards.forEach(c => {
      const cat = CHART_CATALOG.find(item => item.id === c.chartId)
      if (cat) {
        cols.push({ label: `${cat.title} (${cat.tag})`, key: c.chartId, width: 20 })
      }
    })
    return cols
  }, [cards])

  const exportMetadata = useMemo(
    () => ({
      station: 'SPACE WEATHER CUSTOM STUDIO',
      viewTitle: `Custom Multi-Tier Synchronized Telemetry (${cards.length} Tiers)`,
      description: `Synchronized cross-instrument canvas: ${cards.map(c => c.chartId).join(', ')}`,
      timeRangeText: appliedRange
        ? `${appliedRange.startDate} to ${appliedRange.endDate}`
        : `${TIME_LABELS[limit]} UTC Interval`,
      totalRecords: exportData.length,
    }),
    [cards, appliedRange, limit, exportData.length]
  )

  if (cards.length === 0) {
    return (
      <div
        style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
          border: isLight ? '2px dashed rgba(0,0,0,0.1)' : '2px dashed rgba(255,255,255,0.1)',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Activity size={32} color="var(--primary, #38BDF8)" />
        <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-mono)' }}>
          No Tiers Selected on Canvas
        </h3>
        <p style={{ margin: 0, color: isLight ? '#64748B' : '#94A3B8', fontSize: 13 }}>
          Click "+ Add Tier / Graph" to select telemetry streams to stack onto your synchronized workspace.
        </p>
        <button
          type="button"
          onClick={onOpenCatalog}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 22px',
            borderRadius: 8,
            background: 'var(--primary, #0284C7)',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Plus size={16} />
          <span>Add Your First Tier</span>
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        width: '100%',
      }}
    >
      {/* ── ROW 2 TOOLBAR (Matching StandardOverview) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Left: Synchronized Canvas Info Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 4,
              background: isLight ? '#EEF2FF' : 'rgba(99, 102, 241, 0.12)',
              border: isLight ? '1px solid #C7D2FE' : '1px solid rgba(99, 102, 241, 0.3)',
              color: isLight ? '#4338CA' : '#A5B4FC',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
            }}
          >
            <Layers size={13} />
            <span>SYNCHRONIZED CANVAS</span>
          </div>

          <span
            style={{
              fontSize: 12,
              color: isLight ? '#64748B' : '#94A3B8',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            {cards.length} TIERS STACKED
          </span>
        </div>

        {/* Right Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Trend Line Drawing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {drawingMode && (
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: pendingP1 ? '#FBBF24' : '#A78BFA',
                  fontWeight: 600,
                }}
              >
                {pendingP1 ? '● P1 SET — CLICK P2' : '○ CLICK P1 ON CANVAS'}
              </span>
            )}
            <button
              type="button"
              onClick={toggleDrawingMode}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                background: drawingMode
                  ? (isLight ? 'rgba(99, 102, 241, 0.15)' : 'rgba(167,139,250,0.2)')
                  : (isLight ? '#F1F5F9' : 'transparent'),
                border: `1px solid ${drawingMode ? (isLight ? '#6366F1' : '#A78BFA') : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)')}`,
                color: drawingMode ? (isLight ? '#4F46E5' : '#A78BFA') : (isLight ? '#475569' : '#94A3B8'),
                fontSize: 12.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {drawingMode ? '╱ DRAWING ON' : '╱ DRAW LINE'}
            </button>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={clearLines}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: isLight ? '#FEF2F2' : 'transparent',
                  border: `1px solid ${isLight ? '#FECACA' : 'rgba(248,113,113,0.4)'}`,
                  color: isLight ? '#DC2626' : '#F87171',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                CLEAR ({lines.length})
              </button>
            )}
          </div>

          {/* DateRangeToolbar */}
          {onLimitChange && (
            <DateRangeToolbar
              limit={limit}
              onLimitChange={onLimitChange}
              appliedRange={appliedRange}
              onApplyRange={onApplyRange}
              presets={[1440, 4320, 10080]}
              accentColor={isLight ? '#4F46E5' : '#818CF8'}
              loading={loading}
            />
          )}

          {/* Switch to Cards View */}
          {onViewModeChange && (
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              title="Switch to 2-Column Cards Grid view"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isLight ? '#334155' : '#94A3B8',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'all 0.2s',
              }}
            >
              <Columns size={12} />
              <span>CARDS</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isLight ? '#334155' : '#94A3B8',
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              borderRadius: 4,
              transition: 'all 0.2s',
            }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>FULLSCREEN</span>
          </button>

          {/* Export Menu */}
          <ExportChartMenu
            chartRef={chartRef}
            data={exportData}
            columns={exportColumns}
            metadata={exportMetadata}
            filenameBase={`custom_studio_canvas_${cards.length}tier`}
            accentColor={isLight ? '#4F46E5' : '#818CF8'}
          />
        </div>
      </div>

      {/* ── THE SPLIT CONTAINER: TIERS PANEL (LEFT) + GRAPH CARD (RIGHT) ── */}
      <div
        ref={chartWrapperRef}
        style={{
          position: 'relative',
          width: '100%',
          ...(isFullscreen
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: '#020617',
                zIndex: 99999,
                overflowY: 'auto',
                padding: '24px 20px',
                boxSizing: 'border-box',
              }
            : {}),
        }}
      >
        {isFullscreen && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38BDF8' }}>
              CUSTOM STUDIO // SYNCHRONIZED {cards.length}-TIER FULLSCREEN
            </span>
            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#FFF',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Exit Fullscreen (ESC)
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* ── LEFT: TIERS REORDER & CONTROL PANEL (OUTSIDE GRAPH CARD) ── */}
          <div
            style={{
              width: sidebarCollapsed ? 46 : 240,
              transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 10,
              background: isLight ? '#FFFFFF' : '#0B0F19',
              border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: sidebarCollapsed ? '12px 6px' : '14px 12px',
              boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.04)' : '0 10px 30px rgba(0, 0, 0, 0.35)',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Header: Title + Collapse Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                paddingBottom: 10,
                marginBottom: 10,
                borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {!sidebarCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isLight ? '#475569' : '#94A3B8',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: 0.5,
                    }}
                  >
                    TIERS ({cards.length})
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={toggleSidebar}
                title={sidebarCollapsed ? 'Expand Tiers Panel' : 'Collapse Tiers Panel'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: isLight ? '#64748B' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                }}
              >
                {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </button>
            </div>

            {/* List of Tier Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {cards.map((card, idx) => {
                const cat = CHART_CATALOG.find(c => c.id === card.chartId) || CHART_CATALOG[0]
                const accent = isLight ? cat.lightAccentColor : cat.accentColor

                if (sidebarCollapsed) {
                  return (
                    <div
                      key={card.instanceId}
                      title={`${cat.title} (#${idx + 1})`}
                      style={{
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                        background: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${accent}40`,
                        fontSize: 11,
                        fontWeight: 800,
                        color: accent,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'default',
                      }}
                    >
                      #{idx + 1}
                    </div>
                  )
                }

                return (
                  <div
                    key={card.instanceId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.03)',
                      border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: `3px solid ${accent}`,
                      boxShadow: isLight ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Top Row: #Index + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: accent,
                          flexShrink: 0,
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isLight ? '#1E293B' : '#F1F5F9',
                          fontFamily: 'sans-serif',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                        title={cat.title}
                      >
                        {cat.title}{card.chartId === 'neutron-monitor' && card.station ? ` (${card.station})` : ''}
                      </span>
                    </div>

                    {/* Station Selector for Neutron Monitor */}
                    {card.chartId === 'neutron-monitor' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: isLight ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.15)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          borderRadius: 4,
                          padding: '3px 6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#A855F7',
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.05em',
                          }}
                        >
                          STN:
                        </span>
                        <select
                          value={card.station || 'OULU'}
                          onChange={(e) => onStationChange?.(card.instanceId, e.target.value)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: isLight ? '#6B21A8' : '#E9D5FF',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono), monospace',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {POPULAR_STATIONS.map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              style={{
                                background: isLight ? '#FFFFFF' : '#1E1B4B',
                                color: isLight ? '#0F172A' : '#FFFFFF',
                              }}
                            >
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Bottom Row: Source/Category + Reorder & Remove Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 4,
                        borderTop: isLight ? '1px dashed #F1F5F9' : '1px dashed rgba(255,255,255,0.05)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: isLight ? '#64748B' : '#94A3B8',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {cat.source || 'SPACE'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onMoveCard(idx, 'up')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 2,
                            cursor: idx === 0 ? 'default' : 'pointer',
                            color: idx === 0 ? (isLight ? '#CBD5E1' : '#334155') : (isLight ? '#475569' : '#94A3B8'),
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Move Tier Up"
                        >
                          <ArrowUp size={12} />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={idx === cards.length - 1}
                          onClick={() => onMoveCard(idx, 'down')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 2,
                            cursor: idx === cards.length - 1 ? 'default' : 'pointer',
                            color: idx === cards.length - 1 ? (isLight ? '#CBD5E1' : '#334155') : (isLight ? '#475569' : '#94A3B8'),
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Move Tier Down"
                        >
                          <ArrowDown size={12} />
                        </button>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => onRemoveCard(card.instanceId)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 2,
                            cursor: 'pointer',
                            color: isLight ? '#EF4444' : '#F87171',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Remove Tier"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add Graph Tier button inside sidebar */}
              {!sidebarCollapsed && onOpenCatalog && (
                <button
                  type="button"
                  onClick={onOpenCatalog}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: isLight ? '#EEF2FF' : 'rgba(99, 102, 241, 0.1)',
                    border: isLight ? '1px dashed #A5B4FC' : '1px dashed rgba(165, 180, 252, 0.3)',
                    color: isLight ? '#4F46E5' : '#818CF8',
                    fontSize: 11.5,
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    marginTop: 6,
                    transition: 'all 0.2s',
                  }}
                  title="Add new graph tier from catalog"
                >
                  <Plus size={13} />
                  <span>ADD TIER</span>
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT: THE STANDALONE GRAPH CARD ── */}
          <div
            ref={canvasContainerRef}
            style={{
              flex: 1,
              minWidth: 0,
              position: 'relative',
              background: isLight ? '#FFFFFF' : '#0B0F19',
              border: isLight ? '1px solid rgba(99, 102, 241, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '16px 0 20px',
              boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.06)' : '0 12px 30px rgba(0, 0, 0, 0.4)',
              borderRadius: 10,
            }}
          >
            {loading && Object.keys(telemetry).length === 0 ? (
              <div style={{ padding: '120px 0', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner text="Synchronizing multi-tier cross-domain scientific telemetry..." />
              </div>
            ) : (
              <>
                <ReactECharts
                  ref={chartRef}
                  option={option}
                  style={{ height: totalChartHeight, width: '100%' }}
                  notMerge={true}
                  lazyUpdate={false}
                />
                <TrendLineOverlay
                  chartRef={chartRef}
                  wrapperRef={canvasContainerRef}
                  gridCount={cards.length}
                  gridUnits={cards.map(c => {
                    const item = CHART_CATALOG.find(x => x.id === c.chartId)
                    return item?.yAxisUnit || ''
                  })}
                  lines={lines}
                  drawingMode={drawingMode}
                  pendingP1={pendingP1}
                  onChartClick={handleClick}
                  onRemoveLine={removeLine}
                />

                {/* Horizontal Panel Dividers between Tiers */}
                {cards.slice(1).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: 110,
                      right: 90,
                      top: TOP_PADDING + (idx + 1) * (TIER_HEIGHT + TIER_GAP) - Math.floor(TIER_GAP / 2),
                      height: 1,
                      background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.08)',
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
