import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveElectron, loadElectron } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'

const COLORS = { '>=0.8 MeV': '#a855f7', '>=2 MeV': '#3498DB' }

export default function ElectronFlux(){
    const [data,setData] = useState<any[]>([])
    const [energies,setEnergies] = useState<any[]>([])
    const [loading,setLoading] = useState(true)
    const [fetching,setFetching] = useState(false)
  const [limit, setLimit] = useState(360)
  const [activeTab, setActiveTab] = useState('usage')

    const load = async() => {
        const d = await loadElectron(limit)
        const map: Record<string, any> = {}
        d.forEach(r => {
            if(!map[r.time_tag]) map[r.time_tag] = {time_tag:r.time_tag}
            map[r.time_tag][r.energy] = r.flux
        })
        const pivoted = Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
        setData(pivoted)
        setEnergies([...new Set(d.map(r => r.energy))])
        setLoading(false)
    }
        
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveElectron()
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
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0F172A',
        borderColor: 'rgba(168,85,247,0.6)',
        borderWidth: 1.5,
        padding: 14,
        textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
        extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
        formatter: (params: any) => {
          let res = `<div style="color: #C084FC; font-weight:700; margin-bottom: 6px">${params[0].axisValueLabel}</div>`;
          params.forEach((p: any) => {
            res += `<div style="color: ${p.color}; margin-bottom: 2px">${p.seriesName}: ${p.value[1]?.toExponential(2)}</div>`;
          });
          return res;
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
        type: 'log',
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
        axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      series: energies.map(e => ({
        name: e,
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2 },
        itemStyle: { color: COLORS[e] || '#94A3B8' },
        data: data.map(d => [d.time_tag, d[e]])
      }))
    };

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
            GOES / ELECTRON FLUX
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Relativistic Electron Flux · Satellite Charging Risk · GEO Orbit
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

      {loading ? <LoadingSpinner /> : (
        <Card title="INTEGRAL ELECTRON FLUX">
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {energies.map(e => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS[e] || '#94A3B8' }}>
                <div style={{ width: 16, height: 2, background: COLORS[e] || '#94A3B8' }} /> {e}
              </div>
            ))}
          </div>
          <ReactECharts option={option} style={{ height: 320, width: '100%' }} notMerge={true} />
        </Card>
      )}      {/* Refined Instrument Info Guide */}
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
              การวัดค่าและระดับพลังงานของ Electron Flux
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Electron Flux</strong> (Relativistic Electron Flux) คือ ปริมาณความหนาแน่นอิเล็กตรอนสัมพัทธภาพความเร็วใกล้แสง ตรวจวัดโดยดาวเทียม GOES:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Relativistic Electrons:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>อิเล็กตรอนความเร็วสูงมาก (≥0.8 MeV และ ≥2.0 MeV) แสดงพฤติกรรมสัมพัทธภาพ</span>
              </div>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>การสะสมตัวช้า:</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ระดับอิเล็กตรอนค่อย ๆ เพิ่มสูงสุดช่วง 2-3 วันหลังจากโลกเผชิญพายุสุริยะ</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ผลกระทบและการฝังประจุในดาวเทียม (Deep Dielectric Charging)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              เมื่อความหนาแน่นอิเล็กตรอนเพิ่มต่อเนื่อง จะเกิดความเสี่ยงต่อชิปและเกราะในวงโคจรอวกาศ:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Internal Charging (ประจุฝังตัว)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  อิเล็กตรอนความเร็วสูงทะลวงเกราะนอกเข้าไปฝังตัวสะสมประจุในแผงวงจรและฉนวนด้านในดาวเทียม
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>ESD Sparking (สปาร์กและลัดวงจร)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  การปล่อยประจุฉับพลัน (Electrostatic Discharge) เกิดประกายไฟภายใน ทำให้อุปกรณ์ดาวเทียมล้มเหลว
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของระบบ Electron Flux
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>เครื่องตรวจวัดที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>GOES Space Environment In Situ Suite — NOAA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งการวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>วงโคจรค้างฟ้า (Geostationary Orbit)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ช่วงพลังงานหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>≥0.8 MeV และ ≥2.0 MeV</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>หน่วยวัดหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>pfu (Particle Flux Unit: electrons/cm²·s·sr)</td>
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
              ข้อมูลเรียลไทม์ทั้งหมดส่งสัญญาณจากวงโคจรค้างฟ้าโดยหน่วยงานชั้นนำ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NOAA Space Weather Prediction Center (SWPC):</strong> ให้บริการ API และประมวลผลสภาพรังสี
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>GOES Program (NASA / NOAA):</strong> โครงการดาวเทียมสำรวจอุตุนิยมวิทยาและรังสีอวกาศ
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
