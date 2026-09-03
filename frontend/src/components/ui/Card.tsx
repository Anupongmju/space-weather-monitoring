import { ReactNode, CSSProperties, useRef, useState, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import SciFiFullscreenOverlay from './SciFiFullscreenOverlay';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  title?: string;
  subtitle?: string;
  extra?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  accent?: boolean;
  allowFullscreen?: boolean;
}

export default function Card({
  title,
  subtitle,
  extra,
  children,
  style,
  accent = false,
  allowFullscreen = true,
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const cornerColor = accent ? 'var(--text-accent, #5DADE2)' : 'var(--primary, #3498DB)';

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = document.fullscreenElement === cardRef.current;
      setIsFullscreen(isFs);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!cardRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await cardRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen request error:', err);
    }
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: isFullscreen ? '#020617' : 'var(--bg-surface, #050A14)',
        backdropFilter: 'blur(8px)',
        border: isFullscreen ? 'none' : `1px solid ${accent ? 'var(--border-active, rgba(52,152,219,0.4))' : 'var(--border, rgba(52,152,219,0.18))'}`,
        borderRadius: 0,
        padding: isFullscreen ? 0 : 20,
        boxShadow: isFullscreen ? 'none' : accent ? 'var(--shadow-glow, 0 0 20px rgba(52,152,219,0.15))' : 'var(--shadow-card, 0 4px 24px rgba(0,0,0,0.4))',
        position: 'relative',
        transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        ...style,
        ...(isFullscreen
          ? {
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              overflow: 'hidden',
              boxSizing: 'border-box',
            }
          : {}),
      }}
    >
      {isFullscreen ? (
        <SciFiFullscreenOverlay
          isFullscreen={true}
          onClose={toggleFullscreen}
          title={title}
          subtitle={subtitle}
          extra={extra}
          accentColor={isLight ? '#1A6DB5' : '#38BDF8'}
        >
          {children}
        </SciFiFullscreenOverlay>
      ) : (
        <>
          {/* Sci-Fi HUD Tech Corner Brackets */}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: `2px solid ${cornerColor}`, borderLeft: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: `2px solid ${cornerColor}`, borderRight: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: `2px solid ${cornerColor}`, borderLeft: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: `2px solid ${cornerColor}`, borderRight: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />

          {(title || subtitle || extra || allowFullscreen) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                {title && (
                  <h3 style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: 16, fontWeight: 600,
                    color: 'var(--primary, #3498DB)', letterSpacing: 2,
                    textTransform: 'uppercase', margin: 0,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span style={{ width: 4, height: 12, background: 'var(--primary, #3498DB)', display: 'inline-block' }} />
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p style={{
                    fontSize: 14, color: 'var(--text-secondary, #A0B4CC)',
                    margin: '4px 0 0', fontFamily: "'Share Tech Mono', monospace",
                  }}>
                    {subtitle}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {extra && <div>{extra}</div>}
                {allowFullscreen && (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title="Full Screen (F11 style)"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--bg-card-hover, rgba(255, 255, 255, 0.05))',
                      border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
                      color: 'var(--text-muted, #94A3B8)',
                      padding: '4px 10px',
                      borderRadius: 2,
                      fontSize: 13,
                      fontFamily: "'Share Tech Mono', monospace",
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: 600,
                      letterSpacing: 0.5,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--primary, #38BDF8)';
                      e.currentTarget.style.color = 'var(--primary, #38BDF8)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border, rgba(255, 255, 255, 0.15))';
                      e.currentTarget.style.color = 'var(--text-muted, #94A3B8)';
                    }}
                  >
                    <Maximize2 size={13} />
                    <span>FULLSCREEN</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {children}
        </>
      )}
    </div>
  );
}
