import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveNeutron, loadNeutron, STATIONS } from '../../services/cosmicService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'

const STATION_COLORS = STATIONS.reduce((acc, s, i) => {
  // Use the golden angle to generate widely distributed distinct colors
  const hue = (i * 137.508) % 360;
  acc[s.id] = `hsl(${Math.floor(hue)}, 80%, 65%)`
  return acc
}, {})

export default function NeutronMonitor() {
  const [data, setData]           = useState({}) 
  const [active, setActive]       = useState(() => STATIONS.reduce((acc, s) => ({ ...acc, [s.id]: s.id === 'OULU' }), {}))
  const [loading, setLoading]     = useState(true)
  const [fetching, setFetching]   = useState(false)
  const [fetchStation, setFetchStation] = useState('OULU')
  const [limit, setLimit]         = useState(360)
  const [hours, setHours]         = useState(24)
  const [activeTab, setActiveTab] = useState('usage')

  // โหลดข้อมูลเฉพาะ station ที่ active
  const load = async () => {
    setLoading(true)
    const activeStations = STATIONS.filter(s => active[s.id])
    const results = await Promise.all(
      activeStations.map(async s => {
        const d = await loadNeutron(s.id, limit)
        return { id: s.id, data: d }
      })
    )
    const newData = { ...data }
    results.forEach(r => { newData[r.id] = r.data })
    setData(newData)
    setLoading(false)
  }

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveNeutron(fetchStation, hours)
      // reload station นั้น
      const d = await loadNeutron(fetchStation, limit)
      setData(prev => ({ ...prev, [fetchStation]: d }))
      // เปิดเส้นนั้นอัตโนมัติ
      setActive(prev => ({ ...prev, [fetchStation]: true }))
    } catch {}
    setFetching(false)
  }

  useEffect(() => { load() }, [active, limit])

  useAutoFetch(async () => {
    const activeStations = STATIONS.filter(s => active[s.id])
    for (const s of activeStations) {
      const d = await loadNeutron(s.id, limit)
      setData(prev => ({ ...prev, [s.id]: d }))
    }
  }, 60000)

  // toggle station
  const toggleStation = (id) => {
    setActive(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // echarts option
  const series = STATIONS
    .filter(s => active[s.id] && data[s.id]?.length > 0)
    .map(s => {
      const stationData = data[s.id]
      const baseline = stationData.length > 10 ? stationData.slice(0, 10).reduce((sum, d) => sum + d.count_rate, 0) / 10 : null
      
      return {
        name: `${s.label} (${s.id})`,
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.5, color: STATION_COLORS[s.id] },
        itemStyle: { color: STATION_COLORS[s.id] },
        data: stationData.map(d => {
          if (!baseline || baseline === 0) return [d.time_tag, 0]
          const pct = ((d.count_rate - baseline) / baseline) * 100
          return [d.time_tag, pct]
        }),
      }
    })

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0a0a0c',
      borderColor: 'rgba(168,85,247,0.3)',
      textStyle: { color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: 11 },
      formatter: (params) => {
        const time = params[0]?.axisValueLabel || ''
        const lines = params.map(p =>
          `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${p.value[1]?.toFixed(2)}%</b>`
        ).join('<br/>')
        return `<div style="font-family:monospace;font-size:11px">${time}<br/>${lines}</div>`
      }
    },
    legend: { show: false }, // ใช้ custom toggle แทน
    grid: { top: 16, right: 16, bottom: 20, left: 60 },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'slider',  xAxisIndex: 0, height: 20, bottom: 0,
        fillerColor: 'rgba(168,85,247,0.1)',
        borderColor: 'rgba(168,85,247,0.3)',
        handleStyle: { color: '#A855F7' },
        textStyle: { color: '#606075', fontSize: 9 }
      }
    ],
    xAxis: {
      type: 'time',
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
      axisLabel: { color: '#606075', fontSize: 10, fontFamily: 'monospace' }
    },
    yAxis: {
      type: 'value',
      scale: true,
      name: '% VARIATION',
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: { color: '#606075', fontSize: 10 },
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
      axisLabel: { color: '#606075', fontSize: 10, formatter: '{value}%' }
    },
    series,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 18, fontWeight: 700, color: '#C084FC', margin: 0, letterSpacing: 0.5 }}>
            COSMIC RAY / NEUTRON MONITOR
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
            NMDB Network · Global Neutron Station Telemetry
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
          <StatusBadge status={series.length ? 'normal' : 'offline'} />
        </div>
      </div>

      {/* Station toggles */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: '#C084FC', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: 600 }}>
            ACTIVE STATIONS ({Object.values(active).filter(Boolean).length}/{STATIONS.length})
          </span>
          <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>Select to toggle station plot</span>
        </div>
        <div 
          className="station-grid-scroll"
          style={{
            maxHeight: 160, overflowY: 'auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6,
            padding: '12px', background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 0
          }}
        >
          {STATIONS.map(s => {
            const isOn = active[s.id]
            const color = STATION_COLORS[s.id]
            return (
              <button
                key={s.id}
                onClick={() => toggleStation(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: isOn ? `${color}15` : 'transparent',
                  border: `1px solid ${isOn ? color + '55' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 0, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isOn ? color : '#64748B', fontWeight: isOn ? 700 : 400, letterSpacing: 1 }}>
                    {s.id}
                  </div>
                  <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                    {s.label}
                  </div>
                </div>
                {/* dot สถานะ */}
                <div style={{
                  flexShrink: 0,
                  width: 6, height: 6, borderRadius: '50%',
                  background: isOn ? color : '#334155',
                  boxShadow: isOn ? `0 0 6px ${color}` : 'none',
                  transition: 'all 0.15s',
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Fetch controls */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24,
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 0, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#C084FC', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: 600 }}>FETCH REMOTE TELEMETRY:</span>
        <select value={fetchStation} onChange={e => setFetchStation(e.target.value)}
          style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, color: '#F8FAFC', padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
          {STATIONS.map(s => <option key={s.id} value={s.id}>{s.label} ({s.id})</option>)}
        </select>
        <select value={hours} onChange={e => setHours(Number(e.target.value))}
          style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, color: '#F8FAFC', padding: '5px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
          <option value={6}>6 hours</option>
          <option value={24}>24 hours</option>
          <option value={72}>72 hours</option>
          <option value={168}>7 days</option>
        </select>
        <button onClick={fetch_} disabled={fetching}
          style={{
            padding: '4px 12px',
            background: 'transparent',
            border: 'none',
            color: '#C084FC',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1,
          }}
        >
          {fetching ? 'FETCHING...' : 'REFRESH'}
        </button>
      </div>

      {/* Transparent Telemetry Metrics Strip */}
      {STATIONS.filter(s => active[s.id] && data[s.id]?.length).length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start',
          gap: 24, marginBottom: 24, padding: '0 8px', background: 'transparent', border: 'none'
        }}>
          {STATIONS.filter(s => active[s.id] && data[s.id]?.length).map((s, idx, arr) => {
            const latest = data[s.id]?.[data[s.id].length - 1]
            const color = STATION_COLORS[s.id]
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color, fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                    {s.id} ({s.label})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color }}>
                      {latest?.count_rate?.toFixed(1) ?? '—'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      counts/min
                    </span>
                  </div>
                </div>
                {idx < arr.length - 1 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Chart */}
      {loading ? <LoadingSpinner /> : (
        <Card title="NEUTRON COUNT RATE — MULTI STATION">
          {series.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#606075', letterSpacing: 2 }}>
              NO STATION SELECTED — TOGGLE ABOVE TO SHOW
            </div>
          ) : (
            <ReactECharts option={option} style={{ height: 320, width: '100%' }} notMerge={true} />
          )}
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
              การวัดค่ารังสีคอสมิกและอนุภาคนิวตรอน
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Neutron Monitor</strong> วัดปริมาณอนุภาคนิวตรอนทุติยภูมิ (Secondary Neutrons) จากรังสีคอสมิกปะทะบรรยากาศโลก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>% Variation:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>อัตราการเปลี่ยนแปลงจากค่าฐานปกติ Baseline (0% คือปกติ)</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>ความสัมพันธ์สุริยะ:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>แปรผกผันกับกิจกรรมดวงอาทิตย์ (ลมสุริยะเข้มข้นช่วยปัดรังสีคอสมิกออกไป)</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ปรากฏการณ์ Forbush Decrease (การลดลงของฟอร์บุช)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              เหตุการณ์สำคัญในการเฝ้าระวังพายุสุริยะผ่านกราฟนิวตรอน:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Forbush Decrease (ลดลง &ge; 3%)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  หากกราฟลดลงอย่างรวดเร็วเกิน 3% ขึ้นไป บ่งบอกถึงพายุสุริยะ (CME) กำลังพัดผ่านโลก
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>กลไกม่านแม่เหล็กบังรังสี</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  พายุสุริยะ (CME) ทำหน้าที่เสมือนม่านบาเรีย ปัดรังสีคอสมิกลึกไม่ให้ผ่านเข้ามา ทำให้นิวตรอนดิ่งฮวบลง
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดเครือข่ายสถานีตรวจนิวตรอน (NMDB Network)
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>OULU (ฟินแลนด์)</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ละติจูดสูงใกล้ขั้วโลกเหนือ ตรวจรังสีคอสมิกไวพิเศษ</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>JUNG1 (สวิตเซอร์แลนด์)</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ยอดเขา Jungfraujoch สูง 3,470m บรรยากาศบางเบา</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>KIEL / MOSC / THUL</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>สถานีละติจูดกลางและขั้วโลกเหนืออาร์กติก</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>หน่วยวัดปริมาณ</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>counts/min (จำนวนนิวตรอนที่พุ่งชนท่อตรวจวัดต่อนาที)</td>
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
              เชื่อมต่ออัตโนมัติกับฐานข้อมูลเครือข่ายความร่วมมือระดับโลก:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NMDB Network:</strong> Real-Time Database for High-Resolution Neutron Monitor Data
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>สถานีวิจัยสากล:</strong> Oulu, Kiel, Bern และสถาบันวิทยาศาสตร์ที่เกี่ยวข้อง
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
              ข้อมูลอ้างอิง API: ดึงผ่านเซิร์ฟเวอร์ <a href="https://www.nmdb.eu/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NMDB Nest services</a>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}