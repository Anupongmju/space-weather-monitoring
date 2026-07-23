import React, { useState, useRef } from 'react';

export default function SolarImagesWidget() {
  const cardStyle: React.CSSProperties = {
    background: '#050A14',
    backdropFilter: 'blur(8px)',
    // borderRadius: '0px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(52, 152, 219, 0.18)',
    fontFamily: 'var(--font-mono)'
  };

  const titleStyle: React.CSSProperties = {
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

  const panelHeaderStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '14px 10px',
    // borderRadius: '8px 8px 0 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const panelTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#E2E8F0',
    textAlign: 'center',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    background: 'rgba(0, 0, 0, 0.4)',
    padding: '4px',
    // borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    flexWrap: 'wrap',
    justifyContent: 'center'
  };

  const viewportStyle: React.CSSProperties = {
    background: '#000',
    // borderRadius: '0 0 8px 8px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderTop: 'none',
    aspectRatio: '1/1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  };

  // States for sub-types
  const [hmiMode, setHmiMode] = useState<string>('intensity_colored');
  const [sdoWl, setSdoWl] = useState('0171');
  const [cmeMode1, setCmeMode1] = useState<string>('c2_normal');
  const [cmeMode2, setCmeMode2] = useState<string>('c3_normal');

  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const cacheBuster = useRef(Math.floor(Date.now() / 600000)).current; // 10 minutes cache busting

  const handleVideoError = (id: string) => {
    setVideoErrors(prev => ({ ...prev, [id]: true }));
  };

  const renderSolarVideo = (id: string, mp4Url: string, fallbackJpgUrl: string, title: string, playbackRate = 0.4) => {
    if (videoErrors[id]) {
      return (
        <img 
          src={fallbackJpgUrl} 
          alt={`${title} (Fallback)`} 
          style={{ width: '100%', height: 'auto', display: 'block' }} 
        />
      );
    }
    return (
      <video 
        key={mp4Url} // Force reload video element when source URL changes
        src={`${mp4Url}?t=${cacheBuster}`}
        autoPlay 
        loop 
        muted 
        playsInline 
        preload="metadata"
        onError={() => handleVideoError(id)}
        onPlay={(e) => {
          e.currentTarget.playbackRate = playbackRate;
        }}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = playbackRate;
        }}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    );
  };

  // HMI Option lists (combines Intensitygram and Magnetogram)
  const hmiOptions = [
    { label: 'Intensity Colored', value: 'intensity_colored', color: '#fb923c', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_HMIIF.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIF.jpg' },
    { label: 'Intensity Grey', value: 'intensity_grey', color: '#9ca3af', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_HMII.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMII.jpg' },
    { label: 'Magnetogram Colored', value: 'magnetogram_colored', color: '#38bdf8', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_HMIBC.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIBC.jpg' },
    { label: 'Magnetogram B/W', value: 'magnetogram_grey', color: '#e5e7eb', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_HMIB.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIB.jpg' }
  ];

  // Consolidated SDO AIA Wavelength Options
  const sdoWlOptions = [
    { label: '171Å (Gold)', value: '0171', color: '#fbbf24', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0171.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0171.jpg' },
    { label: '193Å (Green)', value: '0193', color: '#22c55e', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0193.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg' },
    { label: '211Å (Purple)', value: '0211', color: '#a855f7', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0211.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0211.jpg' },
    { label: '304Å (Red)', value: '0304', color: '#ef4444', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0304.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg' },
    { label: '335Å (Blue)', value: '0335', color: '#3b82f6', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0335.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0335.jpg' },
    { label: '094Å (Teal)', value: '0094', color: '#06b6d4', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0094.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0094.jpg' },
    { label: '131Å (Blue)', value: '0131', color: '#0ea5e9', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0131.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0131.jpg' },
    { label: 'Thematic', value: 'thematic', color: '#ec4899', mp4: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_304211171.mp4', jpg: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_304211171.jpg' }
  ];

  const cmeOptions1 = [
    { label: 'C2 Normal', value: 'c2_normal', url: 'https://soho.nascom.nasa.gov/data/LATEST/current_c2.gif', color: '#ef4444' },
  ];
  const cmeOptions2 = [
    { label: 'C3 Normal', value: 'c3_normal', url: 'https://soho.nascom.nasa.gov/data/LATEST/current_c3.gif', color: '#3b82f6' },
  ];
  
  

  const currentHmi = hmiOptions.find(o => o.value === hmiMode) || hmiOptions[0];
  const currentSdo = sdoWlOptions.find(o => o.value === sdoWl) || sdoWlOptions[0];
  const currentCme = cmeOptions1.find(o => o.value === cmeMode1) || cmeOptions1[0];
  const currentCme2 = cmeOptions2.find(o => o.value === cmeMode2) || cmeOptions2[0];


  return (
    <div style={{ ...cardStyle, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      {/* Native CSS styling block to handle hover states reliably without direct DOM manipulation conflicts */}
      <style>{`
        .solar-btn {
          padding: 6px 12px;
          font-size: 11px;
          font-family: var(--font-mono), monospace;
          font-weight: bold;
          border: 1px solid rgba(255, 255, 255, 0.08);
          // border-radius: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease-in-out;
          outline: none;
          user-select: none;
        }
        .solar-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
        .solar-btn-active {
          border-color: transparent;
          color: #000000 !important;
        }
        .solar-btn-active:hover {
          filter: brightness(1.1);
        }
      `}</style>

      <h3 style={titleStyle}>
        <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span> 
        LIVE SOLAR IMAGERY
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Helioseismic and Magnetic Imager (HMI) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={panelHeaderStyle}>
            <div style={panelTitleStyle}>Helioseismic and Magnetic Imager (HMI)</div>
            <div style={buttonGroupStyle}>
              {hmiOptions.map(opt => {
                const isActive = hmiMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setHmiMode(opt.value)}
                    className={isActive ? 'solar-btn solar-btn-active' : 'solar-btn'}
                    style={{
                      background: isActive ? opt.color : undefined,
                      boxShadow: isActive ? `0 0 10px ${opt.color}88` : undefined
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={viewportStyle}>
            {renderSolarVideo(
              'hmi_' + hmiMode,
              currentHmi.mp4,
              currentHmi.jpg,
              'Helioseismic and Magnetic Imager (HMI)',
              0.4
            )}
          </div>
        </div>

        {/* Solar Dynamics Observatory */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={panelHeaderStyle}>
            <div style={panelTitleStyle}>Solar Dynamics Observatory (SDO / AIA)</div>
            <div style={buttonGroupStyle}>
              {sdoWlOptions.map(opt => {
                const isActive = sdoWl === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSdoWl(opt.value)}
                    className={isActive ? 'solar-btn solar-btn-active' : 'solar-btn'}
                    style={{
                      background: isActive ? opt.color : undefined,
                      boxShadow: isActive ? `0 0 10px ${opt.color}88` : undefined
                    }}
                  >
                    {opt.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={viewportStyle}>
            {renderSolarVideo(
              'sdo_' + sdoWl,
              currentSdo.mp4,
              currentSdo.jpg,
              'Solar Dynamics Observatory',
              0.4 // Slowed down playback speed for calmer viewing
            )}
          </div>
        </div>

        {/* Coronal Mass Ejections (LASCO) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={panelHeaderStyle}>
            <div style={panelTitleStyle}>Coronal Mass Ejections (LASCO) C2</div>
            {/* <div style={buttonGroupStyle}>
              {cmeOptions1.map(opt => {
                const isActive = cmeMode1 === opt.value;
                return ( 
                  <button
                    key={opt.value}
                    onClick={() => setCmeMode1(opt.value)}
                    className={isActive ? 'solar-btn solar-btn-active' : 'solar-btn'}
                    style={{
                      background: isActive ? opt.color : undefined,
                      boxShadow: isActive ? `0 0 10px ${opt.color}88` : undefined
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div> */}
          </div>
          <div style={viewportStyle}>
            <img 
              key={currentCme.url}
              src={currentCme.url} 
              alt={currentCme.label} 
              style={{ width: '100%', height: 'auto', display: 'block' }} 
            />
          </div>
        </div>
        {/* Coronal Mass Ejections (LASCO) C2 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={panelHeaderStyle}>
            <div style={panelTitleStyle}>Coronal Mass Ejections (LASCO) C3</div>
            {/* <div style={buttonGroupStyle}>
              {cmeOptions2.map(opt => {
                const isActive = cmeMode2 === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCmeMode2(opt.value)}
                    className={isActive ? 'solar-btn solar-btn-active' : 'solar-btn'}
                    style={{
                      background: isActive ? opt.color : undefined,
                      boxShadow: isActive ? `0 0 10px ${opt.color}88` : undefined
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div> */}
          </div>
          <div style={viewportStyle}>
            <img 
              key={currentCme2.url}
              src={currentCme2.url} 
              alt={currentCme2.label} 
              style={{ width: '100%', height: 'auto', display: 'block' }} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}
