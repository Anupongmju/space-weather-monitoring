import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchMawToday, loadMawScatter } from '../../services/mawService'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import { useTheme } from '../../context/ThemeContext'
import { RefreshCw } from 'lucide-react'

export default function MawScatter() {
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
      const d = await loadMawScatter(limit)
      const scatter = Array.isArray(d)
        ? d
            .filter(r => r.pressure > 0 && r.nm_uncorrected > 0)
            .map(r => ({ x: r.pressure, y: r.nm_uncorrected, time: r.time_tag }))
        : []
      setData(scatter)
    } catch (e) {
      console.error('Failed loading MAW scatter data:', e)
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
  }, [limit])

  useAutoFetch(async () => {
    const d = await loadMawScatter(limit)
    const scatter = Array.isArray(d)
      ? d
          .filter(r => r.pressure > 0 && r.nm_uncorrected > 0)
          .map(r => ({ x: r.pressure, y: r.nm_uncorrected, time: r.time_tag }))
      : []
    setData(scatter)
  }, 60000)

  const regression = () => {
    if (data.length < 2) return null
    const n = data.length
    const sx = data.reduce((s, d) => s + d.x, 0)
    const sy = data.reduce((s, d) => s + d.y, 0)
    const sxy = data.reduce((s, d) => s + d.x * d.y, 0)
    const sxx = data.reduce((s, d) => s + d.x * d.x, 0)
    const denom = n * sxx - sx * sx
    if (denom === 0) return null
    const slope = (n * sxy - sx * sy) / denom
    const intercept = (sy - slope * sx) / n
    return { slope, intercept }
  }

  const reg = regression()
  const xMin = data.length ? Math.min(...data.map(d => d.x)) : 0
  const xMax = data.length ? Math.max(...data.map(d => d.x)) : 0
  const regLine = reg ? [
    [xMin, Number((reg.slope * xMin + reg.intercept).toFixed(2))],
    [xMax, Number((reg.slope * xMax + reg.intercept).toFixed(2))],
  ] : []

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#7C3AED' : 'rgba(168, 85, 247, 0.6)',
      borderWidth: 1.5,
      padding: 12,
      extraCssText: isLight
        ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
        : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      formatter: (params: any) => {
        if (params.seriesType === 'scatter') {
          const pt = params.data
          const timeStr = pt[2] ? new Date(pt[2]).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : ''
          return `
            <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
              <strong style="color:${isLight ? '#7C3AED' : '#C084FC'};font-family:var(--font-mono);font-size:13px;">🕒 ${timeStr}</strong>
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;font-family:var(--font-mono);">
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">Pressure:</span>
              <strong style="color:${isLight ? '#D97706' : '#F59E0B'};">${pt[0].toFixed(1)} mbar</strong>
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">NM Uncorrected:</span>
              <strong style="color:${isLight ? '#0284C7' : '#38BDF8'};">${pt[1].toFixed(1)} cts</strong>
            </div>
          `
        }
        return `<div style="font-family:var(--font-mono);font-size:13px;color:${isLight ? '#7C3AED' : '#C084FC'};">Linear Regression Fit</div>`
      }
    },
    grid: { top: 25, right: 30, bottom: 50, left: 85 },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, yAxisIndex: 0 }
    ],
    xAxis: {
      type: 'value',
      name: 'Pressure (mbar)',
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: {
        color: isLight ? '#D97706' : '#F59E0B',
        fontSize: 14,
        fontWeight: 800,
        fontFamily: 'var(--font-mono)'
      },
      scale: true,
      splitLine: {
        show: true,
        lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
      },
      axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    },
    yAxis: {
      type: 'value',
      name: 'NM Uncorrected (cts/min)',
      nameLocation: 'middle',
      nameGap: 52,
      nameTextStyle: {
        color: isLight ? '#0284C7' : '#38BDF8',
        fontSize: 14,
        fontWeight: 800,
        fontFamily: 'var(--font-mono)'
      },
      scale: true,
      splitLine: {
        show: true,
        lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
      },
      axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    },
    series: [
      {
        name: 'Data Point',
        type: 'scatter',
        symbolSize: 8,
        itemStyle: {
          color: isLight ? 'rgba(124, 58, 237, 0.65)' : 'rgba(168, 85, 247, 0.75)',
          borderColor: isLight ? '#7C3AED' : '#C084FC',
          borderWidth: 1
        },
        emphasis: {
          scale: 1.5,
          itemStyle: {
            color: isLight ? '#D97706' : '#FBBF24',
            borderColor: '#FFFFFF',
            borderWidth: 2
          }
        },
        data: data.map(d => [d.x, d.y, d.time])
      },
      ...(regLine.length ? [{
        name: 'Fit Line',
        type: 'line',
        data: regLine,
        showSymbol: false,
        lineStyle: {
          color: isLight ? '#DC2626' : '#F87171',
          width: 2.5,
          type: 'solid'
        }
      }] : [])
    ]
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(124, 58, 237, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#5B21B6' : '#C084FC',
            margin: 0,
            letterSpacing: -0.5
          }}>
            MAW / SCATTER CORRELATION
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Pressure vs. Uncorrected Neutron Counts · Barometric Absorption Fit Line
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
              color: isLight ? '#7C3AED' : '#C084FC', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
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
          accentColor={isLight ? '#7C3AED' : '#C084FC'}
          loading={loading}
        />
      </div>

      {/* Regression Summary Card */}
      {reg && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', marginBottom: 20, flexWrap: 'wrap', gap: 12,
          background: isLight ? '#F5F3FF' : 'rgba(124, 58, 237, 0.08)',
          border: `1px solid ${isLight ? '#DDD6FE' : 'rgba(124, 58, 237, 0.25)'}`,
          borderRadius: 6, fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isLight ? '#6D28D9' : '#C084FC' }}>
              BAROMETRIC REGRESSION FIT:
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? '#0F172A' : '#F8FAFC' }}>
              Slope = {reg.slope.toFixed(2)} cts/mbar &nbsp;|&nbsp; Intercept = {reg.intercept.toFixed(1)}
            </span>
          </div>
          <span style={{
            fontSize: 12,
            padding: '3px 8px',
            borderRadius: 4,
            background: reg.slope < 0 ? (isLight ? '#DCFCE7' : 'rgba(34, 197, 94, 0.2)') : (isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.2)'),
            color: reg.slope < 0 ? (isLight ? '#166534' : '#4ADE80') : (isLight ? '#991B1B' : '#F87171'),
            fontWeight: 700
          }}>
            {reg.slope < 0 ? '✓ NORMAL INVERSE CORRELATION' : '⚠ ATYPICAL POSITIVE SLOPE'}
          </span>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <Card
          title="SCATTER DISTRIBUTION: BAROMETRIC PRESSURE VS NM UNCORRECTED COUNTS"
          subtitle="ILLUSTRATES THE INVERSE ABSORPTION RELATIONSHIP BETWEEN MASS OF ATMOSPHERE AND NEUTRON YIELDS"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(124, 58, 237, 0.18)' : undefined,
          }}
        >
          <ReactECharts option={option} style={{ height: 540, width: '100%' }} notMerge={true} />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#7C3AED' : '#C084FC'}
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
              ความสัมพันธ์เชิงเส้นผกผัน (Inverse Linear Correlation)
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: 0, lineHeight: '1.7' }}>
              กราฟกระจายตัวนี้แสดงความสัมพันธ์โดยตรงระหว่างความกดอากาศ (แกน X) กับอัตราการนับนิวตรอนดิบ (แกน Y) จุดข้อมูลควรเรียงตัวเป็นแนวลาดลง (Negative Slope) ยิ่งความกดอากาศสูง นิวตรอนยิ่งลดลงเนื่องจากถูกชั้นบรรยากาศดูดซับ
            </p>
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
              การวิเคราะห์ความผิดปกติของข้อมูล
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: 0, lineHeight: '1.7' }}>
              หากจุดข้อมูลกระจายตัวออกจากเส้นแนวโน้มอย่างมาก (Outliers) อาจบ่งชี้ว่าเกิดพายุสุริยะครั้งใหญ่ (Forbush decrease หรือ Solar Particle Event) ที่ทำให้ปริมาณรังสีคอสมิกเปลี่ยนแปลงอย่างรวดเร็วโดยไม่ขึ้นกับความกดอากาศ
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
              แบบจำลองการถดถอยเชิงเส้น (Linear Regression)
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: 0, lineHeight: '1.7' }}>
              ความชันของเส้น Fit line ช่วยให้นักวิจัยสามารถตรวจสอบความแม่นยำของสัมประสิทธิ์การปรับแก้ความกดอากาศ (Barometric Coefficient &beta;) ประจำสถานี
            </p>
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
                borderLeft: `3px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
                paddingLeft: 12,
                color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>Mawson Station Cosmic Ray Data · Australian Antarctic Division (AAD)</strong>
              </div>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}