// frontend/src/components/studio/charts/StudioChartRenderer.tsx
import React, { useEffect, useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { ChartId } from '../studioTypes'
import { TimeRange } from '../../ui/DateRangeToolbar'
import { ExportColumn } from '../../../utils/exportHelpers'
import { useTheme } from '../../../context/ThemeContext'
import { formatPowerOf10, formatUTCTime } from '../../../utils/formatters'
import {
  createTimeAxisLabel,
  getMidnightTimestamps,
  getMidnightDividerMarkLines,
  combineMarkLines,
  getTimeDomain,
} from '../../../utils/chartHelpers'
import LoadingSpinner from '../../ui/LoadingSpinner'

// Services
import {
  loadXray,
  loadProton,
  loadElectron,
  loadGoesMag,
} from '../../../services/goesService'
import {
  loadSwepam,
  loadMag,
  loadEpam,
  loadSis,
} from '../../../services/aceService'
import {
  loadPsnmData,
} from '../../../services/psnmService'
import {
  loadMawData,
} from '../../../services/mawService'
import {
  loadNeutron,
} from '../../../services/cosmicService'
import {
  loadMonthlySunspot,
} from '../../../services/sunspotService'
import {
  loadCrater,
  loadSolar1Plasma,
  loadSolar1Mag,
  loadSolar1,
  loadStereo,
} from '../../../services/radiationService'
import {
  loadMarsRad,
  loadMarsMaven,
} from '../../../services/marsService'

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

export interface StudioChartRendererProps {
  chartId: ChartId
  limit: TimeRange
  customRange?: { startDate: string; endDate: string } | null
  chartRef: React.RefObject<any>
  height?: number
  station?: string
  onDataLoaded?: (data: any[], columns: ExportColumn[]) => void
}

export default function StudioChartRenderer({
  chartId,
  limit,
  customRange,
  chartRef,
  height = 320,
  station,
  onDataLoaded,
}: StudioChartRendererProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<any[]>([])

  const sDate = customRange?.startDate
  const eDate = customRange?.endDate

  // Fetch data depending on chartId
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        let result: any[] = []

        switch (chartId) {
          case 'goes-xray': {
            result = await loadXray(limit, sDate, eDate)
            break
          }
          case 'goes-proton': {
            const raw = await loadProton(limit, sDate, eDate)
            // Pivot GOES proton if raw format or use directly
            if (Array.isArray(raw)) {
              if (raw.length > 0 && raw[0].energy) {
                const map: Record<string, any> = {}
                raw.forEach((r: any) => {
                  if (!r || !r.time_tag) return
                  const eKey = (r.energy || '').trim()
                  if (!eKey.startsWith('>=')) return
                  if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
                  map[r.time_tag][eKey] = r.flux > 0 ? r.flux : null
                })
                result = Object.values(map).sort(
                  (a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime()
                )
              } else {
                result = raw
              }
            }
            break
          }
          case 'goes-electron': {
            const raw = await loadElectron(limit, sDate, eDate)
            if (Array.isArray(raw)) {
              if (raw.length > 0 && raw[0].energy) {
                const map: Record<string, any> = {}
                raw.forEach((r: any) => {
                  if (!r || !r.time_tag) return
                  if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
                  const eKey = (r.energy || '').trim()
                  map[r.time_tag][eKey] = r.flux > 0 ? r.flux : null
                })
                result = Object.values(map).sort(
                  (a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime()
                )
              } else {
                result = raw
              }
            }
            break
          }
          case 'goes-mag': {
            result = await loadGoesMag(limit, sDate, eDate)
            break
          }
          case 'ace-swepam': {
            result = await loadSwepam(limit, sDate, eDate)
            break
          }
          case 'ace-mag': {
            result = await loadMag(limit, sDate, eDate)
            break
          }
          case 'ace-epam': {
            result = await loadEpam(limit, sDate, eDate)
            break
          }
          case 'ace-sis': {
            result = await loadSis(limit, sDate, eDate)
            break
          }
          case 'solar1-plasma': {
            result = await loadSolar1Plasma(limit, sDate, eDate)
            break
          }
          case 'solar1-mag': {
            result = await loadSolar1Mag(limit, sDate, eDate)
            break
          }
          case 'solar1-particles': {
            result = await loadSolar1(limit, sDate, eDate)
            break
          }
          case 'stereo-particles': {
            result = await loadStereo(limit, sDate, eDate)
            break
          }
          case 'neutron-monitor': {
            const stn = (station || 'OULU').toUpperCase()
            if (stn === 'PSNM') {
              result = await loadPsnmData(limit, sDate, eDate)
            } else if (stn === 'MAWSON' || stn === 'MAW') {
              result = await loadMawData(limit, sDate, eDate)
            } else {
              result = await loadNeutron(stn, limit, sDate, eDate)
            }
            break
          }
          case 'psnm-neutron': {
            result = await loadPsnmData(limit, sDate, eDate)
            break
          }
          case 'maw-neutron': {
            result = await loadMawData(limit, sDate, eDate)
            break
          }
          case 'global-neutron': {
            // Load Oulu or Sopo
            const [oulu, sopo] = await Promise.all([
              loadNeutron('OULU', limit, sDate, eDate).catch(() => []),
              loadNeutron('SOPO', limit, sDate, eDate).catch(() => []),
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
            result = Object.values(map).sort(
              (a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime()
            )
            break
          }
          case 'sunspot-number': {
            const ss = await loadMonthlySunspot({ limit: 120 })
            result = ss || []
            break
          }
          case 'moon-crater': {
            result = await loadCrater(limit, sDate, eDate)
            break
          }
          case 'mars-rad': {
            result = await loadMarsRad(limit, sDate, eDate)
            break
          }
          case 'mars-maven': {
            result = await loadMarsMaven(Math.min(limit, 720), sDate, eDate)
            break
          }
          default:
            result = []
        }

        if (!isMounted) return
        const safeArr = Array.isArray(result) ? result : []
        setRawData(safeArr)

        // Broadcast to parent card for export
        if (onDataLoaded) {
          onDataLoaded(safeArr, getColumnsForChart(chartId, station))
        }
      } catch (err: any) {
        if (!isMounted) return
        console.error(`Error loading data for ${chartId}:`, err)
        setError(err.message || 'Failed to load telemetry data')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [chartId, limit, sDate, eDate, station])

  // Midnight dividers for clean astronomical timeline visualization
  const midnightDividers = useMemo(() => {
    if (!rawData || rawData.length === 0) return []
    const { minTs, maxTs } = getTimeDomain(rawData)
    const midnights = getMidnightTimestamps(minTs, maxTs)
    return getMidnightDividerMarkLines(midnights, isLight)
  }, [rawData, isLight])

  // Build ECharts Option according to chartId
  const chartOption = useMemo(() => {
    if (!rawData || rawData.length === 0) return null

    const axisLabelColor = isLight ? '#475569' : '#CBD5E1'
    const splitLineColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
    const axisLineColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'

    const baseGrid = {
      top: 36,
      left: 70,
      right: 32,
      bottom: 40,
    }

    const baseDataZoom = [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
    ]

    const baseTooltip = (unit: string) => ({
      trigger: 'axis',
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(10, 15, 30, 0.96)',
      borderColor: isLight ? '#0284C7' : '#38BDF8',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: isLight ? '#0F172A' : '#F8FAFC',
        fontSize: 12,
        fontFamily: 'var(--font-mono), monospace',
      },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const timeStr = formatUTCTime(params[0].value ? params[0].value[0] : params[0].axisValue, true)
        let html = `<div style="font-weight:700;margin-bottom:6px;border-bottom:1px solid ${
          isLight ? '#E2E8F0' : '#334155'
        };padding-bottom:4px;color:${isLight ? '#0284C7' : '#38BDF8'}">🕒 ${timeStr}</div>`
        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          let displayVal = '—'
          if (typeof val === 'number') {
            displayVal = val < 0.001 || val > 10000 ? val.toExponential(3) : val.toFixed(2)
          }
          html += `<div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;">
            <span style="color:${p.color}">● ${p.seriesName}:</span>
            <strong style="color:${isLight ? '#0F172A' : '#FFFFFF'}">${displayVal} ${unit}</strong>
          </div>`
        })
        return html
      },
    })

    const baseLegend = {
      show: true,
      top: 2,
      right: 10,
      textStyle: {
        color: axisLabelColor,
        fontSize: 11,
        fontFamily: 'var(--font-mono), monospace',
      },
    }

    const xAxis = {
      type: chartId === 'sunspot-number' ? 'category' : 'time',
      splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
      axisLine: { lineStyle: { color: axisLineColor } },
      axisLabel:
        chartId === 'sunspot-number'
          ? { color: axisLabelColor, fontSize: 11 }
          : createTimeAxisLabel(isLight, limit > 1440 || !!customRange),
    }

    switch (chartId) {
      // 1. GOES X-ray
      case 'goes-xray': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('W/m²'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            min: 1e-9,
            max: 1e-2,
            name: 'W/m²',
            nameTextStyle: { color: '#EF4444', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: [
            {
              name: 'Long (0.1-0.8 nm)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#EF4444' },
              itemStyle: { color: '#EF4444' },
              data: rawData.map(d => [d.time_tag, d.xrsb_flux || d.flux_b]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Short (0.05-0.4 nm)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.6, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.xrsa_flux || d.flux_a]),
            },
          ],
        }
      }

      // 2. GOES Proton
      case 'goes-proton': {
        const standardOrder = ['>=1 MeV', '>=5 MeV', '>=10 MeV', '>=30 MeV', '>=50 MeV', '>=60 MeV', '>=100 MeV', '>=500 MeV']
        const presentKeys = new Set<string>()
        rawData.forEach(d => {
          Object.keys(d).forEach(k => {
            if (k.startsWith('>=') && d[k] !== null && d[k] !== undefined) presentKeys.add(k)
          })
        })
        const ordered = standardOrder.filter(e => presentKeys.has(e))
        const protonBands = ordered.length > 0 ? ordered : standardOrder

        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('pfu'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            min: 1e-2,
            max: 1e5,
            name: 'pfu',
            nameTextStyle: { color: '#F59E0B', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: protonBands.map((band, idx) => {
            const color = PROTON_COLORS[band] || DIFFERENTIAL_PALETTE[idx % DIFFERENTIAL_PALETTE.length]
            return {
              name: band,
              type: 'line',
              showSymbol: false,
              connectNulls: true,
              lineStyle: { width: band === '>=10 MeV' ? 2 : 1.6, color },
              itemStyle: { color },
              data: rawData.map(d => [
                d.time_tag,
                d[band] ?? (band === '>=10 MeV' ? d.flux_p10 : band === '>=50 MeV' ? d.flux_p50 : band === '>=100 MeV' ? d.flux_p100 : null)
              ]),
              markLine: idx === 0 ? combineMarkLines(midnightDividers) : undefined,
            }
          }),
        }
      }

      // 3. GOES Electron
      case 'goes-electron': {
        const standardOrder = ['>=0.8 MeV', '>=2 MeV', '>=2.0 MeV', '>=4 MeV', '>=4.0 MeV']
        const presentKeys = new Set<string>()
        rawData.forEach(d => {
          Object.keys(d).forEach(k => {
            if (k !== 'time_tag' && d[k] !== null && d[k] !== undefined) presentKeys.add(k)
          })
        })
        const ordered = standardOrder.filter(e => presentKeys.has(e))
        const remaining = Array.from(presentKeys).filter(e => !standardOrder.includes(e)).sort()
        const electronBands = ordered.length > 0 || remaining.length > 0 ? [...ordered, ...remaining] : ['>=0.8 MeV', '>=2 MeV']

        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('e/(cm²·s·sr)'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            name: 'Flux',
            nameTextStyle: { color: '#38BDF8', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: electronBands.map((band, idx) => {
            const color = ELECTRON_COLORS[band] || (idx === 0 ? '#A855F7' : idx === 1 ? '#38BDF8' : '#FB923C')
            return {
              name: band,
              type: 'line',
              showSymbol: false,
              connectNulls: true,
              lineStyle: { width: 1.8, color },
              itemStyle: { color },
              data: rawData.map(d => [
                d.time_tag,
                d[band] ??
                (band.includes('0.8') ? d['>=0.8 MeV'] ?? d.e800 : null) ??
                (band.includes('2') ? d['>=2 MeV'] ?? d['>=2.0 MeV'] ?? d.e2000 : null) ??
                (band.includes('4') ? d['>=4 MeV'] ?? d['>=4.0 MeV'] ?? d.e4000 : null)
              ]),
              markLine: idx === 0 ? combineMarkLines(midnightDividers) : undefined,
            }
          }),
        }
      }

      // 4. GOES Magnetometer
      case 'goes-mag': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('nT'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'nT',
            nameTextStyle: { color: '#34D399', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'Hp (Parallel)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.hp]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'He (Earthward)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#34D399' },
              itemStyle: { color: '#34D399' },
              data: rawData.map(d => [d.time_tag, d.he]),
            },
            {
              name: 'Hn (Normal)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#FBBF24' },
              itemStyle: { color: '#FBBF24' },
              data: rawData.map(d => [d.time_tag, d.hn]),
            },
            {
              name: 'Total Ht',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#EF4444' },
              itemStyle: { color: '#EF4444' },
              data: rawData.map(d => [d.time_tag, d.total]),
            },
          ],
        }
      }

      // 5. ACE SWEPAM Solar Wind
      case 'ace-swepam': {
        return {
          animation: false,
          grid: { ...baseGrid, right: 65 },
          tooltip: baseTooltip(''),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: [
            {
              type: 'value',
              name: 'Speed (km/s)',
              nameTextStyle: { color: '#06B6D4', fontWeight: 700, fontSize: 11 },
              splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
              axisLabel: { color: axisLabelColor },
            },
            {
              type: 'value',
              name: 'Density (p/cm³)',
              nameTextStyle: { color: '#F97316', fontWeight: 700, fontSize: 11 },
              splitLine: { show: false },
              axisLabel: { color: axisLabelColor },
            },
          ],
          series: [
            {
              name: 'Wind Speed',
              type: 'line',
              yAxisIndex: 0,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#06B6D4' },
              itemStyle: { color: '#06B6D4' },
              data: rawData.map(d => [d.time_tag, d.bulk_speed ?? d.proton_speed]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Proton Density',
              type: 'line',
              yAxisIndex: 1,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#F97316' },
              itemStyle: { color: '#F97316' },
              data: rawData.map(d => [d.time_tag, d.proton_density]),
            },
          ],
        }
      }

      // 6. ACE MAG Field
      case 'ace-mag': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('nT'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'IMF (nT)',
            nameTextStyle: { color: '#818CF8', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'Bt (Total)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#818CF8' },
              itemStyle: { color: '#818CF8' },
              data: rawData.map(d => [d.time_tag, d.bt]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Bz (North/South)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#EF4444' },
              itemStyle: { color: '#EF4444' },
              data: rawData.map(d => [d.time_tag, d.bz]),
            },
            {
              name: 'By',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.5, color: '#34D399' },
              itemStyle: { color: '#34D399' },
              data: rawData.map(d => [d.time_tag, d.by]),
            },
          ],
        }
      }

      // 7. ACE EPAM Particles
      case 'ace-epam': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('particles/(cm²·s·sr·MeV)'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            name: 'Flux',
            nameTextStyle: { color: '#FB923C', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: [
            {
              name: 'e 38-53 keV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#FB923C' },
              itemStyle: { color: '#FB923C' },
              data: rawData.map(d => [d.time_tag, d.e38_53]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'p 47-65 keV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.p47_65]),
            },
            {
              name: 'p 112-187 keV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#A855F7' },
              itemStyle: { color: '#A855F7' },
              data: rawData.map(d => [d.time_tag, d.p112_187]),
            },
          ],
        }
      }

      // ACE SIS
      case 'ace-sis': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('particles/(cm²·s·sr)'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            name: 'Flux',
            nameTextStyle: { color: '#10B981', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: [
            {
              name: 'ACE > 10 MeV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#10B981' },
              itemStyle: { color: '#10B981' },
              data: rawData.map(d => [d.time_tag, d.p10]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'ACE > 30 MeV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.p30]),
            },
          ],
        }
      }

      // SOLAR-1 Plasma
      case 'solar1-plasma': {
        return {
          animation: false,
          grid: { ...baseGrid, right: 65 },
          tooltip: baseTooltip(''),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: [
            {
              type: 'value',
              name: 'Speed (km/s)',
              nameTextStyle: { color: '#F59E0B', fontWeight: 700, fontSize: 11 },
              splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
              axisLabel: { color: axisLabelColor },
            },
            {
              type: 'value',
              name: 'Density (p/cm³)',
              nameTextStyle: { color: '#06B6D4', fontWeight: 700, fontSize: 11 },
              splitLine: { show: false },
              axisLabel: { color: axisLabelColor },
            },
          ],
          series: [
            {
              name: 'SOLAR-1 Speed',
              type: 'line',
              yAxisIndex: 0,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#F59E0B' },
              itemStyle: { color: '#F59E0B' },
              data: rawData.map(d => [d.time_tag, d.proton_speed]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'SOLAR-1 Density',
              type: 'line',
              yAxisIndex: 1,
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#06B6D4' },
              itemStyle: { color: '#06B6D4' },
              data: rawData.map(d => [d.time_tag, d.proton_density]),
            },
          ],
        }
      }

      // SOLAR-1 MAG
      case 'solar1-mag': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('nT'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'IMF (nT)',
            nameTextStyle: { color: '#EC4899', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'SOLAR-1 Bt',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#EC4899' },
              itemStyle: { color: '#EC4899' },
              data: rawData.map(d => [d.time_tag, d.bt]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'SOLAR-1 Bz',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#EF4444' },
              itemStyle: { color: '#EF4444' },
              data: rawData.map(d => [d.time_tag, d.bz]),
            },
            {
              name: 'SOLAR-1 By',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.5, color: '#34D399' },
              itemStyle: { color: '#34D399' },
              data: rawData.map(d => [d.time_tag, d.by]),
            },
          ],
        }
      }

      // SOLAR-1 STIS Particles
      case 'solar1-particles': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('pfu'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            name: 'STIS (pfu)',
            nameTextStyle: { color: '#F97316', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: [
            {
              name: 'p1: 47–68 keV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#EA580C' },
              itemStyle: { color: '#EA580C' },
              data: rawData.map(d => [d.time_tag, d.p1]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'p3: 116–180 keV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#F59E0B' },
              itemStyle: { color: '#F59E0B' },
              data: rawData.map(d => [d.time_tag, d.p3]),
            },
            {
              name: 'p5: 342–537 keV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.p5]),
            },
            {
              name: 'p8: 1.8–5.2 MeV',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#EC4899' },
              itemStyle: { color: '#EC4899' },
              data: rawData.map(d => [d.time_tag, d.p8]),
            },
          ],
        }
      }

      // STEREO-A Particles
      case 'stereo-particles': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('particles/(cm²·s·sr)'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            name: 'Flux',
            nameTextStyle: { color: '#6366F1', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: [
            {
              name: 'Ion B02 (45-55 keV)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#6366F1' },
              itemStyle: { color: '#6366F1' },
              data: rawData.map(d => [d.time_tag, d.ion_b02]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Ion B05 (85-125 keV)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.ion_b05]),
            },
            {
              name: 'Ele B02 (45-55 keV)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#10B981' },
              itemStyle: { color: '#10B981' },
              data: rawData.map(d => [d.time_tag, d.ele_b02]),
            },
          ],
        }
      }

      // Neutron Monitor (Selectable station)
      case 'neutron-monitor': {
        const stn = (station || 'OULU').toUpperCase()
        if (stn === 'PSNM') {
          return {
            animation: false,
            grid: baseGrid,
            tooltip: baseTooltip('counts/sec'),
            legend: baseLegend,
            dataZoom: baseDataZoom,
            xAxis,
            yAxis: {
              type: 'value',
              name: 'Counts/sec',
              nameTextStyle: { color: '#A855F7', fontWeight: 700, fontSize: 12 },
              splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
              axisLabel: { color: axisLabelColor },
            },
            series: [
              {
                name: 'PSNM NM-64 Corrected',
                type: 'line',
                showSymbol: false,
                lineStyle: { width: 2.2, color: '#A855F7' },
                itemStyle: { color: '#A855F7' },
                data: rawData.map(d => [d.time_tag, d.nm_corrected ?? d.count_rate]),
                markLine: combineMarkLines(midnightDividers),
              },
              {
                name: 'PSNM Bare Corrected',
                type: 'line',
                showSymbol: false,
                lineStyle: { width: 1.8, color: '#34D399' },
                itemStyle: { color: '#34D399' },
                data: rawData.map(d => [d.time_tag, d.bare_corrected]),
              },
            ],
          }
        } else {
          return {
            animation: false,
            grid: baseGrid,
            tooltip: baseTooltip('counts/sec'),
            legend: baseLegend,
            dataZoom: baseDataZoom,
            xAxis,
            yAxis: {
              type: 'value',
              name: `${stn} (cts/s)`,
              nameTextStyle: { color: '#A855F7', fontWeight: 700, fontSize: 12 },
              splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
              axisLabel: { color: axisLabelColor },
            },
            series: [
              {
                name: `${stn} Count Rate`,
                type: 'line',
                showSymbol: false,
                lineStyle: { width: 2.2, color: '#A855F7' },
                itemStyle: { color: '#A855F7' },
                data: rawData.map(d => [d.time_tag, d.count_rate ?? d.nm_corrected]),
                markLine: combineMarkLines(midnightDividers),
              },
            ],
          }
        }
      }

      // 8. PSNM Neutron Monitor (Doi Inthanon)
      case 'psnm-neutron': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('counts/sec'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'Counts/sec',
            nameTextStyle: { color: '#A855F7', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'NM-64 Corrected',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#A855F7' },
              itemStyle: { color: '#A855F7' },
              data: rawData.map(d => [d.time_tag, d.nm_corrected]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Bare Corrected',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#34D399' },
              itemStyle: { color: '#34D399' },
              data: rawData.map(d => [d.time_tag, d.bare_corrected]),
            },
          ],
        }
      }

      // 9. Mawson Station Neutron Monitor
      case 'maw-neutron': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('counts/sec'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'Counts/sec',
            nameTextStyle: { color: '#6366F1', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'Mawson NM Corrected',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#6366F1' },
              itemStyle: { color: '#6366F1' },
              data: rawData.map(d => [d.time_tag, d.nm_corrected]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Mawson Bare Corrected',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#FBBF24' },
              itemStyle: { color: '#FBBF24' },
              data: rawData.map(d => [d.time_tag, d.bare_corrected]),
            },
          ],
        }
      }

      // 10. Global Neutron Comparison
      case 'global-neutron': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('counts/sec'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'Counts/sec',
            nameTextStyle: { color: '#EC4899', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'OULU (Finland)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#EC4899' },
              itemStyle: { color: '#EC4899' },
              data: rawData.filter(d => d.oulu !== undefined).map(d => [d.time_tag, d.oulu]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'SOPO (South Pole)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.filter(d => d.sopo !== undefined).map(d => [d.time_tag, d.sopo]),
            },
          ],
        }
      }

      // 11. International Sunspot Number
      case 'sunspot-number': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('SSN'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis: {
            type: 'category',
            data: rawData.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`),
            axisLabel: { color: axisLabelColor, fontSize: 11 },
            splitLine: { show: false },
          },
          yAxis: {
            type: 'value',
            name: 'Sunspot Number',
            nameTextStyle: { color: '#FBBF24', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'Monthly Sunspot Number',
              type: 'line',
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#FBBF24' },
              areaStyle: {
                color: isLight ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.08)',
              },
              itemStyle: { color: '#FBBF24' },
              data: rawData.map(d => d.sunspot_number),
            },
          ],
        }
      }

      // 12. Moon CRaTER
      case 'moon-crater': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('cGy/day'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'Dose Rate (cGy/day)',
            nameTextStyle: { color: '#F59E0B', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'D1&2 (Thin Silicon)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#F43F5E' },
              itemStyle: { color: '#F43F5E' },
              data: rawData.map(d => [d.time_tag, d.d12]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'D3&4 (Thick Silicon)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#FB923C' },
              itemStyle: { color: '#FB923C' },
              data: rawData.map(d => [d.time_tag, d.d34]),
            },
            {
              name: 'D5&6 (Tissue Eq)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#A855F7' },
              itemStyle: { color: '#A855F7' },
              data: rawData.map(d => [d.time_tag, d.d56]),
            },
          ],
        }
      }

      // 13. Mars Curiosity RAD
      case 'mars-rad': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('μGy/day'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'value',
            name: 'μGy/day',
            nameTextStyle: { color: '#F87171', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: { color: axisLabelColor },
          },
          series: [
            {
              name: 'Silicon Dose Rate',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2.2, color: '#F87171' },
              itemStyle: { color: '#F87171' },
              data: rawData.map(d => [d.time_tag, d.dose_rate_silicon]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Plastic Dose Rate',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.dose_rate_plastic]),
            },
          ],
        }
      }

      // 14. Mars MAVEN Orbiter
      case 'mars-maven': {
        return {
          animation: false,
          grid: baseGrid,
          tooltip: baseTooltip('counts'),
          legend: baseLegend,
          dataZoom: baseDataZoom,
          xAxis,
          yAxis: {
            type: 'log',
            name: 'Particle Flux',
            nameTextStyle: { color: '#E11D48', fontWeight: 700, fontSize: 12 },
            splitLine: { show: true, lineStyle: { color: splitLineColor, type: 'dashed' } },
            axisLabel: {
              color: axisLabelColor,
              formatter: (v: number) => formatPowerOf10(v),
            },
          },
          series: [
            {
              name: 'Ion Low (19.7-21.1 keV/n)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 2, color: '#E11D48' },
              itemStyle: { color: '#E11D48' },
              data: rawData.map(d => [d.time_tag, d.ion_1]),
              markLine: combineMarkLines(midnightDividers),
            },
            {
              name: 'Ion Mid (83.6-105.4 keV/n)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#FB923C' },
              itemStyle: { color: '#FB923C' },
              data: rawData.map(d => [d.time_tag, d.ion_12]),
            },
            {
              name: 'Electron Low (20.1-21.5 keV)',
              type: 'line',
              showSymbol: false,
              lineStyle: { width: 1.8, color: '#38BDF8' },
              itemStyle: { color: '#38BDF8' },
              data: rawData.map(d => [d.time_tag, d.ele_1]),
            },
          ],
        }
      }

      default:
        return null
    }
  }, [chartId, rawData, isLight, limit, customRange, midnightDividers])

  if (loading) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.01)',
          borderRadius: 8,
        }}
      >
        <LoadingSpinner text={`Streaming ${chartId} telemetry...`} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: isLight ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.08)',
          border: '1px dashed rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          padding: 20,
        }}
      >
        <span style={{ fontSize: 24 }}>⚠️</span>
        <div style={{ color: '#EF4444', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          {error}
        </div>
      </div>
    )
  }

  if (!rawData || rawData.length === 0 || !chartOption) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.01)',
          borderRadius: 8,
          color: isLight ? '#94A3B8' : '#64748B',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
        }}
      >
        📡 No telemetry data available for the selected interval
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ReactECharts
        ref={chartRef}
        option={chartOption}
        style={{ width: '100%', height: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  )
}

function getColumnsForChart(chartId: ChartId, station?: string): ExportColumn[] {
  switch (chartId) {
    case 'neutron-monitor': {
      const stn = (station || 'OULU').toUpperCase()
      if (stn === 'PSNM') {
        return [
          { label: 'UTC Time', key: 'time_tag', width: 22 },
          { label: 'NM-64 Corrected (counts/s)', key: 'nm_corrected', width: 24 },
          { label: 'Bare Corrected (counts/s)', key: 'bare_corrected', width: 24 },
        ]
      }
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: `${stn} Count Rate (counts/s)`, key: 'count_rate', width: 24 },
      ]
    }
    case 'goes-xray':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'XRS-A Short (0.05-0.4nm)', key: 'xrsa_flux', width: 24 },
        { label: 'XRS-B Long (0.1-0.8nm)', key: 'xrsb_flux', width: 24 },
      ]
    case 'goes-proton':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Proton ≥1 MeV (pfu)', key: '>=1 MeV', width: 20 },
        { label: 'Proton ≥5 MeV (pfu)', key: '>=5 MeV', width: 20 },
        { label: 'Proton ≥10 MeV (pfu)', key: '>=10 MeV', width: 20 },
        { label: 'Proton ≥30 MeV (pfu)', key: '>=30 MeV', width: 20 },
        { label: 'Proton ≥50 MeV (pfu)', key: '>=50 MeV', width: 20 },
        { label: 'Proton ≥60 MeV (pfu)', key: '>=60 MeV', width: 20 },
        { label: 'Proton ≥100 MeV (pfu)', key: '>=100 MeV', width: 20 },
        { label: 'Proton ≥500 MeV (pfu)', key: '>=500 MeV', width: 20 },
      ]
    case 'goes-electron':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Electron ≥0.8 MeV', key: '>=0.8 MeV', width: 20 },
        { label: 'Electron ≥2 MeV', key: '>=2 MeV', width: 20 },
        { label: 'Electron ≥4 MeV', key: '>=4 MeV', width: 20 },
      ]
    case 'goes-mag':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Hp (nT)', key: 'hp', width: 14 },
        { label: 'He (nT)', key: 'he', width: 14 },
        { label: 'Hn (nT)', key: 'hn', width: 14 },
        { label: 'Total Ht (nT)', key: 'total', width: 16 },
      ]
    case 'ace-swepam':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Solar Wind Speed (km/s)', key: 'bulk_speed', width: 24 },
        { label: 'Proton Density (p/cm³)', key: 'proton_density', width: 24 },
      ]
    case 'ace-mag':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Bt Total (nT)', key: 'bt', width: 16 },
        { label: 'Bz IMF (nT)', key: 'bz', width: 16 },
        { label: 'By IMF (nT)', key: 'by', width: 16 },
      ]
    case 'ace-epam':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'e 38-53 keV', key: 'e38_53', width: 18 },
        { label: 'p 47-65 keV', key: 'p47_65', width: 18 },
        { label: 'p 112-187 keV', key: 'p112_187', width: 18 },
      ]
    case 'ace-sis':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'ACE > 10 MeV (pfu)', key: 'p10', width: 20 },
        { label: 'ACE > 30 MeV (pfu)', key: 'p30', width: 20 },
      ]
    case 'solar1-plasma':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'SOLAR-1 Speed (km/s)', key: 'proton_speed', width: 22 },
        { label: 'SOLAR-1 Density (p/cm³)', key: 'proton_density', width: 22 },
        { label: 'SOLAR-1 Temp (K)', key: 'proton_temperature', width: 20 },
      ]
    case 'solar1-mag':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Bt Total (nT)', key: 'bt', width: 16 },
        { label: 'Bz IMF (nT)', key: 'bz', width: 16 },
        { label: 'Bx IMF (nT)', key: 'bx', width: 16 },
        { label: 'By IMF (nT)', key: 'by', width: 16 },
      ]
    case 'solar1-particles':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'p1 (47-68 keV)', key: 'p1', width: 18 },
        { label: 'p3 (116-180 keV)', key: 'p3', width: 18 },
        { label: 'p5 (342-537 keV)', key: 'p5', width: 18 },
        { label: 'p8 (1.8-5.2 MeV)', key: 'p8', width: 18 },
      ]
    case 'stereo-particles':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Ion B02 (45-55 keV)', key: 'ion_b02', width: 22 },
        { label: 'Ion B05 (85-125 keV)', key: 'ion_b05', width: 22 },
        { label: 'Ele B02 (45-55 keV)', key: 'ele_b02', width: 22 },
      ]
    case 'psnm-neutron':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'NM-64 Corrected (counts/s)', key: 'nm_corrected', width: 24 },
        { label: 'Bare Corrected (counts/s)', key: 'bare_corrected', width: 24 },
      ]
    case 'maw-neutron':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Mawson NM Corrected', key: 'nm_corrected', width: 24 },
        { label: 'Mawson Bare Corrected', key: 'bare_corrected', width: 24 },
      ]
    case 'global-neutron':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Oulu Counts/s', key: 'oulu', width: 18 },
        { label: 'South Pole Counts/s', key: 'sopo', width: 18 },
      ]
    case 'sunspot-number':
      return [
        { label: 'Year-Month', key: 'time_tag', width: 16 },
        { label: 'Sunspot Number', key: 'sunspot_number', width: 18 },
      ]
    case 'moon-crater':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'CRaTER D1&2 (cGy/day)', key: 'd12', width: 22 },
        { label: 'CRaTER D3&4 (cGy/day)', key: 'd34', width: 22 },
        { label: 'CRaTER D5&6 (cGy/day)', key: 'd56', width: 22 },
      ]
    case 'mars-rad':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Silicon Dose Rate (μGy/day)', key: 'dose_rate_silicon', width: 26 },
        { label: 'Plastic Dose Rate (μGy/day)', key: 'dose_rate_plastic', width: 26 },
      ]
    case 'mars-maven':
      return [
        { label: 'UTC Time', key: 'time_tag', width: 22 },
        { label: 'Ion 19.7-21.1 keV', key: 'ion_1', width: 20 },
        { label: 'Ion 83.6-105.4 keV', key: 'ion_12', width: 20 },
        { label: 'Ele 20.1-21.5 keV', key: 'ele_1', width: 20 },
      ]
    default:
      return [{ label: 'UTC Time', key: 'time_tag', width: 22 }]
  }
}
