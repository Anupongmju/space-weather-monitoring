import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  loadPsnmData,
  loadPsnmRange,
  loadPsnmScatter,
  loadPsnmRegression,
  PsnmDataPoint,
  PsnmRegressionData,
  PsnmTubeRegression
} from '../../services/psnmService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime } from '../../utils/formatters'
import { RefreshCw, Activity, BarChart2, Compass, Zap, Radio, Maximize2, X, Grid, Eye, EyeOff } from 'lucide-react'
import {
  createTimeAxisLabel,
  getMidnightTimestamps,
  getMidnightDividerMarkLines,
  combineMarkLines,
  getTimeDomain
} from '../../utils/chartHelpers'

// Channel specifications for PSNM
const COUNTS_LINES = [
  { key: 'nm_corrected', color: '#0284C7', darkColor: '#38BDF8', label: '18-NM-64 Corrected' },
  { key: 'nm_uncorrected', color: '#EA580C', darkColor: '#FB923C', label: '18-NM-64 Uncorrected' },
  { key: 'bare_corrected', color: '#059669', darkColor: '#34D399', label: 'Bare Corrected' },
  { key: 'bare_uncorrected', color: '#7C3AED', darkColor: '#C084FC', label: 'Bare Uncorrected' }
]

// Colors for tubes
const STD_COLORS = [
  '#0284C7', '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#059669',
  '#0891B2', '#DB2777', '#E11D48', '#0D9488', '#0284C7', '#D97706',
  '#DC2626', '#7C3AED', '#2563EB', '#059669', '#0891B2', '#DB2777'
]
const STD_DARK_COLORS = [
  '#38BDF8', '#FBBF24', '#F87171', '#C084FC', '#60A5FA', '#34D399',
  '#22D3EE', '#F472B6', '#FB7185', '#2DD4BF', '#38BDF8', '#FBBF24',
  '#F87171', '#C084FC', '#60A5FA', '#34D399', '#22D3EE', '#F472B6'
]
const BARE_COLORS = ['#0284C7', '#2563EB', '#059669']
const BARE_DARK_COLORS = ['#38BDF8', '#60A5FA', '#34D399']

const NM18_DISTINCT_COLORS = [
  '#0284C7', '#2563EB', '#4F46E5', '#7C3AED', '#9333EA', '#C026D3',
  '#DB2777', '#E11D48', '#DC2626', '#EA580C', '#D97706', '#CA8A04',
  '#65A30D', '#16A34A', '#059669', '#0D9488', '#0891B2', '#0284C7'
]
const NM18_DARK_DISTINCT_COLORS = [
  '#38BDF8', '#60A5FA', '#818CF8', '#A78BFA', '#C084FC', '#E879F9',
  '#F472B6', '#FB7185', '#F87171', '#FB923C', '#FBBF24', '#FACC15',
  '#A3E635', '#4ADE80', '#34D399', '#2DD4BF', '#22D3EE', '#38BDF8'
]
const BARE3_DISTINCT_COLORS = ['#D97706', '#EA580C', '#059669']
const BARE3_DARK_DISTINCT_COLORS = ['#FBBF24', '#FB923C', '#34D399']

const STD_TUBES = Array.from({ length: 18 }, (_, i) => ({ key: `tube_${i + 1}`, label: `T${i + 1}` }))
const BARE_TUBES = Array.from({ length: 3 }, (_, i) => ({ key: `bare_${i + 1}`, label: `B${i + 1}` }))

type PsnmViewType = 'counts' | 'pressure' | 'leader' | 'tubes' | 'scatter'

const VIEWS: { id: PsnmViewType; tag: string; label: string; icon: any; color: string; desc: string }[] = [
  {
    id: 'counts',
    tag: '01',
    label: 'TOTAL COUNTS',
    icon: Activity,
    color: '#0284C7',
    desc: '18-NM-64 & Bare Corrected / Uncorrected Flux'
  },
  {
    id: 'pressure',
    tag: '02',
    label: 'ATMOSPHERIC PRESSURE',
    icon: BarChart2,
    color: '#D97706',
    desc: 'Doi Inthanon Summit Barometric Pressure (mbar)'
  },
  {
    id: 'leader',
    tag: '03',
    label: 'LEADER FRACTION',
    icon: Zap,
    color: '#EA580C',
    desc: 'Pressure-Corrected Leader Neutron Ratio'
  },
  {
    id: 'tubes',
    tag: '04',
    label: 'INDIVIDUAL TUBES',
    icon: Radio,
    color: '#2563EB',
    desc: '18 NM-64 + 3 Bare Detectors'
  },
  {
    id: 'scatter',
    tag: '05',
    label: 'BAROMETRIC REGRESSION',
    icon: Compass,
    color: '#DC2626',
    desc: 'Δln N vs ΔP · Barometric Coefficient β Determination'
  }
]

