import { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchAndSaveXray, loadXray } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Card from '../../components/ui/Card'
import { useAutoFetch } from '../../hooks/useAutoFetch'
import { useChartPan } from '../../hooks/useChartPan'
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'


// ── Flare classification ───────────────────────────────────────────
function getFlareClass(flux) {
  if (!flux) return { label: '-', color: '#606075' }
  if (flux >= 1e-3) return { label: 'X10', color: '#ff4040' }
  if (flux >= 1e-4) return { label: 'X',   color: '#EF4444' }
  if (flux >= 1e-5) return { label: 'M',   color: '#F97316' }
  if (flux >= 1e-6) return { label: 'C',   color: '#d4c000' }
  if (flux >= 1e-7) return { label: 'B',   color: '#22c55e' }
  return { label: 'A', color: '#3b82f6' }
}

// ── NOAA colored background bands ────────────────────────────────────
const BAND_ZONES = [
  { yMin: 1e-9, yMax: 1e-8, color: 'rgba(8,8,14,0.95)'    },
  { yMin: 1e-8, yMax: 1e-7, color: 'rgba(18,20,28,0.92)'  },
  { yMin: 1e-7, yMax: 1e-6, color: 'rgba(14,26,16,0.90)'  },
  { yMin: 1e-6, yMax: 1e-5, color: 'rgba(52,50,4,0.90)'   },
  { yMin: 1e-5, yMax: 1e-4, color: 'rgba(80,36,4,0.90)'   },
  { yMin: 1e-4, yMax: 1e-3, color: 'rgba(90,8,8,0.90)'    },
  { yMin: 1e-3, yMax: 1e-2, color: 'rgba(60,0,0,0.96)'    },
]
const BAND_LABELS = [
  { yMid: 5e-9,  label: 'A0', color: '#555566' },
  { yMid: 5e-8,  label: 'A',  color: '#777788' },
  { yMid: 5e-7,  label: 'B',  color: '#4ade80' },
  { yMid: 5e-6,  label: 'C',  color: '#d4c000' },
  { yMid: 5e-5,  label: 'M',  color: '#F97316' },
  { yMid: 5e-4,  label: 'X',  color: '#EF4444' },
  { yMid: 5e-3,  label: 'X10',color: '#ff4040' },
]

// ── Dense horizontal sub-gridlines on log scale ──────────────────────
function buildLogGrid() {
  const lines: any[] = []
  for (let exp = -9; exp <= -2; exp++) {
    for (let m = 1; m <= 9; m++) {
      lines.push({
        yAxis: m * Math.pow(10, exp),
        lineStyle: {
          color: m === 1 ? 'rgba(200,200,220,0.14)' : 'rgba(200,200,220,0.06)',
          type: 'solid',
          width: m === 1 ? 0.8 : 0.4,
        }
      })
    }
  }
  return lines
}

// ── Detect flare peaks ────────────────────────────────────────────────
function detectFlares(data: any[]) {
  if (data.length < 5) return []
  const MIN_FLUX = 1e-6
  const GAP = 8
  const events: { time: string; label: string }[] = []
  let lastIdx = -GAP - 1
  for (let i = 2; i < data.length - 2; i++) {
    const v = data[i].flux_long
    if (!v || v < MIN_FLUX) continue
    if (
      v >= data[i-1].flux_long && v >= data[i-2].flux_long &&
      v >= data[i+1].flux_long && v >= data[i+2].flux_long &&
      i - lastIdx > GAP
    ) {
      const cls = getFlareClass(v)
      const base = v >= 1e-3 ? 1e-3 : v >= 1e-4 ? 1e-4 : v >= 1e-5 ? 1e-5 : 1e-6
      events.push({ time: data[i].time_tag, label: `${cls.label}${(v / base).toFixed(1)}` })
      lastIdx = i
    }
  }
  return events
}

