import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadMonthlySunspot, loadLatestSunspot, SunspotRecord } from '../../../services/sunspotService';
import { useWidgetTheme } from './useWidgetTheme';

export default function SunspotWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<SunspotRecord[]>([]);
  const [latestValue, setLatestValue] = useState<number | null>(null);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, emptyTextColor } = useWidgetTheme();

  useEffect(() => {
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
      splitLine,
      axisLabel: {
        color: axisLabelColor,
        fontSize: 11,
        interval: Math.floor(data.length / 4)
      }
    },
    yAxis: {
      type: 'value',
      splitLine,
      axisLabel: { color: axisLabelColor, fontSize: 12 }
    },
    series: [
      {
        name: 'Sunspot Number',
        type: 'line',
        showSymbol: false,
        smooth: true,
        itemStyle: { color: isLight ? '#D97706' : '#E67E22' },
        lineStyle: { width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isLight ? 'rgba(217, 119, 6, 0.25)' : 'rgba(230, 126, 34, 0.35)' },
              { offset: 1, color: isLight ? 'rgba(217, 119, 6, 0.0)' : 'rgba(230, 126, 34, 0.0)' }
            ]
          }
        },
        data: data.map(d => d.sunspot_number)
      }
    ],
    tooltip: {
      ...tooltip,
      formatter: (params: any) => {
        if (!params || !params[0]) return '';
        const item = params[0];
        return `<div><strong>${item.name}</strong><br/>Sunspot Number: <span style="color:${isLight ? '#D97706' : '#E67E22'};font-weight:bold">${item.value}</span></div>`;
      }
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          onClick={() => navigate('/solar/sunspot')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view SILSO Sunspot details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // SUNSPOT NUMBER
          </span>
          <span style={{
            fontSize: 12,
            color: isLight ? '#D97706' : '#E67E22',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 1,
            background: isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(230, 126, 34, 0.12)',
            padding: '1px 6px',
            borderRadius: '3px',
            border: isLight ? '1px solid rgba(217, 119, 6, 0.25)' : '1px solid rgba(230, 126, 34, 0.3)'
          }}>
            SILSO ↗
          </span>
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "'Orbitron', monospace",
          color: isLight ? '#D97706' : '#E67E22'
        }}>
          {latestValue !== null ? `${latestValue.toFixed(1)} SSN` : '—'}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emptyTextColor, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
            LOADING SUNSPOT DATA...
          </div>
        )}
      </div>
    </div>
  );
}