function PsnmMiniScatter({
  tube,
  isLight,
  isSelected,
  onSelect
}: {
  tube: PsnmTubeRegression
  isLight: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  const width = 290
  const height = 180
  const padLeft = 36
  const padRight = 12
  const padTop = 16
  const padBottom = 26

  const pMin = -7.5
  const pMax = 7.5
  const lnMin = -0.25
  const lnMax = 0.25

  const mapX = (x: number) => padLeft + ((x - pMin) / (pMax - pMin)) * (width - padLeft - padRight)
  const mapY = (y: number) => height - padBottom - ((y - lnMin) / (lnMax - lnMin)) * (height - padTop - padBottom)

  const x0 = mapX(0)
  const y0 = mapY(0)

  const regX1 = pMin
  const regY1 = tube.slope * regX1 + tube.intercept
  const regX2 = pMax
  const regY2 = tube.slope * regX2 + tube.intercept

  const pointColor = tube.is_bare
    ? (isLight ? 'rgba(217, 119, 6, 0.50)' : 'rgba(251, 191, 36, 0.55)')
    : (isLight ? 'rgba(37, 99, 235, 0.50)' : 'rgba(96, 165, 250, 0.55)')

  const gridColor = isLight ? 'rgba(226, 232, 240, 0.9)' : 'rgba(255, 255, 255, 0.06)'
  const zeroLineColor = isLight ? 'rgba(100, 116, 139, 0.45)' : 'rgba(148, 163, 184, 0.45)'
  const textColor = isLight ? '#64748B' : '#94A3B8'

  return (
    <div
      onClick={onSelect}
      style={{
        background: isLight ? '#FFFFFF' : '#0F172A',
        border: `1.5px solid ${isSelected ? (tube.is_bare ? '#D97706' : '#2563EB') : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)')}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: 'var(--font-mono)',
        boxShadow: isSelected
          ? (isLight ? '0 0 0 3px rgba(37,99,235,0.2), 0 4px 12px rgba(0,0,0,0.05)' : '0 0 0 3px rgba(37,99,235,0.4), 0 4px 16px rgba(0,0,0,0.5)')
          : (isLight ? '0 1px 3px rgba(0,0,0,0.04)' : '0 2px 6px rgba(0,0,0,0.3)')
      }}
      title={`Click to view full detail of ${tube.name}`}
    >
      {/* Title */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 12.5,
        fontWeight: 700,
        color: tube.is_bare ? '#D97706' : (isLight ? '#1E40AF' : '#60A5FA')
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{tube.name}</span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 3,
            background: tube.is_bare
              ? (isLight ? '#FEF3C7' : 'rgba(217, 119, 6, 0.25)')
              : (isLight ? '#DBEAFE' : 'rgba(37, 99, 235, 0.25)'),
            color: tube.is_bare ? '#B45309' : (isLight ? '#1D4ED8' : '#93C5FD')
          }}>
            {tube.type}
          </span>
        </div>
        {isSelected ? (
          <span style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: tube.is_bare ? '#D97706' : '#2563EB', color: '#FFF', fontWeight: 700 }}>
            SELECTED
          </span>
        ) : (
          <span style={{ fontSize: 10, color: textColor, opacity: 0.8 }}>🔍 View</span>
        )}
      </div>

      {/* Red box with metrics: single clean line with bold numbers */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 8px',
        border: '1px solid #DC2626',
        borderRadius: 4,
        fontSize: 11,
        color: '#DC2626',
        background: isLight ? '#FEF2F2' : 'rgba(220, 38, 38, 0.12)',
        fontWeight: 600
      }}>
        <span>β = <strong style={{ fontWeight: 800 }}>{tube.beta_mbar.toFixed(4)}</strong> %/mb</span>
        <span style={{ opacity: 0.5 }}>|</span>
        <span>R² = <strong style={{ fontWeight: 800 }}>{tube.r2.toFixed(4)}</strong></span>
      </div>

      {/* SVG Scatter Plot */}
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Frame */}
        <rect
          x={padLeft}
          y={padTop}
          width={width - padLeft - padRight}
          height={height - padTop - padBottom}
          fill={isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)'}
          stroke={isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)'}
          strokeWidth="0.8"
        />

        {/* Light Sub-grid Lines */}
        {[-0.2, -0.1, 0.1, 0.2].map(v => (
          <line key={`yg-${v}`} x1={padLeft} y1={mapY(v)} x2={width - padRight} y2={mapY(v)} stroke={gridColor} strokeWidth="0.6" strokeDasharray="1,2" />
        ))}
        {[-5, -2.5, 2.5, 5].map(v => (
          <line key={`xg-${v}`} x1={mapX(v)} y1={padTop} x2={mapX(v)} y2={height - padBottom} stroke={gridColor} strokeWidth="0.6" strokeDasharray="1,2" />
        ))}

        {/* Dashed Center Zero Lines */}
        <line x1={x0} y1={padTop} x2={x0} y2={height - padBottom} stroke={zeroLineColor} strokeWidth="0.9" strokeDasharray="3,3" />
        <line x1={padLeft} y1={y0} x2={width - padRight} y2={y0} stroke={zeroLineColor} strokeWidth="0.9" strokeDasharray="3,3" />

        {/* Scatter Points */}
        {tube.sample_points.map((pt, idx) => (
          <circle
            key={idx}
            cx={mapX(pt[0])}
            cy={mapY(pt[1])}
            r="1.6"
            fill={pointColor}
          />
        ))}

        {/* Linear Fit Line */}
        <line
          x1={mapX(regX1)}
          y1={mapY(regY1)}
          x2={mapX(regX2)}
          y2={mapY(regY2)}
          stroke="#DC2626"
          strokeWidth="1.8"
        />

        {/* Axis Titles */}
        <text x={padLeft + 2} y={padTop - 4} fontSize="8.5" fill={textColor} fontFamily="var(--font-mono)">
          Δln N
        </text>
        <text x={width - padRight} y={height - 5} textAnchor="end" fontSize="8.5" fill={textColor} fontFamily="var(--font-mono)">
          ΔP (mbar)
        </text>

        {/* X Ticks */}
        {[-5, -2.5, 0, 2.5, 5].map(v => (
          <text key={v} x={mapX(v)} y={height - padBottom + 12} textAnchor="middle" fontSize="8.5" fill={textColor} fontFamily="var(--font-mono)">
            {v}
          </text>
        ))}

        {/* Y Ticks */}
        {[-0.2, -0.1, 0, 0.1, 0.2].map(v => (
          <text key={v} x={padLeft - 4} y={mapY(v) + 3} textAnchor="end" fontSize="8.5" fill={textColor} fontFamily="var(--font-mono)">
            {v === 0 ? '0' : v.toFixed(1)}
          </text>
        ))}
      </svg>
    </div>
  )
}

export default function PsnmIndex() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [searchParams, setSearchParams] = useSearchParams()

  const activeView: PsnmViewType = (searchParams.get('view') as PsnmViewType) || 'counts'

  const [data, setData] = useState<PsnmDataPoint[]>([])
  const [scatterData, setScatterData] = useState<any[]>([])
  const [regressionData, setRegressionData] = useState<PsnmRegressionData | null>(null)
  const [regressionChannel, setRegressionChannel] = useState<string>('nm18_sum')
  const [regressionMode, setRegressionMode] = useState<'grid_18_3' | 'mlr_3' | 'beta_comparison'>('mlr_3')
  const [selectedTubeId, setSelectedTubeId] = useState<string>('T01')
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [corrFilter, setCorrFilter] = useState<'all' | 'corrected' | 'uncorrected'>('corrected')
  const [tubeFilter, setTubeFilter] = useState<'all' | 'sec1' | 'sec2' | 'sec3' | 'std' | 'bare'>('all')
  const [scatterTubeFilter, setScatterTubeFilter] = useState<'all' | 'nm18' | 'bare3'>('all')
  const [showScatterPoints, setShowScatterPoints] = useState<boolean>(true)
  const [focusedTubeId, setFocusedTubeId] = useState<string | null>(null)
  const chartRef = useRef<any>(null)

  const exportColumns = useMemo((): ExportColumn[] => {
    const base: ExportColumn[] = [
      { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
      { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') }
    ]
    if (activeView === 'counts') {
      return [
        ...base,
        { key: 'nm_corrected', label: '18-NM-64_Cor', width: 16 },
        { key: 'nm_uncorrected', label: '18-NM-64_Uncor', width: 16 },
        { key: 'bare_corrected', label: 'Bare_Cor', width: 14 },
        { key: 'bare_uncorrected', label: 'Bare_Uncor', width: 14 },
        { key: 'pressure', label: 'Pressure(mmHg)', width: 16 }
      ]
    }
    if (activeView === 'pressure') {
      return [
        ...base,
        { key: 'pressure', label: 'Pressure(mmHg)', width: 16 }
      ]
    }
    if (activeView === 'tubes') {
      const tubeCols: ExportColumn[] = []
      for (let i = 1; i <= 18; i++) {
        tubeCols.push({ key: `tube_${i}`, label: `T${i}`, width: 10 })
      }
      for (let i = 1; i <= 3; i++) {
        tubeCols.push({ key: `bare_${i}`, label: `B${i}`, width: 10 })
      }
      return [...base, ...tubeCols]
    }
    return [
      ...base,
      { key: 'nm_corrected', label: '18-NM-64_Cor', width: 16 },
      { key: 'nm_uncorrected', label: '18-NM-64_Uncor', width: 16 },
      { key: 'pressure', label: 'Pressure(mmHg)', width: 16 }
    ]
  }, [activeView])

  const exportTimeRange = appliedRange
    ? `${appliedRange.startDate} to ${appliedRange.endDate}`
    : `Past ${limit / 1440} Day(s)`

  const parsePsnmData = (raw: PsnmDataPoint[]) => {
    if (!Array.isArray(raw)) return []
    return raw.map(r => {
      const utcTime = r.time_tag.includes('T') ? r.time_tag : r.time_tag.replace(' ', 'T') + 'Z'
      return {
        ...r,
        time_tag: utcTime,
        nm_uncorrected: (typeof r.nm_uncorrected === 'number' && r.nm_uncorrected > 80000) ? null : r.nm_uncorrected,
        bare_uncorrected: (typeof r.bare_uncorrected === 'number' && r.bare_uncorrected > 5000) ? null : r.bare_uncorrected,
        _ts: (r as any)._ts || new Date(utcTime).getTime()
      }
    })
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: async (startDate: string, endDate: string) => {
      const raw = await loadPsnmRange(startDate, endDate)
      return parsePsnmData(raw)
    },
    windowMinutes: 4320,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  const filteredCountsLines = useMemo(() => {
    if (corrFilter === 'corrected') {
      return COUNTS_LINES.filter(l => !l.key.includes('uncorrected'))
    }
    if (corrFilter === 'uncorrected') {
      return COUNTS_LINES.filter(l => l.key.includes('uncorrected'))
    }
    return COUNTS_LINES
  }, [corrFilter])

  const setView = (view: PsnmViewType) => {
    resetPan()
    setSearchParams({ view })
  }

  // Load telemetry data
  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      if (activeView === 'scatter') {
        const reg = await loadPsnmRegression()
        setRegressionData(reg)
      } else {
        let d: PsnmDataPoint[]
        if (appliedRange?.startDate && appliedRange?.endDate) {
          d = await loadPsnmRange(appliedRange.startDate, appliedRange.endDate)
        } else {
          d = await loadPsnmData(limit)
        }
        setData(parsePsnmData(d))
      }
    } catch (e) {
      console.error('Failed loading PSNM data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    resetPan()
    load()
  }, [activeView, limit, appliedRange])

  useAutoFetch(async () => {
    if (appliedRange) return
    if (activeView === 'scatter') {
      const reg = await loadPsnmRegression()
      setRegressionData(reg)
    } else {
      const d = await loadPsnmData(limit)
      setData(parsePsnmData(d))
    }
  }, 60000)

  const isMultiDay = limit > 1440 || !!appliedRange || (data.length > 0 && ((data[data.length - 1]._ts || 0) - (data[0]._ts || 0) > 24 * 3600 * 1000))
  const { minTs, maxTs } = getTimeDomain(data)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  // 1. TOTAL COUNTS Chart Option
  const countsOption = useMemo(() => {
    return {
      useUTC: true,
      backgroundColor: 'transparent',
      legend: {
        show: true,
        top: 0,
        right: 10,
        textStyle: {
          color: isLight ? '#475569' : '#CBD5E1',
          fontFamily: 'var(--font-mono)',
          fontSize: 12
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#0284C7' : 'rgba(56, 189, 248, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        extraCssText: isLight
          ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
          : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: isLight ? '#0284C7' : '#38BDF8', type: 'dashed', width: 1.5 }
        },
        formatter: (params: any) => {
          if (!params || !params.length) return ''
          const rawTime = params[0]?.data?.[0] || params[0]?.axisValue
          const timeStr = formatUTCTime(rawTime, true)
          let res = `
            <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
              <strong style="color:${isLight ? '#0284C7' : '#38BDF8'};font-family:var(--font-mono);font-size:13px;">🕒 ${timeStr}</strong>
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr auto;gap:4px 12px;align-items:center;font-size:12px;font-family:var(--font-mono);">
          `
          params.forEach((p: any) => {
            const val = Array.isArray(p.value) ? p.value[1] : p.value
            const isRatio = p.seriesName === 'Leader Fraction'
            const valStr = typeof val === 'number' ? (isRatio ? val.toFixed(4) : `${val.toFixed(1)} cts/min`) : 'N/A'
            res += `
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
              <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};text-align:right;">${valStr}</strong>
            `
          })
          res += `</div>`
          return res
        }
      },
      grid: { top: 35, right: 30, bottom: 45, left: 75 },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
        }
      ],
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: createTimeAxisLabel(isLight, isMultiDay)
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: 'COUNTS (cts/min)',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: {
          color: isLight ? '#0284C7' : '#38BDF8',
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)'
        },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' }
      },
      animation: false,
      series: filteredCountsLines.map((l, idx) => {
        const color = isLight ? l.color : l.darkColor
        return {
          name: l.label,
          type: 'line',
          smooth: false,
          sampling: 'lttb',
          large: true,
          largeThreshold: 500,
          showSymbol: false,
          connectNulls: true,
          triggerEvent: true,
          lineStyle: { width: 2.2, color, type: 'solid' },
          itemStyle: { color },
          emphasis: { focus: 'series', lineStyle: { width: 3.8 } },
          data: data.map(d => [(d as any)._ts || d.time_tag, (d as any)[l.key]]),
          ...(idx === 0 && midnightDividers.length > 0 ? { markLine: combineMarkLines(midnightDividers) } : {})
        }
      })
    }
  }, [data, isLight, isMultiDay, midnightDividers, filteredCountsLines, zoomRange])

  // 2. ATMOSPHERIC PRESSURE Chart Option
  const pressureOption = useMemo(() => {
    return {
      useUTC: true,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#D97706' : 'rgba(245, 158, 11, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        extraCssText: isLight
          ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
          : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: isLight ? '#D97706' : '#F59E0B', type: 'dashed', width: 1.5 }
        },
        formatter: (params: any) => {
          if (!params || !params.length) return ''
          const rawTime = params[0]?.data?.[0] || params[0]?.axisValue
          const timeStr = formatUTCTime(rawTime, true)
          const val = params[0]?.value[1]
          const valStr = typeof val === 'number' ? `${val.toFixed(2)} mbar` : 'N/A'

          return `
            <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
              <strong style="color:${isLight ? '#D97706' : '#FBBF24'};font-family:var(--font-mono);font-size:13px;">🕒 ${timeStr}</strong>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13px;font-family:var(--font-mono);">
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">Atmospheric Pressure:</span>
              <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr}</strong>
            </div>
          `
        }
      },
      grid: { top: 25, right: 30, bottom: 45, left: 75 },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
        }
      ],
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: createTimeAxisLabel(isLight, isMultiDay)
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: 'PRESSURE (mbar)',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: {
          color: isLight ? '#D97706' : '#F59E0B',
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)'
        },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' }
      },
      animation: false,
      series: [
        {
          name: 'Pressure',
          type: 'line',
          smooth: false,
          sampling: 'lttb',
          large: true,
          largeThreshold: 500,
          showSymbol: false,
          connectNulls: true,
          lineStyle: { width: 2.2, color: isLight ? '#D97706' : '#F59E0B' },
          itemStyle: { color: isLight ? '#D97706' : '#F59E0B' },
          areaStyle: {
            color: isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(245, 158, 11, 0.12)'
          },
          data: data.map(d => [(d as any)._ts || d.time_tag, d.pressure]),
          ...(midnightDividers.length > 0 ? { markLine: combineMarkLines(midnightDividers) } : {})
        }
      ]
    }
  }, [data, isLight, isMultiDay, midnightDividers, zoomRange])

  // 3. LEADER FRACTION Chart Option
  const leaderOption = useMemo(() => {
    return {
      useUTC: true,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#EA580C' : 'rgba(251, 146, 60, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        extraCssText: isLight
          ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
          : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: isLight ? '#EA580C' : '#FB923C', type: 'dashed', width: 1.5 }
        },
        formatter: (params: any) => {
          if (!params || !params.length) return ''
          const rawTime = params[0]?.data?.[0] || params[0]?.axisValue
          const timeStr = formatUTCTime(rawTime, true)
          const val = params[0]?.value[1]
          const valStr = typeof val === 'number' ? val.toFixed(4) : 'N/A'

          return `
            <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
              <strong style="color:${isLight ? '#EA580C' : '#FB923C'};font-family:var(--font-mono);font-size:13px;">🕒 ${timeStr}</strong>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13px;font-family:var(--font-mono);">
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">Leader Fraction:</span>
              <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr}</strong>
            </div>
          `
        }
      },
      grid: { top: 25, right: 30, bottom: 45, left: 75 },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
        }
      ],
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: createTimeAxisLabel(isLight, isMultiDay)
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: 'LEADER FRACTION (RATIO)',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: {
          color: isLight ? '#EA580C' : '#FB923C',
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)'
        },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' }
      },
      animation: false,
      series: [
        {
          name: 'Leader Fraction',
          type: 'line',
          smooth: false,
          sampling: 'lttb',
          large: true,
          largeThreshold: 500,
          showSymbol: false,
          connectNulls: true,
          lineStyle: { width: 2.2, color: isLight ? '#EA580C' : '#FB923C' },
          itemStyle: { color: isLight ? '#EA580C' : '#FB923C' },
          areaStyle: {
            color: isLight ? 'rgba(234, 88, 12, 0.08)' : 'rgba(251, 146, 60, 0.12)'
          },
          data: data.map(d => [(d as any)._ts || d.time_tag, d.leader_cor]),
          ...(midnightDividers.length > 0 ? { markLine: combineMarkLines(midnightDividers) } : {})
        }
      ]
    }
  }, [data, isLight, isMultiDay, midnightDividers, zoomRange])

  // 4. INDIVIDUAL TUBES Chart Option
  const tubesOption = useMemo(() => {
    const showStd = tubeFilter === 'all' || tubeFilter === 'std' || tubeFilter.startsWith('sec')
    const showBare = tubeFilter === 'all' || tubeFilter === 'bare'

    let targetStd = STD_TUBES
    if (tubeFilter === 'sec1') targetStd = STD_TUBES.slice(0, 6)
    else if (tubeFilter === 'sec2') targetStd = STD_TUBES.slice(6, 12)
    else if (tubeFilter === 'sec3') targetStd = STD_TUBES.slice(12, 18)

    const seriesList: any[] = []

    if (showStd && targetStd.length > 0) {
      targetStd.forEach((tube, i) => {
        const globalIdx = STD_TUBES.findIndex(t => t.key === tube.key)
        const colorIdx = globalIdx >= 0 ? globalIdx : i
        const color = isLight ? STD_COLORS[colorIdx % STD_COLORS.length] : STD_DARK_COLORS[colorIdx % STD_DARK_COLORS.length]
        seriesList.push({
          name: `Tube ${tube.label}`,
          type: 'line',
          smooth: false,
          large: true,
          largeThreshold: 200,
          showSymbol: false,
          connectNulls: true,
          emphasis: { disabled: true },
          lineStyle: { width: 1.8, color },
          itemStyle: { color },
          data: data.map(d => [(d as any)._ts || d.time_tag, d[tube.key]])
        })
      })
    }

    if (showBare) {
      BARE_TUBES.forEach((tube, i) => {
        const color = isLight ? BARE_COLORS[i % BARE_COLORS.length] : BARE_DARK_COLORS[i % BARE_DARK_COLORS.length]
        seriesList.push({
          name: `Bare ${tube.label}`,
          type: 'line',
          smooth: false,
          large: true,
          largeThreshold: 200,
          showSymbol: false,
          connectNulls: true,
          emphasis: { disabled: true },
          lineStyle: { width: 2.0, color, type: 'dashed' },
          itemStyle: { color },
          data: data.map(d => [(d as any)._ts || d.time_tag, d[tube.key]])
        })
      })
    }

    if (seriesList.length > 0 && midnightDividers.length > 0) {
      seriesList[0].markLine = combineMarkLines(midnightDividers)
    }

    return {
      useUTC: true,
      backgroundColor: 'transparent',
      animation: false,
      legend: {
        show: true,
        type: 'scroll',
        hoverLink: false,
        top: 0,
        right: 10,
        textStyle: {
          color: isLight ? '#475569' : '#CBD5E1',
          fontFamily: 'var(--font-mono)',
          fontSize: 11
        }
      },
      tooltip: {
        trigger: 'axis',
        renderMode: 'html',
        confine: true,
        transitionDuration: 0,
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#2563EB' : 'rgba(59, 130, 246, 0.6)',
        borderWidth: 1.5,
        padding: 8,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
        axisPointer: {
          type: 'line',
          snap: false,
          animation: false,
          lineStyle: { color: isLight ? '#2563EB' : '#38BDF8', type: 'dashed', width: 1.5 }
        },
        formatter: (params: any) => {
          if (!params || !params.length) return ''
          const rawTime = params[0]?.data?.[0] || params[0]?.axisValue
          const timeStr = formatUTCTime(rawTime, true)
          let res = `
            <div style="margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
              <strong style="color:${isLight ? '#2563EB' : '#60A5FA'};font-family:var(--font-mono);font-size:12px;">🕒 ${timeStr}</strong>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:2px 10px;font-size:11px;font-family:var(--font-mono);">
          `
          params.forEach((p: any) => {
            const val = Array.isArray(p.value) ? p.value[1] : p.value
            const valStr = typeof val === 'number' ? val.toFixed(0) : '-'
            const shortName = p.seriesName.replace('Tube ', 'T').replace('Bare ', 'B')
            res += `
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.color};"></span>
                <span style="color:${isLight ? '#475569' : '#94A3B8'};">${shortName}:</span>
                <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr}</strong>
              </div>
            `
          })
          res += `</div>`
          return res
        }
      },
      grid: { top: 35, right: 30, bottom: 45, left: 75 },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
        }
      ],
      xAxis: {
        type: 'time',
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: createTimeAxisLabel(isLight, isMultiDay)
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: 'TUBE FLUX (cts/min)',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: {
          color: isLight ? '#2563EB' : '#60A5FA',
          fontSize: 13,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)'
        },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' }
      },
      series: seriesList
    }
  }, [data, tubeFilter, isLight, isMultiDay, midnightDividers, zoomRange])

  // 5. BAROMETRIC REGRESSION OPTIONS
  const selectedTube = useMemo(() => {
    if (!regressionData?.tubes_21 || regressionData.tubes_21.length === 0) return null
    return regressionData.tubes_21.find(t => t.id === selectedTubeId) || regressionData.tubes_21[0]
  }, [regressionData, selectedTubeId])

  const filteredRegressionTubes = useMemo(() => {
    if (!regressionData?.tubes_21) return []
    if (scatterTubeFilter === 'nm18') return regressionData.tubes_21.filter(t => !t.is_bare)
    if (scatterTubeFilter === 'bare3') return regressionData.tubes_21.filter(t => t.is_bare)
    return regressionData.tubes_21
  }, [regressionData, scatterTubeFilter])

  // Single Tube Detailed ECharts Option
  const selectedTubeOption = useMemo(() => {
    if (!selectedTube) return {}
    const t = selectedTube
    const pLim = t.p_lim || 7.5
    const lnLim = t.ln_lim || 0.25

    const regLine = [
      [-pLim, Number((t.slope * -pLim + t.intercept).toFixed(6))],
      [pLim, Number((t.slope * pLim + t.intercept).toFixed(6))]
    ]

    const fitColor = t.is_bare ? '#D97706' : '#DC2626'
    const pointColor = t.is_bare
      ? (isLight ? 'rgba(217, 119, 6, 0.40)' : 'rgba(251, 191, 36, 0.45)')
      : (isLight ? 'rgba(37, 99, 235, 0.40)' : 'rgba(96, 165, 250, 0.45)')

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: fitColor,
        borderWidth: 1.5,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 12 },
        formatter: (params: any) => {
          if (params.seriesType === 'scatter') {
            const pt = params.data
            return `
              <div style="font-family:var(--font-mono);font-size:12px;">
                <strong style="color:${fitColor};">${t.full_name} Data Point</strong><br />
                ΔP: <strong>${pt[0].toFixed(3)} mbar</strong><br />
                Δln N: <strong>${pt[1].toFixed(5)}</strong>
              </div>
            `
          }
          return `<div style="font-family:var(--font-mono);font-size:12px;"><strong style="color:${fitColor};">Linear Fit Line</strong>: m=${t.slope.toFixed(6)}, β=${t.beta_mbar.toFixed(4)} %/mbar</div>`
        }
      },
      grid: { top: 30, right: 30, bottom: 50, left: 65 },
      dataZoom: [{ type: 'inside', xAxisIndex: 0, yAxisIndex: 0 }],
      xAxis: {
        type: 'value',
        name: 'Pressure Variation, ΔP (mbar)',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -pLim,
        max: pLim,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Δln N',
        nameLocation: 'middle',
        nameGap: 48,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -lnLim,
        max: lnLim,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      series: [
        {
          name: 'Sampled Points',
          type: 'scatter',
          symbolSize: 4,
          large: true,
          itemStyle: { color: pointColor },
          data: t.sample_points
        },
        {
          name: 'Fit Line',
          type: 'line',
          showSymbol: false,
          data: regLine,
          lineStyle: { color: '#DC2626', width: 2.2 },
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: { color: isLight ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.8)', type: 'dashed', width: 1 },
            data: [{ xAxis: 0 }, { yAxis: 0 }]
          }
        }
      ]
    }
  }, [selectedTube, isLight])

  // 18-NM-64 Combined Regression Chart Option (Exact Calculated Physical Equations)
  const combinedNm18Option = useMemo(() => {
    if (!regressionData?.tubes_21) return {}
    const nmTubes = regressionData.tubes_21.filter(t => !t.is_bare)
    if (nmTubes.length === 0) return {}

    const hasFocus = !!focusedTubeId
    const pLim = 7.5
    const lnLim = showScatterPoints ? 0.25 : 0.08
    const meanBeta = regressionData.summary?.mean_nm18_beta_mbar || 0.6518
    const meanSlope = -(meanBeta / 100)

    const seriesList: any[] = []

    // 1. Mean Fit Line
    seriesList.push({
      name: `18-NM Mean Fit (β = ${meanBeta.toFixed(4)} %/mb)`,
      type: 'line',
      showSymbol: false,
      z: hasFocus ? 2 : 12,
      lineStyle: {
        width: 3.2,
        color: isLight ? '#0F172A' : '#F8FAFC',
        type: 'dashed',
        opacity: hasFocus ? 0.2 : 0.95
      },
      itemStyle: { color: isLight ? '#0F172A' : '#F8FAFC' },
      endLabel: {
        show: !hasFocus,
        formatter: () => `Mean β=${meanBeta.toFixed(4)}`,
        color: isLight ? '#0F172A' : '#F8FAFC',
        fontSize: 10.5,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        distance: 10
      },
      data: [
        [-pLim, Number((meanSlope * -pLim).toFixed(6))],
        [pLim, Number((meanSlope * pLim).toFixed(6))]
      ]
    })

    // 2. Individual Tubes: Regression Lines & Optional Scatter (Exact Calculated Values)
    nmTubes.forEach((t, i) => {
      const color = isLight
        ? NM18_DISTINCT_COLORS[i % NM18_DISTINCT_COLORS.length]
        : NM18_DARK_DISTINCT_COLORS[i % NM18_DARK_DISTINCT_COLORS.length]

      const isFocused = focusedTubeId === t.id
      const lineOpacity = hasFocus ? (isFocused ? 1 : 0.15) : 0.75
      const lineWidth = isFocused ? 4.5 : 2.0
      const lineZ = isFocused ? 40 : 6

      // Regression Line
      seriesList.push({
        name: `${t.full_name} (β=${t.beta_mbar.toFixed(4)})`,
        type: 'line',
        showSymbol: false,
        z: lineZ,
        lineStyle: { width: lineWidth, color, opacity: lineOpacity },
        itemStyle: { color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 4.8 }
        },
        endLabel: {
          show: hasFocus && isFocused,
          formatter: () => `${t.name} (β=${t.beta_mbar.toFixed(4)})`,
          valueAnimation: false,
          color,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          distance: 10
        },
        data: [
          [-pLim, Number((t.slope * -pLim + t.intercept).toFixed(6))],
          [pLim, Number((t.slope * pLim + t.intercept).toFixed(6))]
        ]
      })

      // Scatter Points (if enabled)
      if (showScatterPoints && t.sample_points?.length > 0) {
        const scatterOpacity = hasFocus ? (isFocused ? 0.8 : 0.04) : 0.2
        seriesList.push({
          name: `${t.full_name} Data`,
          type: 'scatter',
          symbolSize: 3.2,
          large: true,
          z: isFocused ? 20 : 2,
          itemStyle: {
            color,
            opacity: scatterOpacity
          },
          emphasis: {
            focus: 'series',
            itemStyle: { opacity: 0.9, borderColor: '#FFFFFF', borderWidth: 1 }
          },
          data: t.sample_points
        })
      }
    })

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#2563EB' : 'rgba(56, 189, 248, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 12 },
        extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
        formatter: (params: any) => {
          if (params.seriesType === 'scatter') {
            const pt = params.data
            return `
              <div style="font-family:var(--font-mono);font-size:12px;">
                <strong style="color:${params.color};">${params.seriesName}</strong><br />
                ΔP: <strong>${pt[0].toFixed(3)} mbar</strong><br />
                Δln N: <strong>${pt[1].toFixed(5)}</strong>
              </div>
            `
          }
          const matched = nmTubes.find(t => params.seriesName.includes(t.full_name))
          if (matched) {
            return `
              <div style="font-family:var(--font-mono);font-size:12.5px;min-width:200px;">
                <div style="color:${params.color};font-weight:700;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;">
                  ⚛️ ${matched.full_name}
                </div>
                <div>Barometric Coeff, β: <strong style="color:${params.color};">${matched.beta_mbar.toFixed(4)} %/mbar</strong></div>
                <div>In mmHg: <strong>${matched.beta_mmhg.toFixed(4)} %/mmHg</strong></div>
                <div>Slope m: <strong>${matched.slope.toFixed(6)}</strong></div>
                <div>Intercept c: <strong>${matched.intercept.toFixed(6)}</strong></div>
                <div>Determination R²: <strong>${matched.r2.toFixed(4)}</strong></div>
              </div>
            `
          }
          return `<div style="font-family:var(--font-mono);font-size:12px;"><strong>${params.seriesName}</strong></div>`
        }
      },
      legend: {
        show: true,
        type: 'scroll',
        top: 6,
        left: 20,
        right: 155,
        icon: 'roundRect',
        itemGap: 10,
        itemWidth: 12,
        itemHeight: 5,
        textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 },
        data: [
          `18-NM Mean Fit (β = ${meanBeta.toFixed(4)} %/mb)`,
          ...nmTubes.map(t => `${t.full_name} (β=${t.beta_mbar.toFixed(4)})`)
        ]
      },
      grid: { top: 50, right: 150, bottom: 45, left: 65 },
      dataZoom: [{ type: 'inside', xAxisIndex: 0, yAxisIndex: 0 }],
      xAxis: {
        type: 'value',
        name: 'Pressure Variation, ΔP (mbar)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -pLim,
        max: pLim,
        interval: 2.5,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Δln N',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -lnLim,
        max: lnLim,
        interval: showScatterPoints ? 0.05 : 0.02,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)', formatter: (v: number) => v.toFixed(2) },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      series: seriesList
    }
  }, [regressionData, isLight, showScatterPoints, focusedTubeId])

  // 3-Bare Combined Regression Chart Option (Exact Calculated Physical Equations)
  const combinedBare3Option = useMemo(() => {
    if (!regressionData?.tubes_21) return {}
    const bareTubes = regressionData.tubes_21.filter(t => t.is_bare)
    if (bareTubes.length === 0) return {}

    const hasFocus = !!focusedTubeId
    const pLim = 7.5
    const lnLim = showScatterPoints ? 0.25 : 0.08
    const meanBeta = regressionData.summary?.mean_bare3_beta_mbar || 0.5946
    const meanSlope = -(meanBeta / 100)

    const seriesList: any[] = []

    // 1. Mean Fit Line
    seriesList.push({
      name: `3-Bare Mean Fit (β = ${meanBeta.toFixed(4)} %/mb)`,
      type: 'line',
      showSymbol: false,
      z: hasFocus ? 2 : 12,
      lineStyle: {
        width: 3.5,
        color: isLight ? '#0F172A' : '#F8FAFC',
        type: 'dashed',
        opacity: hasFocus ? 0.2 : 0.95
      },
      itemStyle: { color: isLight ? '#0F172A' : '#F8FAFC' },
      endLabel: {
        show: !hasFocus,
        formatter: () => `Mean β=${meanBeta.toFixed(4)}`,
        color: isLight ? '#0F172A' : '#F8FAFC',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        distance: 10
      },
      data: [
        [-pLim, Number((meanSlope * -pLim).toFixed(6))],
        [pLim, Number((meanSlope * pLim).toFixed(6))]
      ]
    })

    // 2. Individual Bare Tubes: Regression Lines & Optional Scatter (Exact Calculated Values)
    bareTubes.forEach((t, i) => {
      const color = isLight
        ? BARE3_DISTINCT_COLORS[i % BARE3_DISTINCT_COLORS.length]
        : BARE3_DARK_DISTINCT_COLORS[i % BARE3_DARK_DISTINCT_COLORS.length]

      const isFocused = focusedTubeId === t.id
      const lineOpacity = hasFocus ? (isFocused ? 1 : 0.2) : 0.85
      const lineWidth = isFocused ? 4.5 : 2.2
      const lineZ = isFocused ? 35 : 6

      // Regression Line
      seriesList.push({
        name: `${t.full_name} (β=${t.beta_mbar.toFixed(4)})`,
        type: 'line',
        showSymbol: false,
        z: lineZ,
        lineStyle: { width: lineWidth, color, opacity: lineOpacity },
        itemStyle: { color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 4.8 }
        },
        endLabel: {
          show: hasFocus && isFocused,
          formatter: () => `${t.name} (β=${t.beta_mbar.toFixed(4)})`,
          valueAnimation: false,
          color,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          distance: 10
        },
        data: [
          [-pLim, Number((t.slope * -pLim + t.intercept).toFixed(6))],
          [pLim, Number((t.slope * pLim + t.intercept).toFixed(6))]
        ]
      })

      // Scatter Points (if enabled)
      if (showScatterPoints && t.sample_points?.length > 0) {
        const scatterOpacity = hasFocus ? (isFocused ? 0.8 : 0.05) : 0.3
        seriesList.push({
          name: `${t.full_name} Data`,
          type: 'scatter',
          symbolSize: 4.0,
          large: true,
          z: isFocused ? 20 : 2,
          itemStyle: {
            color,
            opacity: scatterOpacity
          },
          emphasis: {
            focus: 'series',
            itemStyle: { opacity: 0.9, borderColor: '#FFFFFF', borderWidth: 1 }
          },
          data: t.sample_points
        })
      }
    })

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: '#D97706',
        borderWidth: 1.5,
        padding: 12,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 12 },
        extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
        formatter: (params: any) => {
          if (params.seriesType === 'scatter') {
            const pt = params.data
            return `
              <div style="font-family:var(--font-mono);font-size:12px;">
                <strong style="color:${params.color};">${params.seriesName}</strong><br />
                ΔP: <strong>${pt[0].toFixed(3)} mbar</strong><br />
                Δln N: <strong>${pt[1].toFixed(5)}</strong>
              </div>
            `
          }
          const matched = bareTubes.find(t => params.seriesName.includes(t.full_name))
          if (matched) {
            return `
              <div style="font-family:var(--font-mono);font-size:12.5px;min-width:200px;">
                <div style="color:${params.color};font-weight:700;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;">
                  📡 ${matched.full_name}
                </div>
                <div>Barometric Coeff, β: <strong style="color:${params.color};">${matched.beta_mbar.toFixed(4)} %/mbar</strong></div>
                <div>In mmHg: <strong>${matched.beta_mmhg.toFixed(4)} %/mmHg</strong></div>
                <div>Slope m: <strong>${matched.slope.toFixed(6)}</strong></div>
                <div>Intercept c: <strong>${matched.intercept.toFixed(6)}</strong></div>
                <div>Determination R²: <strong>${matched.r2.toFixed(4)}</strong></div>
              </div>
            `
          }
          return `<div style="font-family:var(--font-mono);font-size:12px;"><strong>${params.seriesName}</strong></div>`
        }
      },
      legend: {
        show: true,
        top: 6,
        left: 20,
        right: 155,
        icon: 'roundRect',
        itemGap: 14,
        itemWidth: 14,
        itemHeight: 5,
        textStyle: { color: isLight ? '#475569' : '#CBD5E1', fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600 },
        data: [
          `3-Bare Mean Fit (β = ${meanBeta.toFixed(4)} %/mb)`,
          ...bareTubes.map(t => `${t.full_name} (β=${t.beta_mbar.toFixed(4)})`)
        ]
      },
      grid: { top: 45, right: 150, bottom: 45, left: 65 },
      dataZoom: [{ type: 'inside', xAxisIndex: 0, yAxisIndex: 0 }],
      xAxis: {
        type: 'value',
        name: 'Pressure Variation, ΔP (mbar)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -pLim,
        max: pLim,
        interval: 2.5,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Δln N',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -lnLim,
        max: lnLim,
        interval: showScatterPoints ? 0.05 : 0.02,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 11, fontFamily: 'var(--font-mono)', formatter: (v: number) => v.toFixed(2) },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      series: seriesList
    }
  }, [regressionData, isLight, showScatterPoints, focusedTubeId])

  // MLR_3 Benchmark Option
  const mlr3Option = useMemo(() => {
    if (!regressionData?.mlr_3) return {}
    const m3 = regressionData.mlr_3
    const pLim = m3.p_lim || 8.0
    const lnLim = m3.ln_lim || 0.06

    const regLine = [
      [-pLim, Number((m3.slope * -pLim + m3.intercept).toFixed(6))],
      [pLim, Number((m3.slope * pLim + m3.intercept).toFixed(6))]
    ]

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: '#DC2626',
        borderWidth: 1.5,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 12 },
        formatter: (params: any) => {
          if (params.seriesType === 'scatter') {
            const pt = params.data
            return `
              <div style="font-family:var(--font-mono);font-size:12px;">
                <strong style="color:#DC2626;">📊 MLR_3 Residual Point</strong><br />
                ΔP: <strong>${pt[0].toFixed(3)} mbar</strong><br />
                Δln N: <strong>${pt[1].toFixed(5)}</strong>
              </div>
            `
          }
          return `<div style="font-family:var(--font-mono);font-size:12px;"><strong style="color:#DC2626;">Fit Line</strong>: m=${m3.slope.toFixed(6)}, β=${m3.beta_mbar.toFixed(4)} %/mbar</div>`
        }
      },
      grid: { top: 30, right: 30, bottom: 55, left: 75 },
      dataZoom: [{ type: 'inside', xAxisIndex: 0, yAxisIndex: 0 }],
      xAxis: {
        type: 'value',
        name: 'Pressure Variation, ΔP (mbar)',
        nameLocation: 'middle',
        nameGap: 34,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -pLim,
        max: pLim,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Δln N',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' },
        min: -lnLim,
        max: lnLim,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 12, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      series: [
        {
          name: 'Sampled Points',
          type: 'scatter',
          symbolSize: 3,
          large: true,
          largeThreshold: 200,
          emphasis: { disabled: true },
          itemStyle: { color: isLight ? 'rgba(37, 99, 235, 0.22)' : 'rgba(96, 165, 250, 0.28)' },
          data: m3.sample_points
        },
        {
          name: `Fit Line: m=${m3.slope.toFixed(6)}`,
          type: 'line',
          showSymbol: false,
          data: regLine,
          lineStyle: { color: '#DC2626', width: 2.6 },
          itemStyle: { color: '#DC2626' },
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: { color: isLight ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.8)', type: 'dashed', width: 1 },
            data: [{ xAxis: 0 }, { yAxis: 0 }]
          }
        }
      ]
    }
  }, [regressionData, isLight])

  // Interactive Bar Chart Option for All 21 Tubes
  const barChartOption = useMemo(() => {
    if (!regressionData?.bar_chart_data) return {}
    const { categories, values, nm_mean, bare_mean } = regressionData.bar_chart_data

    return {
      backgroundColor: 'transparent',
      animation: false,
      title: {
        text: 'Princess Sirindhorn Neutron Monitor (PSNM): Barometric Coefficients (β) by Channel',
        subtext: 'Tubes 01–18: NM-64 (Blue) | Tubes 19–21: Bare Counters (Orange) | 2025–2026 Combined (1-Min Resolution)',
        left: 'center',
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 800 },
        subtextStyle: { color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)', fontSize: 11 }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: '#2563EB',
        borderWidth: 1.5,
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return ''
          const p = params[0]
          const isBare = p.dataIndex >= 18
          const beta = p.value
          const betaMmhg = (beta * 1.33322).toFixed(4)
          return `
            <div style="font-family:var(--font-mono);font-size:12px;">
              <strong style="color:${isBare ? '#D97706' : '#2563EB'};">${p.name} [${isBare ? 'Bare Counter' : 'Standard NM-64'}]</strong>
              <div style="margin-top:4px;">• β: <strong>${beta.toFixed(4)} %/mbar</strong></div>
              <div>• β (mmHg): <strong>${betaMmhg} %/mmHg</strong></div>
            </div>
          `
        }
      },
      grid: { top: 70, right: 30, bottom: 50, left: 65 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontFamily: 'var(--font-mono)', fontSize: 11 },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } }
      },
      yAxis: {
        type: 'value',
        name: 'β (%/mbar)',
        nameTextStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 },
        min: 0,
        max: 0.82,
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontFamily: 'var(--font-mono)' }
      },
      series: [
        {
          name: 'Barometric Coefficient β',
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            color: (params: any) => (params.dataIndex >= 18 ? '#F59E0B' : '#3B82F6'),
            borderRadius: [3, 3, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => params.value.toFixed(3),
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: isLight ? '#334155' : '#CBD5E1'
          },
          data: values,
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: { width: 1.5, type: 'dashed' },
            data: [
              {
                yAxis: nm_mean,
                lineStyle: { color: '#2563EB' },
                label: { show: true, position: 'end', formatter: `18-NM-64 Mean: ${nm_mean.toFixed(4)} %/mbar`, color: '#2563EB', fontFamily: 'var(--font-mono)', fontSize: 10.5 }
              },
              {
                yAxis: bare_mean,
                lineStyle: { color: '#D97706' },
                label: { show: true, position: 'end', formatter: `Bare 3-Counter Mean: ${bare_mean.toFixed(4)} %/mbar`, color: '#D97706', fontFamily: 'var(--font-mono)', fontSize: 10.5 }
              }
            ]
          }
        }
      ]
    }
  }, [regressionData, isLight])

  const currentOption = useMemo(() => {
    switch (activeView) {
      case 'pressure': return pressureOption
      case 'leader': return leaderOption
      case 'tubes': return tubesOption
      case 'scatter': return mlr3Option
      case 'counts':
      default:
        return countsOption
    }
  }, [activeView, countsOption, pressureOption, leaderOption, tubesOption, mlr3Option])

  const currentViewObj = VIEWS.find(v => v.id === activeView) || VIEWS[0]

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(124, 58, 237, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#5B21B6' : '#C084FC',
            margin: 0,
            letterSpacing: -0.5
          }}>
            PRINCESS SIRINDHORN NEUTRON MONITOR
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Doi Inthanon, Thailand (PSNM Network) · World-Highest Geomagnetic Cutoff Rigidity (16.8 GV) & Barometric Diagnostics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {panLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: isLight ? '#0284C7' : '#38BDF8',
              background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)',
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${isLight ? 'rgba(2, 132, 199, 0.25)' : 'rgba(56, 189, 248, 0.25)'}`
            }}>
              <RefreshCw size={12} className="animate-spin" />
              <span>FETCHING HISTORICAL...</span>
            </div>
          )}
          <StatusBadge status={data.length || scatterData.length ? 'normal' : 'offline'} />
          <button
            onClick={() => load(true)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: 'transparent', border: 'none',
              color: isLight ? '#7C3AED' : '#C084FC', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'REFRESHING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Date Range Picker Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={currentViewObj.color}
          loading={loading}
          presets={[1440, 4320, 10080]}
        />
      </div>

      {/* 2-Column Split Layout: 30% Left (Views Selector) | 70% Right (Main Chart) */}
      <div
        className="neutron-split-layout"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 20,
          alignItems: 'flex-start',
          width: '100%'
        }}
      >
        {/* LEFT COLUMN (30%): View Selector Menu */}
        <div
          className="neutron-left-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: '30%',
            minWidth: 280,
            maxWidth: 360,
            flexShrink: 0,
            boxSizing: 'border-box',
            position: 'sticky',
            top: 20
          }}
        >
          <div style={{
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 8,
            padding: '14px',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <span style={{
              fontSize: 12,
              color: isLight ? '#6D28D9' : '#C084FC',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
              fontWeight: 700
            }}>
              DATA CHANNELS ({VIEWS.length})
            </span>

            {/* List of Graph Channel Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {VIEWS.map(item => {
                const isSelected = activeView === item.id
                const IconComponent = item.icon

                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: isSelected
                        ? (isLight ? `${item.color}15` : `${item.color}25`)
                        : (isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)'),
                      border: `1px solid ${isSelected ? item.color : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)')}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected && isLight ? `0 2px 8px ${item.color}25` : undefined,
                      width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', overflow: 'hidden' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isSelected ? item.color : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'),
                        color: isSelected ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8'),
                        flexShrink: 0
                      }}>
                        <IconComponent size={15} />
                      </div>

                      <div style={{ overflow: 'hidden' }}>
                        <div style={{
                          fontSize: 12.5,
                          fontFamily: 'var(--font-mono)',
                          color: isSelected ? item.color : (isLight ? '#1E293B' : '#F1F5F9'),
                          fontWeight: isSelected ? 800 : 600,
                          letterSpacing: 0.3
                        }}>
                          {item.label}
                        </div>
                        <div style={{
                          fontSize: 10.5,
                          color: isLight ? '#64748B' : '#94A3B8',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    {/* Indicator Dot */}
                    {isSelected && (
                      <div style={{
                        flexShrink: 0,
                        width: 7, height: 7, borderRadius: '50%',
                        background: item.color,
                        boxShadow: `0 0 6px ${item.color}`,
                        marginLeft: 6
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (70%): Main Selected Chart / Specs View */}
        <div
          className="neutron-right-col"
          style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}
        >
          {loading && !data.length && !scatterData.length ? (
            <LoadingSpinner />
          ) : (
            <Card
              title={`PSNM — ${currentViewObj.label}`}
              subtitle={currentViewObj.desc}
              style={{
                background: isLight ? '#FFFFFF' : undefined,
                boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
                border: isLight ? `1px solid ${currentViewObj.color}30` : undefined,
              }}
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {panLoading && (
                    <span style={{ fontSize: 13, color: currentViewObj.color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ◀ LOADING HISTORICAL DATA...
                    </span>
                  )}
                  <ExportChartMenu
                    chartRef={chartRef}
                    data={data}
                    columns={exportColumns}
                    metadata={{
                      station: 'PSNM (DOI INTHANON, THAILAND)',
                      viewTitle: `PSNM — ${currentViewObj.label}`,
                      description: currentViewObj.desc,
                      timeRangeText: exportTimeRange,
                      totalRecords: data.length
                    }}
                    filenameBase={`PSNM_${activeView.toUpperCase()}_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                    accentColor={currentViewObj.color}
                  />
                </div>
              }
            >
              {/* Optional Top Actions inside Card */}
              {activeView === 'counts' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8', fontWeight: 600 }}>
                    SERIES:
                  </span>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px',
                    borderRadius: 6,
                    background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)'}`,
                    gap: '2px'
                  }}>
                    {[
                      { id: 'all', label: 'ALL (CORR + UNCOR)' },
                      { id: 'corrected', label: 'CORRECTED (CORR)' },
                      { id: 'uncorrected', label: 'UNCORRECTED (UNCOR)' }
                    ].map(tab => {
                      const isAct = corrFilter === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCorrFilter(tab.id as any)}
                          style={{
                            padding: '4px 12px',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            fontWeight: isAct ? 800 : 600,
                            letterSpacing: 0.5,
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: isAct
                              ? (isLight ? '#0284C7' : '#0284C7')
                              : 'transparent',
                            color: isAct
                              ? '#FFFFFF'
                              : (isLight ? '#64748B' : '#94A3B8')
                          }}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeView === 'tubes' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 12, gap: 6 }}>
                  {[
                    { key: 'all', label: 'ALL (21 TUBES)' },
                    { key: 'sec1', label: 'SEC 1 (T01-06)' },
                    { key: 'sec2', label: 'SEC 2 (T07-12)' },
                    { key: 'sec3', label: 'SEC 3 (T13-18)' },
                    { key: 'std', label: '18 NM64' },
                    { key: 'bare', label: '3 BARE (B01-03)' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setTubeFilter(tab.key as any)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        borderRadius: 4,
                        border: `1px solid ${tubeFilter === tab.key ? '#2563EB' : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.1)')}`,
                        background: tubeFilter === tab.key ? (isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.2)') : 'transparent',
                        color: tubeFilter === tab.key ? (isLight ? '#1D4ED8' : '#60A5FA') : (isLight ? '#64748B' : '#94A3B8'),
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {activeView === 'scatter' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Mode Selector Tabs: 18+3 Grid vs MLR_3 vs Beta Bar */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 12,
                    borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        onClick={() => setRegressionMode('grid_18_3')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 16px',
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 7,
                          border: `1.5px solid ${regressionMode === 'grid_18_3' ? '#2563EB' : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)')}`,
                          background: regressionMode === 'grid_18_3' ? (isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.22)') : 'transparent',
                          color: regressionMode === 'grid_18_3' ? (isLight ? '#1D4ED8' : '#60A5FA') : (isLight ? '#64748B' : '#94A3B8'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: regressionMode === 'grid_18_3' ? '0 2px 8px rgba(37,99,235,0.2)' : 'none'
                        }}
                      >
                        <Grid size={15} />
                        <span>📈 18-NM & 3-BARE COMBINED GRAPHS</span>
                      </button>

                      <button
                        onClick={() => {
                          setRegressionMode('mlr_3')
                          setRegressionChannel('mlr_3')
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 16px',
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 7,
                          border: `1.5px solid ${regressionMode === 'mlr_3' ? '#DC2626' : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)')}`,
                          background: regressionMode === 'mlr_3' ? (isLight ? '#FEF2F2' : 'rgba(220, 38, 38, 0.22)') : 'transparent',
                          color: regressionMode === 'mlr_3' ? '#DC2626' : (isLight ? '#64748B' : '#94A3B8'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: regressionMode === 'mlr_3' ? '0 2px 8px rgba(220,38,38,0.2)' : 'none'
                        }}
                      >
                        <Activity size={15} />
                        <span>📊 MLR_3 BENCHMARK (TOTAL SUM)</span>
                      </button>

                      <button
                        onClick={() => setRegressionMode('beta_comparison')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 16px',
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 7,
                          border: `1.5px solid ${regressionMode === 'beta_comparison' ? '#D97706' : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)')}`,
                          background: regressionMode === 'beta_comparison' ? (isLight ? '#FFFBEB' : 'rgba(217, 119, 6, 0.22)') : 'transparent',
                          color: regressionMode === 'beta_comparison' ? '#D97706' : (isLight ? '#64748B' : '#94A3B8'),
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: regressionMode === 'beta_comparison' ? '0 2px 8px rgba(217,119,6,0.2)' : 'none'
                        }}
                      >
                        <BarChart2 size={15} />
                        <span>📈 β COEFFICIENT BY TUBE</span>
                      </button>
                    </div>

                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8' }}>
                      {regressionData?.dataset_years} • {regressionData?.resolution}
                    </div>
                  </div>

                  {/* MODE 1: 18-NM & 3-BARE COMBINED REGRESSION CHARTS */}
                  {regressionMode === 'grid_18_3' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Sub-header Info & Global Controls */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: isLight ? '#F8FAFC' : 'rgba(15, 23, 42, 0.6)',
                        border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isLight ? '#475569' : '#CBD5E1' }}>
                            DATA SOURCE:
                          </span>
                          <span style={{
                            padding: '3px 8px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            borderRadius: 4,
                            border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.1)'}`,
                            background: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.25)',
                            color: isLight ? '#1D4ED8' : '#60A5FA'
                          }}>
                            mawson_con_code/PSNM • PRS 2025–2026 MOP MCT ln diff
                          </span>
                        </div>

                        {/* Controls: Scatter Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setShowScatterPoints(prev => !prev)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: `1.5px solid ${showScatterPoints ? (isLight ? '#2563EB' : '#60A5FA') : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)')}`,
                              background: showScatterPoints ? (isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.2)') : 'transparent',
                              color: showScatterPoints ? (isLight ? '#1D4ED8' : '#60A5FA') : (isLight ? '#64748B' : '#94A3B8'),
                              fontSize: 11,
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {showScatterPoints ? <Eye size={13} /> : <EyeOff size={13} />}
                            <span>{showScatterPoints ? 'SCATTER: ON' : 'SCATTER: OFF (LINES ONLY)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Summary Cards: 18 NM-64 vs 3 Bare */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 12
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: '1.5px solid #2563EB',
                          background: isLight ? '#F0F9FF' : 'rgba(37, 99, 235, 0.1)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong style={{ color: '#2563EB', fontSize: 13 }}>⚛️ Tubes 01–18: Standard 18-NM-64</strong>
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#2563EB', color: '#FFFFFF' }}>18 TUBES</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: isLight ? '#1E293B' : '#E2E8F0', lineHeight: 1.6 }}>
                            <div>• Mean Barometric Coeff, β: <strong style={{ color: '#0284C7' }}>{regressionData?.summary?.mean_nm18_beta_mbar ? regressionData.summary.mean_nm18_beta_mbar.toFixed(4) : '0.6518'} %/mbar</strong> ({ ((regressionData?.summary?.mean_nm18_beta_mbar || 0.6518) * 1.33322).toFixed(4) } %/mmHg)</div>
                            <div>• Range: 0.6420 to 0.6620 %/mbar across 18 NM-64 tubes</div>
                          </div>
                        </div>

                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: '1.5px solid #D97706',
                          background: isLight ? '#FFFBEB' : 'rgba(217, 119, 6, 0.1)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong style={{ color: '#D97706', fontSize: 13 }}>📡 Tubes 19–21: Bare Counters (Lead-Free)</strong>
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#D97706', color: '#FFFFFF' }}>3 TUBES</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: isLight ? '#1E293B' : '#E2E8F0', lineHeight: 1.6 }}>
                            <div>• Mean Barometric Coeff, β: <strong style={{ color: '#D97706' }}>{regressionData?.summary?.mean_bare3_beta_mbar ? regressionData.summary.mean_bare3_beta_mbar.toFixed(4) : '0.5946'} %/mbar</strong> ({ ((regressionData?.summary?.mean_bare3_beta_mbar || 0.5946) * 1.33322).toFixed(4) } %/mmHg)</div>
                            <div>• Individual Tubes: T19 (0.5912), T20 (0.6043), T21 (0.5884 %/mbar)</div>
                          </div>
                        </div>
                      </div>

                      {/* CHART 1: 18-NM-64 Combined Regression Chart */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        padding: '16px 20px',
                        borderRadius: 10,
                        border: `1.5px solid ${isLight ? '#93C5FD' : 'rgba(37, 99, 235, 0.4)'}`,
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        boxShadow: isLight ? '0 4px 16px rgba(37, 99, 235, 0.06)' : '0 4px 20px rgba(0, 0, 0, 0.5)'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
                          paddingBottom: 8
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 14, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                              ⚛️ Graph 1: Standard 18-NM-64 Barometric Regression (All 18 Tubes)
                            </strong>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.2)', color: '#2563EB', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                              18 DETECTORS
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.2)',
                              color: isLight ? '#1D4ED8' : '#60A5FA',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)'
                            }}>
                              CALCULATED FIT (y = m·ΔP + c)
                            </span>
                          </div>
                          <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8' }}>
                            Mean β = <strong style={{ color: '#0284C7' }}>{regressionData?.summary?.mean_nm18_beta_mbar ? regressionData.summary.mean_nm18_beta_mbar.toFixed(4) : '0.6518'} %/mbar</strong>
                          </span>
                        </div>

                        {/* Interactive Tube Focus Pills for Graph 1 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}`
                        }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8', marginRight: 4 }}>
                            FOCUS TUBE:
                          </span>
                          <button
                            onClick={() => setFocusedTubeId(null)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: `1px solid ${focusedTubeId === null ? '#2563EB' : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)')}`,
                              background: focusedTubeId === null ? '#2563EB' : 'transparent',
                              color: focusedTubeId === null ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')
                            }}
                          >
                            ALL 18
                          </button>
                          {regressionData?.tubes_21?.filter(t => !t.is_bare).map((t, i) => {
                            const isSelected = focusedTubeId === t.id
                            const color = isLight ? NM18_DISTINCT_COLORS[i % NM18_DISTINCT_COLORS.length] : NM18_DARK_DISTINCT_COLORS[i % NM18_DARK_DISTINCT_COLORS.length]
                            return (
                              <button
                                key={t.id}
                                onClick={() => setFocusedTubeId(isSelected ? null : t.id)}
                                style={{
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  fontSize: 10.5,
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: `1.5px solid ${isSelected ? color : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')}`,
                                  background: isSelected ? color : 'transparent',
                                  color: isSelected ? '#FFFFFF' : (isLight ? '#334155' : '#CBD5E1'),
                                  transition: 'all 0.12s ease'
                                }}
                                title={`${t.full_name}: β = ${t.beta_mbar.toFixed(4)} %/mbar`}
                              >
                                {t.name.replace('Tube ', 'T')}
                              </button>
                            )
                          })}
                        </div>

                        {/* Focused Tube Info Banner */}
                        {focusedTubeId && (() => {
                          const ft = regressionData?.tubes_21?.find(t => t.id === focusedTubeId)
                          if (!ft) return null
                          return (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 12px',
                              borderRadius: 6,
                              background: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.15)',
                              border: `1px solid ${isLight ? '#93C5FD' : 'rgba(37, 99, 235, 0.4)'}`,
                              fontSize: 11.5,
                              fontFamily: 'var(--font-mono)'
                            }}>
                              <div>
                                <strong style={{ color: '#2563EB' }}>⚛️ Focused: {ft.full_name}</strong>
                                <span style={{ marginLeft: 12 }}>
                                  β: <strong style={{ color: '#0284C7' }}>{ft.beta_mbar.toFixed(4)} %/mbar</strong> ({ft.beta_mmhg.toFixed(4)} %/mmHg)
                                </span>
                                <span style={{ marginLeft: 12 }}>
                                  Slope: <strong>{ft.slope.toFixed(6)}</strong> · Intercept: <strong>{ft.intercept.toFixed(6)}</strong> · R²: <strong>{ft.r2.toFixed(4)}</strong>
                                </span>
                              </div>
                              <button
                                onClick={() => setFocusedTubeId(null)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isLight ? '#64748B' : '#94A3B8',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: 11
                                }}
                              >
                                ✕ Clear Focus
                              </button>
                            </div>
                          )
                        })()}

                        <ReactECharts
                          key={`combined-nm18-${showScatterPoints}-${focusedTubeId}`}
                          option={combinedNm18Option}
                          style={{ height: 500, width: '100%' }}
                          notMerge={true}
                          lazyUpdate={true}
                        />
                      </div>

                      {/* CHART 2: 3-Bare Counters Combined Regression Chart */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        padding: '16px 20px',
                        borderRadius: 10,
                        border: `1.5px solid ${isLight ? '#FDE68A' : 'rgba(217, 119, 6, 0.4)'}`,
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        boxShadow: isLight ? '0 4px 16px rgba(217, 119, 6, 0.06)' : '0 4px 20px rgba(0, 0, 0, 0.5)'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
                          paddingBottom: 8
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 14, color: '#D97706', fontFamily: 'var(--font-mono)' }}>
                              📡 Graph 2: Bare Counters Barometric Regression (Tubes 19–21 Lead-Free)
                            </strong>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: isLight ? '#FFFBEB' : 'rgba(217, 119, 6, 0.2)', color: '#D97706', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                              3 BARE DETECTORS
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: isLight ? '#FFFBEB' : 'rgba(217, 119, 6, 0.2)',
                              color: isLight ? '#B45309' : '#FBBF24',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)'
                            }}>
                              CALCULATED FIT (y = m·ΔP + c)
                            </span>
                          </div>
                          <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8' }}>
                            Mean β = <strong style={{ color: '#D97706' }}>{regressionData?.summary?.mean_bare3_beta_mbar ? regressionData.summary.mean_bare3_beta_mbar.toFixed(4) : '0.5946'} %/mbar</strong>
                          </span>
                        </div>

                        {/* Interactive Tube Focus Pills for Graph 2 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}`
                        }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8', marginRight: 4 }}>
                            FOCUS BARE TUBE:
                          </span>
                          <button
                            onClick={() => setFocusedTubeId(null)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10.5,
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: `1px solid ${focusedTubeId === null ? '#D97706' : (isLight ? '#CBD5E1' : 'rgba(255,255,255,0.12)')}`,
                              background: focusedTubeId === null ? '#D97706' : 'transparent',
                              color: focusedTubeId === null ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8')
                            }}
                          >
                            ALL 3
                          </button>
                          {regressionData?.tubes_21?.filter(t => t.is_bare).map((t, i) => {
                            const isSelected = focusedTubeId === t.id
                            const color = isLight ? BARE3_DISTINCT_COLORS[i % BARE3_DISTINCT_COLORS.length] : BARE3_DARK_DISTINCT_COLORS[i % BARE3_DARK_DISTINCT_COLORS.length]
                            return (
                              <button
                                key={t.id}
                                onClick={() => setFocusedTubeId(isSelected ? null : t.id)}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 10.5,
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: `1.5px solid ${isSelected ? color : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')}`,
                                  background: isSelected ? color : 'transparent',
                                  color: isSelected ? '#FFFFFF' : (isLight ? '#334155' : '#CBD5E1'),
                                  transition: 'all 0.12s ease'
                                }}
                                title={`${t.full_name}: β = ${t.beta_mbar.toFixed(4)} %/mbar`}
                              >
                                {t.name.replace('Tube ', 'T')}
                              </button>
                            )
                          })}
                        </div>

                        <ReactECharts
                          key={`combined-bare3-${showScatterPoints}-${focusedTubeId}`}
                          option={combinedBare3Option}
                          style={{ height: 450, width: '100%' }}
                          notMerge={true}
                          lazyUpdate={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* MODE 2: MLR_3 TOTAL SUM (BENCHMARK) */}
                  {regressionMode === 'mlr_3' && regressionData?.mlr_3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Summary Box */}
                      <div style={{
                        padding: '14px 18px',
                        borderRadius: 10,
                        border: '2px solid #DC2626',
                        background: isLight ? '#FFFFFF' : '#0F172A',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12.5,
                        boxShadow: isLight ? '0 4px 16px rgba(220, 38, 38, 0.08)' : '0 4px 20px rgba(0, 0, 0, 0.6)'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                          borderBottom: `1px solid ${isLight ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.25)'}`,
                          paddingBottom: 6
                        }}>
                          <strong style={{ color: '#DC2626', fontSize: 13.5 }}>
                            📊 {regressionData.mlr_3.name} (Multiplicity Corrected Benchmark)
                          </strong>
                          <span style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                            {regressionData?.dataset_years} • {regressionData?.resolution}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 16px' }}>
                          <div>
                            <span style={{ color: isLight ? '#475569' : '#94A3B8' }}>Points (N): </span>
                            <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>{regressionData.mlr_3.points_count.toLocaleString()} mins</strong>
                          </div>
                          <div>
                            <span style={{ color: isLight ? '#475569' : '#94A3B8' }}>Slope (m): </span>
                            <strong style={{ color: '#DC2626' }}>{regressionData.mlr_3.slope.toFixed(6)}</strong>
                          </div>
                          <div>
                            <span style={{ color: isLight ? '#475569' : '#94A3B8' }}>β (mbar): </span>
                            <strong style={{ color: '#0284C7' }}>{regressionData.mlr_3.beta_mbar.toFixed(4)} %/mbar</strong>
                          </div>
                          <div>
                            <span style={{ color: isLight ? '#475569' : '#94A3B8' }}>β (mmHg): </span>
                            <strong style={{ color: '#059669' }}>{regressionData.mlr_3.beta_mmhg.toFixed(4)} %/mmHg</strong>
                          </div>
                          <div>
                            <span style={{ color: isLight ? '#475569' : '#94A3B8' }}>R²: </span>
                            <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>{regressionData.mlr_3.r2.toFixed(4)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Interactive ECharts canvas */}
                      <ReactECharts
                        key="scatter-mlr3"
                        option={mlr3Option}
                        style={{ height: 540, width: '100%' }}
                        notMerge={true}
                        lazyUpdate={true}
                      />
                    </div>
                  )}

                  {/* MODE 3: BETA COEFFICIENT COMPARISON BAR CHART */}
                  {regressionMode === 'beta_comparison' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isLight ? '#475569' : '#CBD5E1' }}>
                            DATA SOURCE:
                          </span>
                          <span style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            borderRadius: 5,
                            border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.1)'}`,
                            background: isLight ? '#FFFBEB' : 'rgba(217, 119, 6, 0.25)',
                            color: '#D97706'
                          }}>
                            mawson_con_code/PSNM • 21-Channel Barometric Coefficients β (Interactive ECharts)
                          </span>
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8' }}>
                          Hover over bars to inspect channel details & conversion to mmHg
                        </div>
                      </div>

                      {/* Interactive ECharts Bar Chart */}
                      <ReactECharts
                        key="bar-beta-21"
                        option={barChartOption}
                        style={{ height: 540, width: '100%' }}
                        notMerge={true}
                        lazyUpdate={true}
                      />

                      {/* Comparison Stats Cards */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 12
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: '1.5px solid #2563EB',
                          background: isLight ? '#F0F9FF' : 'rgba(37, 99, 235, 0.1)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong style={{ color: '#2563EB', fontSize: 13 }}>⚛️ Tubes 01–18 (18-NM-64 Lead Monitor)</strong>
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#2563EB', color: '#FFFFFF' }}>18 TUBES</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: isLight ? '#1E293B' : '#E2E8F0', lineHeight: 1.6 }}>
                            <div>• Group Mean β: <strong style={{ color: '#0284C7' }}>{regressionData?.bar_chart_data?.nm_mean?.toFixed(4) || '0.6518'} %/mbar</strong> ({ ((regressionData?.bar_chart_data?.nm_mean || 0.6518) * 1.33322).toFixed(4) } %/mmHg)</div>
                            <div>• High-energy secondary nucleons produce higher pressure attenuation</div>
                          </div>
                        </div>

                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: '1.5px solid #D97706',
                          background: isLight ? '#FFFBEB' : 'rgba(217, 119, 6, 0.1)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong style={{ color: '#D97706', fontSize: 13 }}>📡 Tubes 19–21 (Bare Counters, No Lead Producer)</strong>
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#D97706', color: '#FFFFFF' }}>3 TUBES</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: isLight ? '#1E293B' : '#E2E8F0', lineHeight: 1.6 }}>
                            <div>• Group Mean β: <strong style={{ color: '#D97706' }}>{regressionData?.bar_chart_data?.bare_mean?.toFixed(4) || '0.5946'} %/mbar</strong> ({ ((regressionData?.bar_chart_data?.bare_mean || 0.5946) * 1.33322).toFixed(4) } %/mmHg)</div>
                            <div>• Measures lower-energy thermal/evaporation neutrons with lower barometric sensitivity</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Chart Render for views 01, 02, 03, 04 */
                <ReactECharts
                  ref={chartRef}
                  key={activeView}
                  option={currentOption}
                  style={{ height: 540, width: '100%' }}
                  notMerge={false}
                  lazyUpdate={true}
                  onChartReady={onChartReady}
                  onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
                />
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
