import React, { useEffect, useState } from 'react';
import { loadXray, loadProton, loadElectron } from '../../../services/goesService';
import { loadMag, loadSwepam } from '../../../services/aceService';

const getFlareColor = (flareClass) => {
  if (!flareClass) return '#606075';
  if (flareClass.startsWith('X')) return '#EF4444';
  if (flareClass.startsWith('M')) return '#F97316';
  if (flareClass.startsWith('C')) return '#f59e0b';
  return '#3b82f6';
};

const getFlareClassStr = (flux) => {
  if (!flux) return null;
  if (flux >= 1e-4) return `X${(flux / 1e-4).toFixed(1)}`;
  if (flux >= 1e-5) return `M${(flux / 1e-5).toFixed(1)}`;
  if (flux >= 1e-6) return `C${(flux / 1e-6).toFixed(1)}`;
  if (flux >= 1e-7) return `B${(flux / 1e-7).toFixed(1)}`;
  return `A${(flux / 1e-8).toFixed(1)}`;
};

const getStormColor = (kp) => {
  if (!kp) return '#606075';
  if (kp >= 8) return '#EF4444';
  if (kp >= 6) return '#F97316';
  if (kp >= 5) return '#f59e0b';
  return '#22c55e';
};

export default function FactsWidget() {
  const [data, setData] = useState({
    lastXFlare: null,
    lastMFlare: null,
    lastStorm: null,
    currentSsn: null,
    prevSsn: null,
    localMaxXray: null,
    localMinBz: null,
    localMaxSpeed: null,
    localMaxDensity: null,
    localMaxProton: null,
    localMaxElectron: null,
    loading: true,
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // --- 1. Fetch NOAA Data ---
        let lastX = null;
        let lastM = null;
        let lastStorm = null;
        let currentSsn = null;
        let prevSsn = null;

        try {
          const flaresRes = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json');
          const flares = await flaresRes.json();
          for (let i = flares.length - 1; i >= 0; i--) {
            const f = flares[i];
            if (!lastX && f.max_class && f.max_class.startsWith('X')) lastX = f;
            if (!lastM && f.max_class && f.max_class.startsWith('M')) lastM = f;
            if (lastX && lastM) break;
          }
          
          const kpRes = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
          const kpData = await kpRes.json();
          for (let i = kpData.length - 1; i > 0; i--) {
            const row = kpData[i];
            const kpVal = parseFloat(row[1]);
            if (kpVal >= 5) {
              lastStorm = { time: row[0], kp: kpVal };
              break;
            }
          }

          const ssnRes = await fetch('https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json');
          const ssnData = await ssnRes.json();
          if (ssnData.length >= 2) {
            currentSsn = ssnData[ssnData.length - 1];
            prevSsn = ssnData[ssnData.length - 2];
          }
        } catch (e) { console.error("NOAA fetch failed", e); }

        // --- 2. Fetch Local Database Data ---
        let localMaxXray = null;
        let localMinBz = null;
        let localMaxSpeed = null;
        let localMaxDensity = null;
        let localMaxProton = null;
        let localMaxElectron = null;

        try {
          const [xrayData, magData, swepamData, protonData, electronData] = await Promise.all([
            loadXray(10080), loadMag(10080), loadSwepam(10080),
            loadProton(10080), loadElectron(10080)
          ]);

          xrayData.forEach(d => {
            if (d.flux_long && (!localMaxXray || d.flux_long > localMaxXray.flux_long)) {
              localMaxXray = d;
            }
          });

          magData.forEach(d => {
            if (d.bz !== null && (!localMinBz || d.bz < localMinBz.bz)) {
              localMinBz = d;
            }
          });

          swepamData.forEach(d => {
            if (d.bulk_speed && (!localMaxSpeed || d.bulk_speed > localMaxSpeed.bulk_speed)) {
              localMaxSpeed = d;
            }
            if (d.proton_density && (!localMaxDensity || d.proton_density > localMaxDensity.proton_density)) {
              localMaxDensity = d;
            }
          });

          protonData.forEach(d => {
            if (d.energy === '>=10 MeV' && d.flux !== null && (!localMaxProton || d.flux > localMaxProton.flux)) {
              localMaxProton = d;
            }
          });

          electronData.forEach(d => {
            if (d.energy === '>=2 MeV' && d.flux !== null && (!localMaxElectron || d.flux > localMaxElectron.flux)) {
              localMaxElectron = d;
            }
          });
        } catch (e) { console.error("Local fetch failed", e); }

        setData({
          lastXFlare: lastX,
          lastMFlare: lastM,
          lastStorm: lastStorm,
          currentSsn,
          prevSsn,
          localMaxXray,
          localMinBz,
          localMaxSpeed,
          localMaxDensity,
          localMaxProton,
          localMaxElectron,
          loading: false
        });
      } catch (e) {
        console.error("Failed to fetch facts:", e);
        setData(d => ({ ...d, loading: false }));
      }
    };
    
    fetchAll();
  }, []);

  const cardStyle = {
    background: '#050A14',
    backdropFilter: 'blur(8px)',
    borderRadius: '0px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(52, 152, 219, 0.18)',
    fontFamily: 'var(--font-mono)'
  };

  const titleStyle = {
    margin: '0 0 16px 0',
    fontSize: '14px',
    fontWeight: '700',
    fontFamily: "'Orbitron', monospace",
    color: '#ffffff',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const sectionHeaderStyle = {
    fontSize: '12px',
    fontWeight: 'normal',
    color: '#a0aab5',
    backgroundColor: 'transparent',
    padding: '6px 0',
    marginTop: '16px',
    borderBottom: '1px dashed rgba(255,255,255,0.1)',
    borderRadius: '0',
    display: 'flex',
    justifyContent: 'space-between',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '13px'
  };

  if (data.loading) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span> 
          SPACE WEATHER FACTS
        </h3>
        <p style={{ color: '#606075' }}>Fetching live & local data...</p>
      </div>
    );
  }

  const ssnDiffNum = data.currentSsn && data.prevSsn ? data.currentSsn.ssn - data.prevSsn.ssn : 0;
  const isSsnUp = ssnDiffNum > 0;

  const formatDate = (isoString) => {
    if (!isoString) return 'No event (last 7 days)';
    const dateStr = isoString.substring(0, 10);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getStormLevel = (kp) => {
    if (kp >= 9) return 'G5';
    if (kp >= 8) return 'G4';
    if (kp >= 7) return 'G3';
    if (kp >= 6) return 'G2';
    if (kp >= 5) return 'G1';
    return '';
  };

  const localFlareStr = getFlareClassStr(data.localMaxXray?.flux_long);
  const localBzColor = data.localMinBz?.bz < -10 ? '#EF4444' : data.localMinBz?.bz < 0 ? '#3498DB' : '#3B82F6';

  return (
    <div style={{ ...cardStyle, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h3 style={titleStyle}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span> 
          SPACE WEATHER FACTS
        </h3>
      </div>
      
      {/* Recent Events Section (NOAA) */}
      <div style={sectionHeaderStyle}>
        <span>NOAA SWPC: Recent Events</span>
        <span style={{ fontSize: '10px', color: '#606075', fontWeight: 'normal' }}>Source: NOAA JSON API</span>
      </div>
      <div style={{ background: 'transparent', padding: '4px 0' }}>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Last X-flare</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.lastXFlare?.max_time)}</span>
          <span style={{ color: getFlareColor(data.lastXFlare?.max_class), fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
            {data.lastXFlare?.max_class || '—'}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Last M-flare</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.lastMFlare?.max_time)}</span>
          <span style={{ color: getFlareColor(data.lastMFlare?.max_class), fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
            {data.lastMFlare?.max_class || '—'}
          </span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Last geomagnetic storm</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.lastStorm?.time)}</span>
          <span style={{ color: getStormColor(data.lastStorm?.kp), fontWeight: 'bold', minWidth: '60px', textAlign: 'right' }}>
            {data.lastStorm ? `Kp${data.lastStorm.kp} (${getStormLevel(data.lastStorm.kp)})` : '—'}
          </span>
        </div>
      </div>

      {/* Sunspot Section (NOAA) */}
      <div style={sectionHeaderStyle}>NOAA SWPC: Monthly Mean Sunspot Number</div>
      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 0' }}>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0' }}>{data.currentSsn ? data.currentSsn['time-tag'] : 'Current Month'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#FFF' }}>
              {data.currentSsn ? data.currentSsn.ssn.toFixed(1) : '—'}
            </span>
            {data.currentSsn && (
              <span style={{ 
                background: isSsnUp ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                color: isSsnUp ? '#22C55E' : '#EF4444',
                padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
              }}>
                {isSsnUp ? '↑' : '↓'} {Math.abs(ssnDiffNum).toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ color: '#E2E8F0' }}>{data.prevSsn ? data.prevSsn['time-tag'] : 'Previous Month'}</span>
          <span style={{ fontWeight: 'bold', color: '#FFF' }}>
            {data.prevSsn ? data.prevSsn.ssn.toFixed(1) : '—'}
          </span>
        </div>
      </div>

      {/* Local Extremes Section */}
      <div style={sectionHeaderStyle}>Local Database: 7-Day Extremes
        <span style={{ fontSize: '10px', color: '#606075', fontWeight: 'normal' }}>Source: Local SQLite</span>
      </div>
      <div style={{ background: 'transparent', padding: '4px 0' }}>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Max Local Solar Flare</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.localMaxXray?.time_tag)}</span>
          <span style={{ color: getFlareColor(localFlareStr), fontWeight: 'bold', minWidth: '50px', textAlign: 'right' }}>
            {localFlareStr || '—'}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Min Bz (Geomagnetic)</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.localMinBz?.time_tag)}</span>
          <span style={{ color: localBzColor, fontWeight: 'bold', minWidth: '50px', textAlign: 'right' }}>
            {data.localMinBz ? `${data.localMinBz.bz.toFixed(1)} nT` : '—'}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Max Solar Wind Speed</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.localMaxSpeed?.time_tag)}</span>
          <span style={{ color: '#3498DB', fontWeight: 'bold', minWidth: '60px', textAlign: 'right' }}>
            {data.localMaxSpeed ? `${data.localMaxSpeed.bulk_speed.toFixed(0)} km/s` : '—'}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Max Solar Wind Density</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.localMaxDensity?.time_tag)}</span>
          <span style={{ color: '#3498DB', fontWeight: 'bold', minWidth: '60px', textAlign: 'right' }}>
            {data.localMaxDensity ? `${data.localMaxDensity.proton_density.toFixed(1)} p/cc` : '—'}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Max Proton Flux ({'>='}10 MeV)</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.localMaxProton?.time_tag)}</span>
          <span style={{ color: '#3498DB', fontWeight: 'bold', minWidth: '60px', textAlign: 'right' }}>
            {data.localMaxProton ? `${data.localMaxProton.flux.toFixed(2)} pfu` : '—'}
          </span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ color: '#E2E8F0', flex: 1 }}>Max Electron Flux ({'>='}2 MeV)</span>
          <span style={{ color: '#ffffff', textDecoration: 'underline', marginRight: '16px' }}>{formatDate(data.localMaxElectron?.time_tag)}</span>
          <span style={{ color: '#3498DB', fontWeight: 'bold', minWidth: '60px', textAlign: 'right' }}>
            {data.localMaxElectron ? `${data.localMaxElectron.flux.toFixed(0)} pfu` : '—'}
          </span>
        </div>
      </div>
      
    </div>
  );
}
