import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface TabItem {
  id: string;
  label: string;
  badge?: string;
}

interface InstrumentInfoGuideProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs?: TabItem[];
  accentColor?: string;
  children: React.ReactNode;
}

const DEFAULT_TABS: TabItem[] = [
  { id: 'usage', label: 'USAGE & METRICS' },
  { id: 'impacts', label: 'SPACE WEATHER IMPACTS' },
  { id: 'details', label: 'SPECIFICATIONS' },
  { id: 'credits', label: 'DATA SOURCES' }
];

export const InstrumentInfoGuide: React.FC<InstrumentInfoGuideProps> = ({
  activeTab,
  onTabChange,
  tabs = DEFAULT_TABS,
  accentColor = '#38BDF8',
  children
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const resolvedAccent = isLight && (accentColor === '#38BDF8' || accentColor === '#3498DB') ? '#1A6DB5' : accentColor;

  return (
    <div style={{ marginTop: 32, marginBottom: 16 }}>
      {/* Modern High-Precision Tabstrip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: 0,
        overflowX: 'auto',
        paddingBottom: 0
      }}>
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          // Format label display
          const displayLabel = tab.label.includes('(') 
            ? tab.label.split('(')[0].trim().toUpperCase()
            : tab.label.toUpperCase();

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${resolvedAccent}` : '2px solid transparent',
                color: isActive ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                padding: '9px 16px',
                fontSize: 15,
                fontWeight: isActive ? 700 : 500,
                fontFamily: 'var(--font-mono)',
                letterSpacing: 1,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span style={{ opacity: isActive ? 0.9 : 0.4, fontSize: 13 }}>0{idx + 1}.</span>
              <span>{displayLabel}</span>
              {tab.label.includes('(') && (
                <span style={{ fontSize: 14, opacity: isActive ? 0.8 : 0.5, fontWeight: 400 }}>
                  ({tab.label.split('(')[1]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Glass Plate / Crisp White Content Panel */}
      <div style={{
        background: isLight ? '#FFFFFF' : 'rgba(10, 15, 30, 0.45)',
        backdropFilter: isLight ? undefined : 'blur(8px)',
        border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255, 255, 255, 0.06)',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.04)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
        padding: '24px 28px',
        textAlign: 'left',
        lineHeight: 1.7,
        fontSize: 15,
        color: isLight ? '#334155' : '#CBD5E1',
      }}>
        {children}
      </div>
    </div>
  );
};

export default InstrumentInfoGuide;
