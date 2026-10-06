import { useState, useEffect, useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { loadMonthlySunspot, triggerFetchSunspot, SunspotRecord } from '../../services/sunspotService'
import { loadNeutron } from '../../services/cosmicService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useTheme } from '../../context/ThemeContext'
import { formatPowerOf10 } from '../../utils/formatters'
import { RefreshCw } from 'lucide-react'

export default function SunspotNumber() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<SunspotRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [fetching, setFetching] = useState<boolean>(false)
  const [timeRange, setTimeRange] = useState<'10Y' | '50Y' | '100Y' | 'ALL'>('50Y')
  const [scaleType, setScaleType] = useState<'value' | 'log'>('value')
  const [showSmooth, setShowSmooth] = useState<boolean>(true)
  const [showCosmicOverlay, setShowCosmicOverlay] = useState<boolean>(false)
  const [thuleMonthlyMap, setThuleMonthlyMap] = useState<Record<string, number>>({})
  const [cosmicLoading, setCosmicLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('usage')
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!showCosmicOverlay) return
    if (Object.keys(thuleMonthlyMap).length > 0) return

    setCosmicLoading(true)
    loadNeutron('THUL', 0)
      .then(rows => {
        const monthlyCounts: Record<string, { sum: number; count: number }> = {}
        rows.forEach((r: any) => {
          if (!r.time_tag || !r.count_rate || r.count_rate <= 0) return
          const ym = r.time_tag.slice(0, 7)
          if (!monthlyCounts[ym]) monthlyCounts[ym] = { sum: 0, count: 0 }
          monthlyCounts[ym].sum += Number(r.count_rate)
          monthlyCounts[ym].count += 1
        })

        const map: Record<string, number> = {}
        Object.keys(monthlyCounts).forEach(ym => {
          const avg = monthlyCounts[ym].sum / monthlyCounts[ym].count
          map[ym] = Math.round(avg * 10) / 10
        })

        setThuleMonthlyMap(map)
      })
      .catch(err => console.error('Error loading Thule cosmic data:', err))
      .finally(() => setCosmicLoading(false))
  }, [showCosmicOverlay, thuleMonthlyMap])

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    let startYear: number | undefined
    const currentYear = new Date().getFullYear()

    if (timeRange === '10Y') startYear = currentYear - 10
    else if (timeRange === '50Y') startYear = currentYear - 50
    else if (timeRange === '100Y') startYear = currentYear - 100
    else startYear = undefined

    try {
      const records = await loadMonthlySunspot({ startYear })
      setData(records)
    } catch (e) {
      console.error('Failed to load sunspot data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [timeRange])

  useAutoFetch(() => loadData(false), 300000)

  const fetch_ = async () => {
    setFetching(true)
    try {
      await triggerFetchSunspot()
      await loadData(false)
    } catch (e) {
      console.error('Failed to fetch from SILSO:', e)
    } finally {
      setFetching(false)
    }
  }

  // Calculate 13-month smoothed moving average
  const smoothedData = useMemo(() => {
    if (!showSmooth || data.length === 0) return []
    const result: (number | null)[] = new Array(data.length).fill(null)

    for (let i = 6; i < data.length - 6; i++) {
      let sum = 0.5 * data[i - 6].sunspot_number + 0.5 * data[i + 6].sunspot_number
      for (let j = i - 5; j <= i + 5; j++) {
        sum += data[j].sunspot_number
      }
      result[i] = Math.round((sum / 12.0) * 10) / 10
    }
    return result
  }, [data, showSmooth])

  const exportColumns: ExportColumn[] = useMemo(() => [
    { key: 'time_tag', label: 'Time Tag (YYYY-MM)', width: 18 },
    { key: 'year', label: 'Year', width: 6 },
    { key: 'month', label: 'Month', width: 6 },
    { key: 'fractional_year', label: 'Frac Year', width: 12, format: (v) => v != null ? Number(v).toFixed(3) : 'N/A' },
    { key: 'sunspot_number', label: 'SSN (Total)', width: 12, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
    { key: 'ssn_smoothed', label: 'SSN (13M Smooth)', width: 16, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' },
    { key: 'std_dev', label: 'Std Dev', width: 10, format: (v) => v != null && v >= 0 ? Number(v).toFixed(1) : 'N/A' },
    { key: 'obs_count', label: 'Observations', width: 14 },
    { key: 'cosmic_ray_thule', label: 'Thule CR (cts/min)', width: 18, format: (v) => v != null ? Number(v).toFixed(1) : 'N/A' }
  ], [])

  const exportData = useMemo(() => {
    return data.map((d, i) => {
      const ym = `${d.year}-${String(d.month).padStart(2, '0')}`
      return {
        ...d,
        ssn_smoothed: smoothedData[i] ?? null,
        cosmic_ray_thule: thuleMonthlyMap[ym] ?? null,
      }
    })
  }, [data, smoothedData, thuleMonthlyMap])

  const exportMetadata = useMemo(() => ({
    station: 'WDC-SILSO / Royal Observatory of Belgium',
    viewTitle: 'SILSO Monthly Total Sunspot Number Index',
    description: 'International Sunspot Number (ISN v2.0) monthly mean values with standard deviations and optional cosmic ray overlay.',
    timeRangeText: `${timeRange} (${data.length > 0 ? `${data[0].year}-${String(data[0].month).padStart(2, '0')} to ${data[data.length - 1].year}-${String(data[data.length - 1].month).padStart(2, '0')}` : 'N/A'})`,
    totalRecords: data.length
  }), [timeRange, data])

  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      legend: {
        show: true,
        top: 8,
        left: 'center',
        textStyle: { color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
        borderColor: isLight ? '#D97706' : 'rgba(230, 126, 34, 0.6)',
        borderWidth: 1.5,
        padding: 12,
        extraCssText: isLight
          ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 6px;'
          : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 6px;',
        textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: isLight ? '#D97706' : '#F59E0B', type: 'dashed', width: 1.5 }
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return ''
          const idx = params[0].dataIndex
          const rec = data[idx]
          if (!rec) return ''
          const ym = `${rec.year}-${String(rec.month).padStart(2, '0')}`
          let html = `
            <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'};">
              <strong style="color:${isLight ? '#D97706' : '#F59E0B'};font-family:var(--font-mono);font-size:13px;">🕒 ${ym}</strong>
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;font-family:var(--font-mono);">
              <span style="color:${isLight ? '#475569' : '#CBD5E1'};">Monthly Sunspot:</span>
              <strong style="color:${isLight ? '#D97706' : '#F59E0B'};">${rec.sunspot_number.toFixed(1)} SSN</strong>
          `
          if (rec.std_dev >= 0) {
            html += `
              <span style="color:${isLight ? '#64748B' : '#94A3B8'};">Std Dev:</span>
              <span style="color:${isLight ? '#64748B' : '#94A3B8'};">±${rec.std_dev.toFixed(1)}</span>
            `
          }
          if (thuleMonthlyMap[ym] !== undefined) {
            html += `
              <span style="color:${isLight ? '#2563EB' : '#38BDF8'};">Cosmic Ray (Thule):</span>
              <strong style="color:${isLight ? '#2563EB' : '#38BDF8'};">${thuleMonthlyMap[ym]} cts/min</strong>
            `
          }
          html += `</div>`
          return html
        }
      },
      grid: { top: 40, right: showCosmicOverlay ? 80 : 30, bottom: 45, left: 85 },
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
          textStyle: { color: isLight ? '#475569' : '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' }
        }
      ],
      xAxis: {
        type: 'category',
        data: data.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`),
        splitLine: {
          show: true,
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, fontFamily: 'var(--font-mono)' }
      },
      yAxis: showCosmicOverlay ? [
        {
          type: scaleType,
          name: 'SUNSPOT NUMBER (SSN)',
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
            lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
          },
          axisLine: { lineStyle: { color: isLight ? 'rgba(217,119,6,0.4)' : 'rgba(245,158,11,0.4)' } },
          axisLabel: {
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            formatter: scaleType === 'log' ? formatPowerOf10 : undefined
          }
        },
        {
          type: 'value',
          scale: true,
          name: 'COSMIC RAY (cts/min)',
          nameLocation: 'middle',
          nameGap: 52,
          nameTextStyle: {
            color: isLight ? '#2563EB' : '#38BDF8',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)'
          },
          splitLine: { show: false },
          axisLine: { lineStyle: { color: isLight ? 'rgba(37,99,235,0.4)' : 'rgba(56,189,248,0.4)' } },
          axisLabel: { color: isLight ? '#2563EB' : '#38BDF8', fontSize: 13, fontFamily: 'var(--font-mono)' }
        }
      ] : {
        type: scaleType,
        name: 'SUNSPOT NUMBER (SSN)',
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
          lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' }
        },
        axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
        axisLabel: {
          color: isLight ? '#475569' : '#CBD5E1',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          formatter: scaleType === 'log' ? formatPowerOf10 : undefined
        }
      },
      series: [
        {
          name: 'Monthly Total SSN',
          type: 'line',
          showSymbol: false,
          connectNulls: true,
          triggerEvent: true,
          data: data.map(d => d.sunspot_number),
          itemStyle: { color: isLight ? '#D97706' : '#F59E0B' },
          lineStyle: { width: 2.2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: isLight ? 'rgba(217, 119, 6, 0.25)' : 'rgba(245, 158, 11, 0.3)' },
                { offset: 1, color: isLight ? 'rgba(217, 119, 6, 0.0)' : 'rgba(245, 158, 11, 0.0)' }
              ]
            }
          }
        },
        ...(showSmooth ? [{
          name: '13-Month Smoothed Trend',
          type: 'line',
          showSymbol: false,
          connectNulls: true,
          triggerEvent: true,
          data: smoothedData,
          itemStyle: { color: isLight ? '#B45309' : '#FCD34D' },
          lineStyle: { width: 3.0 }
        }] : []),
        ...(showCosmicOverlay ? [{
          name: 'Cosmic Ray (Thule)',
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          connectNulls: true,
          triggerEvent: true,
          data: data.map(d => {
            const ym = `${d.year}-${String(d.month).padStart(2, '0')}`
            return thuleMonthlyMap[ym] ?? null
          }),
          itemStyle: { color: isLight ? '#2563EB' : '#38BDF8' },
          lineStyle: { width: 2.2 }
        }] : [])
      ]
    }
  }, [data, smoothedData, scaleType, showSmooth, showCosmicOverlay, thuleMonthlyMap, isLight])

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
            SOLAR / SUNSPOT NUMBER INDEX
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Monthly Total Sunspot Number Dataset (SILSO SIDC Belgium: 1749–Present) · Solar Cycle Tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StatusBadge status="normal" label="SILSO LIVE" />
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
            <span>{fetching ? 'FETCHING SILSO...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {/* Main Chart Card */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="SILSO MONTHLY SUNSPOT NUMBER DATASET"
          subtitle="HISTORICAL SOLAR CYCLE TRENDS (1749 – PRESENT) · 11-YEAR SOLAR CYCLE MODULATION"
          style={{
            marginBottom: 24,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(217, 119, 6, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
              {/* Preset Buttons */}
              <div style={{
                display: 'flex', gap: 4,
                background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.75)',
                padding: '3px',
                border: isLight ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 6
              }}>
                {(['10Y', '50Y', '100Y', 'ALL'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    style={{
                      padding: '5px 12px',
                      background: timeRange === range ? (isLight ? '#FFFFFF' : 'rgba(245, 158, 11, 0.25)') : 'transparent',
                      border: 'none',
                      borderBottom: timeRange === range ? `2px solid ${isLight ? '#D97706' : '#F59E0B'}` : '2px solid transparent',
                      color: timeRange === range ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      borderRadius: 4,
                      boxShadow: isLight && timeRange === range ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {range === 'ALL' ? 'ALL TIME (1749-NOW)' : range}
                  </button>
                ))}
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, fontFamily: 'var(--font-mono)', color: isLight ? '#475569' : '#CBD5E1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showSmooth}
                    onChange={e => setShowSmooth(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>13M Smooth</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showCosmicOverlay}
                    onChange={e => setShowCosmicOverlay(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Thule Cosmic Ray {cosmicLoading ? '(loading...)' : ''}</span>
                </label>
                <button
                  onClick={() => setScaleType(prev => prev === 'value' ? 'log' : 'value')}
                  style={{
                    padding: '4px 10px',
                    background: scaleType === 'log' ? (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.2)') : (isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)'),
                    border: `1px solid ${scaleType === 'log' ? (isLight ? '#D97706' : '#F59E0B') : (isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.1)')}`,
                    borderRadius: 4,
                    color: scaleType === 'log' ? (isLight ? '#B45309' : '#F59E0B') : (isLight ? '#475569' : '#94A3B8'),
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {scaleType.toUpperCase()} SCALE
                </button>
                <ExportChartMenu
                  chartRef={chartRef}
                  data={exportData}
                  columns={exportColumns}
                  metadata={exportMetadata}
                  filenameBase={`sunspot_number_${timeRange.toLowerCase()}`}
                  accentColor={isLight ? '#D97706' : '#F59E0B'}
                />
              </div>
            </div>
          }
        >
          <ReactECharts ref={chartRef} option={option} style={{ height: 520, width: '100%' }} notMerge={true} />
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
              ดัชนีจำนวนจุดมืดดวงอาทิตย์ (Sunspot Number - SSN)
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', lineHeight: '1.7' }}>
              จำนวนจุดมืดบนดวงอาทิตย์ (SSN) เป็นตัวชี้วัดวัฏจักรสุริยะ (Solar Cycle) ที่มีประวัติศาสตร์การบันทึกต่อเนื่องยาวนานที่สุดในวิทยาศาสตร์ โดยมีคาบเฉลี่ยประมาณ 11 ปี:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#D97706' : '#F59E0B'}`,
                paddingLeft: 12, fontSize: 13, color: isLight ? '#334155' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>Solar Maximum: </strong>
                ช่วงที่มีจุดมืดจำนวนมาก บ่งชี้สนามแม่เหล็กบนดวงอาทิตย์กำลังแปรปรวนสูง มีโอกาสเกิดโซลาร์แฟลร์ (Solar Flare) และพายุสุริยะ (CME) บ่อยครั้งที่สุด
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
                paddingLeft: 12, fontSize: 13, color: isLight ? '#334155' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>ความสัมพันธ์ผกผันกับรังสีคอสมิก: </strong>
                เมื่อเปิดใช้งาน "Thule Cosmic Ray" overlay จะสังเกตเห็นได้อย่างชัดเจนว่าในช่วงที่ SSN สูง รังสีคอสมิกจะลดต่ำลง และกลับกันในช่วง Solar Minimum
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
              ผลกระทบต่อโลกและสภาพอวกาศ
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: 0, lineHeight: '1.7' }}>
              จุดมืดเป็นแหล่งกำเนิดของสนามแม่เหล็กเข้มข้น เมื่อสนามแม่เหล็กบิดตัวและปลดปล่อยพลังงาน จะส่งผลให้บรรยากาศชั้นไอโอโนสเฟียร์ถูกรบกวน กระทบต่อการสื่อสารความถี่สูง (HF Radio Blackout) ระบบนำทาง GPS และสร้างกระแสไฟฟ้ารบกวนโครงข่ายสายส่งบนพื้นโลก
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
              สูตรคำนวณและประวัติข้อมูล SILSO
            </h4>
            <p style={{ color: isLight ? '#334155' : '#CBD5E1', fontSize: 13, margin: '0 0 10px 0', lineHeight: '1.7' }}>
              สูตรมาตรฐาน Wolf Number: $R = k (10g + s)$ โดย $g$ คือจำนวนกลุ่มจุดมืด, $s$ คือจำนวนจุดมืดเดี่ยว และ $k$ คือตัวคูณปรับเทียบของหอดูดาว
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
                borderLeft: `3px solid ${isLight ? '#D97706' : '#F59E0B'}`,
                paddingLeft: 12, color: isLight ? '#475569' : '#CBD5E1'
              }}>
                <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>SILSO: </strong>
                Sunspot Index and Long-term Solar Observations, Royal Observatory of Belgium, Brussels
              </div>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
