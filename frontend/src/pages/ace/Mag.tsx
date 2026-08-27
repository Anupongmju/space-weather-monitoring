import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveMag, loadMag } from '../../services/aceService'
import { loadSolar1Mag } from '../../services/radiationService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'

export default function Mag() {
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
        loadMag(limit, sDate, eDate),
        loadSolar1Mag(limit, sDate, eDate)
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
      await fetchAndSaveMag()
    } catch (e) { }
    await load(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadMag(0, start, end),
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

  const latest = data[data.length - 1]
  const latestS1 = solar1Data[solar1Data.length - 1]
  const bzStatus = !latest ? 'offline' : latest.bz < -10 ? 'danger' : latest.bz < 0 ? 'warning' : 'normal'

  // Build series based on selected satSource
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
        itemStyle: { color: '#A855F7' },
        lineStyle: { width: 1.5, opacity: 0.9 },
        data: data.map(d => [d.time_tag, d.bt])
      },
      {
        name: 'ACE Bz',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: '#EF4444' },
        lineStyle: { width: 1.5, opacity: 0.9 },
        data: data.map(d => [d.time_tag, d.bz])
      },
      {
        name: 'ACE Bx',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: '#38BDF8' },
        lineStyle: { width: 1.5, opacity: 0.9 },
        data: data.map(d => [d.time_tag, d.bx])
      },
      {
        name: 'ACE By',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: '#FBBF24' },
        lineStyle: { width: 1.5, opacity: 0.9 },
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
        itemStyle: { color: '#EC4899' },
        lineStyle: { width: 1.5, opacity: 0.85 },
        data: solar1Data.map(d => [d.time_tag, d.bt])
      },
      {
        name: 'SOLAR-1 Bz',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: '#F59E0B' },
        lineStyle: { width: 1.5, opacity: 0.85 },
        data: solar1Data.map(d => [d.time_tag, d.bz_gse != null ? d.bz_gse : d.bz])
      },
      {
        name: 'SOLAR-1 Bx',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: '#06B6D4' },
        lineStyle: { width: 1.5, opacity: 0.85 },
        data: solar1Data.map(d => [d.time_tag, d.bx_gse != null ? d.bx_gse : d.bx])
      },
      {
        name: 'SOLAR-1 By',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: 0.15,
        showSymbol: false,
        itemStyle: { color: '#10B981' },
        lineStyle: { width: 1.5, opacity: 0.85 },
        data: solar1Data.map(d => [d.time_tag, d.by_gse != null ? d.by_gse : d.by])
      }
    )
  }

  // Multi-grid ECharts option configuration
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(56,189,248,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: '#38BDF8', type: 'dashed', width: 1.5 } }
    },
    legend: {
      show: true,
      textStyle: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
      top: 0
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 40, left: 65, right: 20, height: 160 },    // Grid 0: Bt / Bz
      { top: 250, left: 65, right: 20, height: 160 }    // Grid 1: Bx / By
    ],
    xAxis: [
      {
        gridIndex: 0,
        type: 'time',
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'time',
        axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'value',
        name: 'Bt / Bz (nT)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'value',
        name: 'Bx / By (nT)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#FB923C', fontSize: 11, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>

      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 26, fontWeight: 700, color: '#38BDF8', margin: 0, letterSpacing: -0.5 }}>
            INTERPLANETARY MAGNETOMETER (MAG)
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Magnetometer Vector Comparison · ACE &amp; SOLAR-1 / SWFO-L1 Observatories (L1 Orbit)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={bzStatus} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: '#38BDF8', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Toolbar: Source Toggle + Date Range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {/* Source Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>SATELLITE SOURCE:</span>
          {(['ACE', 'SOLAR1', 'BOTH'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSatSource(s)}
              style={{
                background: satSource === s ? '#38BDF8' : 'rgba(255,255,255,0.05)',
                color: satSource === s ? '#FFF' : '#94A3B8',
                border: '1px solid ' + (satSource === s ? '#38BDF8' : 'rgba(255,255,255,0.1)'),
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {s === 'SOLAR1' ? 'SOLAR-1 (SWFO-L1)' : s === 'BOTH' ? 'BOTH (ACE + SOLAR-1)' : 'ACE'}
            </button>
          ))}
        </div>

        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor="#38BDF8"
          loading={loading}
        />
      </div>

      {/* Telemetry Metrics Strip */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, marginBottom: 24, padding: '0 8px', background: 'transparent', border: 'none'
      }}>
        {[
          { label: 'ACE BZ FIELD', value: latest?.bz?.toFixed(2), color: latest?.bz < 0 ? '#F87171' : '#38BDF8' },
          { label: 'SOLAR-1 BZ FIELD', value: (latestS1?.bz_gse != null ? latestS1.bz_gse : latestS1?.bz)?.toFixed(2), color: (latestS1?.bz_gse != null ? latestS1.bz_gse : latestS1?.bz) < 0 ? '#F87171' : '#F59E0B' },
          { label: 'ACE BT TOTAL', value: latest?.bt?.toFixed(2), color: '#C084FC' },
          { label: 'SOLAR-1 BT TOTAL', value: latestS1?.bt?.toFixed(2), color: '#EC4899' },
        ].map((s, idx) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: s.color }}>
                  {s.value ?? '—'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                  nT
                </span>
              </div>
            </div>
            {idx < 3 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
          </div>
        ))}
      </div>

      {/* Unified Multi-Grid Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="ACE MAGNETIC FIELD (L1 ORBIT)"
          style={{ marginBottom: 16 }}
          extra={panLoading ? (
            <span style={{ fontSize: 11, color: '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          ) : null}
        >
          <ReactECharts option={option} notMerge={true} style={{ height: 450, width: '100%' }} onChartReady={onChartReady} onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#38BDF8"
        tabs={[
          { id: 'usage', label: 'Usage (การใช้งาน)' },
          { id: 'impacts', label: 'Impacts (ผลกระทบ)' },
          { id: 'details', label: 'Details (ข้อมูลอุปกรณ์)' },
          { id: 'credits', label: 'Data Source & Credits (แหล่งข้อมูล)' }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              การวัดค่าองค์ประกอบสนามแม่เหล็ก (IMF Components)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>MAG (Magnetometer)</strong> จะรายงานค่าความเข้มและทิศทางของสนามแม่เหล็กระหว่างดาวเคราะห์ (IMF) ในระบบพิกัดคาร์ทีเซียนแบบ 3 มิติ (GSM Coordinates) เพื่อบอกทิศทางของเส้นแรงแม่เหล็กที่พุ่งผ่านตัวยานอวกาศ ดังนี้:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Bt (Total Magnitude):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความเข้มของสนามแม่เหล็กทั้งหมดในเวลานั้น (nT) ยิ่งมีค่าสูง แสดงว่าสนามแม่เหล็กมีความปั่นป่วนสูง</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Bx:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>แกนที่ชี้จากโลกตรงไปยังดวงอาทิตย์ บอกว่าทิศทางเส้นแม่เหล็กพุ่งเข้าหรือออกจากดวงอาทิตย์</span>
              </div>
              <div style={{ borderLeft: '2px solid #4ADE80', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>By:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>แกนที่ขนานกับระนาบวงโคจรของโลก (ชี้ตรงข้ามกับการเคลื่อนที่ของโลก)</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Bz:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>แกนแนวตั้งตั้งฉากกับระนาบวงโคจรโลก เป็นดัชนีสำคัญที่สุดในการเฝ้าระวังพายุสุริยะ</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ทิศทางของแกน Bz และผลกระทบต่อโลก (Bz Alignment & Impacts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              ทิศทางของสนามแม่เหล็กแกน Bz เป็นตัวแปรที่ชี้วัดว่า พลังงานจากพายุสุริยะจะสามารถเข้าสู่ชั้นบรรยากาศโลกได้หรือไม่:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Bz เป็นบวก (+ / ชี้ขึ้นเหนือ)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  สนามแม่เหล็ก IMF ชี้ไปทางเดียวกับสนามแม่เหล็กโลก เกิดแรงผลักสะท้อนอนุภาคออกไป โลกปลอดภัยจากการรบกวนของพายุสุริยะ
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Bz เป็นลบ (- / ชี้ลงใต้)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  สนามแม่เหล็ก IMF ชี้ทิศตรงข้ามโลก ทำให้เกิด Magnetic Reconnection ถ่ายโอนพลังงานเข้าสู่บรรยากาศ กระตุ้นพายุแม่เหล็กโลกและออโรร่ารุนแรง
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของอุปกรณ์ MAG
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ACE (Advanced Composition Explorer) — NASA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>L1 Lagrangian Point (ห่างจากโลกประมาณ 1.5 ล้านกิโลเมตร)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ประเภทของเซนเซอร์</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Dual Triaxial Fluxgate Magnetometers บนบูมแยก 2 ด้าน</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ย่านการตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>±4 nT ถึง ±65,536 nT (ความแม่นยำสูงถึง 0.004 nT)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              แหล่งที่มาของข้อมูล & เครดิต (Data Source & Credits)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 14px 0', lineHeight: '1.7' }}>
              ข้อมูลแม่เหล็กไฟฟ้าและการวิเคราะห์ค่าองค์ประกอบ IMF ทั้งหมดได้รับการสนับสนุนแบบสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> เผยแพร่ข้อมูล Real-time Magnetic Field API
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NASA ACE Project Office:</strong> ควบคุมและดูแลรักษายานอวกาศเซนเซอร์แมกนีโตมิเตอร์
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Bartol Research Institute:</strong> สถาบันวิจัยมหาวิทยาลัยเดลาแวร์ ผู้ร่วมพัฒนาอุปกรณ์ MAG
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 0,
              fontSize: 12,
              color: '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
