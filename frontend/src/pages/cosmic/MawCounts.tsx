import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchMawToday, loadMawData } from '../../services/mawService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'

const LINES = [
    {key:'nm_corrected', color:'#3498DB',label:'NM Corrected'},
    {key:'nm_uncorrected', color:'#3b82f6',label:'NM Uncorrected'},
    {key:'bare_corrected', color:'#22c55e',label:'Bare Corrected'},
    {key:'bare_uncorrected', color:'#a855f7',label:'Bare Uncorrected'}
]

export default function MawCounts(){
    const [data,setData] =useState([])
    const [loading,setLoading] =useState(true)
    const [fetching,setFetching]=useState(false)
    const [limit, setLimit] = useState(360)
    const [activeTab, setActiveTab] = useState('usage')

    const load = async () => { setLoading(true); const d = await loadMawData(limit); setData(d); setLoading(false); }
    const fetch_ = async () => { setFetching(true); await fetchMawToday(); await load(); setFetching(false); }
    useEffect(() => { load() }, [limit])

    const latest = data.length > 0 ? data[data.length - 1] : null;

    const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0F172A',
      borderColor: 'rgba(99, 102, 241, 0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
      extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      formatter: (params: any) => {
        let res = `<div style="color: #A5B4FC; font-weight:700; margin-bottom: 6px">${params[0].axisValueLabel}</div>`;
        params.forEach((p: any) => {
          res += `<div style="color: ${p.color}; margin-bottom: 2px">${p.seriesName}: ${p.value[1]?.toFixed(1)} cts/min</div>`;
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
      type: 'value',
      scale: true,
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    series: LINES.map(l => ({
      name: l.label,
      type: 'line',
      showSymbol: false,
      lineStyle: { width: 2 },
      itemStyle: { color: l.color },
      data: data.map(d => [d.time_tag, d[l.key]])
    }))
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
            MAW / TOTAL COUNTS
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Mawson Antarctic Station · Cosmic Ray Count Rate Channels
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
                  borderBottom: limit === v ? '2px solid #818CF8' : '2px solid transparent',
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
              color: '#818CF8', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
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
          {LINES.map((l, idx) => (
            <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                  {l.label.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: l.color }}>
                    {latest[l.key]?.toFixed(0) ?? '—'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                    cts/min
                  </span>
                </div>
              </div>
              {idx < LINES.length - 1 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card title="TOTAL COSMIC RAY COUNTS — MAW MAWSON" subtitle="Forbush decrease visible as sudden drop across all channels">
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            {LINES.map(l => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: l.color }}>
                <div style={{ width: 16, height: 2, background: l.color }} />{l.label}
              </div>
            ))}
          </div>
          <ReactECharts option={option} style={{ height: 320, width: '100%' }} notMerge={true} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#FB923C"
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
              ความหมายและการอ่านค่าจำนวนการนับนิวตรอน (Total Counts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Total Counts</strong> คือ กราฟสรุปจำนวนนับนิวตรอนทั้งหมดจากสถานี Mawson (MAW) ทวีปแอนตาร์กติกา:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #FB923C', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>NM Corrected (ปรับแก้ - มีเกราะ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>หักล้างผลความกดอากาศแล้ว เป็นค่าหลักพยากรณ์รังสีคอสมิก</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>NM Uncorrected (ค่าดิบ - มีเกราะ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ค่าดิบอ่านโดยตรงจากเครื่องวัดมาตรฐานมีเกราะตะกั่ว</span>
              </div>
              <div style={{ borderLeft: '2px solid #34D399', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Bare Corrected (ปรับแก้ - ไร้เกราะ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ค่านิวตรอนจากเครื่องวัดชนิดไม่มีตะกั่วล้อมรอบที่หักล้างความกดอากาศแล้ว</span>
              </div>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Bare Uncorrected (ค่าดิบ - ไร้เกราะ):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ค่าดิบอ่านจากเครื่องวัดนิวตรอนไร้เกราะ</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              การเปรียบเทียบระดับพลังงานรังสีคอสมิก (NM vs Bare)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              การเปรียบเทียบระหว่างสเปกตรัมเครื่องวัดมีเกราะ (NM) และไร้เกราะ (Bare) ช่วยจำแนกพลังงานรังสี:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>เครื่องวัดมาตรฐาน (NM)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  เกราะตะกั่วทำหน้าที่เป็นตัวทวีคูณอนุภาค (Multiplier) มีความไวสูงต่อรังสีคอสมิกพลังงานสูงจากอวกาศลึก
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#34D399', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>เครื่องวัดไร้เกราะ (Bare)</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  มีความไวต่ออนุภาคนิวตรอนพลังงานต่ำ ช่วยให้วิเคราะห์ประเภทพายุสุริยะที่เข้าปะทะโลกได้ทันที
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดระบบเครื่องวัดนิวตรอน Mawson
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>พิกัดและตำแหน่ง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Mawson Station (MAW) — ทวีปแอนตาร์กติกา (ขั้วโลกใต้)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>อุปกรณ์มีเกราะหลัก (NM)</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>เครื่องวัดมาตรฐานประเภท 18-NM-64 (เกราะตะกั่ว)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>อุปกรณ์ไร้เกราะ (Bare)</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>เครื่องวัดชนิด Lead-Free</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>หน่วยการวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>counts (จำนวนครั้งปฏิกิริยากับก๊าซในหลอดวัด)</td>
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
              ข้อมูลได้รับการสนับสนุนจากเครือข่ายฐานข้อมูลนิวตรอน:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Australian Antarctic Division (AAD):</strong> ผู้ดูแลประมวลผลเครื่องตรวจจับ Mawson
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>NMDB Database Network:</strong> เครือข่ายรวบรวมข้อมูลสถานีนิวตรอนสากล
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
