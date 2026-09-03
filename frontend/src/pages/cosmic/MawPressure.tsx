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

export default function MawPressure() {
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
      console.error('Failed loading MAW pressure data:', e)
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

  const avg = data.length ? (data.reduce((s, d) => s + (d.pressure || 0), 0) / data.length) : null
  const latest = data[data.length - 1]
  const minP = data.length ? Math.min(...data.map(d => d.pressure || 9999).filter(p => p > 0)) : null
  const maxP = data.length ? Math.max(...data.map(d => d.pressure || 0).filter(p => p > 0)) : null

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#D97706' : 'rgba(245, 158, 11, 0.6)',
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
        const val = params[0]?.value[1]
        const valStr = typeof val === 'number' ? `${val.toFixed(2)} mbar` : 'N/A'

        return `
          <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
            <strong style="color:${isLight ? '#D97706' : '#FBBF24'};font-family:var(--font-mono);font-size:13px;">🕒 ${timeStr}</strong>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13px;font-family:var(--font-mono);">
            <span style="color:${isLight ? '#475569' : '#CBD5E1'};">Atmospheric Pressure:</span>
            <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr}</strong>
          </div>
        `
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
        fillerColor: isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.15)',
        borderColor: isLight ? 'rgba(217, 119, 6, 0.25)' : 'rgba(245, 158, 11, 0.3)',
        handleStyle: { color: isLight ? '#D97706' : '#F59E0B' },
        textStyle: { color: isLight ? '#475569' : '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' },
        dataBackground: {
          lineStyle: { color: isLight ? '#D97706' : '#F59E0B' },
          areaStyle: { color: isLight ? 'rgba(217, 119, 6, 0.2)' : 'rgba(245, 158, 11, 0.2)' }
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
      name: 'PRESSURE (mbar)',
      nameLocation: 'middle',
      nameGap: 52,
      nameTextStyle: {
        color: isLight ? '#D97706' : '#F59E0B',
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
    series: [
      {
        name: 'Pressure',
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        triggerEvent: true,
        lineStyle: { width: 2.2, color: isLight ? '#D97706' : '#F59E0B' },
        itemStyle: { color: isLight ? '#D97706' : '#F59E0B' },
        areaStyle: {
          color: isLight
            ? 'rgba(217, 119, 6, 0.08)'
            : 'rgba(245, 158, 11, 0.08)'
        },
        data: data.map(d => [d.time_tag, d.pressure]),
        markLine: avg ? {
          data: [{ yAxis: Number(avg.toFixed(1)), name: 'Avg' }],
          lineStyle: { color: isLight ? '#EA580C' : '#FB923C', type: 'dashed', opacity: 0.8, width: 1.8 },
          label: {
            formatter: `Avg: {c} mbar`,
            position: 'end',
            color: isLight ? '#C2410C' : '#FDBA74',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700
          }
        } : undefined
      }
    ]
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(217, 119, 6, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#B45309' : '#F59E0B',
            margin: 0,
            letterSpacing: -0.5
          }}>
            MAW / ATMOSPHERIC PRESSURE
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Mawson Antarctic Station Pressure · Barometric Correction Baseline for Secondary Cosmic Ray Yields
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
              color: isLight ? '#D97706' : '#F59E0B', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
            <span>{fetching ? 'FETCHING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* Row 2 Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#D97706' : '#F59E0B'}
          loading={loading}
        />
      </div>

      {/* Metrics Summary Strip */}
      {data.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 20
        }}>
          <div style={{
            padding: '12px 18px',
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderLeft: `4px solid ${isLight ? '#D97706' : '#F59E0B'}`,
            borderRadius: 6,
            boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.03)' : undefined
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              LATEST PRESSURE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                color: isLight ? '#B45309' : '#F59E0B'
              }}>
                {latest?.pressure ? Number(latest.pressure).toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                mbar (hPa)
              </span>
            </div>
          </div>

          <div style={{
            padding: '12px 18px',
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderLeft: `4px solid ${isLight ? '#EA580C' : '#FB923C'}`,
            borderRadius: 6,
            boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.03)' : undefined
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              WINDOW AVERAGE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                color: isLight ? '#EA580C' : '#FB923C'
              }}>
                {avg ? avg.toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                mbar
              </span>
            </div>
          </div>

          <div style={{
            padding: '12px 18px',
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderLeft: '4px solid #3B82F6',
            borderRadius: 6,
            boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.03)' : undefined
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              MIN / MAX RANGE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                color: isLight ? '#1D4ED8' : '#60A5FA'
              }}>
                {minP ? minP.toFixed(1) : '—'} / {maxP ? maxP.toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                mbar
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card
          title="SURFACE ATMOSPHERIC PRESSURE — MAWSON"
          subtitle="CONTINUOUS BAROMETRIC LOG (INVERSELY CORRELATED WITH SECONDARY NEUTRON RATE)"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(217, 119, 6, 0.18)' : undefined,
          }}
        >
          <ReactECharts option={option} style={{ height: 520, width: '100%' }} notMerge={true} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#D97706' : '#F59E0B'}
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
              ความสำคัญของค่าความกดอากาศต่อการวัดรังสีคอสมิก
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', lineHeight: '1.7' }}>
              มวลของบรรยากาศเหนือสถานีทำหน้าที่เป็นตัวดูดซับอนุภาครังสีคอสมิก (Atmospheric Absorption):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#D97706' : '#F59E0B'}`,
                paddingLeft: 14,
                background: isLight ? '#FFFBEB' : 'transparent',
                padding: '8px 14px',
                borderRadius: '0 6px 6px 0'
              }}>
                <span style={{ color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>สัมประสิทธิ์ความกดอากาศ (Barometric Coefficient): </span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13 }}>
                  สำหรับสถานี Mawson มีค่าประมาณ -0.74% ต่อมิลลิบาร์ หากความกดอากาศสูงขึ้น 1 mbar อัตราการนับนิวตรอนดิบจะลดลงประมาณ 0.74%
                </span>
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
              การตัดผลกระทบทางอุตุนิยมวิทยาออกจากข้อมูลอวกาศ
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', lineHeight: '1.7' }}>
              หากไม่มีการปรับแก้ความกดอากาศ (Barometric Correction) พายุลมหนาวหรือหย่อมความกดอากาศต่ำในแอนตาร์กติกาอาจทำให้เข้าใจผิดว่าเกิดการเพิ่มขึ้นของรังสีคอสมิกจากอวกาศ (GLE):
            </p>
            <div style={{
              background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.08)',
              padding: 16, borderRadius: 6,
              border: `1px solid ${isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.25)'}`
            }}>
              <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                การปรับแก้แบบเรียลไทม์
              </h5>
              <p style={{ color: isLight ? '#7F1D1D' : '#FCA5A5', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                สูตรคำนวณ: N(corr) = N(raw) * exp(-β * (P - P0)) ช่วยให้แยกแยะการเปลี่ยนแปลงของสภาพอวกาศที่แท้จริงออกจากสภาพอากาศท้องถิ่นได้อย่างแม่นยำ
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
              อุปกรณ์วัดความกดอากาศสถานี Mawson
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8', width: '35%' }}>ประเภทเซนเซอร์</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>Precision Digital Barometer (Vaisala / Paroscientific)</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)'}` }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>ความละเอียดการวัด</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>&plusmn;0.1 mbar</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#94A3B8' }}>ความถี่การบันทึก</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0F172A' : '#F8FAFC', fontWeight: 600 }}>บันทึกเฉลี่ยทุก 1 นาที</td>
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
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 14px 0', lineHeight: '1.7' }}>
              ข้อมูลความกดอากาศจากสถานี Mawson บันทึกและกำกับดูแลโดย:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#D97706' : '#F59E0B'}`,
                paddingLeft: 12,
                color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>Australian Antarctic Division (AAD) & Bureau of Meteorology (BOM)</strong>
              </div>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
