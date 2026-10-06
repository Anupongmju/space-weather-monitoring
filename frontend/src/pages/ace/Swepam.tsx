import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'react-i18next'
import { fetchAndSaveSwepam, loadSwepam } from '../../services/aceService'
import { loadSolar1Plasma } from '../../services/radiationService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'

export default function Swepam() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [data, setData] = useState<any[]>([])
  const [solar1Data, setSolar1Data] = useState<any[]>([])
  const [satSource, setSatSource] = useState<'ACE' | 'SOLAR1' | 'BOTH'>('ACE')
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef(null)

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const sDate = appliedRange ? appliedRange.startDate : undefined
    const eDate = appliedRange ? appliedRange.endDate : undefined
    try {
      const [dAce, dSolar1] = await Promise.all([
        loadSwepam(limit, sDate, eDate),
        loadSolar1Plasma(limit, sDate, eDate)
      ])
      const newAce = Array.isArray(dAce) ? dAce : []
      const newSolar1 = Array.isArray(dSolar1) ? dSolar1 : []

      if (showLoading || appliedRange) {
        setData(newAce)
        setSolar1Data(newSolar1)
      } else {
        // Smart merge: keep any older historical data user loaded to the left
        setData(prev => {
          if (!prev || prev.length === 0 || newAce.length === 0) return newAce
          const firstNewTs = new Date(newAce[0].time_tag).getTime()
          const older = prev.filter(p => new Date(p.time_tag).getTime() < firstNewTs)
          return [...older, ...newAce]
        })
        setSolar1Data(prev => {
          if (!prev || prev.length === 0 || newSolar1.length === 0) return newSolar1
          const firstNewTs = new Date(newSolar1[0].time_tag).getTime()
          const older = prev.filter(p => new Date(p.time_tag).getTime() < firstNewTs)
          return [...older, ...newSolar1]
        })
      }
    } catch (err) {
      console.error('Failed to load swepam data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveSwepam()
    } catch(e) {}
    await load(false)
    setFetching(false)
  }

  const activeData = satSource === 'SOLAR1' ? solar1Data : (data.length ? data : solar1Data)

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady, isViewingHistory } = useChartPan({
    data: activeData,
    setData: (merged: any[]) => {
      if (satSource === 'SOLAR1') {
        setSolar1Data(merged)
      } else {
        setData(merged)
      }
    },
    loadHistorical: async (start, end) => {
      if (satSource === 'SOLAR1') {
        const dSolar1 = await loadSolar1Plasma(0, start, end)
        const freshSolar1 = Array.isArray(dSolar1) ? dSolar1 : []
        if (freshSolar1.length) {
          setSolar1Data(prev => {
            const existingKeys = new Set(prev.map(p => p.time_tag))
            const filtered = freshSolar1.filter(p => !existingKeys.has(p.time_tag))
            return [...filtered, ...prev].sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
          })
        }
        return freshSolar1
      } else if (satSource === 'BOTH') {
        const [dAce, dSolar1] = await Promise.all([
          loadSwepam(0, start, end),
          loadSolar1Plasma(0, start, end)
        ])
        const freshAce = Array.isArray(dAce) ? dAce : []
        const freshSolar1 = Array.isArray(dSolar1) ? dSolar1 : []
        if (freshSolar1.length) {
          setSolar1Data(prev => {
            const existingKeys = new Set(prev.map(p => p.time_tag))
            const filtered = freshSolar1.filter(p => !existingKeys.has(p.time_tag))
            return [...filtered, ...prev].sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
          })
        }
        return freshAce
      } else {
        return loadSwepam(0, start, end)
      }
    },
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    load(true)
  }, [limit, appliedRange])

  useEffect(() => {
    resetPan()
  }, [satSource])

  useAutoFetch(async () => {
    await load(false)
  }, 60000, !appliedRange && !isViewingHistory)

  const series: any[] = []

  if (satSource === 'ACE' || satSource === 'BOTH') {
    series.push(
      {
        name: 'ACE Density',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.proton_density])
      },
      {
        name: 'ACE Speed',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#1D4ED8' : '#3498DB' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.bulk_speed])
      },
      {
        name: 'ACE Temp',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#9333EA' : '#C084FC' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.ion_temp])
      }
    )
  }

  if (satSource === 'SOLAR1' || satSource === 'BOTH') {
    series.push(
      {
        name: 'SOLAR-1 Density',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#D97706' : '#F59E0B' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.proton_density])
      },
      {
        name: 'SOLAR-1 Speed',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#059669' : '#10B981' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.proton_speed])
      },
      {
        name: 'SOLAR-1 Temp',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#E11D48' : '#F43F5E' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.proton_temperature])
      }
    )
  }

  const allSwepamData = satSource === 'SOLAR1' ? solar1Data : (satSource === 'BOTH' ? [...data, ...solar1Data] : data)
  const { minTs, maxTs } = getTimeDomain(allSwepamData)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  ;[0, 1, 2].forEach(gi => {
    const s = series.find(ser => ser.xAxisIndex === gi)
    if (s) s.markLine = combineMarkLines(midnightDividers)
  })

  // Multi-grid ECharts option configuration
  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    legend: {
      show: true,
      textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' },
      top: 0
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0B192C',
      borderColor: isLight ? '#93C5FD' : '#38BDF8',
      textStyle: { color: isLight ? '#0F172A' : '#E2E8F0', fontFamily: 'var(--font-mono)' },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const rawTime = params[0]?.value ? params[0].value[0] : (params[0]?.axisValue || '')
        const timeStr = formatUTCTime(rawTime, true)
        let html = `<div style="font-family:var(--font-mono);font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};font-weight:700;color:${isLight ? '#0284C7' : '#38BDF8'}">
          🕒 ${timeStr}
        </div>`
        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          const valStr = typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;margin:3px 0;font-family:var(--font-mono);">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
            </span>
            <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr}</strong>
          </div>`
        })
        return html
      }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 35, left: 85, right: 20, height: '26%' },    // Grid 0: Proton Density
      { top: '38%', left: 85, right: 20, height: '26%' },   // Grid 1: Bulk Speed
      { top: '69%', left: 85, right: 20, height: '24%' }    // Grid 2: Ion Temperature
    ],
    xAxis: [
      {
        gridIndex: 0,
        type: 'time',
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'time',
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
        type: 'time',
        axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange),
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'value',
        name: 'Density (p/cm³)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#0284C7' : '#38BDF8',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'value',
        name: 'Speed (km/s)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#1D4ED8' : '#3498DB',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
        type: 'value',
        name: 'Temp (K)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#9333EA' : '#C084FC',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: {
          color: isLight ? '#475569' : '#E2E8F0',
          fontSize: 13,
          fontFamily: 'monospace, sans-serif',
          formatter: (value: number) => value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1, 2],
        filterMode: 'none',
        rangeMode: ['value', 'value'],
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
      }
    ],
    series
  }

  // Unified export dataset based on satSource
  const exportData = useMemo(() => {
    if (satSource === 'ACE') return data
    if (satSource === 'SOLAR1') return solar1Data
    // BOTH: merge by time_tag
    const map = new Map<string, any>()
    data.forEach(d => {
      map.set(d.time_tag, {
        time_tag: d.time_tag,
        ace_density: d.proton_density,
        ace_speed: d.bulk_speed,
        ace_temp: d.ion_temp
      })
    })
    solar1Data.forEach(d => {
      const existing = map.get(d.time_tag) || { time_tag: d.time_tag }
      existing.solar1_density = d.proton_density
      existing.solar1_speed = d.proton_speed
      existing.solar1_temp = d.proton_temperature
      map.set(d.time_tag, existing)
    })
    return Array.from(map.values()).sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }, [satSource, data, solar1Data])

  const exportColumns = useMemo((): ExportColumn[] => {
    const base: ExportColumn[] = [
      { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
      { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') }
    ]

    if (satSource === 'ACE') {
      return [
        ...base,
        { key: 'proton_density', label: 'Proton_Density(p/cm3)', width: 22 },
        { key: 'bulk_speed', label: 'Bulk_Speed(km/s)', width: 18 },
        { key: 'ion_temp', label: 'Ion_Temp(K)', width: 16 }
      ]
    }

    if (satSource === 'SOLAR1') {
      return [
        ...base,
        { key: 'proton_density', label: 'Proton_Density(p/cm3)', width: 22 },
        { key: 'proton_speed', label: 'Proton_Speed(km/s)', width: 20 },
        { key: 'proton_temperature', label: 'Proton_Temp(K)', width: 18 }
      ]
    }

    return [
      ...base,
      { key: 'ace_density', label: 'ACE_Density(p/cm3)', width: 20 },
      { key: 'ace_speed', label: 'ACE_Speed(km/s)', width: 18 },
      { key: 'ace_temp', label: 'ACE_Temp(K)', width: 16 },
      { key: 'solar1_density', label: 'SOLAR1_Density(p/cm3)', width: 22 },
      { key: 'solar1_speed', label: 'SOLAR1_Speed(km/s)', width: 20 },
      { key: 'solar1_temp', label: 'SOLAR1_Temp(K)', width: 18 }
    ]
  }, [satSource])

  const exportTimeRange = appliedRange
    ? `${appliedRange.startDate} to ${appliedRange.endDate}`
    : `Past ${limit / 1440} Day(s)`

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>

      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 26, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(26, 109, 181, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26, fontWeight: 800,
            color: isLight ? '#0C1E35' : '#FB923C',
            margin: 0, letterSpacing: -0.5
          }}>
            SOLAR WIND PLASMA (SWEPAM / SWiPS)
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#94A3B8',
            fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)'
          }}>
            Solar Wind Plasma Comparison · ACE SWEPAM &amp; SOLAR-1 SWiPS (L1 Orbit)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 13, color: '#FB923C', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '5px 12px',
              background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: isLight ? '#1A6DB5' : '#FB923C',
              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1,
              boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

          {/* Toolbar: Source Toggle + Date Range */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {/* Source Switcher Toggle */}
            <div style={{
              display: 'flex',
              background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
              padding: 3,
              borderRadius: 8,
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)'
            }}>
              {(['ACE', 'SOLAR1', 'BOTH'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSatSource(s)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    border: 'none',
                    background: satSource === s
                      ? (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.15)')
                      : 'transparent',
                    color: satSource === s
                      ? (isLight ? '#EA580C' : '#FB923C')
                      : (isLight ? '#64748B' : '#94A3B8'),
                    borderRadius: 6,
                    cursor: 'pointer',
                    boxShadow: isLight && satSource === s ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                    transition: 'all 0.15s'
                  }}
                >
                  {s === 'SOLAR1' ? 'SOLAR-1 (SWiPS)' : s === 'BOTH' ? 'BOTH (ACE + SOLAR-1)' : 'ACE'}
                </button>
              ))}
            </div>

            <DateRangeToolbar
              limit={limit}
              onLimitChange={setLimit}
              appliedRange={appliedRange}
              onApplyRange={setAppliedRange}
              accentColor={isLight ? '#1A6DB5' : '#FB923C'}
              loading={loading}
            />
          </div>

          {/* SWEPAM Multi-Grid Chart Block */}
          {loading ? <LoadingSpinner /> : (
            <Card
              title="SWEPAM PLASMA METRICS (REAL-TIME)"
              style={{
                marginBottom: 20,
                background: isLight ? '#FFFFFF' : undefined,
                boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
                border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
              }}
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {panLoading && (
                    <span style={{ fontSize: 13, color: '#3498DB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ◀ LOADING HISTORICAL DATA...
                    </span>
                  )}
                  <ExportChartMenu
                    chartRef={chartRef}
                    data={exportData}
                    columns={exportColumns}
                    metadata={{
                      station: 'ACE / SOLAR-1 (L1 ORBIT)',
                      viewTitle: `SWEPAM PLASMA METRICS (${satSource})`,
                      description: 'Solar Wind Plasma: Proton Density, Bulk Speed, and Ion Temperature',
                      timeRangeText: exportTimeRange,
                      totalRecords: exportData.length
                    }}
                    filenameBase={`SWEPAM_PLASMA_${satSource}_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                    accentColor={isLight ? '#EA580C' : '#FB923C'}
                  />
                </div>
              }
            >
              <ReactECharts
                ref={chartRef}
                key={satSource}
                option={option}
                notMerge={true}
                lazyUpdate={true}
                style={{ height: 580, width: '100%' }}
                onChartReady={onChartReady}
                onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
              />
            </Card>
          )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#FB923C"
        tabs={[
          { id: 'usage', label: t('guide_tabs.usage') },
          { id: 'impacts', label: t('guide_tabs.impacts') },
          { id: 'details', label: t('guide_tabs.details') },
          { id: 'credits', label: t('guide_tabs.credits') }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              {t('guides.swepam.usage_title')}
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>SWEPAM</strong> {t('guides.swepam.usage_desc')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600, fontSize: 13 }}>{t('guides.swepam.proton_density_title')}</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>{t('guides.swepam.proton_density_desc')}</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600, fontSize: 13 }}>{t('guides.swepam.bulk_speed_title')}</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>{t('guides.swepam.bulk_speed_desc')}</span>
              </div>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600, fontSize: 13 }}>{t('guides.swepam.ion_temp_title')}</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>{t('guides.swepam.ion_temp_desc')}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              {t('guides.swepam.impacts_title')}
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              {t('guides.swepam.impacts_desc')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{ background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 6, border: isLight ? '1px solid rgba(26, 109, 181, 0.12)' : '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#EF4444', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{t('guides.swepam.satellites_title')}</h5>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  {t('guides.swepam.satellites_desc')}
                </p>
              </div>
              <div style={{ background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 6, border: isLight ? '1px solid rgba(26, 109, 181, 0.12)' : '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: isLight ? '#EA580C' : '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{t('guides.swepam.power_grid_title')}</h5>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  {t('guides.swepam.power_grid_desc')}
                </p>
              </div>
              <div style={{ background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 6, border: isLight ? '1px solid rgba(26, 109, 181, 0.12)' : '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: isLight ? '#059669' : '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>{t('guides.swepam.aurora_title')}</h5>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  {t('guides.swepam.aurora_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              {t('guides.swepam.details_title')}
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#475569' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%' }}>{t('guides.swepam.spacecraft')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.swepam.spacecraft_val')}</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>{t('guides.swepam.orbit_location')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.swepam.orbit_desc')}</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>{t('guides.swepam.institution')}</td>
                  <td style={{ padding: '8px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.swepam.institution_desc')}</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>{t('guides.swepam.density_range')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.swepam.density_val')}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>{t('guides.swepam.speed_range')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.swepam.speed_val')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              {t('guides.swepam.credits_title')}
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 14px 0', lineHeight: '1.7' }}>
              {t('guides.swepam.credits_intro')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#475569' : '#94A3B8' }}>
              <div style={{ borderLeft: isLight ? '2px solid rgba(26, 109, 181, 0.3)' : '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                {t('guides.swepam.swpc_desc')}
              </div>
              <div style={{ borderLeft: isLight ? '2px solid rgba(26, 109, 181, 0.3)' : '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                {t('guides.swepam.nasa_desc')}
              </div>
              <div style={{ borderLeft: isLight ? '2px solid rgba(26, 109, 181, 0.3)' : '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                {t('guides.swepam.lanl_desc')}
              </div>
            </div>
            <div style={{ 
              marginTop: 16, 
              padding: '10px 14px', 
              background: isLight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)', 
              border: isLight ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255,255,255,0.06)', 
              borderRadius: 6, 
              fontSize: 13, 
              color: isLight ? '#B45309' : '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              {t('guides.swepam.api_note')}
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}