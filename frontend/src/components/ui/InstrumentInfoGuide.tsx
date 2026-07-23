import React from 'react';

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
  return (
    <div style={{ marginTop: 32, marginBottom: 16 }}>
      {/* Modern High-Precision Tabstrip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                borderBottom: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                color: isActive ? '#F8FAFC' : '#64748B',
                padding: '10px 18px',
                fontSize: 11,
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
              <span style={{ opacity: isActive ? 0.9 : 0.4, fontSize: 9 }}>0{idx + 1}.</span>
              <span>{displayLabel}</span>
              {tab.label.includes('(') && (
                <span style={{ fontSize: 10, opacity: isActive ? 0.7 : 0.4, fontWeight: 400 }}>
                  ({tab.label.split('(')[1]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Glass Plate Content Panel */}
      <div style={{
        background: 'rgba(10, 15, 30, 0.35)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderTop: 'none',
        borderRadius: 0,
        padding: '28px 32px',
        textAlign: 'left',
        lineHeight: 1.7
      }}>
        {children}
      </div>
    </div>
  );
};

export default InstrumentInfoGuide;
