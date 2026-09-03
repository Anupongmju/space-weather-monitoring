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
import { RefreshCw, AlertTriangle } from 'lucide-react'

const STD_COLORS = [
  '#0284C7', '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#059669',
  '#0891B2', '#DB2777', '#E11D48', '#0D9488', '#0284C7', '#D97706',
  '#DC2626', '#7C3AED', '#2563EB', '#059669', '#0891B2', '#DB2777'
]
const STD_DARK_COLORS = [
  '#38BDF8', '#FBBF24', '#F87171', '#C084FC', '#60A5FA', '#34D399',
  '#22D3EE', '#F472B6', '#FB7185', '#2DD4BF', '#38BDF8', '#FBBF24',
  '#F87171', '#C084FC', '#60A5FA', '#34D399', '#22D3EE', '#F472B6'
]

const BARE_COLORS = ['#0284C7', '#2563EB', '#059669', '#7C3AED', '#D97706', '#DC2626']
const BARE_DARK_COLORS = ['#38BDF8', '#60A5FA', '#34D399', '#C084FC', '#FBBF24', '#F87171']

const STD_TUBES = Array.from({ length: 18 }, (_, i) => ({ key: `tube_${i + 1}`, label: `T${i + 1}` }))
const BARE_TUBES = Array.from({ length: 6 }, (_, i) => ({ key: `bare_${i + 1}`, label: `B${i + 1}` }))

