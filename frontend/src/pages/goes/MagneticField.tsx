import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveGoesMag, loadGoesMag } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useTheme } from '../../context/ThemeContext'
import { formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'

export default function MagneticField() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef(null)

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined
      const d = await loadGoesMag(limit, sDate, eDate)
      if (Array.isArray(d)) {
        setData(d)
      } else {
        setData([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveGoesMag()
    } catch (e) { }
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

  const { minTs, maxTs } = getTimeDomain(data)
  const midnightDividers = getMidnightDividerMarkLines(getMidnightTimestamps(minTs, maxTs), isLight)

  const option = {
    useUTC: true,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
      borderColor: isLight ? '#A7F3D0' : 'rgba(52,211,153,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#059669' : '#34D399', type: 'dashed', width: 1.5 } },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const rawTime = params[0]?.value ? params[0].value[0] : (params[0]?.axisValue || '')
        const timeStr = formatUTCTime(rawTime, true)
        let html = `<div style="font-family:var(--font-mono);font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};font-weight:700;color:${isLight ? '#059669' : '#34D399'}">
          🕒 ${timeStr}
        </div>`
        params.forEach((p: any) => {
          const val = Array.isArray(p.value) ? p.value[1] : p.value
          const valStr = typeof val === 'number' ? val.toFixed(2) : '—'
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;margin:3px 0;font-family:var(--font-mono);">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">${p.seriesName}</span>
            </span>
            <strong style="color:${isLight ? '#0F172A' : '#F8FAFC'};">${valStr} nT</strong>
          </div>`
        })
        return html
      }
    },
    legend: {
      show: true,
      top: 0,
      textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' }
    },
    grid: { top: 35, right: 20, bottom: 45, left: 85 },
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
      splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange)
    },
    yAxis: {
      type: 'value',
      name: 'nT',
      nameLocation: 'middle',
      nameGap: 56,
      nameTextStyle: {
        color: isLight ? '#059669' : '#34D399',
        fontSize: 14.5,
        fontWeight: 700,
        fontFamily: 'sans-serif'
      },
      splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
      axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif' }
    },
    series: [
      {
        name: 'Hp (Parallel)',
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2.2, opacity: 1 },
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        data: data.map(d => [d.time_tag, d.hp]),
        markLine: combineMarkLines(midnightDividers),
      },
      {
        name: 'He (Earthward)',
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2.2, opacity: 1 },
        itemStyle: { color: isLight ? '#059669' : '#34D399' },
        data: data.map(d => [d.time_tag, d.he])
      },
      {
        name: 'Hn (Normal/East)',
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2.2, opacity: 1 },
        itemStyle: { color: isLight ? '#D97706' : '#FBBF24' },
        data: data.map(d => [d.time_tag, d.hn])
      },
      {
        name: 'Total (Ht)',
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2.2, type: 'dashed', opacity: 1 },
        itemStyle: { color: isLight ? '#7C3AED' : '#A855F7' },
        data: data.map(d => [d.time_tag, d.total])
      },
    ]
  }

  const exportColumns = useMemo((): ExportColumn[] => [
    { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
    { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') },
    { key: 'hp', label: 'Hp_Parallel(nT)', width: 16 },
    { key: 'he', label: 'He_Earthward(nT)', width: 18 },
    { key: 'hn', label: 'Hn_Normal(nT)', width: 16 },
    { key: 'total', label: 'Ht_Total(nT)', width: 14 }
  ], [])

  const exportTimeRange = appliedRange
    ? `${appliedRange.startDate} to ${appliedRange.endDate}`
    : `Past ${limit / 1440} Day(s)`

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 26, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(26, 109, 181, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#0C1E35' : '#34D399',
            margin: 0,
            letterSpacing: -0.5
          }}>
            GOES / MAGNETIC FIELD
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Geostationary Magnetic Field Vectors — Hp, He, Hn, Total (nT) · GOES Magnetometer
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14, color: isLight ? '#059669' : '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: isLight ? '#059669' : '#34D399', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            {fetching ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Dedicated Row 2 Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <DateRangeToolbar
          limit={limit}
          onLimitChange={setLimit}
          appliedRange={appliedRange}
          onApplyRange={setAppliedRange}
          accentColor={isLight ? '#059669' : '#34D399'}
          loading={loading}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <Card
          title="MAGNETIC FIELD COMPONENTS — Hp, He, Hn, Ht"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {panLoading && (
                <span style={{ fontSize: 13, color: isLight ? '#059669' : '#34D399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              <ExportChartMenu
                chartRef={chartRef}
                data={data}
                columns={exportColumns}
                metadata={{
                  station: 'GOES (GEOSTATIONARY ORBIT)',
                  viewTitle: 'GOES GEOSTATIONARY MAGNETIC FIELD',
                  description: 'Geostationary Magnetic Field Components: Parallel (Hp), Earthward (He), Normal (Hn), Total (Ht)',
                  timeRangeText: exportTimeRange,
                  totalRecords: data.length
                }}
                filenameBase={`GOES_MAG_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                accentColor={isLight ? '#059669' : '#34D399'}
              />
            </div>
          }
        >
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: 520, width: '100%' }}
            onChartReady={onChartReady}
            onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
          />
        </Card>
      )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={isLight ? '#059669' : '#34D399'}
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
              การวัดค่าสนามแม่เหล็กโลกแบบ 3 มิติ (Hp, He, Hn, Ht)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>Magnetic Field</strong> ตรวจวัดความเข้มสนามแม่เหล็กโลกในวงโคจรค้างฟ้า (Geosynchronous) ติดตามการกดทับของลมสุริยะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#059669' : '#34D399'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Hp (Parallel Component):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>ฉากกับวงโคจร (ทิศเหนือ) เฝ้าระวังหลัก หากลมสุริยะกดทับรุนแรงอาจดิ่งติดลบ</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>He &amp; Hn (Earth-ward &amp; Normal):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>องค์ประกอบชี้เข้าหาโลก (He) และทิศตะวันออก (Hn)</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Ht (Total Field Magnitude):</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>ความเข้มรวมเวกเตอร์ 3 แกน (Ht = √(Hp² + He² + Hn²)) ดูภาพรวมปั่นป่วน</span>
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
              ผลกระทบจากความแปรปรวนของสนามแม่เหล็ก (Geomagnetic Storm Impacts)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              พายุสุริยะกระแทกสนามแม่เหล็กโลก ก่อผลกระทบต่อเทคโนโลยี:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Magnetopause Crossing</h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  หาก Hp ติดลบ แสดงว่าสนามแม่เหล็กโลกร่นลึก ดาวเทียมหลุดไปเผชิญพายุสุริยะภายนอกโดยตรง
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFF7ED' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FED7AA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#EA580C', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>กระแสไฟฟ้าเหนี่ยวนำ GIC</h5>
                <p style={{ color: isLight ? '#9A3412' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  ความผันผวนแม่เหล็กเหนี่ยวนำกระแส GIC เข้าสู่ระบบสายส่งไฟฟ้าแรงสูงเสี่ยงทำหม้อแปลงเสียหาย
                </p>
              </div>
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
              รายละเอียดทางเทคนิคของระบบตรวจวัดสนามแม่เหล็ก
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>อุปกรณ์ตรวจวัด</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>Magnetometer ติดตั้งบนดาวเทียม GOES ของ NOAA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Geosynchronous Orbit (วงโคจรค้างฟ้า)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>หน่วยการวัด</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>nT (NanoTesla - นาโนเทสลา)</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>แกนเวกเตอร์ 3 มิติ</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>Hp (ฉาก), He (ชี้เข้าโลก), Hn (ทิศตะวันออก), Ht (รวม)</td>
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
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 14px 0',
              lineHeight: '1.7'
            }}>
              ข้อมูลความปั่นป่วนแม่เหล็กโลกได้รับการประมวลผลจากสถาบันสากล:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#334155' : '#94A3B8' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#059669' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ศูนย์พยากรณ์และเฝ้าระวังภัย NOAA
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#059669' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>GOES Satellite Mission:</strong> เครือข่ายดาวเทียมวัดค่าสภาพอากาศและสนามแม่เหล็ก
              </div>
            </div>
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              fontSize: 13,
              color: isLight ? '#475569' : '#FBBF24',
              fontFamily: 'var(--font-mono)'
            }}>
              ข้อมูลอ้างอิง API: ค่าสนามแม่เหล็กดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#059669' : '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
