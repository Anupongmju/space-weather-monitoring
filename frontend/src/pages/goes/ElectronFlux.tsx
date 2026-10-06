import { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveElectron, loadElectron } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import ExportChartMenu from '../../components/ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'
import { formatPowerOf10, formatUTCTime } from '../../utils/formatters'
import { createTimeAxisLabel, getMidnightTimestamps, getMidnightDividerMarkLines, combineMarkLines, getTimeDomain } from '../../utils/chartHelpers'
import { useTheme } from '../../context/ThemeContext'

const getEnergyColor = (e: string, isLight: boolean): string => {
  if (e.includes('0.8')) return isLight ? '#7C3AED' : '#A855F7'
  if (e.includes('2')) return isLight ? '#0284C7' : '#38BDF8'
  if (e.includes('4')) return isLight ? '#D97706' : '#FB923C'
  return isLight ? '#059669' : '#34D399'
}

export default function ElectronFlux() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [data, setData] = useState<any[]>([])
  const [energies, setEnergies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [limit, setLimit] = useState<TimeRange>(1440)
  const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [activeTab, setActiveTab] = useState('usage')
  const chartRef = useRef<any>(null)

  const pivot = (d: any[]) => {
    const map: Record<string, any> = {}
    d.forEach(r => {
      if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
      map[r.time_tag][r.energy] = r.flux
    })
    return Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
  }

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const sDate = appliedRange ? appliedRange.startDate : undefined
      const eDate = appliedRange ? appliedRange.endDate : undefined
      const d = await loadElectron(limit, sDate, eDate)
      if (Array.isArray(d)) {
        setEnergies(Array.from(new Set(d.map(r => r.energy))))
        setData(pivot(d))
      } else {
        setData([])
        setEnergies([])
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
      await fetchAndSaveElectron()
    } catch (e) { }
    await load(false)
    setFetching(false)
  }

  const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: async (start, end) => {
      const older = await loadElectron(0, start, end)
      return pivot(older)
    },
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
      borderColor: isLight ? '#C084FC' : 'rgba(168,85,247,0.6)',
      borderWidth: 1.5,
      padding: 14,
      textStyle: { color: isLight ? '#0F172A' : '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 13 },
      extraCssText: isLight ? 'box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px;' : 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 8px;',
      axisPointer: { type: 'line', lineStyle: { color: isLight ? '#7C3AED' : '#C084FC', type: 'dashed', width: 1.5 } },
      formatter: (params: any) => {
        if (!params || !Array.isArray(params) || params.length === 0) return ''
        const rawTime = params[0]?.data?.[0] || params[0]?.axisValue
        const dateStr = formatUTCTime(rawTime, true)
        let res = `<div style="font-family:var(--font-mono);font-size:13px;color: ${isLight ? '#7C3AED' : '#C084FC'}; font-weight:700; margin-bottom: 6px">🕒 ${dateStr}</div>`
        params.forEach((p: any) => {
          if (!p || p.value === undefined || p.value === null) return
          const rawVal = Array.isArray(p.value) ? p.value[1] : p.value
          const val = (rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal)))
            ? Number(rawVal).toExponential(2)
            : 'N/A'
          res += `<div style="display:flex; justify-content:space-between; gap:16px; margin-top:3px; font-family:var(--font-mono); font-size:12px;">
                    <span style="color:${p.color}">${p.seriesName || ''}:</span>
                    <span style="font-weight:bold; color:${isLight ? '#0F172A' : '#F8FAFC'}">${val} pfu</span>
                  </div>`
        })
        return res
      }
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
      axisLabel: createTimeAxisLabel(isLight, limit > 1440 || !!appliedRange),
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    },
    yAxis: {
      type: 'log',
      name: 'Electrons (pfu)',
      nameLocation: 'middle',
      nameGap: 56,
      nameTextStyle: {
        color: isLight ? '#7C3AED' : '#C084FC',
        fontSize: 14.5,
        fontWeight: 700,
        fontFamily: 'sans-serif'
      },
      splitLine: { show: true, lineStyle: { color: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', type: 'dashed' } },
      axisLabel: { color: isLight ? '#475569' : '#E2E8F0', fontSize: 13, fontFamily: 'monospace, sans-serif', formatter: formatPowerOf10 },
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' } },
    },
    series: energies.map((e, idx) => {
      const color = getEnergyColor(e, isLight)
      return {
        name: e,
        type: 'line',
        showSymbol: false,
        connectNulls: true,
        lineStyle: { width: 2.2, opacity: 1 },
        itemStyle: { color },
        data: data.map(d => [d.time_tag, d[e]]),
        markLine: idx === 0 ? combineMarkLines(midnightDividers) : undefined,
      }
    })
  }

  const exportColumns = useMemo((): ExportColumn[] => {
    const base: ExportColumn[] = [
      { key: 'date', label: 'Date_UTC', width: 12, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(0, 10) : '') },
      { key: 'time', label: 'Time_UTC', width: 10, formatter: (_: any, r?: any) => (r && r.time_tag ? r.time_tag.substring(11, 19) : '') }
    ]
    const energyCols = energies.map(e => ({
      key: e,
      label: e.replace(/\s+/g, '_').replace(/>=/g, 'ge_'),
      width: 16
    }))
    return [...base, ...energyCols]
  }, [energies])

  const exportTimeRange = appliedRange
    ? `${appliedRange.startDate} to ${appliedRange.endDate}`
    : `Past ${limit / 1440} Day(s)`

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Seamless Header */}
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
            color: isLight ? '#0C1E35' : '#C084FC',
            margin: 0,
            letterSpacing: -0.5
          }}>
            GOES / ELECTRON FLUX
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Relativistic Electron Flux · Satellite Charging Risk · GEO Orbit
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {panLoading && (
            <span style={{ fontSize: 14, color: isLight ? '#7C3AED' : '#C084FC', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ◀ LOADING HISTORICAL DATA...
            </span>
          )}
          <StatusBadge status={data.length ? 'normal' : 'offline'} />
          <button
            onClick={fetch_}
            disabled={fetching}
            style={{
              padding: '4px 10px', background: 'transparent', border: 'none',
              color: isLight ? '#7C3AED' : '#C084FC', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
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
          accentColor={isLight ? '#7C3AED' : '#C084FC'}
          loading={loading}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <Card
          title="INTEGRAL ELECTRON FLUX"
          style={{
            marginBottom: 20,
            background: isLight ? '#FFFFFF' : undefined,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
          }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {panLoading && (
                <span style={{ fontSize: 13, color: isLight ? '#7C3AED' : '#C084FC', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
              <ExportChartMenu
                chartRef={chartRef}
                data={data}
                columns={exportColumns}
                metadata={{
                  station: 'GOES (GEOSTATIONARY ORBIT)',
                  viewTitle: 'GOES RELATIVISTIC ELECTRON FLUX',
                  description: 'Radiation Belt Relativistic Electron Flux (≥800 keV, ≥2 MeV, ≥4 MeV)',
                  timeRangeText: exportTimeRange,
                  totalRecords: data.length
                }}
                filenameBase={`GOES_ELECTRON_${appliedRange ? `${appliedRange.startDate}_to_${appliedRange.endDate}` : `${limit / 1440}D`}`}
                accentColor={isLight ? '#7C3AED' : '#C084FC'}
              />
            </div>
          }
        >
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {energies.map(e => {
              const color = getEnergyColor(e, isLight)
              return (
                <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>
                  <div style={{ width: 18, height: 3, background: color, borderRadius: 2 }} /> {e}
                </div>
              )
            })}
          </div>
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
              การวัดค่าและระดับพลังงานของ Electron Flux
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              <strong>Electron Flux</strong> (Relativistic Electron Flux) คือ ปริมาณความหนาแน่นอิเล็กตรอนสัมพัทธภาพความเร็วใกล้แสง ตรวจวัดโดยดาวเทียม GOES:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>Relativistic Electrons:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>อิเล็กตรอนความเร็วสูงมาก (≥0.8 MeV และ ≥2.0 MeV) แสดงพฤติกรรมสัมพัทธภาพ</span>
              </div>
              <div style={{
                borderLeft: `3px solid ${isLight ? '#D97706' : '#FB923C'}`,
                paddingLeft: 14,
                background: isLight ? '#F8FAFC' : 'transparent',
                padding: isLight ? '8px 12px' : '0 0 0 14px',
                borderRadius: isLight ? '0 6px 6px 0' : 0
              }}>
                <span style={{ color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 700, fontSize: 13 }}>การสะสมตัวช้า:</span>
                <span style={{ color: isLight ? '#475569' : '#94A3B8', fontSize: 13, marginLeft: 6 }}>ระดับอิเล็กตรอนค่อย ๆ เพิ่มสูงสุดช่วง 2-3 วันหลังจากโลกเผชิญพายุสุริยะ</span>
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
              ผลกระทบและการฝังประจุในดาวเทียม (Deep Dielectric Charging)
            </h4>
            <p style={{
              color: isLight ? '#334155' : '#CBD5E1',
              fontSize: 13,
              margin: '0 0 16px 0',
              textAlign: 'justify',
              lineHeight: '1.7'
            }}>
              เมื่อความหนาแน่นอิเล็กตรอนเพิ่มต่อเนื่อง จะเกิดความเสี่ยงต่อชิปและเกราะในวงโคจรอวกาศ:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{
                background: isLight ? '#FEF2F2' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FECACA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#DC2626', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Internal Charging (ประจุฝังตัว)</h5>
                <p style={{ color: isLight ? '#991B1B' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  อิเล็กตรอนความเร็วสูงทะลวงเกราะนอกเข้าไปฝังตัวสะสมประจุในแผงวงจรและฉนวนด้านในดาวเทียม
                </p>
              </div>
              <div style={{
                background: isLight ? '#FFF7ED' : 'rgba(255,255,255,0.02)',
                padding: 16,
                borderRadius: 6,
                border: isLight ? '1px solid #FED7AA' : '1px solid rgba(255,255,255,0.06)'
              }}>
                <h5 style={{ color: '#EA580C', margin: '0 0 6px 0', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>ESD Sparking (สปาร์กและลัดวงจร)</h5>
                <p style={{ color: isLight ? '#9A3412' : '#94A3B8', fontSize: 13, margin: 0, lineHeight: '1.6' }}>
                  การปล่อยประจุฉับพลัน (Electrostatic Discharge) เกิดประกายไฟภายใน ทำให้อุปกรณ์ดาวเทียมล้มเหลว
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
              รายละเอียดทางเทคนิคของระบบ Electron Flux
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#334155' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', width: '35%', fontWeight: 600 }}>เครื่องตรวจวัดที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC', fontWeight: 600 }}>GOES Space Environment In Situ Suite — NOAA</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ตำแหน่งการวัด</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>วงโคจรค้างฟ้า (Geostationary Orbit)</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>ช่วงพลังงานหลัก</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>≥0.8 MeV และ ≥2.0 MeV</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: isLight ? '#64748B' : '#64748B', fontWeight: 600 }}>หน่วยวัดหลัก</td>
                  <td style={{ padding: '10px 0', color: isLight ? '#0C1E35' : '#F8FAFC' }}>pfu (Particle Flux Unit: electrons/cm²·s·sr)</td>
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
              ข้อมูลเรียลไทม์ทั้งหมดส่งสัญญาณจากวงโคจรค้างฟ้าโดยหน่วยงานชั้นนำ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: isLight ? '#334155' : '#94A3B8' }}>
              <div style={{ borderLeft: `2px solid ${isLight ? '#7C3AED' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>NOAA Space Weather Prediction Center (SWPC):</strong> ให้บริการ API และประมวลผลสภาพรังสี
              </div>
              <div style={{ borderLeft: `2px solid ${isLight ? '#7C3AED' : 'rgba(255,255,255,0.2)'}`, paddingLeft: 12 }}>
                <strong style={{ color: isLight ? '#0C1E35' : '#F8FAFC' }}>GOES Program (NASA / NOAA):</strong> โครงการดาวเทียมสำรวจอุตุนิยมวิทยาและรังสีอวกาศ
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
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: isLight ? '#7C3AED' : '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
