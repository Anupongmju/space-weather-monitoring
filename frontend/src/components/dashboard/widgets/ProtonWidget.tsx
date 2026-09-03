import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadProton } from '../../../services/goesService';
import { formatPowerOf10 } from '../../../utils/formatters';
import { useWidgetTheme } from './useWidgetTheme';

const INTEGRAL_COLORS: Record<string, string> = {
  '>=1 MeV': '#3B82F6',
  '>=5 MeV': '#22C55E',
  '>=10 MeV': '#F59E0B',
  '>=30 MeV': '#EAB308',
  '>=50 MeV': '#3498DB',
  '>=60 MeV': '#F97316',
  '>=100 MeV': '#EF4444',
  '>=500 MeV': '#A855F7'
};

export default function ProtonWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [energies, setEnergies] = useState<string[]>([]);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, emptyTextColor } = useWidgetTheme();

  useEffect(() => {
    loadProton(4320).then(d => {
      // Filter out differential channels so the widget ONLY plots Integral channels (>=1 MeV, >=10 MeV, etc.)
      const intData = d.filter((r: any) => r.energy && r.energy.startsWith('>='))
      const targetData = intData.length > 0 ? intData : d

      const map: Record<string, any> = {}
      targetData.forEach((r: any) => {
        if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
        map[r.time_tag][r.energy] = r.flux
      })
      const pivoted = Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
      const keys = [...new Set(targetData.map((r: any) => r.energy))].filter(Boolean) as string[]
      setData(pivoted)
      setEnergies(keys)
    }).catch(() => {})
  }, []);

  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 45 },
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
    series: energies.map(energy => ({
      name: energy,
      type: 'line',
      showSymbol: false,
      lineStyle: { width: 1.5, color: INTEGRAL_COLORS[energy] || '#38BDF8' },
      itemStyle: { color: INTEGRAL_COLORS[energy] || '#38BDF8' },
      data: data.map(d => [d.time_tag, d[energy]])
    })),
    tooltip
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const latestTenMev = latest ? latest['>=10 MeV'] || latest['>=10MeV'] || Object.values(latest).find(v => typeof v === 'number') : null;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/goes/proton')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view GOES Proton Flux details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // PROTON FLUX
          </span>
          <span style={{ fontSize: 12, color: '#D97706', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(245, 158, 11, 0.12)', padding: '1px 6px', borderRadius: '3px', border: isLight ? '1px solid rgba(217, 119, 6, 0.25)' : '1px solid rgba(245, 158, 11, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: isLight ? '#D97706' : '#F59E0B' }}>
          {latestTenMev != null ? `${Number(latestTenMev).toExponential(1)} pfu` : '—'}
        </div>
      </div>
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} notMerge={true} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emptyTextColor, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
            NO PROTON DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}
