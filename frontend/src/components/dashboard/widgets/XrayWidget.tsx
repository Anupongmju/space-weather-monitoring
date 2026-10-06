import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadXray } from '../../../services/goesService';
import { formatPowerOf10 } from '../../../utils/formatters';
import { useWidgetTheme } from './useWidgetTheme';

export default function XrayWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, emptyTextColor } = useWidgetTheme();
  
  useEffect(() => {
    loadXray(4320).then(setData);
  }, []);

  const longColor = isLight ? '#0284C7' : '#38BDF8';
  const shortColor = isLight ? '#059669' : '#22C55E';

  const option = {
    useUTC: true,
    grid: { top: 12, right: 10, bottom: 20, left: 45 },
    xAxis: { type: 'time', splitLine, axisLabel: { color: axisLabelColor, fontSize: 12 } },
    yAxis: {
      type: 'log',
      splitLine,
      axisLabel: {
        color: axisLabelColor,
        fontSize: 12,
        formatter: formatPowerOf10
      }
    },
    series: [
      {
        name: '1-8 Å (Long)',
        type: 'line',
        showSymbol: false,
        itemStyle: { color: longColor },
        lineStyle: { width: 1.5, color: longColor },
        data: data.map((d: any) => [d.time_tag, d.flux_long])
      },
      {
        name: '0.5-4 Å (Short)',
        type: 'line',
        showSymbol: false,
        itemStyle: { color: shortColor },
        lineStyle: { width: 1.5, color: shortColor },
        data: data.map((d: any) => [d.time_tag, d.flux_short])
      }
    ],
    tooltip: {
      ...tooltip,
      formatter: (params: any[]) => {
        if (!params || !params.length) return '';
        const date = params[0].axisValueLabel || params[0].data?.[0];
        let html = `<div style="font-size:12px;color:${isLight ? '#475569' : '#94A3B8'};margin-bottom:6px;">${date}</div>`;
        params.forEach(p => {
          const val = p.data && p.data[1] != null && !isNaN(p.data[1]) ? Number(p.data[1]).toExponential(2) : '—';
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px;">
            <span style="color:${isLight ? '#334155' : '#CBD5E1'}">${p.marker} ${p.seriesName}</span>
            <span style="font-weight:bold;color:${p.color}">${val}</span>
          </div>`;
        });
        return html;
      }
    }
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div 
          onClick={() => navigate('/goes/xray')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}
          title="Click to view GOES X-Ray details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // GOES X-RAY
          </span>
          <span style={{ fontSize: 12, color: isLight ? '#1A6DB5' : '#3498DB', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: isLight ? 'rgba(26, 109, 181, 0.08)' : 'rgba(52, 152, 219, 0.12)', padding: '1px 6px', borderRadius: '3px', border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(52, 152, 219, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: longColor, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8' }}>L:</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: longColor }}>
              {latest && latest.flux_long ? latest.flux_long.toExponential(1) : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: shortColor, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#94A3B8' }}>S:</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: shortColor }}>
              {latest && latest.flux_short ? latest.flux_short.toExponential(1) : '—'}
            </span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} notMerge={true} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emptyTextColor, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
            NO X-RAY DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}
