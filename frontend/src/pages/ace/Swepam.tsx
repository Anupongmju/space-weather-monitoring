import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveSwepam, loadSwepam, fetchArchiveSwepam } from '../../services/aceService'
import { loadSolar1Plasma } from '../../services/radiationService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { useTheme } from '../../context/ThemeContext'

export default function Swepam() {
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
      if (sDate && eDate) {
        const d = await fetchArchiveSwepam(sDate, eDate, 10000)
        setData(Array.isArray(d) ? d : [])
        setSolar1Data([])
      } else {
        const [dAce, dSolar1] = await Promise.all([
          loadSwepam(limit),
          loadSolar1Plasma(limit)
        ])
        setData(Array.isArray(dAce) ? dAce : [])
        setSolar1Data(Array.isArray(dSolar1) ? dSolar1 : [])
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

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadSwepam(0, start, end),
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

  // Multi-grid ECharts option configuration
  const option = {
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
      textStyle: { color: isLight ? '#0F172A' : '#E2E8F0', fontFamily: 'var(--font-mono)' }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 35, left: 85, right: 20, height: '26%' },    // Grid 0: Proton Density
      { top: '38%', left: 85, right: 20, height: '26%' },   // Grid 1: Bulk Speed
      { top: '69%', left: 85, right: 20, height: '26%' }    // Grid 2: Ion Temperature
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
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'monospace, sans-serif' },
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
            {/* Source Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              <span style={{ color: isLight ? '#475569' : '#94A3B8', fontWeight: 700 }}>SATELLITE:</span>
              {(['ACE', 'SOLAR1', 'BOTH'] as const).map(s => {
                const isActive = satSource === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSatSource(s)}
                    style={{
                      background: isActive
                        ? (isLight ? '#1A6DB5' : '#FB923C')
                        : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                      color: isActive ? '#FFFFFF' : (isLight ? '#334155' : '#94A3B8'),
                      border: '1px solid ' + (isActive
                        ? (isLight ? '#1A6DB5' : '#FB923C')
                        : (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)')),
                      fontSize: 13,
                      fontWeight: 700,
                      padding: '5px 14px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      boxShadow: isLight && !isActive ? '0 1px 4px rgba(0,0,0,0.03)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {s === 'SOLAR1' ? 'SOLAR-1 (SWFO-L1)' : s === 'BOTH' ? 'BOTH (ACE + SOLAR-1)' : 'ACE'}
                  </button>
                );
              })}
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
              extra={panLoading ? (
                <span style={{ fontSize: 13, color: '#3498DB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              ) : null}
            >
              <ReactECharts option={option} notMerge={true} style={{ height: 580, width: '100%' }} onChartReady={onChartReady} onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }} />
            </Card>
          )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#FB923C"
        tabs={[
          { id: 'usage', label: 'Usage (การใช้งาน)' },
          { id: 'impacts', label: 'Impacts (ผลกระทบ)' },
          { id: 'details', label: 'Details (ข้อมูลอุปกรณ์)' },
          { id: 'credits', label: 'Data Source & Credits (แหล่งข้อมูล)' }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              การใช้งานและการตรวจวัดของ SWEPAM
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>SWEPAM</strong> (Solar Wind Electrons Protons and Alpha Monitor) ตรวจวัดการไหลเข้าของอนุภาคมีประจุ (Plasma) ในลมสุริยะแบบ Real-time โดยเน้นเก็บข้อมูลความดัน อุณหภูมิ และความหนาแน่นของอนุภาคที่มีผลกับโลกโดยตรง
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Proton Density (ความหนาแน่นโปรตอน):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>แสดงปริมาณอนุภาคต่อลูกบาศก์เซนติเมตร (n/cc) ยิ่งหนาแน่นมาก ลมสุริยะยิ่งมีพลังทำลายหรือส่งผลต่อสนามแม่เหล็กโลกได้รุนแรงขึ้น</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Bulk Speed (ความเร็วลมสุริยะ):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความเร็วในการเดินทางของกระแสอนุภาค (km/s) โดยปกติลมสุริยะทั่วไปจะมีความเร็วประมาณ 300 - 500 km/s แต่หากมีพายุสุริยะ (CME) ความเร็วอาจสูงถึง 1,000 km/s ขึ้นไป</span>
              </div>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Ion Temperature (อุณหภูมิไอออน):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>การสั่นสะเทือนทางพลังงานความร้อนของไอออนในลมสุริยะ (หน่วย: Kelvin)</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ผลกระทบจากลมสุริยะ & พายุสุริยะ (Space Weather Impacts)
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              เมื่อค่าที่วัดได้จาก SWEPAM มีค่าสูงผิดปกติ (เช่น ความเร็วพุ่งเกิน 600 km/s หรือความหนาแน่นโปรตอนสูงมาก) อาจส่งผลกระทบต่อวิถีชีวิตและเทคโนโลยีบนโลก ดังนี้:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{ background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 6, border: isLight ? '1px solid rgba(26, 109, 181, 0.12)' : '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#EF4444', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>ดาวเทียม & ระบบสื่อสาร</h5>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  อนุภาคพลังงานสูงสามารถเจาะทะลุและทำลายวงจรอิเล็กทรอนิกส์ในดาวเทียม ทำให้สัญญาณนำทาง GPS ขัดข้อง หรือการสื่อสารวิทยุคลื่นสั้น (HF) เป็นอัมพาตชั่วคราว
                </p>
              </div>
              <div style={{ background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 6, border: isLight ? '1px solid rgba(26, 109, 181, 0.12)' : '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: isLight ? '#EA580C' : '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>ระบบโครงข่ายไฟฟ้าบนโลก</h5>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  พายุสุริยะรุนแรงสามารถกระตุ้นให้เกิดกระแสไฟฟ้าเหนี่ยวนำทางแม่เหล็กโลก (GIC) ในสายส่งไฟฟ้าแรงสูง ซึ่งอาจทำให้หม้อแปลงระเบิดและเกิดไฟดับเป็นวงกว้าง
                </p>
              </div>
              <div style={{ background: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 6, border: isLight ? '1px solid rgba(26, 109, 181, 0.12)' : '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: isLight ? '#059669' : '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>แสงเหนือ-แสงใต้ (Aurora)</h5>
                <p style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  ในมุมที่สวยงาม อนุภาคเหล่านี้จะเข้าปะทะกับชั้นบรรยากาศโลกแถบขั้วโลก ทำให้เกิดปรากฏการณ์แสงออโรร่าที่สว่างไสวและสวยงามในละติจูดสูง
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของอุปกรณ์ SWEPAM
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#475569' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%' }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>ACE (Advanced Composition Explorer) — NASA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>L1 Lagrangian Point (ห่างจากโลกประมาณ 1.5 ล้านกิโลเมตร)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>ผู้รับผิดชอบอุปกรณ์</td>
                  <td style={{ padding: '8px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Los Alamos National Laboratory (LANL) ประเทศสหรัฐอเมริกา</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>ย่านความหนาแน่นที่วัดได้</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>0.07 ถึง 150 protons/cc</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B' }}>ย่านความเร็วที่วัดได้</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>275 ถึง 1250 km/s</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{ color: isLight ? '#0C1E35' : '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              แหล่งที่มาของข้อมูล & เครดิต (Data Source & Credits)
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 14px 0', lineHeight: '1.7' }}>
              ข้อมูลและภาพกราฟทั้งหมดในหน้านี้ ได้รับการสนับสนุนแบบสาธารณะและอัปเดตแบบเรียลไทม์จากหน่วยงานวิทยาศาสตร์ระดับโลก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#475569' : '#94A3B8' }}>
              <div style={{ borderLeft: isLight ? '2px solid rgba(26, 109, 181, 0.3)' : '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์พยากรณ์สภาพอวกาศแห่งชาติของสหรัฐฯ ภายใต้หน่วยงาน <strong>NOAA</strong> ซึ่งเป็นผู้เผยแพร่ข้อมูล Real-time Solar Wind API
              </div>
              <div style={{ borderLeft: isLight ? '2px solid rgba(26, 109, 181, 0.3)' : '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>NASA ACE Project Science Office:</strong> โครงการดาวเทียมสำรวจอวกาศขั้นสูง (Advanced Composition Explorer) ขององค์การ <strong>NASA</strong>
              </div>
              <div style={{ borderLeft: isLight ? '2px solid rgba(26, 109, 181, 0.3)' : '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Los Alamos National Laboratory (LANL):</strong> สถาบันวิจัยวิศวกรรมและการวิจัยพลังงานผู้พัฒนาและประมวลผลข้อมูลดิบของเครื่องตรวจวัด SWEPAM
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
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#1A6DB5' : '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}