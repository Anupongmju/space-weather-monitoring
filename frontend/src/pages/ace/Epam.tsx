import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveEpam, loadEpam } from '../../services/aceService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'

export default function Epam() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState(360)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef(null)

  const load = async () => { const d = await loadEpam(limit); setData(d); setLoading(false) }
  
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveEpam()
    } catch(e) {}
    await load()
    setFetching(false)
  }

  useEffect(() => {
    load()
  }, [limit])

  useAutoFetch(async () => {
    await load()
  }, 60000, [limit])

  const latest = data[data.length - 1]

  // Time calculations for keeping latest data centered with space on the right
  const times = data.map(d => new Date(d.time_tag).getTime()).filter(t => !isNaN(t))
  const minT = times.length ? Math.min(...times) : undefined
  const maxT = times.length ? Math.max(...times) : undefined
  const diff = (minT !== undefined && maxT !== undefined) ? maxT - minT : 0
  const visibleMax = (maxT !== undefined && diff > 0) ? maxT + diff * 0.5 : undefined

  // Multi-grid ECharts option configuration
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(168,85,247,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: '#C084FC', type: 'dashed', width: 1.5 } }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 40, left: 65, right: 20, height: 160 },    // Grid 0: Electron Flux
      { top: 250, left: 65, right: 20, height: 160 }    // Grid 1: Proton Flux
    ],
    xAxis: [
      {
        gridIndex: 0,
        type: 'time',
        min: minT,
        max: visibleMax,
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'time',
        min: minT,
        max: visibleMax,
        axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'log',
        name: 'Electrons',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#C084FC', fontSize: 11, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'log',
        name: 'Protons',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        filterMode: 'none'
      }
    ],
    series: [
      { name: '38-53 keV', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, itemStyle: { color: '#FB923C' }, lineStyle: { width: 2 }, data: data.map(d => [d.time_tag, d.e38_53]) },
      { name: '175-315 keV', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, itemStyle: { color: '#FBBF24' }, lineStyle: { width: 2 }, data: data.map(d => [d.time_tag, d.e175_315]) },
      { name: '47-65 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, itemStyle: { color: '#38BDF8' }, lineStyle: { width: 2 }, data: data.map(d => [d.time_tag, d.p47_65]) },
      { name: '112-187 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, itemStyle: { color: '#34D399' }, lineStyle: { width: 2 }, data: data.map(d => [d.time_tag, d.p112_187]) },
      { name: '310-580 keV', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, itemStyle: { color: '#C084FC' }, lineStyle: { width: 2 }, data: data.map(d => [d.time_tag, d.p310_580]) }
    ]
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>
      
      {/* Seamless Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 26, fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: -0.5 }}>
            ACE / EPAM
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Electron Proton Alpha Monitor — Energetic Particles · L1 Orbit
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[360, 1440, 4320, 10080].map(v => (
              <button
                key={v}
                onClick={() => setLimit(v)}
                style={{
                  padding: '4px 10px', background: 'transparent', border: 'none',
                  borderBottom: limit === v ? '2px solid #C084FC' : '2px solid transparent',
                  color: limit === v ? '#F8FAFC' : '#94A3B8',
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: limit === v ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                {v === 360 ? '6H' : v === 1440 ? '1D' : v === 4320 ? '3D' : '7D'}
              </button>
            ))}
          </div>
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: '#C084FC', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Transparent Telemetry Metrics Strip */}
      {latest && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, marginBottom: 24, padding: '0 8px', background: 'transparent', border: 'none'
        }}>
          {[
            { label: 'e- 38-53 keV',   value: latest.e38_53?.toExponential(2),   color: '#FB923C' },
            { label: 'e- 175-315 keV', value: latest.e175_315?.toExponential(2), color: '#FBBF24' },
            { label: 'p⁺ 47-65 keV',   value: latest.p47_65?.toExponential(2),   color: '#38BDF8' },
            { label: 'p⁺ 112-187 keV', value: latest.p112_187?.toExponential(2), color: '#34D399' },
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
                </div>
              </div>
              {idx < 3 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      )}

      {/* Combined Multi-Grid Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card title="EPAM CHARGED PARTICLES FLUX (REAL-TIME)" style={{ marginBottom: 16 }}>
          <ReactECharts ref={chartRef} option={option} style={{ height: 450, width: '100%' }} notMerge={true} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#C084FC"
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
              การใช้งานและการตรวจวัดของ EPAM
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>EPAM</strong> (Electron Proton and Alpha Monitor) ตรวจวัดปริมาณอนุภาคพลังงานสูง (Energetic Particles) เช่น อิเล็กตรอนและไอออน (รวมถึงโปรตอนและแอลฟา) ที่เคลื่อนที่ด้วยความเร็วสูงกว่าปกติอย่างมาก โดยเฝ้าระวังเป็น 2 ส่วนหลัก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Energetic Electrons (อิเล็กตรอนพลังงานสูง):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>วัดฟลักซ์อิเล็กตรอนความเร็วใกล้เคียงความเร็วแสง ที่ถูกปลดปล่อยมาถึงโลกอย่างรวดเร็วหลัง Solar Flare</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Energetic Protons & Alpha Particles (ไอออนพลังงานสูง):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ตรวจวัดอนุภาคมีมวลสูง (โปรตอนและแอลฟา) ที่เคลื่อนที่ด้วยพลังงานจลน์สูงมาก</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ภัยคุกคามจากพายุรังสีสุริยะ (Solar Radiation Storm Impacts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              EPAM ตรวจวัดอนุภาคพลังงานสูงเป็นพิเศษ ซึ่งเกิดขึ้นจากเหตุการณ์รุนแรงบนดวงอาทิตย์ ข้อมูล EPAM จึงเป็นดัชนีชี้วัดพายุรังสีสุริยะ (Solar Radiation Storms) โดยตรง:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>ความเสียหายต่อดาวเทียม</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  อนุภาคพลังงานสูงทะลุตัวเกราะดาวเทียม เข้าไปสะสมประจุและเกิดความเสียหายถาวรแก่ระบบวงจรอิเล็กทรอนิกส์
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>อันตรายต่อการบินและนักบินอวกาศ</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  เพิ่มระดับรังสีสะสมเป็นอันตรายต่อนักบินอวกาศ และเครื่องบินพาณิชย์ที่บินผ่านขั้วโลก (Polar Routes)
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของอุปกรณ์ EPAM
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ACE (Advanced Composition Explorer) — NASA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>L1 Lagrangian Point (~1.5 ล้านกิโลเมตรจากโลก)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>เซนเซอร์รับสัญญาณ</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Solid-state detector telescopes 5 ชุด ปรับมุม 3D</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ย่านพลังงานที่ตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>e- 38–350 keV / Ions 47 keV–4.8 MeV</td>
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
              ข้อมูลความหนาแน่นอนุภาคและระดับรังสีของดวงอาทิตย์ได้รับการสนับสนุนแบบสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> เผยแพร่ข้อมูล Real-time Solar Charged Particles API
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NASA ACE Project Office:</strong> ควบคุมและดูแลภารกิจยานอวกาศ ACE
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>JHU / APL:</strong> สถาบันวิจัยฟิสิกส์ประยุกต์ มหาวิทยาลัยจอห์นสฮอปกินส์ ผู้ประมวลผลข้อมูล EPAM
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