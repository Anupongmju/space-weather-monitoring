import React, { useEffect, useState } from 'react';

const getAlertType = (msg) => {
  if (msg.includes('WARNING:')) return { label: 'WARNING', color: '#3498DB' };
  if (msg.includes('ALERT:')) return { label: 'ALERT', color: '#EF4444' };
  if (msg.includes('WATCH:')) return { label: 'WATCH', color: '#FBBF24' };
  if (msg.includes('SUMMARY:')) return { label: 'SUMMARY', color: '#94A3B8' };
  if (msg.includes('EXTENDED WARNING:')) return { label: 'EXT WARNING', color: '#3498DB' };
  return { label: 'INFO', color: '#94A3B8' };
};

const parseTitle = (msg) => {
  const lines = msg.split('\n');
  const line = lines.find(l =>
    l.includes('WARNING:') || l.includes('ALERT:') ||
    l.includes('WATCH:') || l.includes('SUMMARY:') || l.includes('EXTENDED WARNING:')
  );
  if (line) return line.replace(/^.*?(WARNING:|ALERT:|WATCH:|SUMMARY:|EXTENDED WARNING:)/, '').trim();
  return 'NOAA Space Weather Message';
};

export default function AlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('https://services.swpc.noaa.gov/products/alerts.json');
        const data = await res.json();
        setAlerts(data.slice(0, 5));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  return (
    <div style={{
      background: '#050A14',
      backdropFilter: 'blur(8px)',
      borderRadius: '0px',
      marginBottom: '20px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(52, 152, 219, 0.18)',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Pulsing red dot for live alerts */}
          <span style={{ position: 'relative', width: '8px', height: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              position: 'absolute', width: '14px', height: '14px',
              background: 'rgba(239, 68, 68, 0.3)', borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></span>
            <span style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', position: 'relative' }}></span>
          </span>
          <h3 style={{
            margin: 0, fontSize: '11px', fontWeight: '700',
            fontFamily: "'Orbitron', monospace", color: '#ffffff',
            letterSpacing: '2px', textTransform: 'uppercase'
          }}>NOAA ALERTS</h3>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#606075', letterSpacing: '1px', textTransform: 'uppercase' }}>
          LIVE · SWPC
        </span>
      </div>

      {loading ? (
        <div style={{ fontFamily: 'var(--font-mono)', color: '#606075', fontSize: '12px', padding: '8px 0' }}>
          Fetching latest alerts...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {alerts.map((alert, idx) => {
            const title = parseTitle(alert.message);
            const type = getAlertType(alert.message);
            const date = alert.issue_datetime.substring(0, 16);

            return (
              <div
                key={idx}
                style={{
                  padding: '12px 0',
                  borderBottom: idx < alerts.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  // cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {/* Type badge + date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '9px',
                    color: type.color, letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    // {type.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#606075' }}>
                    {date} UTC
                  </span>
                </div>
                <p style={{
                  margin: 0, fontSize: '12px', color: '#E2E8F0',
                  lineHeight: '1.45', fontWeight: '500',
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>
                  {title}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
