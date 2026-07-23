import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveProton, loadProton } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'

const COLORS = {
  '>=1 MeV': '#3B82F6',
  '>=5 MeV': '#22C55E',
  '>=10 MeV': '#F59E0B',
  '>=50 MeV': '#3498DB',
  '>=100 MeV': '#EF4444',
  '>=500 MeV': '#A855F7'
}

export default function ProtonFlux(){
    const [raw,setRaw] = useState<any[]>([])
    const [data,setData] =useState<any[]>([])
    const [energies,setEnergies] =useState<any[]>([])
    const [loading,setLoading] =useState(true)
    const [fetching,setFetching] =useState(false)
  const [limit, setLimit] = useState(360)
  const [activeTab, setActiveTab] = useState('usage')

    const load = async ()=>{
        const d = await loadProton(limit)
        setRaw(d)
        const map: Record<string, any> = {}
        d.forEach(r => {
            if (!map[r.time_tag]) map[r.time_tag] = {time_tag:r.time_tag}
            map[r.time_tag][r.energy] = r.flux
        })
        const pivoted = Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
        const keys = [...new Set(d.map(r => r.energy))].filter(Boolean)
        setData(pivoted)
        setEnergies(keys)
        setLoading(false)
    }

    
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveProton()
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

    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#16161F',
        borderColor: 'rgba(52,152,219,0.3)',
        textStyle: { color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: 11 },
        formatter: (params: any) => {
          let res = `<div style="color: #3498DB; margin-bottom: 6px">${params[0].axisValueLabel}</div>`;
          params.forEach((item: any) => {
            const val = item.value[1] !== null ? item.value[1].toExponential(2) : 'N/A';
            res += `<div style="display:flex; justify-content:space-between; gap:16px;">
                      <span style="color:${item.color}">${item.seriesName}:</span>
                      <span style="font-weight:bold">${val} pfu</span>
                    </div>`;
          });
          return res;
        }
      },
      grid: { top: 30, right: 20, bottom: 30, left: 50 },
      dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' }],
      xAxis: {
        type: 'time',
        splitLine: { show: false },
        axisLabel: { color: '#606075', fontSize: 10 }
      },
      yAxis: {
        type: 'log',
        splitLine: { show: true, lineStyle: { color: 'rgba(52,152,219,0.06)', type: 'dashed' } },
        axisLabel: { color: '#606075', fontSize: 10 }
      },
      series: energies.map(e => ({
        name: e,
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 1.5 },
        itemStyle: { color: COLORS[e] || '#606075' },
        data: data.map(d => [d.time_tag, d[e]]),
        markLine: e === energies[0] ? {
            data: [{ yAxis: 10, name: 'S1' }],
            lineStyle: { color: '#EF4444', type: 'dashed', opacity: 0.5 },
            symbol: ['none', 'none'],
            label: { formatter: 'S1', position: 'end', color: '#EF4444', fontSize: 10 }
        } : undefined
      }))
    };

    const latest = data[data.length - 1]

    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 18, fontWeight: 700, color: '#38BDF8', margin: 0, letterSpacing: 0.5 }}>
              GOES / PROTON FLUX
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
              Integral Proton Flux — Multi-energy Bands
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
            <StatusBadge status={data.length ? 'normal' : 'offline'} />
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

        {/* Transparent Telemetry Metrics Strip */}
        {latest && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
            gap: 24, marginBottom: 24, padding: '0 8px', background: 'transparent', border: 'none'
          }}>
            {[
              { label: '≥ 10 MeV (SPE THRESHOLD)', value: latest['>=10 MeV']?.toExponential(2), color: '#FBBF24', unit: 'pfu' },
              { label: '≥ 50 MeV (HIGH ENERGY)', value: latest['>=50 MeV']?.toExponential(2), color: '#FB923C', unit: 'pfu' },
              { label: '≥ 100 MeV (CRITICAL)', value: latest['>=100 MeV']?.toExponential(2), color: '#F87171', unit: 'pfu' },
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

        {loading ? <LoadingSpinner /> : (
          <Card title="INTEGRAL PROTON FLUX">
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              {energies.map(e => (
                <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS[e] || '#606075' }}>
                  <div style={{ width: 16, height: 2, background: COLORS[e] || '#606075' }} />
                  {e}
                </div>
              ))}
            </div>
            <ReactECharts option={option} style={{ height: 350, width: '100%' }} notMerge={true} />
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
              การวัดค่าและระดับพลังงานของ Proton Flux
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Proton Flux</strong> (Integral Proton Flux) ตรวจวัดความหนาแน่นโปรตอนพลังงานสูงสะสมจาก GOES ในวงโคจรค้างฟ้า แสดงแยกตามช่วงพลังงาน (MeV):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #FBBF24', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;10 MeV:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>เกณฑ์มาตรฐานแจ้งเตือนพายุรังสีสุริยะ (Solar Radiation Storm / SPE)</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;50 MeV:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>พลังงานสูง ทะลวงผ่านแผงวงจรและเกราะป้องกันดาวเทียม</span>
              </div>
              <div style={{ borderLeft: '2px solid #F87171', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>&gt;100 MeV:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ระดับวิกฤต ทะลุบรรยากาศเพิ่มปริมาณรังสีทางการบิน</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ผลกระทบจากพายุรังสีสุริยะ (Solar Radiation Storm Impacts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              พายุรังสีสุริยะเดินทางถึงโลกภายในหลายสิบนาทีถึงหลายชั่วโมง ส่งผลกระทบโดยตรงต่อ:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>นักบินอวกาศ & ระบบอวกาศ</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  เป็นอันตรายรุนแรงต่อสุขภาพนักบินอวกาศที่ทำภารกิจนอกยาน (EVA) จากการรับรังสีเข้มข้น
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>สายการบินพาณิชย์ & ดาวเทียม</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  อาจปรับเส้นทางบินอ้อมขั้วโลก (Polar Routes) และต้องสวิตช์ปิดอุปกรณ์ดาวเทียมบางส่วนป้องกันความเสียหาย
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของระบบ Proton Flux
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>GOES (Geostationary Operational Environmental Satellite) — NOAA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Geostationary Orbit (วงโคจรค้างฟ้าเหนือเส้นศูนย์สูตร)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>หน่วยวัดหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>pfu (Particle Flux Unit: particles/cm²·s·sr)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>เกณฑ์พายุรังสี</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ระดับ S1 (Minor) เริ่มที่ &gt;= 10 pfu ในช่วง &gt;= 10 MeV</td>
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
              ข้อมูลสนับสนุนแบบเรียลไทม์จากระบบตรวจวัดระดับสากล:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์พยากรณ์สภาพอวกาศภายใต้ NOAA
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>GOES Satellite Network:</strong> เครือข่ายดาวเทียมอุตุนิยมวิทยาและสภาพอวกาศ
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