import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import { loadElectron } from '../../../services/goesService';
import { useWidgetTheme } from './useWidgetTheme';

export default function ElectronWidget() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [energies, setEnergies] = useState<string[]>([]);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, emptyTextColor } = useWidgetTheme();

  useEffect(() => {
    loadElectron(4320).then(d => {
      const map: Record<string, any> = {};
      d.forEach((r: any) => {
        if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag };
        map[r.time_tag][r.energy] = r.flux;
      });
      const pivoted = Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime());
      const keys = [...new Set(d.map((r: any) => r.energy))].filter(Boolean) as string[];
      setData(pivoted);
      setEnergies(keys);
    }).catch(() => {});
  }, []);

  const option = {
    useUTC: true,
    grid: { top: 10, right: 10, bottom: 20, left: 45 },
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
    series: energies.length > 0 ? energies.map(energy => ({
      name: energy,
      type: 'line',
      showSymbol: false,
      lineStyle: { width: 1.5 },
      data: data.map(d => [d.time_tag, d[energy]])
    })) : [
      { name: '>=2 MeV', type: 'line', showSymbol: false, itemStyle: { color: isLight ? '#7C3AED' : '#A855F7' }, lineStyle: { width: 1.5 }, data: [] }
    ],
    tooltip
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const latestTwoMev = latest ? latest['>=2 MeV'] || latest['>=2MeV'] || Object.values(latest).find(v => typeof v === 'number') : null;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div 
          onClick={() => navigate('/goes/electron')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}
          title="Click to view GOES Electron Flux details"
        >
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // ELECTRON FLUX
          </span>
          <span style={{ fontSize: 12, color: isLight ? '#7C3AED' : '#A855F7', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: isLight ? 'rgba(124, 58, 237, 0.08)' : 'rgba(168, 85, 247, 0.12)', padding: '1px 6px', borderRadius: '3px', border: isLight ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid rgba(168, 85, 247, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: isLight ? '#7C3AED' : '#A855F7', flexShrink: 0 }}>
          {latestTwoMev != null ? `${Number(latestTwoMev).toExponential(1)}` : '—'}
        </div>
      </div>
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emptyTextColor, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
            NO ELECTRON DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}
