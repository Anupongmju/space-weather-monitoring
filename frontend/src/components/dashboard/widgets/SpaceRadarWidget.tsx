import React, { useState, useEffect } from 'react';

export default function SpaceRadarWidget() {
  const [sweepAngle, setSweepAngle] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSweepAngle((prev) => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(timer);
  }, []);

  const cardStyle: React.CSSProperties = {
    background: '#050A14',
    backdropFilter: 'blur(8px)',
    borderRadius: '0px',
    padding: '20px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(52, 152, 219, 0.18)',
    marginBottom: '20px',
    position: 'relative',
    fontFamily: 'var(--font-mono)'
  };

  const satellites = [
    { name: 'ACE / L1', distance: '1.5M km', lat: '0.00°', lon: '0.00°', status: 'LOCK', color: '#3498DB', cx: 120, cy: 60 },
    { name: 'GOES-16', distance: '35,786 km', lat: '+0.01°', lon: '-75.2°', status: 'ACTIVE', color: '#22C55E', cx: 80, cy: 110 },
    { name: 'LRO / MOON', distance: '384,400 km', lat: '-5.14°', lon: '+12.4°', status: 'TRACKING', color: '#C084FC', cx: 155, cy: 135 },
  ];

  return (
    <div style={cardStyle}>
      {/* Sci-Fi Corner Brackets */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%', boxShadow: '0 0 6px #3498DB' }}></span>
          <h3 style={{
            margin: 0, fontSize: '11px', fontWeight: '700',
            fontFamily: "'Orbitron', monospace", color: '#ffffff',
            letterSpacing: '2px', textTransform: 'uppercase'
          }}>HUD ORBIT RADAR</h3>
        </div>
        <span style={{ fontSize: '9px', color: '#38BDF8', letterSpacing: '1px' }}>
          SWEEP 360° · REALTIME
        </span>
      </div>

      {/* Radar View Container */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
            <defs>
              <radialGradient id="radarSweepGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3498DB" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3498DB" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Concentric Circles */}
            <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(52, 152, 219, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(52, 152, 219, 0.25)" strokeWidth="1" />
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(52, 152, 219, 0.3)" strokeWidth="1" />

            {/* Axis Lines */}
            <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(52, 152, 219, 0.2)" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(52, 152, 219, 0.2)" strokeWidth="1" strokeDasharray="2 2" />

            {/* Degree Markings */}
            <text x="100" y="20" fill="rgba(52, 152, 219, 0.6)" fontSize="7" textAnchor="middle">0°</text>
            <text x="182" y="103" fill="rgba(52, 152, 219, 0.6)" fontSize="7">90°</text>
            <text x="100" y="186" fill="rgba(52, 152, 219, 0.6)" fontSize="7" textAnchor="middle">180°</text>
            <text x="12" y="103" fill="rgba(52, 152, 219, 0.6)" fontSize="7">270°</text>

            {/* Rotating Radar Sweep Line */}
            <g transform={`rotate(${sweepAngle}, 100, 100)`}>
              <line x1="100" y1="100" x2="100" y2="12" stroke="#38BDF8" strokeWidth="1.5" opacity="0.9" />
              <path d="M 100 100 L 100 12 A 88 88 0 0 0 50 26 Z" fill="url(#radarSweepGlow)" />
            </g>

            {/* Center Earth Marker */}
            <circle cx="100" cy="100" r="5" fill="#3498DB" />
            <circle cx="100" cy="100" r="10" fill="none" stroke="#3498DB" strokeWidth="1" opacity="0.6" />

            {/* Satellite Blips */}
            {satellites.map((sat, idx) => (
              <g key={idx}>
                <circle cx={sat.cx} cy={sat.cy} r="3.5" fill={sat.color} />
                <circle cx={sat.cx} cy={sat.cy} r="8" fill="none" stroke={sat.color} strokeWidth="1" opacity="0.5" className="animate-glow" />
                <text x={sat.cx + 6} y={sat.cy + 3} fill="#ffffff" fontSize="7" fontWeight="bold">{sat.name.split('/')[0]}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Satellite Coordinates Table */}
        <div style={{ width: '100%', fontSize: '10px', color: '#94A3B8' }}>
          {satellites.map((sat) => (
            <div key={sat.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', background: sat.color, borderRadius: '50%' }} />
                <span style={{ color: '#F8FAFC', fontWeight: 'bold' }}>{sat.name}</span>
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '9px' }}>{sat.distance}</div>
              <span style={{
                color: sat.color,
                fontSize: '8px',
                padding: '1px 4px',
                background: `${sat.color}15`,
                border: `1px solid ${sat.color}44`,
                borderRadius: '2px'
              }}>{sat.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
