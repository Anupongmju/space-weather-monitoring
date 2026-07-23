import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchMawToday, loadMawData } from '../../services/mawService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'

export default function MawPressure() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit]       = useState(360)
  const [activeTab, setActiveTab] = useState('usage')

  const load = async () => { setLoading(true); const d = await loadMawData(limit); setData(d); setLoading(false) }
  
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchMawToday()
    } catch(e) {}
    await load()
    setFetching(false)
  }

  useEffect(() => { load() }, [limit])

  const avg = data.length ? (data.reduce((s, d) => s + (d.pressure || 0), 0) / data.length) : null
  const latest = data[data.length - 1]

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(245,158,11,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      formatter: (params: any) => {
        return `<div style="color: #FBBF24; font-weight:700; margin-bottom: 6px">${params[0].axisValueLabel}</div>` +
               `<div style="color: #F59E0B">Pressure: ${params[0].value[1]?.toFixed(1)} mbar</div>`;
      }
    },
    grid: { top: 30, right: 20, bottom: 30, left: 65 },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' }],
    xAxis: {
      type: 'time',
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    series: [
      {
        name: 'Pressure',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 2.2 },
        itemStyle: { color: '#F59E0B' },
        data: data.map(d => [d.time_tag, d.pressure]),
        markLine: avg ? {
          data: [{ yAxis: avg, name: 'avg' }],
          lineStyle: { color: '#F59E0B', type: 'dashed', opacity: 0.7, width: 1.5 },
          label: { formatter: 'Avg', position: 'end', color: '#F59E0B', fontSize: 10, fontFamily: 'var(--font-mono)' }
        } : undefined
      }
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
            MAW / ATMOSPHERIC PRESSURE
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Mawson Antarctic Station Pressure · Barometric Correction Standard
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
                  borderBottom: limit === v ? '2px solid #F59E0B' : '2px solid transparent',
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
              color: '#F59E0B', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
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
            { label: 'CURRENT PRESSURE', value: latest.pressure?.toFixed(1), color: '#F59E0B' },
            { label: 'AVERAGE',  value: avg?.toFixed(1), color: '#FB923C' },
            { label: 'MAX PRESSURE', value: data.length ? Math.max(...data.map(d => d.pressure || 0)).toFixed(1) : '—', color: '#F87171' },
            { label: 'MIN PRESSURE', value: data.length ? Math.min(...data.filter(d => d.pressure > 0).map(d => d.pressure)).toFixed(1) : '—', color: '#34D399' },
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
                    mbar
                  </span>
                </div>
              </div>
              {idx < 3 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card title="ATMOSPHERIC PRESSURE — MAWSON STATION" subtitle="Higher pressure = lower cosmic ray count (inverse relation)">
          {avg && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
              Daily average: <span style={{ color: '#F59E0B' }}>{avg.toFixed(1)} mbar</span>
            </div>
          )}
          <ReactECharts option={option} style={{ height: 260, width: '100%' }} notMerge={true} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#F59E0B"
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
              ความสัมพันธ์ของความกดอากาศกับการปรับแก้ค่ารังสีคอสมิก
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Atmospheric Pressure</strong> ณ สถานี Mawson (MAW) แอนตาร์กติกา ใช้คำนวณปรับแก้รังสีคอสมิกผ่านผลกระทบบารอมิเตอร์ (Barometric Effect):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #F59E0B', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>เมื่อความกดอากาศสูง (อากาศหนาแน่น):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>บรรยากาศช่วยดูดซับรังสีคอสมิก ทำให้นิโอตรอนตกลงมาถึงพื้นดินน้อยลง</span>
              </div>
              <div style={{ borderLeft: '2px solid #34D399', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>เมื่อความกดอากาศต่ำ (อากาศบาง):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>บรรยากาศบางลง อนุภาคนิวตรอนทะลวงลงมาชนเครื่องวัดพื้นโลกง่ายขึ้น</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ผลกระทบและการกำจัดสัญญาณรบกวนสภาพอากาศ (Barometric Correction)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              ความกดอากาศมีความจำเป็นต่อการขจัดสัญญาณรบกวน:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>สัญญาณรบกวนจากพายุฝน</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ข้อมูลดิบจะเปลี่ยนตามพายุฝนสภาพภูมิอากาศ ทำให้ค่าพุ่งสูงหลอกตา ไม่สะท้อนพลังงานจริงจากอวกาศ
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>ข้อมูลรังสีคอสมิกที่บริสุทธิ์</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  สูตรคำนวณหักล้างเบี่ยงเบนออก เพื่อให้ได้ค่ารังสีคอสมิกที่สะท้อนสถานการณ์ดวงอาทิตย์อย่างแท้จริง
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของระบบชดเชยค่าความกดอากาศ
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>สถานีวัดความกดอากาศ</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Mawson Station (MAW) — ทวีปแอนตาร์กติกา (ขั้วโลกใต้)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งทางภูมิศาสตร์</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ละติจูด 67.6° S, ลองจิจูด 62.9° E</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>เครื่องมือปรับแก้หลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>บารอมิเตอร์ความแม่นยำสูง เชื่อม Mawson Cosmic Ray Monitor (18-NM-64)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>หน่วยวัดความกดอากาศ</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>mbar (Millibar - มิลลิบาร์)</td>
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
              ข้อมูลสนับสนุนโดยกลุ่มความร่วมมือด้านฟิสิกส์ขั้วโลก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Australian Antarctic Division (AAD):</strong> ผู้ดูแลรักษาสถานี Mawson และเครื่องตรวจวัด
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NMDB Database Network:</strong> เครือข่ายรวบรวมข้อมูลสถานีความกดอากาศและนิวตรอน
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
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://www.nmdb.eu/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NMDB Nest services</a>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
