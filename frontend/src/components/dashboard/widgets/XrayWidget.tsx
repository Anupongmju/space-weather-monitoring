import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadXray } from '../../../services/goesService';
import { useWidgetTheme } from './useWidgetTheme';

export default function XrayWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, valueColor } = useWidgetTheme();
  
  useEffect(() => {
    loadXray(4320).then(setData);
  }, []);

  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 40 },
    xAxis: { type: 'time', splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    yAxis: {
      type: 'log',
      splitLine,
      axisLabel: {
        color: axisLabelColor,
        fontSize: 12,
        formatter: (v: number) => {
          if (v <= 0) return '0';
          const log = Math.round(Math.log10(v));
          const superscripts: Record<string, string> = {
            '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
          };
          const expStr = log.toString().split('').map(c => superscripts[c] || c).join('');
          return `10${expStr}`;
        }
      }
    },
    series: [
      {
        name: '1-8 Å',
        type: 'line',
        showSymbol: false,
        itemStyle: { color: isLight ? '#1A6DB5' : '#3498DB' },
        lineStyle: { width: 1.5 },
        data: data.map((d: any) => [d.time_tag, d.flux_long])
      }
    ],
    tooltip
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/goes/xray')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view GOES X-Ray details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // GOES X-RAY
          </span>
          <span style={{ fontSize: 12, color: isLight ? '#1A6DB5' : '#3498DB', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: isLight ? 'rgba(26, 109, 181, 0.08)' : 'rgba(52, 152, 219, 0.12)', padding: '1px 6px', borderRadius: '3px', border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(52, 152, 219, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: valueColor }}>
          {latest ? `${latest.flux_long.toExponential(2)}` : '—'}
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
