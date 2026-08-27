import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadMonthlySunspot, loadLatestSunspot, SunspotRecord } from '../../../services/sunspotService';

export default function SunspotWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<SunspotRecord[]>([]);
  const [latestValue, setLatestValue] = useState<number | null>(null);

  useEffect(() => {
    // Load last 120 months (10 years) for widget trend graph
    loadMonthlySunspot(120).then(d => {
      setData(d);
      if (d.length > 0) {
        setLatestValue(d[d.length - 1].sunspot_number);
      }
    }).catch(err => console.error('SunspotWidget error:', err));

    loadLatestSunspot().then(res => {
      if (res.latest) {
        setLatestValue(res.latest.sunspot_number);
      }
    }).catch(() => {});
  }, []);

  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 35 },
    xAxis: {
      type: 'category',
      data: data.map(d => `${d.year}-${String(d.month).padStart(2, '0')}`),
      splitLine: { show: false },
      axisLabel: {
        color: '#606075',
        fontSize: 9,
        interval: Math.floor(data.length / 4)
      }
    },
    yAxis: {
      type: 'value',
      splitLine: { show: false },
      axisLabel: { color: '#606075', fontSize: 9 }
    },
    series: [
      {
        name: 'Sunspot Number',
        type: 'line',
        showSymbol: false,
        smooth: true,
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
        },
        data: data.map(d => d.sunspot_number)
      }
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#16161F',
      borderColor: 'rgba(230, 126, 34, 0.3)',
      textStyle: { color: '#FFF', fontSize: 10 },
      formatter: (params: any) => {
        if (!params || !params[0]) return '';
        const item = params[0];
        return `<div><strong>${item.name}</strong><br/>Sunspot Number: <span style="color:#E67E22;font-weight:bold">${item.value}</span></div>`;
      }
    }
  };

  return (
    <div style={{
      height: '240px',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          onClick={() => navigate('/solar/sunspot')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view SILSO Sunspot details"
        >
          <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            // SUNSPOT NUMBER
          </span>
          <span style={{
            fontSize: 9,
            color: '#E67E22',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 1,
            background: 'rgba(230, 126, 34, 0.12)',
            padding: '1px 6px',
            borderRadius: '3px',
            border: '1px solid rgba(230, 126, 34, 0.3)'
          }}>
            SILSO ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: '#E67E22' }}>
          {latestValue !== null ? `${latestValue.toFixed(1)} SSN` : '—'}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#606075', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            LOADING SUNSPOT DATA...
          </div>
        )}
      </div>
    </div>
  );
}
