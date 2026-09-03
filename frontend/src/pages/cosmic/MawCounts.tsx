import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchMawToday, loadMawData, loadMawRange } from '../../services/mawService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { useTheme } from '../../context/ThemeContext'
import { RefreshCw } from 'lucide-react'

const LINES = [
  { key: 'nm_corrected', color: '#0284C7', darkColor: '#38BDF8', label: 'NM Corrected' },
  { key: 'nm_uncorrected', color: '#2563EB', darkColor: '#60A5FA', label: 'NM Uncorrected' },
  { key: 'bare_corrected', color: '#059669', darkColor: '#34D399', label: 'Bare Corrected' },
  { key: 'bare_uncorrected', color: '#7C3AED', darkColor: '#C084FC', label: 'Bare Uncorrected' }
]

export default function MawCounts() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(360)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      let d: any[]
      if (appliedRange?.startDate && appliedRange?.endDate) {
        d = await loadMawRange(appliedRange.startDate, appliedRange.endDate)
      } else {
        d = await loadMawData(limit)
      }
      setData(Array.isArray(d) ? d : [])
    } catch (e) {
      console.error('Failed loading MAW data:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchMawToday()
      await load(false)
    } catch (e) {
      console.error('Failed fetching today MAW data:', e)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    load()
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    if (appliedRange) return
    const d = await loadMawData(limit)
    setData(Array.isArray(d) ? d : [])
  }, 60000)

  const latest = data.length > 0 ? data[data.length - 1] : null

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#0284C7' : 'rgba(56, 189, 248, 0.6)',
      borderWidth: 1.5,
      padding: 12,
      extraCssText: isLight
        ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
        : 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); border-radius: 6px;',
      textStyle: {
        color: isLight ? '#0F172A' : '#F8FAFC',
        fontFamily: 'var(--font-mono)',
        fontSize: 13
      },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const time = params[0]?.axisValueLabel || ''
        const timeStr = time ? new Date(time).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : ''

        let res = `
          <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
            <strong style="color:${isLight ? '#0284C7' : '#38BDF8'};font-family:var(--font-mono);font-size:13px;">🕒 ${timeStr}</strong>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr auto;gap:4px 12px;align-items:center;font-size:12px;font-family:var(--font-mono);">
        `
        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          const valStr = typeof val === 'number' ? `${val.toFixed(1)} cts/min` : 'N/A'
          res += `
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
            <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
            <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};text-align:right;">${valStr}</strong>
          `
        })
        res += `</div>`
        return res
      }
    },
    grid: { top: 25, right: 30, bottom: 45, left: 85 },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 22,
        bottom: 10,
        fillerColor: isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)',
        borderColor: isLight ? 'rgba(2, 132, 199, 0.25)' : 'rgba(56, 189, 248, 0.3)',
        handleStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        textStyle: { color: isLight ? '#475569' : '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' },
        dataBackground: {
          lineStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
          areaStyle: { color: isLight ? 'rgba(2, 132, 199, 0.2)' : 'rgba(56, 189, 248, 0.2)' }
        }
      }
    ],
    xAxis: {
      type: 'time',
      splitLine: {
        show: true,
        lineStyle: {
          color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
          type: 'dashed'
        }
      },
      axisLine: {
        lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }
      },
      axisLabel: {
        color: isLight ? '#475569' : '#CBD5E1',
        fontSize: 13,
        fontFamily: 'var(--font-mono)'
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      name: 'COUNTS (cts/min)',
      nameLocation: 'middle',
      nameGap: 52,
      nameTextStyle: {
        color: isLight ? '#0284C7' : '#38BDF8',
        fontSize: 16,
        fontWeight: 800,
        fontFamily: 'var(--font-mono)'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
          type: 'dashed'
        }
      },
      axisLine: {
        lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }
      },
      axisLabel: {
        color: isLight ? '#475569' : '#CBD5E1',
        fontSize: 13,
        fontFamily: 'var(--font-mono)'
      }
    },
    series: LINES.map(l => {
      const color = isLight ? l.color : l.darkColor
      return {
        name: l.label,
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        triggerEvent: true,
        lineStyle: { width: 2.2, color },
        itemStyle: { color },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 4.0 }
        },
        blur: {
          lineStyle: { opacity: 0.15 }
        },
        data: data.map(d => [d.time_tag, d[l.key]])
      }
    })
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(2, 132, 199, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#0369A1' : '#38BDF8',
            margin: 0,
            letterSpacing: -0.5
          }}>
            MAW / TOTAL COUNTS
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Mawson Antarctic Station · Cosmic Ray Count Rate Channels & Forbush Modulation
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: 'transparent', border: 'none',
              color: isLight ? '#0284C7' : '#38BDF8', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
            <span>{fetching ? 'FETCHING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* Row 2 Toolbar: DateRangeToolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#0284C7' : '#38BDF8'}
          loading={loading}
        />
      </div>

      {/* Telemetry Metrics Strip */}
      {latest && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20
        }}>
          {LINES.map(l => {
            const color = isLight ? l.color : l.darkColor
            return (
              <div
                key={l.key}
                style={{
                  padding: '12px 18px',
                  background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                  border: `1px solid ${isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 6,
                  boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.03)' : undefined
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                  {l.label.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "'Orbitron', var(--font-sans), monospace",
                    color
                  }}>
                    {latest[l.key] ? Number(latest[l.key]).toFixed(1) : '—'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                    cts/min
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card
          title="TOTAL COSMIC RAY COUNTS — MAWSON STATION"
          subtitle="MONITORING 4 DISCRETE CHANNELS (FORBUSH DECREASE OBSERVED AS SUDDEN DROP)"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(2, 132, 199, 0.18)' : undefined,
          }}
        >
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
            {LINES.map(l => {
              const color = isLight ? l.color : l.darkColor
              return (
                <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>
                  <div style={{ width: 18, height: 3, background: color, borderRadius: 2 }} />
                  {l.label}
                </div>
              )
            })}
          </div>
          <ReactECharts option={option} style={{ height: 520, width: '100%' }} notMerge={true} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#0284C7' : '#38BDF8'}
        tabs={[
          { id: 'usage', label: '01. USAGE (การใช้งาน)' },
          { id: 'impacts', label: '02. IMPACTS (ผลกระทบ)' },
          { id: 'details', label: '03. DETAILS (ข้อมูลอุปกรณ์)' },
          { id: 'credits', label: '04. DATA SOURCE & CREDITS (แหล่งข้อมูล)' }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              การติดตามช่องสัญญาณตรวจวัดนิวตรอนสถานี Mawson
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', lineHeight: '1.7' }}>
              สถานี Mawson แอนตาร์กติกา เป็นหนึ่งในสถานีตรวจวัดรังสีคอสมิกที่สำคัญที่สุดในซีกโลกใต้ มีการแบ่งช่องสัญญาณออกเป็น 4 ประเภท:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div style={{
                background: isLight ? '#F0F9FF' : 'rgba(56, 189, 248, 0.06)',
                padding: 14, borderRadius: 6,
                border: `1px solid ${isLight ? '#BAE6FD' : 'rgba(56, 189, 248, 0.2)'}`
              }}>
                <strong style={{ color: isLight ? '#0284C7' : '#38BDF8', fontSize: 13 }}>NM Corrected (ปรับแก้ความกดแล้ว): </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: isLight ? '#334155' : '#94A3B8', lineHeight: '1.5' }}>
                  เป็นค่ามาตรฐานทางวิทยาศาสตร์ที่หักล้างผลกระทบของความกดอากาศออก เพื่อสังเกตการณ์ความแปรผันของรังสีคอสมิกจากอวกาศอย่างแท้จริง
                </p>
              </div>
              <div style={{
                background: isLight ? '#F5F3FF' : 'rgba(168, 85, 247, 0.06)',
                padding: 14, borderRadius: 6,
                border: `1px solid ${isLight ? '#DDD6FE' : 'rgba(168, 85, 247, 0.2)'}`
              }}>
                <strong style={{ color: isLight ? '#7C3AED' : '#C084FC', fontSize: 13 }}>Bare Tubes (หลอดเปลือย): </strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: isLight ? '#334155' : '#94A3B8', lineHeight: '1.5' }}>
                  ตรวจวัดอนุภาคนิวตรอนพลังงานต่ำ (Thermal/Epithermal) ช่วยเปรียบเทียบสเปกตรัมพลังงานของอนุภาค
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              การเฝ้าระวังพายุสุริยะและเหตุการณ์ Forbush Decrease
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', lineHeight: '1.7' }}>
              เมื่อเกิดพายุสุริยะรุนแรง (CME) พัดผ่านโลก ม่านแม่เหล็กของพายุจะปัดรังสีคอสมิก ทำให้อัตราการนับนิวตรอนทุติยภูมิดิ่งลงอย่างฉับพลัน:
            </p>
            <div style={{
              background: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.08)',
              padding: 16, borderRadius: 6,
              border: `1px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.25)'}`
            }}>
              <h5 style={{ color: '#D97706', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                จุดสังเกตสำคัญในกราฟ
              </h5>
              <p style={{ color: isLight ? '#78350F' : '#FCD34D', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                หากเส้น NM Corrected และ Bare Corrected ตกฮวบลงพร้อมกันเกิน 3-10% ภายในไม่กี่ชั่วโมง แสดงว่าโลกกำลังอยู่ในใจกลางของพายุสุริยะขนาดใหญ่
              </p>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              ข้อมูลสถานีวิจัย Mawson (Antarctica)
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8', width: '35%' }}>ตำแหน่งพิกัด</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>67°36'S, 62°52'E (ชายฝั่ง Mac. Robertson Land)</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>ความสูงจากระดับน้ำทะเล</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>15 เมตร</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>Rigidity Cutoff</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>0.22 GV (ตรวจจับอนุภาคพลังงานต่ำได้ละเอียดมาก)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>การจัดประเภทอุปกรณ์</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>18-NM64 Neutron Monitor + 6 Bare Counters</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{
              color: isLight ? '#0C1E35' : '#F8FAFC',
              margin: '0 0 14px 0',
              fontSize: 15,
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontWeight: 700
            }}>
              แหล่งที่มาของข้อมูล & เครดิต (Data Source & Credits)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 12,
                color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>Australian Antarctic Division (AAD): </strong>
                Space and Atmospheric Physics (SAP) Group
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 12,
                color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>Bureau of Meteorology (BOM / SWS): </strong>
                Australian Space Weather Forecasting Centre
              </div>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
