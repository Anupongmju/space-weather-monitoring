import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  style?: CSSProperties;
  accent?: boolean;
}

export default function Card({ title, subtitle, children, style, accent = false }: CardProps) {
  const cornerColor = accent ? '#5DADE2' : '#3498DB';

  return (
    <div style={{
      background: '#050A14',
      backdropFilter: 'blur(8px)',
      border: `1px solid ${accent ? 'rgba(52,152,219,0.4)' : 'rgba(52,152,219,0.18)'}`,
      borderRadius: 0,
      padding: 20,
      boxShadow: accent ? '0 0 20px rgba(52,152,219,0.15)' : '0 4px 24px rgba(0,0,0,0.4)',
      position: 'relative',
      ...style
    }}>
      {/* Sci-Fi HUD Tech Corner Brackets */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: `2px solid ${cornerColor}`, borderLeft: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: `2px solid ${cornerColor}`, borderRight: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: `2px solid ${cornerColor}`, borderLeft: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: `2px solid ${cornerColor}`, borderRight: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />

      {(title || subtitle) && (
        <div style={{ marginBottom: 16 }}>
          {title && (
            <h3 style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 12, fontWeight: 600,
              color: '#3498DB', letterSpacing: 2,
              textTransform: 'uppercase', margin: 0,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ width: 4, height: 12, background: '#3498DB', display: 'inline-block' }} />
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              fontSize: 12, color: '#A0B4CC',
              margin: '4px 0 0', fontFamily: "'Share Tech Mono', monospace",
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
