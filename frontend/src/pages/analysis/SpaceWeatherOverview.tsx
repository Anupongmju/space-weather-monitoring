import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
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
  Calendar
} from 'lucide-react'
import OrbitBackground from '../../components/space/OrbitBackground'
import { loadMag, loadSwepam, fetchArchiveSwepam } from '../../services/aceService'
import { loadProton } from '../../services/goesService'
import { loadNeutron } from '../../services/cosmicService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useLineDrawing } from '../../hooks/useLineDrawing'
import TrendLineOverlay, { buildMarkLines } from '../../components/ui/TrendLineOverlay'

const PROTON_COLORS: Record<string, string> = {
  '>=1 MeV': '#60A5FA',   // Bright Blue
  '>=5 MeV': '#34D399',   // Bright Emerald
  '>=10 MeV': '#FBBF24',  // Bright Amber
  '>=50 MeV': '#3498DB',  // Bright Blue Accent
  '>=100 MeV': '#F87171', // Bright Red
  '>=500 MeV': '#C084FC', // Bright Purple
}

type TimeRange = 360 | 1440 | 4320 | 10080
const TIME_LABELS: Record<number, string> = { 360: '6H', 1440: '1D', 4320: '3D', 10080: '7D' }

const getTodayStr = () => {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

const getPastDateStr = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function DateInputDDMMYYYY({
  value,
  onChange,
  accentColor = '#818CF8',
}: {
  value: string
  onChange: (val: string) => void
  accentColor?: string
}) {
  const hiddenRef = useRef<HTMLInputElement>(null)

  const formatDisplay = (iso: string) => {
    if (!iso) return ''
    const parts = iso.split('-')
    if (parts.length === 3) {
      const [y, m, d] = parts
      return `${d}/${m}/${y}`
    }
    return iso
  }

  const parseDisplay = (disp: string) => {
    const parts = disp.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      if (d.length <= 2 && m.length <= 2 && y.length === 4) {
        const dd = d.padStart(2, '0')
        const mm = m.padStart(2, '0')
        return `${y}-${mm}-${dd}`
      }
    }
    return null
  }

  const [inputText, setInputText] = useState(formatDisplay(value))

  useEffect(() => {
    setInputText(formatDisplay(value))
  }, [value])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputText(raw)
    const iso = parseDisplay(raw)
    if (iso && !isNaN(new Date(iso).getTime())) {
      onChange(iso)
    }
  }

  const openPicker = () => {
    try {
      hiddenRef.current?.showPicker()
    } catch {
      hiddenRef.current?.focus()
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="DD/MM/YYYY"
        value={inputText}
        onChange={handleTextChange}
        style={{
          width: 115,
          background: 'rgba(2, 6, 23, 0.9)',
          color: '#F8FAFC',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '3px 24px 3px 8px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          outline: 'none',
          textAlign: 'center',
          letterSpacing: '0.5px',
        }}
      />
      <button
        type="button"
        onClick={openPicker}
        style={{
          position: 'absolute',
          right: 4,
          background: 'transparent',
          border: 'none',
          color: accentColor,
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Calendar size={13} />
      </button>
      <input
        ref={hiddenRef}
        type="date"
        value={value}
        onChange={e => {
          if (e.target.value) {
            onChange(e.target.value)
          }
        }}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </div>
  )
}

export default function SpaceWeatherOverview() {
  const chartRef = useRef<any>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const initialZoomDispatchedRef = useRef(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── Trend Line Drawing ───────────────────────────────────────────
  const { lines, drawingMode, pendingP1, toggleDrawingMode, handleClick, removeLine, clearLines } = useLineDrawing()
  const GRID_UNITS = ['cts/min', 'ratio', 'nT', 'nT', 'km/s', 'pfu']

  const [isCustomDate, setIsCustomDate] = useState(false)
  const [startDateInput, setStartDateInput] = useState(getPastDateStr(3))
  const [endDateInput, setEndDateInput] = useState(getTodayStr())
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)

  useEffect(() => {
    if (!isCustomDate) return
    if (!startDateInput || !endDateInput) return

    const start = new Date(startDateInput)
    const end = new Date(endDateInput)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return
    if (start > end) return

    setAppliedRange({ startDate: startDateInput, endDate: endDateInput })
  }, [isCustomDate, startDateInput, endDateInput])

  const [magData, setMagData] = useState<any[]>([])
  const [swepamData, setSwepamData] = useState<any[]>([])
  const [protonRaw, setProtonRaw] = useState<any[]>([])
  const [ouluData, setOuluData] = useState<any[]>([])
  const [sopoData, setSopoData] = useState<any[]>([])
  const [sopbData, setSopbData] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const sDate = isCustomDate && appliedRange ? appliedRange.startDate : undefined
      const eDate = isCustomDate && appliedRange ? appliedRange.endDate : undefined

      const swepamPromise = (isCustomDate && appliedRange && sDate && eDate)
        ? fetchArchiveSwepam(sDate, eDate, limit)
        : loadSwepam(limit, sDate, eDate)

      const [mag, swepam, proton, oulu, sopo, sopb] = await Promise.all([
        loadMag(limit, sDate, eDate),
        swepamPromise,
        loadProton(limit, sDate, eDate),
        loadNeutron('OULU', limit, sDate, eDate),
        loadNeutron('SOPO', limit, sDate, eDate),
        loadNeutron('SOPB', limit, sDate, eDate),
      ])
      setMagData(mag)
      setSwepamData(swepam)
      setProtonRaw(proton)
      setOuluData(oulu)
      setSopoData(sopo)
      setSopbData(sopb)
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
      const [olderMag, olderSwepam, olderProton, olderOulu, olderSopo, olderSopb] = await Promise.all([
        loadMag(0, start, end),
        loadSwepam(0, start, end),
        loadProton(0, start, end),
        loadNeutron('OULU', 0, start, end),
        loadNeutron('SOPO', 0, start, end),
        loadNeutron('SOPB', 0, start, end),
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

      return olderMag.length ? olderMag
        : olderSwepam.length ? olderSwepam
          : olderProton.length ? olderProton
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
  }, [limit, appliedRange, isCustomDate])



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

  const protonPivoted = useMemo(() => {
    const map: Record<string, any> = {}
    protonRaw.forEach(r => {
      if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
      map[r.time_tag][r.energy] = r.flux
    })
    return Object.values(map).sort(
      (a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime()
    )
  }, [protonRaw])

  const energyBands = useMemo(() => {
    return [...new Set(protonRaw.map(r => r.energy))].filter(Boolean).sort()
  }, [protonRaw])

  // Synchronized time axis baselines
  const { axisMin, axisMax } = useMemo(() => {
    const refTimes = [
      ...magData.map(d => new Date(d.time_tag).getTime()),
      ...swepamData.map(d => new Date(d.time_tag).getTime()),
    ].filter(t => !isNaN(t))

    if (!refTimes.length) return { axisMin: undefined, axisMax: undefined }
    const minT = Math.min(...refTimes)
    const maxT = Math.max(...refTimes)
    const pad = (maxT - minT) * 0.02
    return { axisMin: minT - pad, axisMax: maxT + pad }
  }, [magData, swepamData])

  const GRIDS = [
    { top: 45, left: 95, right: 85, height: 130 },
    { top: 215, left: 95, right: 85, height: 130 },
    { top: 385, left: 95, right: 85, height: 130 },
    { top: 555, left: 95, right: 85, height: 120 },
    { top: 715, left: 95, right: 85, height: 120 },
    { top: 875, left: 95, right: 85, height: 135 },
  ]

  const axisLabelStyle = { color: '#F8FAFC', fontSize: 13, fontFamily: 'monospace, sans-serif', fontWeight: 600 }
  const splitLineStyle = { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' as const } }
  const noSplit = { show: false }

  const xAxisBase = (gi: number, showLabel: boolean) => ({
    gridIndex: gi,
    type: 'time' as const,
    splitLine: splitLineStyle,
    axisLabel: showLabel ? axisLabelStyle : { show: false },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  })

  const yAxisBase = (gi: number, name: string, color: string) => ({
    gridIndex: gi,
    type: 'value' as const,
    name,
    nameLocation: 'middle' as const,
    nameGap: 55,
    nameTextStyle: { color, fontSize: 13, fontFamily: 'sans-serif', fontWeight: 700 },
    splitLine: splitLineStyle,
    axisLabel: { ...axisLabelStyle, color: '#F8FAFC' },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  })

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: '#0F172A',
      borderColor: 'rgba(99, 102, 241, 0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: {
        type: 'line' as const,
        lineStyle: { color: '#818CF8', type: 'dashed' as const, width: 1.5 },
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return '';

        const rawTime = params[0].axisValueLabel || params[0].value[0];
        let timeStr = rawTime;
        if (typeof rawTime === 'number') {
          timeStr = new Date(rawTime).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
        }

        const groups: Record<string, { label: string; color: string; items: any[] }> = {
          cosmic: { label: 'COSMIC RAY (OULU & SOPO)', color: '#818CF8', items: [] },
          sopb_sopo: { label: 'SOUTH POLE RATIO (SOPB / SOPO)', color: '#E879F9', items: [] },
          imf_tz: { label: 'IMF Bt & Bz (ACE/DSCOVR)', color: '#60A5FA', items: [] },
          imf_xy: { label: 'IMF Bx - By (GSE)', color: '#FB923C', items: [] },
          sw_speed: { label: 'SOLAR WIND SPEED', color: '#34D399', items: [] },
          proton: { label: 'PROTON FLUX INTEGRAL', color: '#FBBF24', items: [] }
        };

        params.forEach((p: any) => {
          if (!p) return;
          const name = p.seriesName;
          const val = Array.isArray(p.value) ? p.value[1] : p.value;
          if (val === undefined || val === null) return;

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
          }
        });

        let html = `<div style="font-family: var(--font-mono); font-size: 11px; min-width: 240px;">`;
        html += `<div style="color: #94A3B8; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px; margin-bottom: 8px; font-weight: 600; letter-spacing: 0.5px;">`;
        html += `⏱ ${timeStr}</div>`;

        Object.values(groups).forEach(g => {
          if (g.items.length === 0) return;

          html += `<div style="color: ${g.color}; font-weight: 700; margin-top: 8px; margin-bottom: 4px; font-size: 10px; letter-spacing: 0.8px; display: flex; align-items: center; gap: 4px;">`;
          html += `<span style="display:inline-block; width:8px; height:8px; background:${g.color}; border-radius:2px;"></span>${g.label}</div>`;

          g.items.forEach(item => {
            let valDisplay = typeof item.value === 'number' ? item.value.toFixed(1) : item.value;
            if (item.name === 'SOPB / SOPO' && typeof item.value === 'number') {
              valDisplay = item.value.toFixed(4);
            } else if (g.label.includes('PROTON') && typeof item.value === 'number') {
              valDisplay = item.value.toExponential(2);
            }
            html += `<div style="display: flex; justify-content: space-between; gap: 20px; padding: 2px 0 2px 10px; color: #E2E8F0;">`;
            html += `<span style="display:flex; align-items:center; gap:6px;"><span style="color: ${item.color}; font-size:12px;">●</span>${item.name}</span>`;
            html += `<span style="font-weight: 700; color: #FFFFFF; font-family: monospace;">${valDisplay}</span>`;
            html += `</div>`;
          });
        });

        html += `</div>`;
        return html;
      }
    },
    axisPointer: {
      link: [{ xAxisIndex: [0, 1, 2, 3, 4, 5] }],
      snap: true,
    },
    dataZoom: [
      {
        type: 'inside' as const,
        xAxisIndex: [0, 1, 2, 3, 4, 5],
        filterMode: 'none' as const,
        rangeMode: ['value', 'value'] as const,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: true,
        preventDefaultMouseDown: true,
        ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
      },
    ],
    legend: {
      show: true,
      top: 868,
      right: 80,
      icon: 'roundRect',
      itemGap: 12,
      itemWidth: 10,
      itemHeight: 4,
      textStyle: {
        color: '#CBD5E1',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
      },
      data: energyBands,
    },
    grid: GRIDS,
    xAxis: [
      xAxisBase(0, false),
      xAxisBase(1, false),
      xAxisBase(2, false),
      xAxisBase(3, false),
      xAxisBase(4, false),
      xAxisBase(5, true),
    ],
    yAxis: [
      yAxisBase(0, 'Cosmic Ray (cts/min)', '#A5B4FC'),
      { ...yAxisBase(1, 'SP B / NM', '#E879F9'), scale: true },
      yAxisBase(2, 'Bt & Bz (nT)', '#93C5FD'),
      yAxisBase(3, 'Bx - By (nT)', '#FDBA74'),
      { ...yAxisBase(4, 'SW Speed (km/s)', '#6EE7B7'), scale: true },
      { ...yAxisBase(5, 'Proton Flux (pfu)', '#FDE047'), type: 'log' as const },
    ],
    series: [
      {
        name: 'OULU',
        type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, lineStyle: { width: 2.2, color: '#818CF8' },
        itemStyle: { color: '#818CF8' },
        markLine: buildMarkLines(lines, 0),
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
        markLine: buildMarkLines(lines, 1),
        data: sopbSopoRatioData,
      },
      {
        name: 'Bt',
        type: 'line', xAxisIndex: 2, yAxisIndex: 2,
        showSymbol: false, lineStyle: { width: 2, color: '#C084FC' },
        itemStyle: { color: '#C084FC' },
        markLine: buildMarkLines(lines, 2),
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
        markLine: {
          data: [{ yAxis: 0 }],
          lineStyle: { color: 'rgba(255, 255, 255, 0.25)', type: 'dashed' },
          symbol: ['none', 'none'],
          label: { show: false },
        },
      },
      {
        name: 'SW Speed',
        type: 'line', xAxisIndex: 4, yAxisIndex: 4,
        showSymbol: false, lineStyle: { width: 2.2, color: '#34D399' },
        itemStyle: { color: '#34D399' },
        markLine: buildMarkLines(lines, 4),
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
        markLine: idx === 0 ? buildMarkLines(lines, 5) : undefined,
        endLabel: {
          show: true,
          formatter: (params: any) => params.seriesName,
          color: PROTON_COLORS[e] || '#94A3B8',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          distance: 6,
        },
        data: protonPivoted.map((d: any) => [d.time_tag, d[e]]),
      })),
    ],
  }), [ouluData, sopoData, sopbSopoRatioData, magData, swepamData, protonPivoted, energyBands, axisMin, axisMax, lines])

  const PANEL_LABELS = [
    { y: 50, label: 'COSMIC RAY', target: 'OULU & SOPO (NMDB)', color: '#A5B4FC', icon: Globe },
    { y: 220, label: 'SOPB / SOPO', target: 'SOUTH POLE RATIO', color: '#E879F9', icon: Layers },
    { y: 390, label: 'IMF Bt & Bz', target: 'L1 ACE / DSCOVR', color: '#93C5FD', icon: Zap },
    { y: 560, label: 'IMF Bx - By', target: 'GSE COORDINATE', color: '#FDBA74', icon: Activity },
    { y: 720, label: 'SW SPEED', target: 'L1 SWEPAM PLASMA', color: '#6EE7B7', icon: Wind },
    { y: 880, label: 'PROTON FLUX', target: 'GOES GEO SATELLITES', color: '#FDE047', icon: Satellite },
  ]

  const latestMag = magData[magData.length - 1]
  const latestSwepam = swepamData[swepamData.length - 1]
  const latestOulu = ouluData.filter((d: any) => d.count_rate > 0).slice(-1)[0]
  const latestRatio = sopbSopoRatioData.length ? sopbSopoRatioData[sopbSopoRatioData.length - 1][1] : null

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Content area with frameless layout */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Seamless Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 26,
              fontWeight: 700,
              color: '#F8FAFC',
              margin: 0,
              letterSpacing: -0.5
            }}>
              SPACE WEATHER OVERVIEW
            </h1>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
              Synchronized 6-Tier Analytics: Cosmic Ray · Polar Ratio · Magnetic Field · Solar Wind · Proton Flux
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {panLoading && (
              <span style={{ fontSize: 11, color: '#818CF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            )}
            {/* ── Trend Line Toolbar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {drawingMode && (
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', color: pendingP1 ? '#FBBF24' : '#A78BFA',
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
                  background: drawingMode ? 'rgba(167,139,250,0.2)' : 'transparent',
                  border: `1px solid ${drawingMode ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`,
                  color: drawingMode ? '#A78BFA' : '#94A3B8',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: 0.5,
                  transition: 'all 0.2s', borderRadius: 2,
                }}
              >
                {drawingMode ? '╱ DRAWING ON' : '╱ DRAW LINE'}
              </button>
              {lines.length > 0 && (
                <button
                  onClick={clearLines}
                  style={{
                    padding: '4px 10px', background: 'transparent',
                    border: '1px solid rgba(248,113,113,0.4)', color: '#F87171',
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: 0.5, borderRadius: 2,
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
                color: '#818CF8',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'SYNCING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Row 2 Toolbar (Below Header Line): Presets, CUSTOM toggle & Date Pickers */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap'
        }}>
          {/* Preset & Custom Tabs Pill Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(15, 23, 42, 0.65)',
            padding: '3px 6px',
            // borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {([360, 1440, 4320, 10080] as TimeRange[]).map(v => (
              <button
                key={v}
                onClick={() => {
                  setIsCustomDate(false)
                  setAppliedRange(null)
                  setLimit(v)
                }}
                style={{
                  padding: '4px 10px',
                  background: (!isCustomDate && limit === v) ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  border: 'none',
                  // borderRadius: 6,
                  borderBottom: (!isCustomDate && limit === v) ? '2px solid #818CF8' : '2px solid transparent',
                  color: (!isCustomDate && limit === v) ? '#F8FAFC' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: (!isCustomDate && limit === v) ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {TIME_LABELS[v]}
              </button>
            ))}

            <button
              onClick={() => {
                setIsCustomDate(prev => !prev)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: isCustomDate ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                border: 'none',
                // borderRadius: 6,
                borderBottom: isCustomDate ? '2px solid #818CF8' : '2px solid transparent',
                color: isCustomDate ? '#F8FAFC' : '#94A3B8',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: isCustomDate ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={13} />
              CUSTOM
            </button>
          </div>

          {/* Inline Custom Date Inputs (Appears on Row 2 next to CUSTOM when active) */}
          {isCustomDate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '4px 12px',
              // borderRadius: 8,
              border: '1px solid rgba(129, 140, 248, 0.4)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>FROM:</span>
                <DateInputDDMMYYYY value={startDateInput} onChange={setStartDateInput} accentColor="#818CF8" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>TO:</span>
                <DateInputDDMMYYYY value={endDateInput} onChange={setEndDateInput} accentColor="#818CF8" />
              </div>

              <button
                onClick={() => {
                  if (startDateInput && endDateInput) {
                    setAppliedRange({ startDate: startDateInput, endDate: endDateInput })
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  // borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.15s ease'
                }}
              >
                APPLY
              </button>
            </div>
          )}
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
              background: 'rgba(10, 15, 30, 0.45)',
              // borderRadius: 0,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px 0',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)'
            }}
          >
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: 1040, width: '100%' }}
              notMerge={true}
              lazyUpdate={false}
              onChartReady={onChartReady}
              onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
            />

            <TrendLineOverlay
              chartRef={chartRef}
              wrapperRef={chartWrapperRef}
              gridCount={6}
              gridUnits={GRID_UNITS}
              lines={lines}
              drawingMode={drawingMode}
              pendingP1={pendingP1}
              onChartClick={handleClick}
              onRemoveLine={removeLine}
            />

            {/* Horizontal Panel Dividers */}
            {[215, 385, 555, 715, 875].map(top => (
              <div key={top} style={{
                position: 'absolute',
                left: 95,
                right: 85,
                top,
                height: 1,
                background: 'rgba(255,255,255,0.06)',
                pointerEvents: 'none',
              }} />
            ))}
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
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
            <span><strong style={{ color: '#818CF8' }}>OULU</strong> Oulu, Finland</span>
            <span><strong style={{ color: '#FB923C' }}>SOPO</strong> South Pole, Antarctica</span>
            <span><strong style={{ color: '#E879F9' }}>SOPB/SOPO</strong> Polar Ratio</span>
            <span><strong style={{ color: '#F8FAFC' }}>ACE</strong> L1 Orbit Sensors</span>
            <span><strong style={{ color: '#F8FAFC' }}>GOES</strong> NOAA Satellites</span>
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



