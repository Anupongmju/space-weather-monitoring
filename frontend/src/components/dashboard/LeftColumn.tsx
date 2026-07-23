import React from 'react';
import MagWidget from './widgets/MagWidget';
import SwepamWidget from './widgets/SwepamWidget';
import XrayWidget from './widgets/XrayWidget';
import CosmicWidget from './widgets/CosmicWidget';
import ProtonWidget from './widgets/ProtonWidget';
import ElectronWidget from './widgets/ElectronWidget';

import FactsWidget from './widgets/FactsWidget';
import SolarImagesWidget from './widgets/SolarImagesWidget';

export default function LeftColumn() {
  const cardStyle: React.CSSProperties = {
    background: '#050A14',
    backdropFilter: 'blur(8px)',
    borderRadius: '0px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(52, 152, 219, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden'
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

  const textStyle = {
    margin: 0,
    fontSize: '14px',
    color: '#a0aab5',
    flex: 1,
  };

  return (
    <div style={{ flex: '1 1 70%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SolarImagesWidget />
      
      {/* Top Row: 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div style={{ ...cardStyle, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
          <h3 style={titleStyle}>
            <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span> 
            SYSTEM TELEMETRY
          </h3>
          <p style={textStyle}>REAL-TIME SENSOR DATA</p>
          <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <MagWidget />
            <SwepamWidget />
            <XrayWidget />
            <CosmicWidget />
            <ProtonWidget />
            <ElectronWidget />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <FactsWidget />
      </div>
    </div>
  );
}

