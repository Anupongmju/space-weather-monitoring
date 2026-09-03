import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveEpam, loadEpam } from '../../services/aceService'
import { loadSolar1 } from '../../services/radiationService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { formatPowerOf10 } from '../../utils/formatters'
import { useTheme } from '../../context/ThemeContext'

export default function Epam() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<any[]>([])
  const [solar1Data, setSolar1Data] = useState<any[]>([])
  const [satSource, setSatSource] = useState<'ACE' | 'SOLAR1' | 'BOTH'>('ACE')
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(360)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef(null)

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const sDate = appliedRange ? appliedRange.startDate : undefined
    const eDate = appliedRange ? appliedRange.endDate : undefined
    try {
      const [dAce, dSolar1] = await Promise.all([
        loadEpam(limit, sDate, eDate),
        loadSolar1(limit, sDate, eDate)
      ])
      setData(Array.isArray(dAce) ? dAce : [])
      setSolar1Data(Array.isArray(dSolar1) ? dSolar1 : [])
    } catch (e) {
      console.error(e)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveEpam()
    } catch (e) { }
    await load(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadEpam(0, start, end),
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    load(true)
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    await load(false)
  }, 60000, !appliedRange)

  const series: any[] = []

  if (satSource === 'ACE' || satSource === 'BOTH') {
    series.push(
      {
        name: 'ACE e 38-53 keV',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#EA580C' : '#FB923C' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.e38_53])
      },
      {
        name: 'ACE e 175-315 keV',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#D97706' : '#FBBF24' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.e175_315])
      },
      {
        name: 'ACE p 47-65 keV',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.p47_65])
      },
      {
        name: 'ACE p 112-187 keV',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#059669' : '#34D399' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.p112_187])
      },
      {
        name: 'ACE p 310-580 keV',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#9333EA' : '#C084FC' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: data.map(d => [d.time_tag, d.p310_580])
      }
    )
  }

  if (satSource === 'SOLAR1' || satSource === 'BOTH') {
    series.push(
      {
        name: 'S1 e 38-53 keV (de1)',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#DB2777' : '#EC4899' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.de1])
      },
      {
        name: 'S1 e 175-315 keV (de2)',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#E11D48' : '#F43F5E' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.de2])
      },
      {
        name: 'S1 p 47-68 keV (p1)',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#0891B2' : '#06B6D4' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.p1])
      },
      {
        name: 'S1 p 115-195 keV (p3)',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#10B981' : '#10B981' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.p3])
      },
      {
        name: 'S1 p 321-580 keV (p5)',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: isLight ? '#7C3AED' : '#8B5CF6' },
        lineStyle: { width: 2.2, opacity: 1 },
        data: solar1Data.map(d => [d.time_tag, d.p5])
      }
    )
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#93C5FD' : 'rgba(168,85,247,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#9333EA' : '#C084FC', type: 'dashed', width: 1.5 } }
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
      { top: 35, left: 85, right: 20, height: '42%' },    // Grid 0: Electron Flux
      { top: '54%', left: 85, right: 20, height: '40%' }   // Grid 1: Proton Flux
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
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'log',
        name: 'Electrons',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#9333EA' : '#C084FC',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif', formatter: formatPowerOf10 },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'log',
        name: 'Protons',
        nameLocation: 'middle',
        nameGap: 56,
        nameTextStyle: {
          color: isLight ? '#0284C7' : '#38BDF8',
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: 'sans-serif'
        },
        splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif', formatter: formatPowerOf10 },
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
            color: isLight ? '#0C1E35' : '#C084FC',
            margin: 0,
            letterSpacing: -0.5
          }}>
            ENERGETIC PARTICLES (EPAM / STIS)
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Suprathermal &amp; Energetic Particle Spectrometer · ACE EPAM &amp; SOLAR-1 STIS (L1 Orbit)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14, color: isLight ? '#9333EA' : '#C084FC', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: isLight ? '#9333EA' : '#C084FC', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Toolbar: Source Toggle + Date Range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {/* Source Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          <span style={{ color: isLight ? '#475569' : '#94A3B8', fontWeight: 600 }}>SATELLITE:</span>
          {(['ACE', 'SOLAR1', 'BOTH'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSatSource(s)}
              style={{
                background: satSource === s ? (isLight ? '#7C3AED' : '#C084FC') : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                color: satSource === s ? '#FFF' : (isLight ? '#334155' : '#94A3B8'),
                border: '1px solid ' + (satSource === s ? (isLight ? '#7C3AED' : '#C084FC') : (isLight ? 'rgba(26,109,181,0.2)' : 'rgba(255,255,255,0.1)')),
                fontSize: 14,
                fontWeight: 600,
                padding: '5px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: isLight && satSource !== s ? '0 1px 4px rgba(0,0,0,0.03)' : undefined,
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
          accentColor={isLight ? '#7C3AED' : '#C084FC'}
          loading={loading}
        />
      </div>

      {/* Combined Multi-Grid Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="EPAM CHARGED PARTICLES FLUX (REAL-TIME)"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={panLoading ? (
            <span style={{ fontSize: 13, color: isLight ? '#9333EA' : '#C084FC', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          ) : null}
        >
          <ReactECharts
            option={option}
            notMerge={true}
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
        accentColor={isLight ? '#7C3AED' : '#C084FC'}
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
              การใช้งานและการตรวจวัดของ EPAM
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>EPAM</strong> (Electron Proton and Alpha Monitor) ตรวจวัดปริมาณอนุภาคพลังงานสูง (Energetic Particles) เช่น อิเล็กตรอนและไอออน (รวมถึงโปรตอนและแอลฟา) ที่เคลื่อนที่ด้วยความเร็วสูงกว่าปกติอย่างมาก โดยเฝ้าระวังเป็น 2 ส่วนหลัก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#EA580C' : '#FB923C'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Energetic Electrons (อิเล็กตรอนพลังงานสูง):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>วัดฟลักซ์อิเล็กตรอนความเร็วใกล้เคียงความเร็วแสง ที่ถูกปลดปล่อยมาถึงโลกอย่างรวดเร็วหลัง Solar Flare</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Energetic Protons &amp; Alpha Particles (ไอออนพลังงานสูง):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>ตรวจวัดอนุภาคมีมวลสูง (โปรตอนและแอลฟา) ที่เคลื่อนที่ด้วยพลังงานจลน์สูงมาก</span>
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
              ภัยคุกคามจากพายุรังสีสุริยะ (Solar Radiation Storm Impacts)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              EPAM ตรวจวัดอนุภาคพลังงานสูงเป็นพิเศษ ซึ่งเกิดขึ้นจากเหตุการณ์รุนแรงบนดวงอาทิตย์ ข้อมูล EPAM จึงเป็นดัชนีชี้วัดพายุรังสีสุริยะ (Solar Radiation Storms) โดยตรง:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>ความเสียหายต่อดาวเทียม</h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  อนุภาคพลังงานสูงทะลุตัวเกราะดาวเทียม เข้าไปสะสมประจุและเกิดความเสียหายถาวรแก่ระบบวงจรอิเล็กทรอนิกส์
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFFBEB' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FDE68A' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#D97706', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>อันตรายต่อการบินและนักบินอวกาศ</h5>
                <p style={{ color: isLight ? '#92400E' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  เพิ่มระดับรังสีสะสมเป็นอันตรายต่อนักบินอวกาศ และเครื่องบินพาณิชย์ที่บินผ่านขั้วโลก (Polar Routes)
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
              รายละเอียดทางเทคนิคของอุปกรณ์ EPAM
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>ACE (Advanced Composition Explorer) — NASA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>L1 Lagrangian Point (~1.5 ล้านกิโลเมตรจากโลก)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>เซนเซอร์รับสัญญาณ</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Solid-state detector telescopes 5 ชุด ปรับมุม 3D</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ย่านพลังงานที่ตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>e- 38–350 keV / Ions 47 keV–4.8 MeV</td>
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
              แหล่งที่มาของข้อมูล & เครดิต (Data Source & Credits)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 14px 0',
              lineHeight: '1.7'
            }}>
              ข้อมูลความหนาแน่นอนุภาคและระดับรังสีของดวงอาทิตย์ได้รับการสนับสนุนแบบสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#334155' : '#94A3B8' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#7C3AED' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> เผยแพร่ข้อมูล Real-time Solar Charged Particles API
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#7C3AED' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>NASA ACE Project Office:</strong> ควบคุมและดูแลภารกิจยานอวกาศ ACE
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#7C3AED' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>JHU / APL:</strong> สถาบันวิจัยฟิสิกส์ประยุกต์ มหาวิทยาลัยจอห์นสฮอปกินส์ ผู้ประมวลผลข้อมูล EPAM
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
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#7C3AED' : '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}