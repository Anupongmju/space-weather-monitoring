import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchMawToday, loadMawScatter } from '../../services/mawService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'

export default function MawScatter() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit]       = useState(360)
  const [activeTab, setActiveTab] = useState('usage')

  const load = async () => {
    setLoading(true)
    const d = await loadMawScatter(limit)
    const scatter = d
      .filter(r => r.pressure > 0 && r.nm_uncorrected > 0)
      .map(r => ({ x: r.pressure, y: r.nm_uncorrected, time: r.time_tag }))
    setData(scatter)
    setLoading(false)
  }

  
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchMawToday()
    } catch(e) {}
    await load()
    setFetching(false)
  }

  useEffect(() => { load() }, [limit])

  const regression = () => {
    if (data.length < 2) return null
    const n  = data.length
    const sx = data.reduce((s, d) => s + d.x, 0)
    const sy = data.reduce((s, d) => s + d.y, 0)
    const sxy = data.reduce((s, d) => s + d.x * d.y, 0)
    const sxx = data.reduce((s, d) => s + d.x * d.x, 0)
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    const intercept = (sy - slope * sx) / n
    return { slope, intercept }
  }

  const reg = regression()
  const xMin = data.length ? Math.min(...data.map(d => d.x)) : 0
  const xMax = data.length ? Math.max(...data.map(d => d.x)) : 0
  const regLine = reg ? [
    [xMin, reg.slope * xMin + reg.intercept],
    [xMax, reg.slope * xMax + reg.intercept],
  ] : []

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(168,85,247,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      formatter: (params: any) => {
        if (params.seriesType === 'scatter') {
          return `<div style="color: #94A3B8; margin-bottom: 4px; font-size: 10px">${params.data[2]}</div>
                  <div style="color: #FBBF24">Pressure: ${params.data[0].toFixed(1)} mbar</div>
                  <div style="color: #38BDF8">NM Uncorr: ${params.data[1].toFixed(1)}</div>`
        }
        return `Linear Regression`
      }
    },
    grid: { top: 30, right: 20, bottom: 45, left: 65 },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, yAxisIndex: 0 }],
    xAxis: {
      type: 'value',
      name: 'Pressure (mbar)',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: '#C084FC', fontSize: 11, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
      scale: true,
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    yAxis: {
      type: 'value',
      name: 'NM Uncorrected (counts)',
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
      scale: true,
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 5,
        itemStyle: { color: 'rgba(192,132,252,0.6)' },
        data: data.map(d => [d.x, d.y, d.time_tag])
      },
      {
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 2.2, color: '#FB923C' },
        data: regLine
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
            MAW / SCATTER CORRELATION
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Barometric Coefficient Analysis · Pressure vs Uncorrected Cosmic Counts
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
      {reg && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, marginBottom: 24, padding: '0 8px', background: 'transparent', border: 'none'
        }}>
          {[
            { label: 'REGRESSION SLOPE', value: reg.slope.toFixed(4), color: '#C084FC', unit: 'cts/mbar' },
            { label: 'Y INTERCEPT', value: reg.intercept.toFixed(1), color: '#38BDF8', unit: 'cts' },
            { label: 'DATA POINTS', value: data.length, color: '#34D399', unit: 'pts' },
            { label: 'CORRELATION', value: reg.slope < 0 ? 'INVERSE' : 'DIRECT', color: reg.slope < 0 ? '#34D399' : '#F87171', unit: '' },
          ].map((s, idx) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                  {s.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: s.color }}>
                    {s.value}
                  </span>
                  {s.unit && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      {s.unit}
                    </span>
                  )}
                </div>
              </div>
              {idx < 3 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card title="SCATTER: PRESSURE vs NM UNCORRECTED" subtitle="Negative slope confirms pressure correction is valid">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
            <span style={{ color: '#A855F7' }}>●</span> Data points &nbsp;
            <span style={{ color: '#3498DB' }}>—</span> Linear regression
            {reg && <span style={{ marginLeft: 12 }}>y = {reg.slope.toFixed(3)}x + {reg.intercept.toFixed(1)}</span>}
          </div>
          <ReactECharts option={option} style={{ height: 320, width: '100%' }} notMerge={true} />
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
              ความสัมพันธ์เชิงผกผันของกราฟ Scatter Plot
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Scatter Plot</strong> เปรียบเทียบความกดอากาศ (แกน X) และจำนวนนิวตรอนดิบยังไม่ปรับแก้ (แกน Y) ยืนยัน Inverse Correlation:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>ทิศทางเชิงลบ:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความกดอากาศเพิ่มขึ้น นิวตรอนที่หลุดลงถึงพื้นดินลดลง</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>แนวโน้มการเรียงตัว:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>จุดสีม่วงเรียงตัวเฉียงลงซ้ายไปขวา ยืนยันความผกผันตรงตามสมการปรับแก้</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              การทำนายและปรับแก้ด้วยค่าทางสถิติ (SLOPE & INTERCEPT)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              การประมวลผลสมการถดถอยเชิงเส้น (Linear Regression Line) เส้นสีส้มเพื่อสกัดค่าปรับแก้:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#C084FC', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>SLOPE (ความชัน)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  จำนวนนิวตรอนที่ลดต่อความกดอากาศเพิ่มขึ้นทุก 1 mbar ใช้หักล้างหาค่ารังสีคอสมิกสัมบูรณ์
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#38BDF8', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>INTERCEPT (จุดตัดแกน Y)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  จำนวนนิวตรอนตามทฤษฎีหากไม่มีชั้นบรรยากาศคอยกั้น (ความกดอากาศ 0 mbar)
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ข้อมูลเชิงเทคนิคพารามิเตอร์ Scatter Plot
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>สถานีรวบรวมข้อมูล</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Mawson Station (MAW) — แอนตาร์กติกา (ขั้วโลกใต้)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตัวแปรบนแกน X</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Atmospheric pressure (mbar) ความกดอากาศระดับสถานี</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตัวแปรบนแกน Y</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>NM Uncorrected (counts) จำนวนนิวตรอนดิบจากสถานี 18-NM-64</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>เส้นถดถอยเชิงเส้น</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Least Squares Regression (y = ax + b)</td>
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
              ข้อมูลคำนวณเรียลไทม์อ้างอิงแหล่งข้อมูลหลัก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Australian Antarctic Division (AAD):</strong> ผู้ดูแลบันทึกสถานีรังสีคอสมิกแอนตาร์กติกา
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NMDB Network:</strong> เครือข่ายความร่วมมือวิจัยฟิสิกส์พลังงานสูงสากล
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
              ข้อมูลอ้างอิง API: ดึงผ่านเกตเวย์ <a href="https://www.nmdb.eu/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NMDB Nest services</a>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}