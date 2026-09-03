import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadNeutronWithFallback } from '../../../services/cosmicService';
import { useWidgetTheme } from './useWidgetTheme';

export default function CosmicWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [station, setStation] = useState<string>('OULU');
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, emptyTextColor } = useWidgetTheme();
  
  useEffect(() => {
    loadNeutronWithFallback(['OULU', 'SOPO', 'JUNG1', 'THUL', 'MOSC'], 4320).then(res => {
      setStation(res.station);
      setData(res.data);
    });
  }, []);

  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 45 },
    xAxis: { type: 'time', splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    yAxis: { type: 'value', scale: true, splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    series: [
      {
        name: `${station} Count Rate`,
        type: 'line',
        showSymbol: false,
        itemStyle: { color: isLight ? '#4F46E5' : '#818CF8' },
        lineStyle: { width: 1.5 },
        data: data.map((d: any) => [d.time_tag, d.count_rate])
      }
    ],
    tooltip
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/cosmic/neutron')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view Cosmic Ray Neutron details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // COSMIC RAY ({station})
          </span>
          <span style={{ fontSize: 12, color: isLight ? '#4F46E5' : '#818CF8', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: isLight ? 'rgba(79, 70, 229, 0.08)' : 'rgba(129, 140, 248, 0.12)', padding: '1px 6px', borderRadius: '3px', border: isLight ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(129, 140, 248, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: isLight ? '#4F46E5' : '#818CF8' }}>
          {latest && latest.count_rate ? `${latest.count_rate.toFixed(0)} cpm` : '—'}
        </div>
      </div>
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emptyTextColor, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
            LOADING COSMIC DATA...
          </div>
        )}
      </div>
    </div>
  );
}