export default function XrayFlux(){
    const [data,setData] = useState<any[]>([])
    const [loading,setLoading] = useState(true)
    const [fetching,setFetching] = useState(false)
    const [limit, setLimit] = useState<TimeRange>(360)
    const [appliedRange, setAppliedRange] = useState<{ startDate: string; endDate: string } | null>(null)
    const [activeTab, setActiveTab] = useState('usage')
    
    const { onDataZoom, panLoading, resetPan, zoomRange, onChartReady } = useChartPan({
    data,
    setData,
    loadHistorical: (start, end) => loadXray(0, start, end),
    windowMinutes: 1440,
    initialWindowMinutes: appliedRange ? 0 : limit,
  })

  const load = async (showLoading = true) => {
      if (showLoading) setLoading(true)
      try {
        const sDate = appliedRange ? appliedRange.startDate : undefined
        const eDate = appliedRange ? appliedRange.endDate : undefined
        const d = await loadXray(limit, sDate, eDate)
        if (Array.isArray(d)) {
          setData(d)
        }
      } catch (err) {
        console.error('Failed to load xray data:', err)
      } finally {
        if (showLoading) setLoading(false)
      }
    }
    
  const fetch_ = async () => {
    setFetching(true)
    try {
      await fetchAndSaveXray()
    } catch(e) {}
    await load(false)
    setFetching(false)
  }

  useEffect(() => {
    resetPan()
    load(true)
  }, [limit, appliedRange])

  useAutoFetch(async () => {
    await load(false)
  }, 60000, !appliedRange)
    
    const latest = data[data.length - 1]
    const flare = getFlareClass(latest?.flux_long)
    const bzStatus = flare.label === 'X' || flare.label === 'X10' ? 'danger' : flare.label === 'M' ? 'warning' : 'normal'
    const flareEvents = detectFlares(data)
    const logGridLines = buildLogGrid()
    const tStart = data[0]?.time_tag
    const tEnd   = data[data.length - 1]?.time_tag

    const option = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#12121C',
        borderColor: 'rgba(52,152,219,0.4)',
        textStyle: { color: '#FFF', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params) => {
          if (!params || params.length === 0) return ''
          const time = params[0].axisValueLabel
          const f0 = params[0]?.value?.[1]
          const f1 = params[1]?.value?.[1]
          const cls = f0 ? getFlareClass(f0) : null
          return (
            `<div style="font-family: var(--font-mono); font-size: 11px">` +
            `<div style="color:#606075; margin-bottom:4px">${time}</div>` +
            (f0 ? `<div style="color:#3498DB">1-8 Å: ${f0.toExponential(2)} W/m²</div>` : '') +
            (f1 ? `<div style="color:#22c55e">0.5-4 Å: ${f1.toExponential(2)} W/m²</div>` : '') +
            (cls ? `<div style="color:${cls.color};font-weight:700;margin-top:4px">Class ${cls.label}</div>` : '') +
            `</div>`
          )
        }
      },
      grid: { top: 14, right: 58, bottom: 36, left: 56 },
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
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#333' } },
        axisTick: { lineStyle: { color: '#333' } },
        axisLabel: { color: '#777', fontSize: 10, fontFamily: 'monospace' }
      },
      yAxis: {
        type: 'log',
        min: 1e-9,
        max: 1e-2,
        interval: 1,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#333' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#888',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (v) => {
            const exp = Math.round(Math.log10(v));
            return `10${exp.toString().replace('-', '⁻')}`;
          }
        }
      },
      series: [
        {
          name: '_bands', type: 'line', data: [], showSymbol: false, silent: true,
          markArea: {
            silent: true,
            data: BAND_ZONES.map(z => [
              { yAxis: z.yMin, itemStyle: { color: z.color } },
              { yAxis: z.yMax }
            ])
          }
        },
        {
          name: '_grid', type: 'line', data: [], showSymbol: false, silent: true,
          markLine: {
            silent: true,
            symbol: ['none','none'],
            label: { show: false },
            data: logGridLines.map(l => ([
              { coord: [tStart, l.yAxis], lineStyle: l.lineStyle },
              { coord: [tEnd,   l.yAxis] }
            ]))
          }
        },
        {
          name: '_blabels', type: 'line', data: [], showSymbol: false, silent: true,
          markLine: {
            silent: true,
            symbol: ['none','none'],
            data: BAND_LABELS.map(b => ({
              yAxis: b.yMid,
              lineStyle: { opacity: 0 },
              label: { show: true, position: 'insideEndTop', formatter: b.label,
                color: b.color, fontSize: 11, fontFamily: 'monospace', fontWeight: 700, distance: 4 }
            }))
          }
        },
        {
          name: '_flares', type: 'line', data: [], showSymbol: false,
          markLine: {
            silent: false,
            symbol: ['none','none'],
            data: flareEvents.map(e => ({
              xAxis: e.time,
              lineStyle: { color: 'rgba(220,220,200,0.5)', type: 'solid', width: 1 },
              label: { show: true, position: 'insideStartBottom', color: '#eab308',
                fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                formatter: e.label, rotate: 90, distance: 4 }
            }))
          }
        },
        {
          name: '1-8 Å (Long)',
          type: 'line',
          showSymbol: false,
          connectNulls: true,
          lineStyle: { width: 1.5, color: '#3498DB' },
          data: data.map(d => [d.time_tag, d.flux_long])
        },
        {
          name: '0.5-4 Å (Short)',
          type: 'line',
          showSymbol: false,
          connectNulls: true,
          lineStyle: { width: 1.5, color: '#22c55e' },
          data: data.map(d => [d.time_tag, d.flux_short])
        }
      ]
    };

    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 18, fontWeight: 700, color: '#3498DB', margin: 0, letterSpacing: 0.5 }}>
              GOES / X-RAY FLUX
            </h2>
            <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
              Solar X-Ray Radiation Monitor · 1-8Å & 0.5-4Å
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {panLoading && (
              <span style={{ fontSize: 11, color: '#3498DB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            )}
            <StatusBadge status={bzStatus} />
            <button
              onClick={fetch_}
              disabled={fetching}
              style={{
                padding: '4px 10px', background: 'transparent', border: 'none',
                color: '#3498DB', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
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
            accentColor="#3498DB"
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
              { label: 'LONG (1-8 Å)', value: latest.flux_long?.toExponential(2), color: '#3498DB', unit: 'W/m²' },
              { label: 'SHORT (0.5-4 Å)', value: latest.flux_short?.toExponential(2), color: '#38BDF8', unit: 'W/m²' },
              { label: 'CURRENT FLARE CLASS', value: flare.label, color: flare.color, unit: '' },
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
                    {s.unit && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                        {s.unit}
                      </span>
                    )}
                  </div>
                </div>
                {idx < 2 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
              </div>
            ))}
          </div>
        )}

        {loading ? <LoadingSpinner /> : (
          <Card 
            title="SOLAR X-RAY FLUX"
            extra={panLoading ? (
              <span style={{ fontSize: 11, color: '#3498DB', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ◀ LOADING HISTORICAL DATA...
              </span>
            ) : null}
          >
            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {[{ color: '#3498DB', label: '1–8 Å (Long)' }, { color: '#22c55e', label: '0.5–4 Å (Short)' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'monospace', color: l.color }}>
                  <div style={{ width: 22, height: 2, background: l.color }} />
                  {l.label}
                </div>
              ))}
              <div style={{ marginLeft: 'auto', fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                {flareEvents.length > 0 ? `${flareEvents.length} flare event${flareEvents.length > 1 ? 's' : ''} detected` : 'No flares detected'}
              </div>
            </div>
            <ReactECharts
              option={option}
              style={{ height: 380, width: '100%' }}
              onChartReady={onChartReady}
              onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
            />
          </Card>
        )}

      {/* Refined Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#3498DB"
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
              การปะทุจ้าและการแบ่งระดับความรุนแรง (Solar Flare Classification)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              เซนเซอร์ XRS (X-ray Sensor) บน GOES ตรวจวัดรังสีเอกซ์ช่วงความยาวคลื่น <strong>0.1 - 0.8 nm (Long)</strong> และ <strong>0.05 - 0.4 nm (Short)</strong> เพื่อแบ่งระดับความรุนแรงของ Solar Flare เป็น 5 ระดับ:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 0, borderLeft: '3px solid #38BDF8' }}>
                <strong style={{ color: '#38BDF8', fontSize: 12, fontFamily: 'var(--font-mono)' }}>A-Class (ต่ำมาก)</strong>
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '4px 0 0' }}>ระดับพื้นฐานปกติ ไม่มีผลกระทบต่อโลก</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 0, borderLeft: '3px solid #34D399' }}>
                <strong style={{ color: '#34D399', fontSize: 12, fontFamily: 'var(--font-mono)' }}>B-Class (ระดับต่ำ)</strong>
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '4px 0 0' }}>การปะทุขนาดเล็กมาก ไม่ส่งผลกระทบ</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 0, borderLeft: '3px solid #FBBF24' }}>
                <strong style={{ color: '#FBBF24', fontSize: 12, fontFamily: 'var(--font-mono)' }}>C-Class (เล็กน้อย)</strong>
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '4px 0 0' }}>ส่งผลกระทบต่อโลกน้อยมาก</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 0, borderLeft: '3px solid #FB923C' }}>
                <strong style={{ color: '#FB923C', fontSize: 12, fontFamily: 'var(--font-mono)' }}>M-Class (ปานกลาง)</strong>
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '4px 0 0' }}>รบกวนสัญญาณวิทยุขั้วโลก และมักเกิด CME</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 0, borderLeft: '3px solid #F87171' }}>
                <strong style={{ color: '#F87171', fontSize: 12, fontFamily: 'var(--font-mono)' }}>X-Class (รุนแรงสุด)</strong>
                <p style={{ color: '#94A3B8', fontSize: 11, margin: '4px 0 0' }}>วิทยุขัดข้องวงกว้าง ก่อพายุแม่เหล็กโลก</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              สภาวะคลื่นวิทยุขัดข้อง (Radio Blackouts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              รังสีเอกซ์เดินทางด้วยความเร็วแสง (ใช้เวลา 8 นาทีจากดวงอาทิตย์ถึงโลก) X-ray Flux จึงเป็นด่านแรกเตือนภัย Radio Blackouts:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#F87171', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>คลื่นวิทยุขัดข้องเฉียบพลัน</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  รังสีเอกซ์เพิ่มความหนาแน่นในบรรยากาศชั้น D-region ดูดกลืนคลื่นวิทยุความถี่สูง (HF Radio) เครื่องบินและวิทยุขั้วโลกขาดการติดต่อ
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                <h5 style={{ color: '#FB923C', margin: '0 0 6px 0', fontSize: 13, fontFamily: 'var(--font-mono)' }}>สัญญาณนำทาง GPS ขัดข้อง</h5>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, lineHeight: '1.6' }}>
                  ไอโอโนสเฟียร์ถูกรบกวนหักเหสัญญาณวิทยุจากดาวเทียม ทำให้ระบบ GPS/GNSS เบี่ยงเบนคลาดเคลื่อนในด้านกลางวัน
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', var(--font-sans), monospace", fontWeight: 600 }}>
              รายละเอียดทางเทคนิคของอุปกรณ์ XRS
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B', width: '35%' }}>ยานอวกาศที่ติดตั้ง</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>GOES (Geostationary Operational Environmental Satellite) — NOAA</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ตำแหน่งวงโคจร</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>Geostationary Orbit (วงโคจรค้างฟ้าเหนือเส้นศูนย์สูตร)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>เครื่องมือวัดหลัก</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>X-Ray Sensor (XRS) หลอด Ionization Chamber 2 ช่องสัญญาณ</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>ความละเอียดเวลา</td>
                  <td style={{ padding: '10px 0', color: '#F8FAFC' }}>ระดับวินาทีเพื่อความรวดเร็วในการแจ้งเตือนแบบทันทีทันใด</td>
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
              ข้อมูลดัชนีและแผนภูมิกราฟรังสีเอกซ์จากดวงอาทิตย์ได้รับการสนับสนุนแบบสาธารณะ:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94A3B8' }}>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>National Oceanic and Atmospheric Administration (NOAA):</strong> โครงการดาวเทียม GOES
              </div>
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <strong style={{ color: '#F8FAFC' }}>Space Weather Prediction Center (SWPC):</strong> ประมวลผลและเตือนภัย Radio Blackouts API
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
              ข้อมูลอ้างอิง API: ดึงผ่าน <a href="https://services.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline' }}>NOAA SWPC JSON Services</a> อัปเดตทุก 1 นาที
            </div>
          </div>
        )}
      </InstrumentInfoGuide>
    </div>
  )
}
