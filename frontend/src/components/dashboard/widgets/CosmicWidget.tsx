import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { loadNeutronWithFallback } from '../../../services/cosmicService'

export default function CosmicWidget() {
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [station, setStation] = useState<string>('OULU')
  
  useEffect(() => {
    loadNeutronWithFallback(['OULU', 'SOPO', 'JUNG1', 'THUL', 'MOSC'], 4320).then(res => {
      setStation(res.station)
      setData(res.data)
    })
  }, [])


  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 45 },
    xAxis: { type: 'time', splitLine: { show: false }, axisLabel: { color: '#606075', fontSize: 9 } },
    yAxis: { type: 'value', scale: true, splitLine: { show: false }, axisLabel: { color: '#606075', fontSize: 9 } },
    series: [
      {
        name: `${station} Count Rate`,
        type: 'line',
        showSymbol: false,
        itemStyle: { color: '#818CF8' },
        lineStyle: { width: 1.5 },
        data: data.map((d: any) => [d.time_tag, d.count_rate])
      }
    ],
    tooltip: { trigger: 'axis', backgroundColor: '#16161F', textStyle: { color: '#FFF', fontSize: 10 } }
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div style={{ height: '240px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/cosmic/neutron')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view Cosmic Ray Neutron details"
        >
          <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            // COSMIC RAY ({station})
          </span>
          <span style={{ fontSize: 9, color: '#818CF8', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: 'rgba(129, 140, 248, 0.12)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(129, 140, 248, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: '#818CF8' }}>
          {latest && latest.count_rate ? `${latest.count_rate.toFixed(0)} cpm` : '—'}
        </div>
      </div>
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#606075', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            NO COSMIC DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}



