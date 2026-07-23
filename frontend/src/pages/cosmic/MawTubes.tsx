import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchMawToday, loadMawData } from '../../services/mawService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'

const STD_COLORS  = ['#3498DB','#F59E0B','#EF4444','#A855F7','#3B82F6','#22C55E','#06B6D4','#EC4899','#FF6B6B','#4ECDC4','#3498DB','#F59E0B','#EF4444','#A855F7','#3B82F6','#22C55E','#06B6D4','#EC4899']
const BARE_COLORS = ['#3498DB','#3B82F6','#22C55E','#A855F7','#F59E0B','#EF4444']

const STD_TUBES  = Array.from({ length: 18 }, (_, i) => ({ key: `tube_${i+1}`,  label: `T${i+1}`,  color: STD_COLORS[i] }))
const BARE_TUBES = Array.from({ length: 6 },  (_, i) => ({ key: `bare_${i+1}`,  label: `B${i+1}`,  color: BARE_COLORS[i] }))

export default function MawTubes() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit]       = useState(360)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef(null)

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

  const dropouts = STD_TUBES.filter(t => {
    const zeros = data.filter(d => (d[t.key] || 0) === 0).length
    return data.length > 0 && zeros / data.length > 0.5
  }).map(t => t.label)

  // Time calculations for keeping latest data centered with space on the right
  const times = data.map(d => new Date(d.time_tag).getTime()).filter(t => !isNaN(t))
  const minT = times.length ? Math.min(...times) : undefined
  const maxT = times.length ? Math.max(...times) : undefined
  const diff = (minT !== undefined && maxT !== undefined) ? maxT - minT : 0
  const visibleMax = (maxT !== undefined && diff > 0) ? maxT + diff * 0.5 : undefined

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(59,130,246,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: '#38BDF8', type: 'dashed', width: 1.5 } }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 40, left: 65, right: 20, height: 160 },    // Grid 0: Standard Tubes
      { top: 250, left: 65, right: 20, height: 160 }    // Grid 1: Bare Tubes
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
        type: 'value',
        scale: true,
        name: 'Standard (cts)',
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
        scale: true,
        name: 'Bare (cts)',
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
        filterMode: 'none'
      }
    ],
    series: [
      ...STD_TUBES.map(t => ({
        name: t.label,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false,
        lineStyle: { width: 1.5 },
        itemStyle: { color: t.color },
        data: data.map(d => [d.time_tag, d[t.key]])
      })),
      ...BARE_TUBES.map(t => ({
        name: t.label,
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 1.5 },
        itemStyle: { color: t.color },
        data: data.map(d => [d.time_tag, d[t.key]])
      }))
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
            MAW / INDIVIDUAL DETECTOR TUBES
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            18 Standard Shielded + 6 Bare Unshielded Tubes · Hardware QC Monitor
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
                  borderBottom: limit === v ? '2px solid #38BDF8' : '2px solid transparent',
                  color: limit === v ? '#F8FAFC' : '#94A3B8',
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: limit === v ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                {v === 360 ? '6H' : v === 1440 ? '1D' : v === 4320 ? '3D' : '7D'}
              </button>
            ))}
          </div>
          <StatusBadge status={dropouts.length ? 'warning' : data.length ? 'normal' : 'offline'} label={dropouts.length ? `${dropouts.length} dropout` : 'Normal'} />
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

      {dropouts.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FBBF24' }}>
          ⚠ Possible dropout detected: {dropouts.join(', ')}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card title="INDIVIDUAL DETECTOR TUBES MONITORING" subtitle="T1-T18 (Standard shielded) & B1-B6 (Bare unshielded)">
          {/* Legend indicators */}
          <div style={{ display: 'flex', gap: '8px 12px', marginBottom: 16, flexWrap: 'wrap', fontSize: 9, fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
            <span style={{ color: '#888', marginRight: 4, fontWeight: 'bold' }}>STD:</span>
            {STD_TUBES.map(t => (
              <span key={t.key} style={{ color: t.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, display: 'inline-block' }} />{t.label}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px 12px', marginBottom: 16, flexWrap: 'wrap', fontSize: 9, fontFamily: 'var(--font-mono)', paddingBottom: 4 }}>
            <span style={{ color: '#888', marginRight: 4, fontWeight: 'bold' }}>BARE:</span>
            {BARE_TUBES.map(t => (
              <span key={t.key} style={{ color: t.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, display: 'inline-block' }} />{t.label}
              </span>
            ))}
          </div>
          <ReactECharts ref={chartRef} option={option} style={{ height: 450, width: '100%' }} notMerge={true} />
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
              การตรวจสอบท่อรับสัญญาณและโครงสร้างอุปกรณ์ตรวจวัด
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Individual Tubes</strong> ตรวจสอบสถานะสัญญาณรายหลอดแก๊สรับนิวตรอน Mawson (MAW) สำหรับประกันคุณภาพฮาร์ดแวร์:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Standard Tubes (T1 - T18):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ท่อมาตรฐานมีเกราะตะกั่วล้อมรอบ 18 ท่อ ผลรวมการนับเท่ากับ NM Uncorrected</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Bare Tubes (B1 - B6):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ท่อชนิดไร้เกราะตะกั่ว 6 ท่อ ผลรวมการนับเท่ากับ Bare Uncorrected</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ระบบควบคุมคุณภาพฮาร์ดแวร์และการตรวจจับจุดขัดข้อง (Hardware QC)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              ประโยชน์การวิเคราะห์กราฟและสถานะรายท่อเพื่อความถูกต้องของข้อมูล:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Dropout Detection (สัญญาณหาย)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  หากหลอดแก๊สเสียหายหรือรั่ว ค่าจะตกดิ่งเป็น 0 ระบบจะแจ้งเตือนระบุพิกัดท่อขัดข้องทันที
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>การรักษาความคงที่ความน่าเชื่อถือ</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  การเปรียบเทียบอัตราการรันของข้อมูลแต่ละท่อที่เต้นใกล้เคียงกัน ยืนยันความแม่นยำทางวิทยาศาสตร์
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดข้อมูลโครงสร้างทางเทคนิคของอุปกรณ์รับ
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>สถานีติดตั้งฮาร์ดแวร์</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Mawson Station (MAW) — ทวีปแอนตาร์กติกา (ขั้วโลกใต้)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>จำนวนท่อตรวจวัดรวม</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>18 ท่อมีเกราะ (T1-T18) และ 6 ท่อไร้เกราะ (B1-B6)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>แก๊สภายในท่อตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Helium-3 (He-3) หรือ Boron Trifluoride (BF3)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>หน่วยตรวจวัดย่อย</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>counts (จำนวนครั้งปฏิกิริยานิวเคลียร์ย่อยในหลอด)</td>
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
              การดูแลรักษาโครงสร้างอุปกรณ์วิทยาศาสตร์ได้รับการสนับสนุนสากล:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Australian Antarctic Division (AAD):</strong> ผู้ดูแลบำรุงรักษาฮาร์ดแวร์หลอดตรวจนิวตรอน
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NMDB Network:</strong> เครือข่ายการรวบรวมและวิเคราะห์สเปกตรัมข้อมูลนิวตรอน
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
              ข้อมูลอ้างอิง API: ดึงข้อมูลสถานะแต่ละท่อผ่าน <a href="https://www.nmdb.eu/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NMDB Nest services</a>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
