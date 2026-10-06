import React from 'react';
import { useTranslation } from 'react-i18next';
import MagWidget from './widgets/MagWidget';
import SwepamWidget from './widgets/SwepamWidget';
import XrayWidget from './widgets/XrayWidget';
import CosmicWidget from './widgets/CosmicWidget';
import ProtonWidget from './widgets/ProtonWidget';
import ElectronWidget from './widgets/ElectronWidget';
import KpWidget from './widgets/KpWidget';
import ThuleWidget from './widgets/ThuleWidget';
import FactsWidget from './widgets/FactsWidget';
import SolarImagesWidget from './widgets/SolarImagesWidget';

export default function LeftColumn() {
  const { t } = useTranslation();
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface, #050A14)',
    backdropFilter: 'blur(8px)',
    borderRadius: '0px',
    padding: '24px',
    boxShadow: 'var(--shadow-card, 0 8px 24px rgba(0, 0, 0, 0.4))',
    border: '1px solid var(--border, rgba(52, 152, 219, 0.18))',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 0.25s ease, border-color 0.25s ease',
  };

  const titleStyle = {
    margin: '0 0 16px 0',
    fontSize: '14px',
    fontWeight: '700',
    fontFamily: "'Orbitron', monospace",
    color: 'var(--text-primary, #ffffff)',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
    paddingBottom: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const textStyle = {
    margin: 0,
    fontSize: '14px',
    color: 'var(--text-muted, #a0aab5)',
    flex: 1,
  };

  const accentColor = 'var(--primary, #3498DB)';

  return (
    <div style={{ flex: '1 1 70%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SolarImagesWidget />
      
      {/* Telemetry Section */}
      <div style={{ width: '100%' }}>
        <div style={{ ...cardStyle, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, pointerEvents: 'none' }} />
          <h3 style={titleStyle}>
            <span style={{ width: '8px', height: '8px', background: accentColor, borderRadius: '50%' }}></span> 
            {t('dashboard.system_telemetry', 'SYSTEM TELEMETRY')}
          </h3>
          <p style={textStyle}>{t('dashboard.realtime_sensor_data', 'REAL-TIME SENSOR DATA')}</p>
          <div className="telemetry-grid" style={{ marginTop: '15px' }}>
            <MagWidget />
            <SwepamWidget />
            <ProtonWidget />
            <CosmicWidget />
            <XrayWidget />
            <ElectronWidget />
            <KpWidget />
            <ThuleWidget />
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
