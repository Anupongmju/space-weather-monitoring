import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveSis, loadSis } from '../../services/aceService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'


export default function Sis() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState(360)
  const [activeTab, setActiveTab] = useState('usage')

  const load = async () => { const d = await loadSis(limit); setData(d); setLoading(false) }
  
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveSis()
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

  const times = data.map(d => new Date(d.time_tag).getTime()).filter(t => !isNaN(t));
  const minT = times.length ? Math.min(...times) : undefined;
  const maxT = times.length ? Math.max(...times) : undefined;
  const diff = (minT !== undefined && maxT !== undefined) ? maxT - minT : 0;
  const visibleMax = (maxT !== undefined && diff > 0) ? maxT + diff * 0.5 : undefined;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(52,211,153,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: '#34D399', type: 'dashed', width: 1.5 } }
    },
    grid: { top: 30, right: 20, bottom: 30, left: 65 },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' }],
    xAxis: { 
      type: 'time', 
      min: minT,
      max: visibleMax,
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } }, 
      axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    yAxis: {
      type: 'log',
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    series: [
      { name: '>10 MeV', type: 'line', showSymbol: false, itemStyle: { color: '#34D399' }, lineStyle: { width: 2.2 }, data: data.map(d => [d.time_tag, d.p10]) },
      { name: '>30 MeV', type: 'line', showSymbol: false, itemStyle: { color: '#FB923C' }, lineStyle: { width: 2.2 }, data: data.map(d => [d.time_tag, d.p30]) }
    ]
  };

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
            ACE / SIS
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Solar Isotope Spectrometer — High Energy Protons · L1 Orbit
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
                  borderBottom: limit === v ? '2px solid #34D399' : '2px solid transparent',
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
              color: '#34D399', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
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
            { label: '>10 MeV PROTONS', value: latest.p10?.toExponential(2), color: '#34D399' },
            { label: '>30 MeV PROTONS', value: latest.p30?.toExponential(2), color: '#FB923C' },
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
                    pfu
                  </span>
                </div>
              </div>
              {idx < 1 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card title="HIGH ENERGY PROTON FLUX — SIS">
          <ReactECharts option={option} style={{ height: 280, width: '100%' }} notMerge={true} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#34D399"
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
              การใช้งานและการตรวจวัดของ SIS
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>SIS</strong> (Solar Isotope Spectrometer) ตรวจวัดองค์ประกอบไอโซโทปและนิวเคลียสพลังงานสูง (10–100 MeV/nucleon):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #34D399', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;10 MeV Protons:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>โปรตอนระดับพลังงานสูงกว่า 10 MeV ทะลุกำบังเบาได้ ใช้เตือนภัยพายุรังสีเริ่มต้น</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;30 MeV Protons:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>โปรตอนพลังงานสูงกว่า 30 MeV ทะลุเกราะโลหะหนา เป็นอันตรายสูงต่อวงจรอวกาศ</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              การพยากรณ์ภัยคุกคามรังสีขั้นรุนแรง (Severe Radiation Hazards)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              พลังงานระดับสูงมากจาก SIS (Solar Particle Events & Galactic Cosmic Rays) มีผลกระทบต่อความปลอดภัยในอวกาศอย่างยิ่ง:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Single Event Upsets (SEU)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  รังสีเปลี่ยนบิตในหน่วยความจำคอมพิวเตอร์ดาวเทียม ทำให้ระบบลัดวงจรหรือล้มเหลวถาวร
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>อันตรายต่อมนุษย์อวกาศ</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ดัชนีเตือนภัยสูงสุดสำหรับนักบินอวกาศบน ISS และภารกิจห้วงอวกาศลึกเมื่อต้องเข้าห้องกำบัง
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของอุปกรณ์ SIS
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ACE (Advanced Composition Explorer) — NASA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>L1 Point (~1.5 ล้านกิโลเมตรจากโลก)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>โครงสร้างของเครื่องมือ</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Silicon detector telescopes 2 ชุด (Z = 2 ถึง 30)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ย่านพลังงานที่ตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>~10 ถึง 100 MeV/nucleon</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{ color: '#EAB308', margin: '0 0 12px 0', fontSize: 14, fontFamily: "'Orbitron', sans-serif" }}>
              แหล่งที่มาของข้อมูล & เครดิต (Data Source & Credits)
            </h4>
            <p style={{ color: '#A0A0B0', fontSize: 13, margin: '0 0 12px 0', textAlign: 'justify' }}>
              ข้อมูลดัชนีระดับรังสีคอสมิกและนิวเคลียสพลังงานสูงบนหน้าเว็บนี้ ได้รับการสนับสนุนข้อมูลและอัปเดตแบบเรียลไทม์จากหน่วยงานวิทยาศาสตร์ระดับโลก:
            </p>
            <ul style={{ color: '#A0A0B0', fontSize: 13, margin: 0, paddingLeft: 18, lineHeight: '1.8' }}>
              <li>
                <strong>Space Weather Prediction Center (SWPC):</strong> ศูนย์พยากรณ์สภาพอวกาศแห่งชาติของสหรัฐฯ ภายใต้หน่วยงาน <strong>NOAA</strong> (National Oceanic and Atmospheric Administration) ซึ่งเป็นผู้ให้บริการดึงข้อมูล API สำหรับความเข้มรังสีของดวงอาทิตย์
              </li>
              <li>
                <strong>NASA ACE Project Office:</strong> โครงการดาวเทียมสำรวจอวกาศขั้นสูง (Advanced Composition Explorer) ขององค์การ <strong>NASA</strong> ซึ่งดูแลรักษายานและเซนเซอร์ SIS
              </li>
              <li>
                <strong>California Institute of Technology (Caltech):</strong> สถาบันวิจัยชั้นนำของสหรัฐอเมริกา ที่เป็นผู้ร่วมพัฒนา คัดกรอง และประมวลผลข้อมูลฟลักซ์รังสีของอุปกรณ์ SIS
              </li>
            </ul>
            <div style={{ 
              marginTop: 16, 
              padding: '10px 14px', 
              background: 'rgba(234,179,8,0.05)', 
              border: '1px solid rgba(234,179,8,0.2)', 
              borderRadius: 6,
              fontSize: 12,
              color: '#EAB308'
            }}>
              <strong>ข้อมูลอ้างอิง API:</strong> ข้อมูลเรียลไทม์ของระบบถูกดึงผ่าน API ของ <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#FFF', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> โดยทำการอัปเดตข้อมูลทุก ๆ 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
