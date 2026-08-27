import { useState, useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { loadMonthlySunspot, loadLatestSunspot, triggerFetchSunspot, SunspotRecord, SunspotLatestResponse } from '../../services/sunspotService';
import { loadNeutron } from '../../services/cosmicService';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card from '../../components/ui/Card';
import InstrumentInfoGuide from '../../components/ui/InstrumentInfoGuide';
import { useAutoFetch } from '../../hooks/useAutoFetch';
import { useChartPan } from '../../hooks/useChartPan';

export default function SunspotNumber() {
  const [data, setData] = useState<SunspotRecord[]>([]);
  const [latestStats, setLatestStats] = useState<SunspotLatestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<'10Y' | '50Y' | '100Y' | 'ALL'>('50Y');
  const [scaleType, setScaleType] = useState<'value' | 'log'>('value');
  const [showSmooth, setShowSmooth] = useState<boolean>(true);
  const [showCosmicOverlay, setShowCosmicOverlay] = useState<boolean>(false);
  const [thuleMonthlyMap, setThuleMonthlyMap] = useState<Record<string, number>>({});
  const [cosmicLoading, setCosmicLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('usage');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;
  const chartRef = useRef(null);

  useEffect(() => {
    if (!showCosmicOverlay) return;
    if (Object.keys(thuleMonthlyMap).length > 0) return;

    setCosmicLoading(true);
    loadNeutron('THUL', 0)
      .then(rows => {
        const monthlyCounts: Record<string, { sum: number; count: number }> = {};
        rows.forEach((r: any) => {
          if (!r.time_tag || !r.count_rate || r.count_rate <= 0) return;
          const ym = r.time_tag.slice(0, 7);
          if (!monthlyCounts[ym]) monthlyCounts[ym] = { sum: 0, count: 0 };
          monthlyCounts[ym].sum += Number(r.count_rate);
          monthlyCounts[ym].count += 1;
        });

        const map: Record<string, number> = {};
        Object.keys(monthlyCounts).forEach(ym => {
          const avg = monthlyCounts[ym].sum / monthlyCounts[ym].count;
          map[ym] = Math.round(avg * 10) / 10;
        });

        setThuleMonthlyMap(map);
      })
      .catch(err => console.error('Error loading Thule cosmic data:', err))
      .finally(() => setCosmicLoading(false));
  }, [showCosmicOverlay, thuleMonthlyMap]);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    let startYear: number | undefined;
    const currentYear = new Date().getFullYear();

    if (timeRange === '10Y') startYear = currentYear - 10;
    else if (timeRange === '50Y') startYear = currentYear - 50;
    else if (timeRange === '100Y') startYear = currentYear - 100;
    else startYear = undefined;

    try {
      const [monthlyData, latest] = await Promise.all([
        loadMonthlySunspot(undefined, startYear, undefined),
        loadLatestSunspot()
      ]);
      setData(monthlyData);
      setLatestStats(latest);
    } catch (err) {
      console.error('Error loading sunspot data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetch_ = async () => {
    setFetching(true);
    try {
      await triggerFetchSunspot();
    } catch (e) {
      console.error(e);
    }
    await loadData(false);
    setFetching(false);
  };

  const { onDataZoom, panLoading, resetPan, onChartReady } = useChartPan({
    data: data as any[],
    setData: setData as any,
    loadHistorical: (start, end) => {
      const sy = new Date(start).getFullYear();
      const ey = new Date(end).getFullYear();
      return loadMonthlySunspot(undefined, sy, ey) as any;
    },
    windowMinutes: 0,
    initialWindowMinutes: 0
  });

  useEffect(() => {
    resetPan();
    loadData(true);
  }, [timeRange]);

  useAutoFetch(async () => {
    await loadData(false);
  }, 300000);

  // Calculate 13-month centered moving average for smoothed cycle trend
  const smoothedData = useMemo(() => {
    if (!showSmooth || data.length < 13) return [];
    const result: (number | null)[] = new Array(data.length).fill(null);
    for (let i = 6; i < data.length - 6; i++) {
      let sum = 0.5 * data[i - 6].sunspot_number + 0.5 * data[i + 6].sunspot_number;
      for (let j = -5; j <= 5; j++) {
        sum += data[i + j].sunspot_number;
      }
      result[i] = Math.round((sum / 12.0) * 10) / 10;
    }
    return result;
  }, [data, showSmooth]);

  // ECharts Option
  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      legend: {
        show: true,
        top: 10,
        left: 'center',
        textStyle: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0F172A',
        borderColor: 'rgba(230, 126, 34, 0.6)',
        borderWidth: 1.5,
        padding: 14,
        textStyle: { color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: 11 },
        extraCssText: 'box-shadow: 0 20px 40px rgba(0,0,0,0.9); border-radius: 0px;',
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#E67E22', type: 'dashed', width: 1.5 }
        },
        formatter: (params: any[]) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const rec = data[idx];
          if (!rec) return '';
          const ym = `${rec.year}-${String(rec.month).padStart(2, '0')}`;
          let html = `<div style="font-weight:bold;color:#E67E22;margin-bottom:6px;font-size:12px">${ym}</div>`;
          html += `<div><span style="color:#E67E22">●</span> Monthly Sunspot: <strong style="color:#FFF">${rec.sunspot_number.toFixed(1)} SSN</strong></div>`;
          if (rec.std_dev >= 0) html += `<div style="color:#94A3B8;font-size:10px;padding-left:12px">Std Dev: ±${rec.std_dev.toFixed(1)}</div>`;
          if (thuleMonthlyMap[ym] !== undefined) {
            html += `<div style="margin-top:4px"><span style="color:#818CF8">●</span> Cosmic Ray (Thule): <strong style="color:#A5B4FC">${thuleMonthlyMap[ym]} cts/min</strong></div>`;
          }
          return html;
        }
      },
      grid: { top: 45, right: showCosmicOverlay ? 70 : 30, bottom: 50, left: 60 },
      xAxis: {
        type: 'category',
        data: data.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`),
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' }
      },
      yAxis: showCosmicOverlay ? [
        {
          type: scaleType,
          name: 'Sunspot Number (SSN)',
          nameTextStyle: { color: '#E67E22', fontSize: 10, fontFamily: 'var(--font-mono)', padding: [0, 0, 0, 20] },
          splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
          axisLine: { lineStyle: { color: 'rgba(230,126,34,0.4)' } },
          axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' }
        },
        {
          type: 'value',
          name: 'Cosmic Ray Thule (cts/min)',
          scale: true,
          nameTextStyle: { color: '#818CF8', fontSize: 10, fontFamily: 'var(--font-mono)', padding: [0, 20, 0, 0] },
          splitLine: { show: false },
          axisLine: { lineStyle: { color: 'rgba(129,140,248,0.4)' } },
          axisLabel: { color: '#818CF8', fontSize: 10, fontFamily: 'var(--font-mono)' }
        }
      ] : {
        type: scaleType,
        name: 'Sunspot Number (SSN)',
        nameTextStyle: { color: '#94A3B8', fontSize: 10, fontFamily: 'var(--font-mono)', padding: [0, 0, 0, 20] },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: '#CBD5E1', fontSize: 10, fontFamily: 'var(--font-mono)' }
      },
      series: [
        {
          name: 'Monthly Total SSN',
          type: 'line',
          showSymbol: false,
          data: data.map(d => d.sunspot_number),
          itemStyle: { color: '#E67E22' },
          lineStyle: { width: 1.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(230, 126, 34, 0.35)' },
                { offset: 1, color: 'rgba(230, 126, 34, 0.0)' }
              ]
            }
          }
        },
        ...(showSmooth ? [{
          name: '13-Month Smoothed Trend',
          type: 'line',
          showSymbol: false,
          data: smoothedData,
          itemStyle: { color: '#F1C40F' },
          lineStyle: { width: 2.5 }
        }] : []),
        ...(showCosmicOverlay ? [{
          name: 'Cosmic Ray (Thule)',
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          connectNulls: true,
          data: data.map(d => {
            const ym = `${d.year}-${String(d.month).padStart(2, '0')}`;
            return thuleMonthlyMap[ym] ?? null;
          }),
          itemStyle: { color: '#818CF8' },
          lineStyle: { width: 2 }
        }] : [])
      ]
    };
  }, [data, smoothedData, scaleType, showSmooth, showCosmicOverlay, thuleMonthlyMap]);

  // Pagination for raw data table
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const reversed = [...data].reverse();
    const start = (page - 1) * pageSize;
    return reversed.slice(start, start + pageSize);
  }, [data, page]);

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = ['Year', 'Month', 'Date_Fractional', 'Sunspot_Number', 'Std_Dev', 'Obs_Count', 'Definitive'];
    const rows = data.map(d => [
      d.year, d.month, d.fractional_year, d.sunspot_number, d.std_dev, d.obs_count, d.is_definitive ? 1 : 0
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SILSO_Sunspot_Data_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const latest = latestStats?.latest;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px', color: '#F8FAFC' }}>
      {/* Top Header Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 22, fontWeight: 700,
              color: '#F8FAFC', letterSpacing: 1.5,
              textTransform: 'uppercase', margin: 0
            }}>
              SUNSPOT NUMBER INDEX
            </h1>
            <StatusBadge status="normal" label="SILSO LIVE" size="sm" />
          </div>
          <p style={{
            fontSize: 12, color: '#94A3B8',
            margin: '4px 0 0', fontFamily: 'var(--font-mono)', letterSpacing: 0.5
          }}>
            MONTHLY TOTAL SUNSPOT NUMBER DATASET (SILSO SIDC BELGIUM: 1749–PRESENT)
          </p>
        </div>

        <button
          onClick={fetch_}
          disabled={fetching}
          style={{
            background: fetching ? 'rgba(230,126,34,0.1)' : 'rgba(230,126,34,0.15)',
            border: '1px solid rgba(230,126,34,0.4)',
            color: '#E67E22',
            fontSize: 11, fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            padding: '8px 16px',
            cursor: fetching ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 8
          }}
          onMouseEnter={e => { if (!fetching) e.currentTarget.style.background = 'rgba(230,126,34,0.25)'; }}
          onMouseLeave={e => { if (!fetching) e.currentTarget.style.background = 'rgba(230,126,34,0.15)'; }}
        >
          {fetching ? 'FETCHING SILSO DATA...' : 'FETCH FRESH SILSO DATA'}
        </button>
      </div>

      {/* Sunspot Metrics Banner */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, marginBottom: 28, padding: '0 8px'
      }}>
        {[
          { label: 'LATEST MONTHLY SSN', value: latest?.sunspot_number?.toFixed(1), unit: 'SSN', color: '#E67E22', sub: latest ? `${latest.year}-${String(latest.month).padStart(2, '0')}` : '' },
          { label: '12-MONTH AVERAGE', value: latestStats?.avg_12m?.toFixed(1), unit: 'SSN', color: '#38BDF8', sub: 'Moving Avg' },
          { label: '12-MONTH PEAK', value: latestStats?.max_12m?.toFixed(1), unit: 'SSN', color: '#F59E0B', sub: 'Solar Max Trend' },
          { label: 'SOLAR CYCLE', value: 'CYCLE 25', unit: 'ACTIVE', color: '#10B981', sub: '2019 – Present' },
        ].map((s, idx) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: s.color }}>
                  {s.value ?? '—'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                  {s.unit}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {s.sub}
              </div>
            </div>
            {idx < 3 && <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />}
          </div>
        ))}
      </div>

      {/* Main Chart Block */}
      {loading ? <LoadingSpinner /> : (
        <Card
          title="SILSO MONTHLY SUNSPOT NUMBER DATASET"
          subtitle="HISTORICAL SOLAR CYCLE TRENDS (1749 – PRESENT)"
          style={{ marginBottom: 24 }}
          extra={
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              {/* Time Range Preset Buttons */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['10Y', '50Y', '100Y', 'ALL'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    style={{
                      background: timeRange === range ? '#E67E22' : 'rgba(255,255,255,0.05)',
                      color: timeRange === range ? '#FFF' : '#94A3B8',
                      border: '1px solid ' + (timeRange === range ? '#E67E22' : 'rgba(255,255,255,0.1)'),
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {range === 'ALL' ? 'ALL TIME (1749-NOW)' : range}
                  </button>
                ))}
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showSmooth}
                    onChange={e => setShowSmooth(e.target.checked)}
                    style={{ accentColor: '#F1C40F' }}
                  />
                  13-Mo Smooth
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scaleType === 'log'}
                    onChange={e => setScaleType(e.target.checked ? 'log' : 'value')}
                    style={{ accentColor: '#E67E22' }}
                  />
                  Log Scale
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: showCosmicOverlay ? 'rgba(129, 140, 248, 0.15)' : 'transparent',
                  border: `1px solid ${showCosmicOverlay ? '#818CF8' : 'rgba(255,255,255,0.15)'}`,
                  color: showCosmicOverlay ? '#A5B4FC' : '#94A3B8',
                  fontWeight: showCosmicOverlay ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={showCosmicOverlay}
                    onChange={e => setShowCosmicOverlay(e.target.checked)}
                    style={{ accentColor: '#818CF8' }}
                  />
                  {cosmicLoading ? 'Loading Thule...' : 'Compare Cosmic Rays (Thule)'}
                </label>
              </div>

              {panLoading && (
                <span style={{ fontSize: 11, color: '#E67E22', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ◀ LOADING HISTORICAL DATA...
                </span>
              )}
            </div>
          }
        >
          <ReactECharts
            ref={chartRef}
            option={option}
            notMerge={true}
            style={{ height: 460, width: '100%' }}
            onChartReady={onChartReady}
            onEvents={{ datazoom: onDataZoom, dataZoom: onDataZoom }}
          />
        </Card>
      )}

      {/* Instrument Info Guide */}
      <InstrumentInfoGuide
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#E67E22"
        tabs={[
          { id: 'usage', label: 'Usage (การใช้งาน & วัฏจักรสุริยะ)' },
          { id: 'impacts', label: 'Impacts (ผลกระทบต่อสภาพอวกาศ)' },
          { id: 'details', label: 'Details (สูตรคำนวณ & SILSO)' },
          { id: 'credits', label: 'Data Source & Credits (แหล่งข้อมูล)' }
        ]}
      >
        {activeTab === 'usage' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', monospace", fontWeight: 600 }}>
              ความสำคัญของจุดบนดวงอาทิตย์ (Sunspot Number) และวัฏจักรสุริยะ 11 ปี
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              <strong>Sunspots (จุดดับดวงอาทิตย์)</strong> เป็นพื้นที่ที่มีความเข้มของสนามแม่เหล็กสูงผิดปกติบนชั้นโฟโตสเฟียร์ของดวงอาทิตย์ จำนวนจุดดับนี้แปรผันตามวัฏจักรสุริยะ (Solar Cycle) ทุกๆ 11 ปีโดยประมาณ
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderLeft: '2px solid #E67E22', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Solar Maximum (ช่วงสุริยะสูงสุด):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ช่วงที่มีจุดดับดวงอาทิตย์จำนวนมาก เป็นช่วงที่เกิดการปะทุโซลาร์แฟลร์ (Solar Flares) และการพ่นมวลโคโรนา (CME) บ่อยครั้งที่สุด</span>
              </div>
              <div style={{ borderLeft: '2px solid #38BDF8', paddingLeft: 14 }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>Solar Minimum (ช่วงสุริยะต่ำสุด):</span>
                <span style={{ color: '#94A3B8', fontSize: 13, marginLeft: 6 }}>ช่วงที่ดวงอาทิตย์สงบเงียบ แทบไม่มีจุดดับบนผิวดวงอาทิตย์ รังสีคอสมิกจากห้วงอวกาศลึกจะสามารถทะลุเข้ามาในระบบสุริยะได้มากขึ้น</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', monospace", fontWeight: 600 }}>
              ผลกระทบจากวัฏจักรสุริยะ (Space Weather Impacts)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              เมื่อปริมาณจุดดับดวงอาทิตย์มีจำนวนสูงขึ้น โอกาสเกิดพายุสุริยะและผลกระทบต่อเทคโนโลยีบนโลกจะเพิ่มขึ้นตามลำดับ:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderLeft: '2px solid #E67E22' }}>
                <div style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>การสื่อสารคลื่นวิทยุ (Radio Blackout):</div>
                <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>รังสี X-ray จากกลุ่มจุดดับกระตุ้นชั้นไอโอโนสเฟียร์ รบกวนสัญญาณวิทยุความถี่สูง (HF)</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderLeft: '2px solid #F59E0B' }}>
                <div style={{ color: '#F8FAFC', fontWeight: 600, fontSize: 13 }}>ดาวเทียม & สัญญาณ GPS:</div>
                <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>ชั้นบรรยากาศชั้นบนขยายตัวเพิ่มแรงต้านดาวเทียมวงโคจรต่ำ และทำให้สัญญาณ GPS คลาดเคลื่อน</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', monospace", fontWeight: 600 }}>
              สูตรคำนวณดรรชนี Wolf Sunspot Number ($R_i$)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 12px 0', lineHeight: '1.7' }}>
              ดรรชนีจุดบนดวงอาทิตย์สากล คำนวณโดยใช้สูตรของ Rudolf Wolf (ปี 1848):
            </p>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: 14, border: '1px solid rgba(230,126,34,0.3)', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E67E22', marginBottom: 12 }}>
              R_i = k · (10g + s)
            </div>
            <ul style={{ color: '#94A3B8', fontSize: 12, margin: 0, paddingLeft: 20, lineHeight: '1.6' }}>
              <li><strong>g</strong>: จำนวนกลุ่มจุดบนดวงอาทิตย์ (Sunspot Groups)</li>
              <li><strong>s</strong>: จำนวนจุดดับเดี่ยวๆ ทั้งหมด (Individual Sunspots)</li>
              <li><strong>k</strong>: ตัวคูณปรับมาตรฐานของแต่ละหอดูดาว (Observatory Scale Factor)</li>
            </ul>
          </div>
        )}

        {activeTab === 'credits' && (
          <div>
            <h4 style={{ color: '#F8FAFC', margin: '0 0 14px 0', fontSize: 15, fontFamily: "'Orbitron', monospace", fontWeight: 600 }}>
              แหล่งข้อมูลอ้างอิง (Data Source & Credits)
            </h4>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 12px 0', lineHeight: '1.7' }}>
              ข้อมูลจัดทำโดย **SILSO (Sunspot Index and Long-term Solar Observations)** ศูนย์ข้อมูล World Data Center for the Sunspot Index จากหอดูดาว **Royal Observatory of Belgium** กรุงบรัสเซลส์ ประเทศเบลเยียม
            </p>
            <div style={{ fontSize: 12, color: '#E67E22', fontFamily: 'var(--font-mono)' }}>
              SILSO Portal: <a href="https://www.sidc.be/SILSO/" target="_blank" rel="noreferrer" style={{ color: '#38BDF8', textDecoration: 'none' }}>https://www.sidc.be/SILSO/</a>
            </div>
          </div>
        )}
      </InstrumentInfoGuide>

      
    </div>
  );
}
