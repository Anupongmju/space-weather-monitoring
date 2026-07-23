import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveGoesWind, loadGoesWind } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'

export default function SolarWind(){
  const [data,setData] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [fetching,setFetching] = useState(false)
  const [limit, setLimit] = useState(360)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef(null)

  const load = async () => {
    const d = await loadGoesWind(limit);setData(d);setLoading(false)
  }
  
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveGoesWind()
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
      borderColor: 'rgba(245,158,11,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: '#F59E0B', type: 'dashed', width: 1.5 } }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 35, left: 65, right: 20, height: 120 },    // Grid 0: Density
      { top: 190, left: 65, right: 20, height: 120 },   // Grid 1: Speed
      { top: 345, left: 65, right: 20, height: 120 }    // Grid 2: Temperature
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
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
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
        type: 'value',
        name: 'Density (p/cc)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#FBBF24', fontSize: 10, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'value',
        name: 'Speed (km/s)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#FB923C', fontSize: 10, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 2,
        type: 'log',
        name: 'Temp (K)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: '#38BDF8', fontSize: 10, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1, 2],
        filterMode: 'none'
      }
    ],
    series: [
      {
        name: 'Density',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false,
        itemStyle: { color: '#FBBF24' },
        lineStyle: { width: 2 },
        data: data.map(d => [d.time_tag, d.density])
      },
      {
        name: 'Speed',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        showSymbol: false,
        itemStyle: { color: '#FB923C' },
        lineStyle: { width: 2 },
        data: data.map(d => [d.time_tag, d.speed])
      },
      {
        name: 'Temperature',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        showSymbol: false,
        itemStyle: { color: '#38BDF8' },
        lineStyle: { width: 2 },
        data: data.map(d => [d.time_tag, d.temperature])
      }
    ]
  }

  return(
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>
      
      {/* Seamless Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 26, fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: -0.5 }}>
            GOES / SOLAR WIND
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Solar Wind Plasma — Density, Speed, Temperature · GEO Orbit
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
            { label: 'PROTON DENSITY', value: latest.density?.toFixed(1), unit: 'p/cc', color: '#FBBF24' },
            { label: 'SOLAR WIND SPEED', value: latest.speed?.toFixed(0), unit: 'km/s', color: '#FB923C' },
            { label: 'PLASMA TEMP', value: latest.temperature ? (latest.temperature/1000).toFixed(0)+'k' : '—', unit: 'K', color: '#38BDF8' },
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
                    {s.unit}
                  </span>
                </div>
              </div>
              {idx < 2 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      )}

      {/* Combined Multi-Grid Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card title="GOES SOLAR WIND PLASMA METRICS (REAL-TIME)" style={{ marginBottom: 16 }}>
          <ReactECharts ref={chartRef} option={option} style={{ height: 500, width: '100%' }} notMerge={true} />
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
              องค์ประกอบและการวัดค่าของลมสุริยะ (Solar Wind Plasma)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Solar Wind</strong> (ลมสุริยะ) คือ ลำของอนุภาคพลาสม่ามีประจุพลังงานสูงที่ไหลออกจากชั้นบรรยากาศดวงอาทิตย์:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #F59E0B', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Density (ความหนาแน่นพลาสม่า):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความหนาแน่นโปรตอน (p/cc) บ่งบอกมวลอนุภาคที่กำลังเข้าปะทะโลก</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Speed (ความเร็วลมสุริยะ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความเร็วเฉลี่ย (km/s) ปกติ 300-500 km/s หากเกิด CME อาจพุ่งเกิน 1,000 km/s</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Temperature (อุณหภูมิ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ระดับพลังงานจลน์ความร้อนของไอออน (K) บ่งบอกความสั่นสะเทือนพลังงาน</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ผลกระทบของลมสุริยะความเร็วสูง (Space Weather Impacts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              การปะทะของลมสุริยะความเร็วสูง (High-Speed Streams) ส่งผลต่ออวกาศรอบโลก:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>การบีบอัดสนามแม่เหล็กโลก</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ความเร็วและความหนาแน่นสูงถ่ายโอนพลังงานจลน์ บีบเกราะแม่เหล็กโลก ก่อพายุแม่เหล็กโลก (Geomagnetic Storm)
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>ขัดข้องดาวเทียม & GPS</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ประจุไฟฟ้าสะสมผิวนอกดาวเทียมและไอโอโนสเฟียร์ถูกรบกวน ส่งผลให้สัญญาณ GPS และสื่อสารเบี่ยงเบน
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>การเกิดแสงออโรรา (Aurora)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  อนุภาคพลังงานสูงเล็ดลอดตามแนวขั้วโลก ปะทะแก๊สในบรรยากาศชั้นบนเกิดแสงออโรราสว่างไสว
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของระบบวิเคราะห์ลมสุริยะ
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>แหล่งข้อมูลดาวเทียมหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>DSCOVR (Deep Space Climate Observatory) — NOAA / NASA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งการวัดค่า</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>จุดลากรานจ์ L1 (ห่างจากโลก 1.5 ล้าน กม. ทางดวงอาทิตย์)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>พารามิเตอร์วัดหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Density (p/cc), Speed (km/s), Temperature (K)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ความครอบคลุมย้อนหลัง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>7 วันล่าสุดแบบเรียลไทม์ละเอียดสูง</td>
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
              ข้อมูลและภาพกราฟทั้งหมดได้รับการสนับสนุนสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์เฝ้าระวังสภาพอากาศอวกาศ NOAA
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>DSCOVR & ACE Missions (NASA / NOAA):</strong> ดาวเทียมตรวจลมสุริยะจุด L1
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
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC Plasma Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}