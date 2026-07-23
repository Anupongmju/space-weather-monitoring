import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { loadMag } from '../../../services/aceService'

export default function MagWidget() {
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  
  useEffect(() => {
    loadMag(4320).then(setData)
  }, [])


  const option = {
    grid: { top: 10, right: 10, bottom: 20, left: 30 },
    xAxis: { type: 'time', splitLine: { show: false }, axisLabel: { color: '#606075', fontSize: 9 } },
    yAxis: { type: 'value', splitLine: { show: false }, axisLabel: { color: '#606075', fontSize: 9 } },
    series: [
      { name: 'Bz', type: 'line', showSymbol: false, itemStyle: { color: '#3498DB' }, lineStyle: { width: 1.5 }, data: data.map((d: any) => [d.time_tag, d.bz]) }
    ],
    tooltip: { trigger: 'axis', backgroundColor: '#16161F', textStyle: { color: '#FFF', fontSize: 10 } }
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div style={{ height: '240px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/ace/mag')}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Click to view ACE Mag details"
        >
          <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            // ACE MAG (Bz)
          </span>
          <span style={{ fontSize: 9, color: '#3498DB', fontFamily: 'var(--font-mono)', letterSpacing: 1, background: 'rgba(52, 152, 219, 0.12)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
            DETAIL ↗
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: '#ffffff' }}>
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


