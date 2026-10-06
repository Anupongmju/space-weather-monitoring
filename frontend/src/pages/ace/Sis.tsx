import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveSis, loadSis } from '../../services/aceService'
import { loadSolar1 } from '../../services/radiationService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { formatPowerOf10, formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'
import { useTheme } from '../../context/ThemeContext'

export default function Sis() {
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
        loadSis(limit, sDate, eDate),
        loadSolar1(limit, sDate, eDate)
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
      await fetchAndSaveSis()
    } catch (e) { }
    await load(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady, isViewingHistory } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadSis(0, start, end),
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    load(true)
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    await load(false)
  }, 60000, !appliedRange && !isViewingHistory)

  const series: any[] = []

  if (satSource === 'ACE' || satSource === 'BOTH') {
    series.push(
      {
        name: 'ACE > 10 MeV',
        type: 'line',
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#059669' : '#34D399' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.p10])
      },
      {
        name: 'ACE > 30 MeV',
        type: 'line',
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.p30])
      }
    )
  }

  if (satSource === 'SOLAR1' || satSource === 'BOTH') {
    series.push(
      {
        name: 'S1 > 10 MeV (p7)',
        type: 'line',
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#D97706' : '#F59E0B' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.p7])
      },
      {
        name: 'S1 > 30 MeV (p8)',
        type: 'line',
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#DB2777' : '#EC4899' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.p8])
      }
    )
  }

  const allSisData = satSource === 'SOLAR1' ? solar1Data : (satSource === 'BOTH' ? [...data, ...solar1Data] : data)
  const { minTs, maxTs } = getTimeDomain(allSisData)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  if (series[0]) {
    series[0].markLine = combineMarkLines(midnightDividers)
  }

  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#93C5FD' : 'rgba(52,211,153,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#059669' : '#34D399', type: 'dashed', width: 1.5 } },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const rawTime = params[0]?.value ? params[0].value[0] : (params[0]?.axisValue || '')
        const timeStr = formatUTCTime(rawTime, true)
        let html = `<div style="font-family:var(--font-mono);font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};font-weight:700;color:${isLight ? '#059669' : '#34D399'}">
          🕒 ${timeStr}
        </div>`
        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          const valStr = typeof val === 'number' ? (val < 0.01 && val > 0 ? val.toExponential(3) : val.toLocaleString(undefined, { maximumFractionDigits: 4 })) : '—'
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
    legend: {
      show: true,
      textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' },
      top: 0
    },
    grid: { top: 35, right: 20, bottom: 45, left: 85 },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        rangeMode: ['value', 'value'],
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
      }
    ],
    xAxis: {
      type: 'time',
      splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange),
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    },
    yAxis: {
      type: 'log',
      name: 'Particles / (cm² s sr MeV)',
      nameLocation: 'middle',
      nameGap: 56,
      nameTextStyle: {
        color: isLight ? '#059669' : '#34D399',
        fontSize: 14.5,
        fontWeight: 700,
        fontFamily: 'sans-serif'
      },
      splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif', formatter: formatPowerOf10 },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    },
    series
  }

  // Unified export dataset based on satSource
  const exportData = useMemo(() => {
    if (satSource === 'ACE') return data
    if (satSource === 'SOLAR1') return solar1Data
    const map = new Map<string, any>()
    data.forEach(d => {
      map.set(d.time_tag, { ...d, _type: 'ACE' })
    })
    solar1Data.forEach(d => {
      const existing = map.get(d.time_tag) || { time_tag: d.time_tag }
      map.set(d.time_tag, { ...existing, ...d })
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
        { key: 'integral_10mev', label: 'Protons_>10MeV', width: 18 },
        { key: 'integral_30mev', label: 'Protons_>30MeV', width: 18 }
      ]
    }

    if (satSource === 'SOLAR1') {
      return [
        ...base,
        { key: 'p7', label: 'S1_p7(>10MeV_proxy)', width: 22 },
        { key: 'p8', label: 'S1_p8(>30MeV_proxy)', width: 22 }
      ]
    }

    return [
      ...base,
      { key: 'integral_10mev', label: 'ACE_>10MeV', width: 16 },
      { key: 'integral_30mev', label: 'ACE_>30MeV', width: 16 },
      { key: 'p7', label: 'S1_p7_>10MeV', width: 16 },
      { key: 'p8', label: 'S1_p8_>30MeV', width: 16 }
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
            color: isLight ? '#0C1E35' : '#34D399',
            margin: 0,
            letterSpacing: -0.5
          }}>
            HIGH-ENERGY PROTONS (SIS / STIS)
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Solar Isotope Spectrometer &amp; STIS · High-Energy Proton Flux (&gt;10 &amp; &gt;30 MeV)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14, color: isLight ? '#059669' : '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: isLight ? '#059669' : '#34D399', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Toolbar: Source Selector + Date Range */}
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
                  ? (isLight ? '#059669' : '#34D399')
                  : (isLight ? '#64748B' : '#94A3B8'),
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: isLight && satSource === s ? '0 1px 4px rgba(0,0,0,0.06)' : undefined,
                transition: 'all 0.15s'
              }}
            >
              {s === 'SOLAR1' ? 'SOLAR-1 (STIS)' : s === 'BOTH' ? 'BOTH (ACE + SOLAR-1)' : 'ACE'}
            </button>
          ))}
        </div>

        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#059669' : '#34D399'}
          loading={loading}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <Card
          title="SIS / STIS HIGH ENERGY PROTON FLUX"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {panLoading && (
                <span style={{ fontSize: 13, color: isLight ? '#059669' : '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              <ExportChartMenu
                chartRef={chartRef}
                data={exportData}
                columns={exportColumns}
                metadata={{
                  station: 'ACE / SOLAR-1 (L1 ORBIT)',
                  viewTitle: `SIS / STIS HIGH-ENERGY PROTON FLUX (${satSource})`,
                  description: 'Solar Isotope Spectrometer & STIS: Integral High-Energy Protons (>10 & >30 MeV)',
                  timeRangeText: exportTimeRange,
                  totalRecords: exportData.length
                }}
                filenameBase={`SIS_PROTONS_${satSource}_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                accentColor={isLight ? '#059669' : '#34D399'}
              />
            </div>
          }
        >
          <ReactECharts
            ref={chartRef}
            key={satSource}
            option={option}
            notMerge={false}
            lazyUpdate={true}
            style={{ height: 520, width: '100%' }}
            onChartReady={onChartReady}
            onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
          />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#059669' : '#34D399'}
        tabs={[
          { id: 'usage', label: '01. USAGE (การใช้งาน)' },
          { id: 'impacts', label: '02. IMPACTS (ผลกระทบ)' },
          { id: 'details', label: '03. DETAILS (ข้อมูลอุปกรณ์)' },
          { id: 'credits', label: '04. DATA SOURCE & CREDITS (แหล่งข้อมูล)' }
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
              การใช้งานและการตรวจวัดของ SIS
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>SIS</strong> (Solar Isotope Spectrometer) ตรวจวัดองค์ประกอบไอโซโทปและนิวเคลียสพลังงานสูง (10–100 MeV/nucleon):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#059669' : '#34D399'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>&gt;10 MeV Protons:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>โปรตอนระดับพลังงานสูงกว่า 10 MeV ทะลุกำบังเบาได้ ใช้เตือนภัยพายุรังสีเริ่มต้น</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#EA580C' : '#FB923C'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>&gt;30 MeV Protons:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>โปรตอนพลังงานสูงกว่า 30 MeV ทะลุเกราะโลหะหนา เป็นอันตรายสูงต่อวงจรอวกาศ</span>
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
              การพยากรณ์ภัยคุกคามรังสีขั้นรุนแรง (Severe Radiation Hazards)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              พลังงานระดับสูงมากจาก SIS (Solar Particle Events &amp; Galactic Cosmic Rays) มีผลกระทบต่อความปลอดภัยในอวกาศอย่างยิ่ง:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Single Event Upsets (SEU)</h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  รังสีเปลี่ยนบิตในหน่วยความจำคอมพิวเตอร์ดาวเทียม ทำให้ระบบลัดวงจรหรือล้มเหลวถาวร
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFFBEB' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FDE68A' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#D97706', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>อันตรายต่อมนุษย์อวกาศ</h5>
                <p style={{ color: isLight ? '#92400E' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  ดัชนีเตือนภัยสูงสุดสำหรับนักบินอวกาศบน ISS และภารกิจห้วงอวกาศลึกเมื่อต้องเข้าห้องกำบัง
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
              รายละเอียดทางเทคนิคของอุปกรณ์ SIS
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>ACE (Advanced Composition Explorer) — NASA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>L1 Point (~1.5 ล้านกิโลเมตรจากโลก)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>โครงสร้างของเครื่องมือ</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Silicon detector telescopes 2 ชุด (Z = 2 ถึง 30)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ย่านพลังงานที่ตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>~10 ถึง 100 MeV/nucleon</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#EAB308',
              margin: '0 0 12px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              แหล่งที่มาของข้อมูล &amp; เครดิต (Data Source &amp; Credits)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#A0A0B0',
              fontSize: 13,
              margin: '0 0 12px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              ข้อมูลดัชนีระดับรังสีคอสมิกและนิวเคลียสพลังงานสูงบนหน้าเว็บนี้ ได้รับการสนับสนุนข้อมูลและอัปเดตแบบเรียลไทม์จากหน่วยงานวิทยาศาสตร์ระดับโลก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#334155' : '#A0A0B0' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#059669' : '#34D399'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์พยากรณ์สภาพอวกาศแห่งชาติของสหรัฐฯ (NOAA)
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#059669' : '#34D399'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>NASA ACE Project Office:</strong> โครงการดาวเทียมสำรวจอวกาศขั้นสูง (ACE)
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#059669' : '#34D399'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>California Institute of Technology (Caltech):</strong> ร่วมพัฒนาและประมวลผลข้อมูลฟลักซ์รังสี SIS
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: isLight ? '#F8FAFC' : 'rgba(234,179,8,0.05)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(234,179,8,0.2)',
              borderRadius: 6,
              fontSize: 13,
              color: isLight ? '#475569' : '#EAB308',
              fontFamily: 'var(--font-mono)'
            }}>
              <strong>ข้อมูลอ้างอิง API:</strong> ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#059669' : '#34D399', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
