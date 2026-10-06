import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTranslation } from 'react-i18next'
import { fetchAndSaveMag, loadMag } from '../../services/aceService'
import { loadSolar1Mag } from '../../services/radiationService'
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

export default function Mag() {
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
        loadMag(limit, sDate, eDate),
        loadSolar1Mag(limit, sDate, eDate)
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
    } catch (e) {
      console.error(e)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveMag()
    } catch (e) { }
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
        const dSolar1 = await loadSolar1Mag(0, start, end)
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
          loadMag(0, start, end),
          loadSolar1Mag(0, start, end)
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
        return loadMag(0, start, end)
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

  const latest = data[data.length - 1]
  const bzStatus = !latest ? 'offline' : latest.bz < -10 ? 'danger' : latest.bz < 0 ? 'warning' : 'normal'

  // Build series based on selected satSource with bold lines and light/dark theme contrast
  const series: any[] = []

  if (satSource === 'ACE' || satSource === 'BOTH') {
    series.push(
      {
        name: 'ACE Bt',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#7C3AED' : '#A855F7' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.bt])
      },
      {
        name: 'ACE Bz',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#DC2626' : '#EF4444' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.bz])
      },
      {
        name: 'ACE Bx',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.bx])
      },
      {
        name: 'ACE By',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#D97706' : '#FBBF24' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.by])
      }
    )
  }

  if (satSource === 'SOLAR1' || satSource === 'BOTH') {
    series.push(
      {
        name: 'SOLAR-1 Bt',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#DB2777' : '#EC4899' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.bt])
      },
      {
        name: 'SOLAR-1 Bz',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#EA580C' : '#F59E0B' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.bz_gse != null ? d.bz_gse : d.bz])
      },
      {
        name: 'SOLAR-1 Bx',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#0891B2' : '#06B6D4' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.bx_gse != null ? d.bx_gse : d.bx])
      },
      {
        name: 'SOLAR-1 By',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#059669' : '#10B981' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.by_gse != null ? d.by_gse : d.by])
      }
    )
  }

  const allMagData = satSource === 'SOLAR1' ? solar1Data : (satSource === 'BOTH' ? [...data, ...solar1Data] : data)
  const { minTs, maxTs } = getTimeDomain(allMagData)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  const firstGrid0 = series.find(s => s.xAxisIndex === 0)
  if (firstGrid0) {
    firstGrid0.markLine = combineMarkLines(midnightDividers)
  }
  const firstGrid1 = series.find(s => s.xAxisIndex === 1)
  if (firstGrid1) {
    firstGrid1.markLine = combineMarkLines(midnightDividers)
  }

  // Multi-grid ECharts option configuration
  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#93C5FD' : 'rgba(56,189,248,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#1A6DB5' : '#38BDF8', type: 'dashed', width: 1.5 } },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const rawTime = params[0]?.value ? params[0].value[0] : (params[0]?.axisValue || '')
        const timeStr = formatUTCTime(rawTime, true)
        let html = `<div style="font-family:var(--font-mono);font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};font-weight:700;color:${isLight ? '#0284C7' : '#38BDF8'}">
          🕒 ${timeStr}
        </div>`
        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          const valStr = typeof val === 'number' ? val.toFixed(2) : '—'
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;margin:3px 0;font-family:var(--font-mono);">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
            </span>
            <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr} nT</strong>
          </div>`
        })
        return html
      }
    },
    legend: {
      show: true,
      textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' },
      top: 0
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 35, left: 85, right: 20, height: '40%' },    // Grid 0: Bt / Bz
      { top: '54%', left: 85, right: 20, height: '38%' }   // Grid 1: Bx / By
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
        axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange),
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'value',
        name: 'Bt / Bz (nT)',
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
        name: 'Bx / By (nT)',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#D97706' : '#FB923C',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
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
    const map = new Map<string, any>()
    data.forEach(d => {
      map.set(d.time_tag, {
        time_tag: d.time_tag,
        ace_bt: d.bt,
        ace_bx: d.bx_gse,
        ace_by: d.by_gse,
        ace_bz: d.bz_gse
      })
    })
    solar1Data.forEach(d => {
      const existing = map.get(d.time_tag) || { time_tag: d.time_tag }
      existing.solar1_bt = d.bt
      existing.solar1_bx = d.bx_gse
      existing.solar1_by = d.by_gse
      existing.solar1_bz = d.bz_gse
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
        { key: 'bt', label: 'Bt(nT)', width: 12 },
        { key: 'bx_gse', label: 'Bx_GSE(nT)', width: 14 },
        { key: 'by_gse', label: 'By_GSE(nT)', width: 14 },
        { key: 'bz_gse', label: 'Bz_GSE(nT)', width: 14 }
      ]
    }

    if (satSource === 'SOLAR1') {
      return [
        ...base,
        { key: 'bt', label: 'Bt(nT)', width: 12 },
        { key: 'bx_gse', label: 'Bx_GSE(nT)', width: 14 },
        { key: 'by_gse', label: 'By_GSE(nT)', width: 14 },
        { key: 'bz_gse', label: 'Bz_GSE(nT)', width: 14 }
      ]
    }

    return [
      ...base,
      { key: 'ace_bt', label: 'ACE_Bt(nT)', width: 14 },
      { key: 'ace_bx', label: 'ACE_Bx(nT)', width: 14 },
      { key: 'ace_by', label: 'ACE_By(nT)', width: 14 },
      { key: 'ace_bz', label: 'ACE_Bz(nT)', width: 14 },
      { key: 'solar1_bt', label: 'SOLAR1_Bt(nT)', width: 16 },
      { key: 'solar1_bx', label: 'SOLAR1_Bx(nT)', width: 16 },
      { key: 'solar1_by', label: 'SOLAR1_By(nT)', width: 16 },
      { key: 'solar1_bz', label: 'SOLAR1_Bz(nT)', width: 16 }
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
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#0C1E35' : '#38BDF8',
            margin: 0,
            letterSpacing: -0.5
          }}>
            INTERPLANETARY MAGNETOMETER (MAG)
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Magnetometer Vector Comparison · ACE &amp; SOLAR-1 / SWFO-L1 Observatories (L1 Orbit)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14, color: isLight ? '#1A6DB5' : '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={bzStatus} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: isLight ? '#1A6DB5' : '#38BDF8', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Toolbar: Source Toggle + Date Range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
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
                  ? (isLight ? '#0284C7' : '#38BDF8')
                  : (isLight ? '#64748B' : '#94A3B8'),
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: isLight && satSource === s ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                transition: 'all 0.15s'
              }}
            >
              {s === 'SOLAR1' ? 'SOLAR-1 (MAG)' : s === 'BOTH' ? 'BOTH (ACE + SOLAR-1)' : 'ACE'}
            </button>
          ))}
        </div>

        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#1A6DB5' : '#38BDF8'}
          loading={loading}
        />
      </div>

      {/* Unified Multi-Grid Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="ACE MAGNETIC FIELD (L1 ORBIT)"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {panLoading && (
                <span style={{ fontSize: 13, color: isLight ? '#1A6DB5' : '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              <ExportChartMenu
                chartRef={chartRef}
                data={exportData}
                columns={exportColumns}
                metadata={{
                  station: 'ACE / SOLAR-1 (L1 ORBIT)',
                  viewTitle: `INTERPLANETARY MAGNETIC FIELD (${satSource})`,
                  description: 'Interplanetary Magnetic Field (IMF): Total Magnitude (Bt) and Coordinate Components (Bx, By, Bz)',
                  timeRangeText: exportTimeRange,
                  totalRecords: exportData.length
                }}
                filenameBase={`IMF_MAG_${satSource}_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                accentColor={isLight ? '#1A6DB5' : '#38BDF8'}
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
        accentColor={isLight ? '#1A6DB5' : '#38BDF8'}
        tabs={[
          { id: 'usage', label: t('guide_tabs.usage') },
          { id: 'impacts', label: t('guide_tabs.impacts') },
          { id: 'details', label: t('guide_tabs.details') },
          { id: 'credits', label: t('guide_tabs.credits') }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              {t('guides.mag.usage.title')}
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>MAG (Magnetometer)</strong> {t('guides.mag.usage.desc')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Bt (Total Magnitude):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>{t('guides.mag.usage.bt')}</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Bx:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>{t('guides.mag.usage.bx')}</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#D97706' : '#FBBF24'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>By:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>{t('guides.mag.usage.by')}</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#DC2626' : '#EF4444'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Bz:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>{t('guides.mag.usage.bz')}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              {t('guides.mag.impacts.title')}
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              {t('guides.mag.impacts.desc')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#F0FDF4' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #BBF7D0' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#059669', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {t('guides.mag.impacts.north_title')}
                </h5>
                <p style={{ color: isLight ? '#166534' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  {t('guides.mag.impacts.north_desc')}
                </p>
              </div>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {t('guides.mag.impacts.south_title')}
                </h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  {t('guides.mag.impacts.south_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              {t('guides.mag.details.title')}
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>{t('guides.mag.details.spacecraft_label')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>{t('guides.mag.details.spacecraft_val')}</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>{t('guides.mag.details.orbit_label')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.mag.details.orbit_val')}</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>{t('guides.mag.details.sensor_label')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.mag.details.sensor_val')}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>{t('guides.mag.details.range_label')}</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>{t('guides.mag.details.range_val')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              {t('guides.mag.credits.title')}
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 14px 0',
              lineHeight: '1.7'
            }}>
              {t('guides.mag.credits.desc')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#334155' : '#94A3B8' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#1A6DB5' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> {t('guides.mag.credits.swpc')}
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#1A6DB5' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>NASA ACE Project Office:</strong> {t('guides.mag.credits.nasa')}
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#1A6DB5' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Bartol Research Institute:</strong> {t('guides.mag.credits.bartol')}
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              fontSize: 13,
              color: isLight ? '#475569' : '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              {t('guides.mag.credits.api_ref')}
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