export default function MawTubes() {
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
      console.error('Failed loading MAW tube data:', e)
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

  const dropouts = STD_TUBES.filter(t => {
    const zeros = data.filter(d => (d[t.key] || 0) === 0).length
    return data.length > 0 && zeros / data.length > 0.5
  }).map(t => t.label)

  const times = data.map(d => new Date(d.time_tag).getTime()).filter(t => !isNaN(t))
  const minT = times.length ? Math.min(...times) : undefined
  const maxT = times.length ? Math.max(...times) : undefined

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#2563EB' : 'rgba(59,130,246,0.6)',
      borderWidth: 1.5,
      padding: 12,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight
        ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
        : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: {
        type: 'line',
        lineStyle: { color: isLight ? '#2563EB' : '#38BDF8', type: 'dashed', width: 1.5 }
      }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    grid: [
      { top: 25, left: 85, right: 30, height: '42%' },
      { top: '56%', left: 85, right: 30, height: '36%' }
    ],
    xAxis: [
      {
        gridIndex: 0,
        type: 'time',
        min: minT,
        max: maxT,
        axisLabel: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'time',
        min: minT,
        max: maxT,
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    yAxis: [
      {
        gridIndex: 0,
        type: 'value',
        scale: true,
        name: 'STANDARD (cts)',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: {
          color: isLight ? '#0284C7' : '#38BDF8',
          fontSize: 14,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)'
        },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      },
      {
        gridIndex: 1,
        type: 'value',
        scale: true,
        name: 'BARE (cts)',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: {
          color: isLight ? '#059669' : '#34D399',
          fontSize: 14,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)'
        },
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'var(--font-mono)' },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
      {
        type: 'slider',
        xAxisIndex: [0, 1],
        height: 20,
        bottom: 5,
        fillerColor: isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)',
        borderColor: isLight ? 'rgba(2, 132, 199, 0.25)' : 'rgba(56, 189, 248, 0.3)',
        handleStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        textStyle: { color: isLight ? '#475569' : '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' }
      }
    ],
    series: [
      ...STD_TUBES.map((t, i) => {
        const color = isLight ? STD_COLORS[i] : STD_DARK_COLORS[i]
        return {
          name: t.label,
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          connectNulls: true,
          triggerEvent: true,
          lineStyle: { width: 1.8, color },
          itemStyle: { color },
          emphasis: { focus: 'series', lineStyle: { width: 3.5 } },
          data: data.map(d => [d.time_tag, d[t.key]])
        }
      }),
      ...BARE_TUBES.map((t, i) => {
        const color = isLight ? BARE_COLORS[i] : BARE_DARK_COLORS[i]
        return {
          name: t.label,
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          connectNulls: true,
          triggerEvent: true,
          lineStyle: { width: 1.8, color },
          itemStyle: { color },
          emphasis: { focus: 'series', lineStyle: { width: 3.5 } },
          data: data.map(d => [d.time_tag, d[t.key]])
        }
      })
    ]
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
            MAW / INDIVIDUAL TUBES
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            18 Standard NM64 + 6 Bare Counters · Hardware Quality Control & Tube Health Telemetry
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

      {/* Dropouts Alert Banner */}
      {dropouts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px', marginBottom: 20,
          background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: 6, color: '#DC2626', fontFamily: 'var(--font-mono)', fontSize: 13
        }}>
          <AlertTriangle size={18} />
          <span>
            <strong>Hardware Alert:</strong> Detected persistent zero count rate (&gt;50% dropout) on tubes: <strong>{dropouts.join(', ')}</strong>. Sensor check recommended.
          </span>
        </div>
      )}

      {/* Main Dual Chart Card */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="TUBE-LEVEL COUNT RATES (T1–T18 STANDARD & B1–B6 BARE)"
          subtitle="CONTINUOUS MONITORING ACROSS ALL 24 INDEPENDENT DETECTOR TUBES"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(2, 132, 199, 0.18)' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#0284C7' : '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                18 STANDARD NM64:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STD_TUBES.map((t, i) => {
                  const color = isLight ? STD_COLORS[i] : STD_DARK_COLORS[i]
                  return (
                    <span key={t.key} style={{
                      padding: '2px 6px',
                      background: isLight ? `${color}18` : `${color}25`,
                      border: `1px solid ${color}`,
                      borderRadius: 3,
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color,
                      fontWeight: 700
                    }}>
                      {t.label}
                    </span>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#059669' : '#34D399', fontFamily: 'var(--font-mono)' }}>
                6 BARE TUBES:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {BARE_TUBES.map((t, i) => {
                  const color = isLight ? BARE_COLORS[i] : BARE_DARK_COLORS[i]
                  return (
                    <span key={t.key} style={{
                      padding: '2px 6px',
                      background: isLight ? `${color}18` : `${color}25`,
                      border: `1px solid ${color}`,
                      borderRadius: 3,
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color,
                      fontWeight: 700
                    }}>
                      {t.label}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <ReactECharts option={option} style={{ height: 600, width: '100%' }} notMerge={true} />
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
              การตรวจสอบคุณภาพระดับหลอดตรวจวัด (Hardware QC)
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', lineHeight: '1.7' }}>
              Neutron Monitor ประกอบด้วยหลอดตรวจจับก๊าซฮีเลียม-3 หรือโบรอนไตรฟลูออไรด์ (BF3) เรียงกันหลายหลอด การติดตามรายหลอดช่วยให้:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 12,
                fontSize: 13,
                color: isLight ? '#334155' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>ตรวจจับหลอดเสียหรือมีปัญหาไฟกระชาก: </strong>
                หากมีหลอดใดหลอดหนึ่งค่าเป็น 0 หรือนับผิดปกติเกินเพื่อน ระบบสามารถคัดแยกออกจากผลรวมก่อนประมวลผลทางวิทยาศาสตร์
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
              ความเชื่อมั่นของข้อมูลเตือนภัยพายุสุริยะ
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: 0, lineHeight: '1.7' }}>
              การยืนยันว่าการลดลงของสัญญาณ (Forbush Decrease) เกิดขึ้นจริงในทุกๆ หลอดพร้อมๆ กัน เป็นการยืนยันอย่างแน่ชัดว่าเกิดจากปรากฏการณ์ในอวกาศ ไม่ใช่ความผิดพลาดของวงจรไฟฟ้าภายในสถานี
            </p>
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
              โครงสร้างของอุปกรณ์ตรวจจับ Mawson
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8', width: '35%' }}>Standard Tubes (T1–T18)</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>หลอด NM64 พร้อมเกราะตะกั่วและตัวชะลอพาราฟิน (Moderator)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>Bare Tubes (B1–B6)</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>หลอดตรวจวัดเปลือย ไม่มีตัวชะลอความเร็ว</td>
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
              แหล่งที่มาของข้อมูล & เครดิต
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 12,
                color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>Australian Antarctic Division (AAD) & Bureau of Meteorology (BOM / SWS)</strong>
              </div>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
