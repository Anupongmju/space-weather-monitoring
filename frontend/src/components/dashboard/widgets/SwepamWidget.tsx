import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadSwepam } from '../../../services/aceService';
import { useWidgetTheme } from './useWidgetTheme';

export default function SwepamWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, valueColor } = useWidgetTheme();

  useEffect(() => {
    loadSwepam(4320).then(setData);
  }, []);

  const option = {
    useUTC: true,
    grid: { top: 10, right: 10, bottom: 20, left: 30 },
    xAxis: { type: 'time', splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    yAxis: { type: 'value', splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    series: [
      {
        name: 'Speed',
        type: 'line',
        showSymbol: false,
        itemStyle: { color: isLight ? '#0284C7' : '#38BDF8' },
        lineStyle: { width: 1.5 },
        data: data.map((d: any) => [d.time_tag, d.bulk_speed])
      }
    ],
    tooltip
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div 
          onClick={() => navigate('/ace/swepam')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}
          title="Click to view Solar Wind Speed details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // SOLAR WIND SPEED
          </span>
          <span style={{ fontSize: 12, color: isLight ? '#0284C7' : '#38BDF8', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)', padding: '1px 6px', borderRadius: '3px', border: isLight ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(56, 189, 248, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: isLight ? '#0284C7' : '#38BDF8', flexShrink: 0 }}>
          {latest && latest.bulk_speed != null ? `${latest.bulk_speed.toFixed(0)} km/s` : '—'}
        </div>
      </div>
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : null}
      </div>
    </div>
  );
}
