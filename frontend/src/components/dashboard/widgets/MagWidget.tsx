import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadMag } from '../../../services/aceService';
import { useWidgetTheme } from './useWidgetTheme';

export default function MagWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, valueColor } = useWidgetTheme();

  useEffect(() => {
    loadMag(4320).then(setData);
  }, []);

  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 30 },
    xAxis: { type: 'time', splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    yAxis: { type: 'value', splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    series: [
      {
        name: 'Bz',
        type: 'line',
        showSymbol: false,
        itemStyle: { color: isLight ? '#1A6DB5' : '#3498DB' },
        lineStyle: { width: 1.5 },
        data: data.map((d: any) => [d.time_tag, d.bz])
      }
    ],
    tooltip
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/ace/mag')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view ACE Mag details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // ACE MAG (Bz)
          </span>
          <span style={{ fontSize: 12, color: isLight ? '#1A6DB5' : '#3498DB', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: isLight ? 'rgba(26, 109, 181, 0.08)' : 'rgba(52, 152, 219, 0.12)', padding: '1px 6px', borderRadius: '3px', border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(52, 152, 219, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: valueColor }}>
          {latest ? `${latest.bz.toFixed(2)} nT` : '—'}
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
