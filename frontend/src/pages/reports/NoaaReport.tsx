import React, { useState, useEffect } from 'react';

export default function NoaaReport() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('https://services.swpc.noaa.gov/products/alerts.json');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setAlerts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Refresh every 5 minutes for near real-time updates
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getAlertBadge = (message) => {
    if (message.includes('WARNING')) return { label: 'WARNING', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (message.includes('WATCH')) return { label: 'WATCH', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
    if (message.includes('ALERT')) return { label: 'ALERT', color: '#3498DB', bg: 'rgba(52, 152, 219, 0.1)' };
    if (message.includes('SUMMARY')) return { label: 'SUMMARY', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    return { label: 'INFO', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  };

  const parseMessage = (msg) => {
    const lines = msg.split('\n');
    return lines.map((line, idx) => {
      // Bold the keys for better readability
      if (line.includes(':')) {
        const [key, ...rest] = line.split(':');
        return <div key={idx} style={{ marginBottom: '4px' }}><strong style={{ color: 'rgba(255,255,255,0.8)' }}>{key}:</strong> {rest.join(':')}</div>;
      }
      return <div key={idx} style={{ marginBottom: '4px' }}>{line}</div>;
    });
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-mono)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', marginBottom: '40px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '12px', height: '12px', background: '#3498DB', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px #3498DB' }}></span>
            NOAA SWPC Reports & Alerts
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '14px' }}>
            Real-time Space Weather Prediction Center Data Feed
          </p>
        </div>
        
        {loading && <div style={{ color: '#3498DB', fontSize: '14px' }}>Fetching latest data...</div>}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          Error fetching NOAA data: {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px' }}>
        {alerts.map((alert, idx) => {
          const badge = getAlertBadge(alert.message);
          return (
            <div key={idx} style={{
              background: 'rgba(20, 25, 35, 0.6)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(30, 35, 45, 0.8)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(20, 25, 35, 0.6)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: `1px solid ${badge.color}`
                  }}>
                    {badge.label}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>ID: {alert.product_id}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                  {new Date(alert.issue_datetime).toLocaleString()}
                </div>
              </div>

              <div style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                lineHeight: '1.6',
                background: 'rgba(0,0,0,0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `2px solid ${badge.color}`
              }}>
                {parseMessage(alert.message)}
              </div>
            </div>
          );
        })}

        {!loading && alerts.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px' }}>
            No recent alerts found.
          </div>
        )}
      </div>
    </div>
  );
}
