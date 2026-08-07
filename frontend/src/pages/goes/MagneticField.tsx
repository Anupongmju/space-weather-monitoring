import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveGosMag, loadGoesMag } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'


export default function MagneticField(){
    const [data,setData] = useState<any[]>([])
    const [loading,setLoading] = useState(true)
    const [fetching,setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(360)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef<any>(null)

    const load = async (showLoading = true) => {
      if (showLoading) setLoading(true)
      try {
        const sDate = appliedRange ? appliedRange.startDate : undefined
        const eDate = appliedRange ? appliedRange.endDate : undefined
        const d = await loadGoesMag(limit, sDate, eDate)
        if (Array.isArray(d)) {
          setData(d)
        }
      } catch (err) {
        console.error('Failed to load mag data:', err)
      } finally {
        if (showLoading) setLoading(false)
      }
    }
    
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveGosMag()
    } catch(e) {}
    await load(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadGoesMag(0, start, end),
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

    const latest =data[data.length -1]

    const option = {
      tooltip: { trigger: 'axis', backgroundColor: '#16161F', borderColor: 'rgba(52,152,219,0.3)', textStyle: { color: '#FFF', fontFamily: 'var(--font-mono)', fontSize: 11 } },
      grid: { top: 10, right: 16, bottom: 20, left: 50 },
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
      xAxis: { type: 'time', splitLine: { show: true, lineStyle: { color: 'rgba(52,152,219,0.06)', type: 'dashed' } }, axisLabel: { color: '#606075', fontSize: 10 } },
      yAxis: { type: 'value', name: 'nT', splitLine: { show: true, lineStyle: { color: 'rgba(52,152,219,0.06)', type: 'dashed' } }, axisLabel: { color: '#606075', fontSize: 10 } },
      series: [
        { name: 'Hp', type: 'line', showSymbol: false, connectNulls: true, lineStyle: { width: 1.5 }, itemStyle: { color: '#38BDF8' }, data: data.map(d => [d.time_tag, d.hp]) },
        { name: 'He', type: 'line', showSymbol: false, connectNulls: true, lineStyle: { width: 1.5 }, itemStyle: { color: '#34D399' }, data: data.map(d => [d.time_tag, d.he]) },
        { name: 'Hn', type: 'line', showSymbol: false, connectNulls: true, lineStyle: { width: 1.5 }, itemStyle: { color: '#FBBF24' }, data: data.map(d => [d.time_tag, d.hn]) },
        { name: 'Total (Ht)', type: 'line', showSymbol: false, connectNulls: true, lineStyle: { width: 1.5, type: 'dashed' }, itemStyle: { color: '#A855F7' }, data: data.map(d => [d.time_tag, d.total]) },
      ]
    }

    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 18, fontWeight: 700, color: '#34D399', margin: 0, letterSpacing: 0.5 }}>
              GOES / MAGNETIC FIELD
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
              Geostationary Magnetic Field Vectors — Hp, He, Hn, Total (nT)
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

        {/* Dedicated Row 2 Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <DateRangeToolbar
            limit={limit}
            onLimitChange={setLimit}
            appliedRange={appliedRange}
            onApplyRange={setAppliedRange}
            accentColor="#34D399"
            loading={loading}
          />
        </div>

        {/* Transparent Telemetry Metrics Strip */}
        {latest && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
            gap: 24, marginBottom: 24, padding: '0 8px', background: 'transparent', border: 'none'
          }}>
            {[
              { label: 'Hp (NORTHWARD / PARALLEL)', value: latest.hp?.toFixed(1), color: '#38BDF8', unit: 'nT' },
              { label: 'He (EARTHWARD)', value: latest.he?.toFixed(1), color: '#34D399', unit: 'nT' },
              { label: 'Hn (EASTWARD)', value: latest.hn?.toFixed(1), color: '#FBBF24', unit: 'nT' },
              { label: 'TOTAL FIELD (Ht)', value: latest.total?.toFixed(1), color: '#A855F7', unit: 'nT' },
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
                {idx < 3 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
              </div>
            ))}
          </div>
        )}

        {loading ? <LoadingSpinner /> : (
          <Card
            title="MAGNETIC FIELD COMPONENTS — Hp, He, Hn, Ht"
            extra={panLoading ? (
              <span style={{ fontSize: 11, color: '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            ) : null}
          >
            <ReactECharts
              option={option}
              style={{ height: 330, width: '100%' }}
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
              การวัดค่าสนามแม่เหล็กโลกแบบ 3 มิติ (Hp, He, Hn, Ht)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Magnetic Field</strong> ตรวจวัดความเข้มสนามแม่เหล็กโลกในวงโคจรค้างฟ้า (Geosynchronous) ติดตามการกดทับของลมสุริยะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #34D399', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Hp (Parallel Component):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ฉากกับวงโคจร (ทิศเหนือ) เฝ้าระวังหลัก หากลมสุริยะกดทับรุนแรงอาจดิ่งติดลบ</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>He & Hn (Earth-ward & Normal):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>องค์ประกอบชี้เข้าหาโลก (He) และทิศตะวันออก (Hn)</span>
              </div>
              <div style={{ borderLeft: '2px solid #C084FC', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Ht (Total Field Magnitude):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความเข้มรวมเวกเตอร์ 3 แกน (Ht = √(Hp² + He² + Hn²)) ดูภาพรวมปั่นป่วน</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              ผลกระทบจากความแปรปรวนของสนามแม่เหล็ก (Geomagnetic Storm Impacts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              พายุสุริยะกระแทกสนามแม่เหล็กโลก ก่อผลกระทบต่อเทคโนโลยี:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Magnetopause Crossing</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  หาก Hp ติดลบ แสดงว่าสนามแม่เหล็กโลกร่นลึก ดาวเทียมหลุดไปเผชิญพายุสุริยะภายนอกโดยตรง
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>กระแสไฟฟ้าเหนี่ยวนำ GIC</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ความผันผวนแม่เหล็กเหนี่ยวนำกระแส GIC เข้าสู่ระบบสายส่งไฟฟ้าแรงสูงเสี่ยงทำหม้อแปลงเสียหาย
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของระบบตรวจวัดสนามแม่เหล็ก
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>อุปกรณ์ตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Magnetometer ติดตั้งบนดาวเทียม GOES ของ NOAA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Geosynchronous Orbit (วงโคจรค้างฟ้า)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>หน่วยการวัด</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>nT (NanoTesla - นาโนเทสลา)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>แกนเวกเตอร์ 3 มิติ</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Hp (ฉาก), He (ชี้เข้าโลก), Hn (ทิศตะวันออก), Ht (รวม)</td>
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
              ข้อมูลความปั่นป่วนแม่เหล็กโลกได้รับการประมวลผลจากสถาบันสากล:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์พยากรณ์และเฝ้าระวังภัย NOAA
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>GOES Satellite Mission:</strong> เครือข่ายดาวเทียมวัดค่าสภาพอากาศและสนามแม่เหล็ก
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
              ข้อมูลอ้างอิง API: ค่าสนามแม่เหล็กดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
