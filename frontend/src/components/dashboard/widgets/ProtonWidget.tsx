import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { loadProton } from '../../../services/goesService'

export default function ProtonWidget() {
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [energies, setEnergies] = useState<string[]>([])

  useEffect(() => {
    loadProton(4320).then(d => {
      const map: Record<string, any> = {}
      d.forEach((r: any) => {
        if (!map[r.time_tag]) map[r.time_tag] = { time_tag: r.time_tag }
        map[r.time_tag][r.energy] = r.flux
      })
      const pivoted = Object.values(map).sort((a: any, b: any) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
      const keys = [...new Set(d.map((r: any) => r.energy))].filter(Boolean) as string[]
      setData(pivoted)
      setEnergies(keys)
    }).catch(() => {})
  }, [])

  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 45 },
    xAxis: { type: 'time', splitLine: { show: false }, axisLabel: { color: '#606075', fontSize: 9 } },
    yAxis: { type: 'log', splitLine: { show: false }, axisLabel: { color: '#606075', fontSize: 9 } },
    series: energies.length > 0 ? energies.map(energy => ({
      name: energy,
      type: 'line',
      showSymbol: false,
      lineStyle: { width: 1.5 },
      data: data.map(d => [d.time_tag, d[energy]])
    })) : [
      { name: '>=10 MeV', type: 'line', showSymbol: false, itemStyle: { color: '#F59E0B' }, lineStyle: { width: 1.5 }, data: [] }
    ],
    tooltip: { trigger: 'axis', backgroundColor: '#16161F', textStyle: { color: '#FFF', fontSize: 10 } }
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const latestTenMev = latest ? latest['>=10 MeV'] || latest['>=10MeV'] || Object.values(latest).find(v => typeof v === 'number') : null;

  return (
    <div style={{ height: '240px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/goes/proton')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view GOES Proton Flux details"
        >
          <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            // PROTON FLUX
          </span>
          <span style={{ fontSize: 9, color: '#F59E0B', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: 'rgba(245, 158, 11, 0.12)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: '#F59E0B' }}>
          {latestTenMev != null ? `${Number(latestTenMev).toExponential(1)} pfu` : '—'}
        </div>
      </div>
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#606075', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            NO PROTON DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}
