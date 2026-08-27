import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveSis, loadSis } from '../../services/aceService'
import { loadSolar1 } from '../../services/radiationService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { formatPowerOf10 } from '../../utils/formatters'


export default function Sis() {
  const [data, setData] = useState<any[]>([])
  const [solar1Data, setSolar1Data] = useState<any[]>([])
  const [satSource, setSatSource] = useState<'ACE' | 'SOLAR1' | 'BOTH'>('ACE')
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(360)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const sDate = appliedRange ? appliedRange.startDate : undefined
    const eDate = appliedRange ? appliedRange.endDate : undefined
    try {
      const [dAce, dSolar1] = await Promise.all([
        loadSis(limit, sDate, eDate),
        loadSolar1(limit, sDate, eDate)
      ])
      setData(Array.isArray(dAce) ? dAce : [])
      setSolar1Data(Array.isArray(dSolar1) ? dSolar1 : [])
    } catch(e) {
      console.error(e)
    } finally {
      if (showLoading) setLoading(false)
    }
  }
  
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveSis()
    } catch(e) {}
    await load(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadSis(0, start, end),
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  useEffect(() => {
    resetPan()
    load(true)
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    await load(false)
  }, 60000, !appliedRange)

  const latest = data[data.length - 1]

  const series: any[] = []

  if (satSource === 'ACE' || satSource === 'BOTH') {
    series.push(
      { name: 'ACE > 10 MeV', type: 'line', smooth: 0.15, showSymbol: false, itemStyle: { color: '#34D399' }, lineStyle: { width: 1.5, opacity: 0.9 }, data: data.map(d => [d.time_tag, d.p10]) },
      { name: 'ACE > 30 MeV', type: 'line', smooth: 0.15, showSymbol: false, itemStyle: { color: '#38BDF8' }, lineStyle: { width: 1.5, opacity: 0.9 }, data: data.map(d => [d.time_tag, d.p30]) }
    )
  }

  if (satSource === 'SOLAR1' || satSource === 'BOTH') {
    series.push(
      { name: 'S1 > 10 MeV (p7)', type: 'line', smooth: 0.15, showSymbol: false, itemStyle: { color: '#F59E0B' }, lineStyle: { width: 1.5, opacity: 0.85 }, data: solar1Data.map(d => [d.time_tag, d.p7]) },
      { name: 'S1 > 30 MeV (p8)', type: 'line', smooth: 0.15, showSymbol: false, itemStyle: { color: '#EC4899' }, lineStyle: { width: 1.5, opacity: 0.85 }, data: solar1Data.map(d => [d.time_tag, d.p8]) }
    )
  }

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
    legend: {
      show: true,
      textStyle: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
      top: 0
    },
    grid: { top: 35, right: 20, bottom: 30, left: 65 },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        rangeMode: ['value', 'value'],
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        ...(zoomRange ? { startValue: zoomRange.startValue, endValue: zoomRange.endValue } : {})
      }
    ],
    xAxis: { 
      type: 'time', 
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } }, 
      axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    yAxis: {
      type: 'log',
      name: 'Particles / (cm² s sr MeV)', 
      nameLocation: 'middle', 
      nameGap: 45, 
      nameTextStyle: { color: '#34D399', fontSize: 10, fontWeight: 'bold', fontFamily: 'var(--font-mono)' },
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: '#E2E8F0', fontSize: 10, fontFamily: 'var(--font-mono)', formatter: formatPowerOf10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    series
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 26, fontWeight: 700, color: '#34D399', margin: 0, letterSpacing: -0.5 }}>
            HIGH-ENERGY PROTONS (SIS / STIS)
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Solar Isotope Spectrometer &amp; STIS · High-Energy Proton Flux (&gt;10 &amp; &gt;30 MeV)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 11, color: '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
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

      {/* Toolbar: Source Selector + Date Range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {/* Source Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>SATELLITE SOURCE:</span>
          {(['ACE', 'SOLAR1', 'BOTH'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSatSource(s)}
              style={{
                background: satSource === s ? '#34D399' : 'rgba(255,255,255,0.05)',
                color: satSource === s ? '#FFF' : '#94A3B8',
                border: '1px solid ' + (satSource === s ? '#34D399' : 'rgba(255,255,255,0.1)'),
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {s === 'SOLAR1' ? 'SOLAR-1 (STIS)' : s === 'BOTH' ? 'BOTH (ACE + SOLAR-1)' : 'ACE'}
            </button>
          ))}
        </div>

        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor="#34D399"
          loading={loading}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <Card
          title="SIS / STIS HIGH ENERGY PROTON FLUX"
          extra={panLoading ? (
            <span style={{ fontSize: 11, color: '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          ) : null}
        >
          <ReactECharts
            option={option}
            notMerge={true}
            style={{ height: 320, width: '100%' }}
            onChartReady={onChartReady}
            onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
          />
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
