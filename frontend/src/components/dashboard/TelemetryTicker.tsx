import React from 'react';

export default function TelemetryTicker() {
  const tickerItems = [
    { tag: 'L1/ACE', metric: 'IMF Bz', val: '+0.6 nT', status: 'NORMAL', color: '#3498DB' },
    { tag: 'L1/SWEPAM', metric: 'BULK SPEED', val: '290 km/s', status: 'QUIET', color: '#38BDF8' },
    { tag: 'GOES-16', metric: 'X-RAY FLUX', val: 'Class C1.7', status: 'QUIET', color: '#22C55E' },
    { tag: 'GOES-16', metric: 'PROTON FLUX', val: '0.2 pfu', status: 'NOMINAL', color: '#3498DB' },
    { tag: 'GLOBAL', metric: 'KP INDEX', val: '1.33 (G0)', status: 'QUIET', color: '#22C55E' },
    { tag: 'COSMIC', metric: 'NEUTRON MON', val: '101 cpm', status: 'NORMAL', color: '#C084FC' },
    { tag: 'MAW', metric: 'PRESSURE', val: '988 hPa', status: 'STABLE', color: '#38BDF8' },
  ];

  // Duplicate items for continuous seamless infinite loop
  const displayItems = [...tickerItems, ...tickerItems];

  return (
    <div style={{
      width: '100%',
      height: '32px',
      background: 'rgba(3, 9, 20, 0.95)',
      borderBottom: '1px solid rgba(52, 152, 219, 0.25)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 900,
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      userSelect: 'none'
    }}>
      {/* Fixed Left Label Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 14px',
        height: '100%',
        background: '#050A14',
        borderRight: '1px solid rgba(52, 152, 219, 0.3)',
        color: '#3498DB',
        fontWeight: 'bold',
        letterSpacing: '1.5px',
        whiteSpace: 'nowrap',
        zIndex: 2,
        boxShadow: '4px 0 12px rgba(0,0,0,0.5)'
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#3498DB', boxShadow: '0 0 8px #3498DB'
        }} />
        TELEMETRY STREAM //
      </div>

      {/* Scrolling Container */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        width: 'max-content',
        animation: 'ticker-scroll 28s linear infinite',
      }}
        onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
        onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
      >
        {displayItems.map((item, idx) => (
          <div key={idx} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 20px',
            whiteSpace: 'nowrap',
            borderRight: '1px dashed rgba(255,255,255,0.08)'
          }}>
            <span style={{ color: '#64748B', fontWeight: 'bold' }}>[{item.tag}]</span>
            <span style={{ color: '#94A3B8' }}>{item.metric}:</span>
            <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{item.val}</span>
            <span style={{
              fontSize: '9px',
              padding: '1px 5px',
              borderRadius: '2px',
              background: `${item.color}15`,
              color: item.color,
              border: `1px solid ${item.color}44`,
              letterSpacing: '0.5px'
            }}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
