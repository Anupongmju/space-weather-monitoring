import React, { ReactNode, useEffect, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SciFiFullscreenOverlayProps {
  isFullscreen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  extra?: ReactNode;
  children: ReactNode;
  accentColor?: string;
  scrollable?: boolean;
}

export default function SciFiFullscreenOverlay({
  isFullscreen,
  onClose,
  title,
  subtitle,
  extra,
  children,
  accentColor = '#38BDF8',
  scrollable = false,
}: SciFiFullscreenOverlayProps) {
  const [utcTime, setUtcTime] = useState<string>('');
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const resolvedAccent = isLight && (accentColor === '#38BDF8' || accentColor === '#3498DB') ? '#1A6DB5' : accentColor;

  useEffect(() => {
    if (!isFullscreen) return;
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    const triggerResize = () => {
      window.dispatchEvent(new Event('resize'));
    };

    // Trigger multiple resize events as browser finishes entering full screen
    triggerResize();
    const timers = [30, 80, 150, 300, 500, 800, 1200].map(t =>
      setTimeout(triggerResize, t)
    );

    const bodyEl = document.querySelector('.scifi-fs-body');
    let ro: ResizeObserver | null = null;
    if (bodyEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        triggerResize();
      });
      ro.observe(bodyEl);
    }

    return () => {
      timers.forEach(clearTimeout);
      ro?.disconnect();
    };
  }, [isFullscreen]);

  if (!isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: isLight ? '#EEF4FB' : '#020617',
        backgroundImage: isLight
          ? `
            radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.16) 0%, transparent 65%),
            radial-gradient(circle at 50% 100%, rgba(26, 109, 181, 0.10) 0%, transparent 70%),
            linear-gradient(to right, rgba(26, 109, 181, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(26, 109, 181, 0.05) 1px, transparent 1px)
          `
          : `
            radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.12) 0%, transparent 65%),
            radial-gradient(circle at 50% 100%, rgba(30, 58, 138, 0.15) 0%, transparent 70%),
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
        backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
        zIndex: 99999,
        padding: '14px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isLight ? 'inset 0 0 80px rgba(26, 109, 181, 0.08)' : 'inset 0 0 120px rgba(0, 0, 0, 0.9)',
      }}
    >
      <style>{`
        @keyframes hudPulse {
          0%, 100% { opacity: 0.9; transform: scale(1); filter: drop-shadow(0 0 4px #10B981); }
          50% { opacity: 0.4; transform: scale(0.85); filter: drop-shadow(0 0 1px #10B981); }
        }
        .scifi-fs-body {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .scifi-fs-body.scifi-fs-scrollable {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          display: block !important;
        }
        /* Top header/legend items take natural height */
        .scifi-fs-body:not(.scifi-fs-scrollable) > div:not(:last-child) {
          flex-shrink: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          margin-bottom: 8px !important;
        }
        /* The chart container (the last child) fills all remaining vertical space */
        .scifi-fs-body:not(.scifi-fs-scrollable) > div:last-child,
        .scifi-fs-body:not(.scifi-fs-scrollable) > .echarts-for-react:last-child {
          flex: 1 1 0% !important;
          height: 100% !important;
          min-height: 0 !important;
          width: 100% !important;
          position: relative !important;
        }
        /* ECharts React container */
        .scifi-fs-body:not(.scifi-fs-scrollable) .echarts-for-react {
          height: 100% !important;
          min-height: 200px !important;
          width: 100% !important;
          flex: 1 1 0% !important;
          position: relative !important;
        }
        /* Inner ECharts canvas and generated divs */
        .scifi-fs-body:not(.scifi-fs-scrollable) .echarts-for-react > div:first-child {
          height: 100% !important;
          width: 100% !important;
          position: relative !important;
        }
        .scifi-fs-body:not(.scifi-fs-scrollable) .echarts-for-react canvas {
          height: 100% !important;
          width: 100% !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
        }
      `}</style>

      {/* ── 4 Sci-Fi HUD Corner Reticles ── */}
      <div style={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ width: 18, height: 18, borderTop: `2px solid ${resolvedAccent}`, borderLeft: `2px solid ${resolvedAccent}` }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isLight ? 'rgba(71, 85, 105, 0.6)' : 'rgba(255,255,255,0.35)', letterSpacing: 1.5 }}>
          SYS.SEC // ALPHA-01
        </span>
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, pointerEvents: 'none', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isLight ? 'rgba(71, 85, 105, 0.6)' : 'rgba(255,255,255,0.35)', letterSpacing: 1.5 }}>
          RES // 1920x1080 FULL
        </span>
        <div style={{ width: 18, height: 18, borderTop: `2px solid ${resolvedAccent}`, borderRight: `2px solid ${resolvedAccent}` }} />
      </div>

      <div style={{ position: 'absolute', bottom: 12, left: 12, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ width: 18, height: 18, borderBottom: `2px solid ${resolvedAccent}`, borderLeft: `2px solid ${resolvedAccent}` }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isLight ? 'rgba(71, 85, 105, 0.6)' : 'rgba(255,255,255,0.35)', letterSpacing: 1.5 }}>
          TELEMETRY // CONTINUOUS
        </span>
      </div>

      <div style={{ position: 'absolute', bottom: 12, right: 12, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isLight ? 'rgba(71, 85, 105, 0.6)' : 'rgba(255,255,255,0.35)', letterSpacing: 1.5 }}>
          DEEP SPACE RAD // SYNC
        </span>
        <div style={{ width: 18, height: 18, borderBottom: `2px solid ${resolvedAccent}`, borderRight: `2px solid ${resolvedAccent}` }} />
      </div>

      {/* ── Top HUD Control Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px 10px',
          background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(5, 12, 28, 0.85)',
          backdropFilter: 'blur(16px)',
          border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(56, 189, 248, 0.22)',
          borderBottom: `2px solid ${resolvedAccent}`,
          boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.06)' : '0 8px 32px rgba(0, 0, 0, 0.6)',
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        {/* Left: Live status and UTC Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.12)', border: isLight ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 2 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#10B981',
                display: 'inline-block',
                animation: 'hudPulse 2s infinite ease-in-out',
              }}
            />
            <span style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: isLight ? '#059669' : '#34D399', letterSpacing: 1 }}>
              LIVE TELEMETRY
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLight ? '#475569' : '#94A3B8', fontSize: 13.5, fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: isLight ? '#64748B' : '#475569' }}>⏱</span>
            <span>{utcTime || 'UTC MONITORING'}</span>
          </div>
        </div>

        {/* Center: Title & Subtitle */}
        <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
          {title && (
            <div
              style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: 16,
                fontWeight: 700,
                color: isLight ? '#0C1E35' : '#FFFFFF',
                letterSpacing: 2,
                textTransform: 'uppercase',
                textShadow: isLight ? 'none' : `0 0 16px ${resolvedAccent}80`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 6, height: 14, background: resolvedAccent, display: 'inline-block' }} />
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: 12.5, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 2, letterSpacing: 0.5 }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Right: Extra controls + ESC Key badge + Prominent Exit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {extra && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{extra}</div>}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: isLight ? '#64748B' : '#64748B',
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)',
              border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
            }}
          >
            <span>PRESS</span>
            <kbd style={{ background: isLight ? '#E2E8F0' : '#1E293B', border: isLight ? '1px solid #CBD5E1' : '1px solid #475569', color: isLight ? '#1E293B' : '#F1F5F9', borderRadius: 2, padding: '1px 5px', fontSize: 11, fontWeight: 700 }}>
              ESC
            </kbd>
            <span>TO EXIT</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Exit Full Screen (ESC)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isLight ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.18)',
              border: isLight ? '1px solid #DC2626' : '1px solid #EF4444',
              color: isLight ? '#DC2626' : '#FCA5A5',
              padding: '5px 12px',
              borderRadius: 2,
              fontSize: 13.5,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: 0.8,
              boxShadow: isLight ? '0 2px 8px rgba(239, 68, 68, 0.2)' : '0 0 15px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#EF4444';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isLight ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.18)';
              e.currentTarget.style.color = isLight ? '#DC2626' : '#FCA5A5';
            }}
          >
            <Minimize2 size={13} />
            <span>EXIT FULLSCREEN</span>
          </button>
        </div>
      </div>

      {/* ── Main Chart Glass Canvas Container ── */}
      <div
        className={`scifi-fs-body ${scrollable ? 'scifi-fs-scrollable' : ''}`}
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          background: isLight ? '#FFFFFF' : 'rgba(5, 10, 24, 0.7)',
          border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: isLight
            ? '0 8px 30px rgba(0, 0, 0, 0.06)'
            : '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(56, 189, 248, 0.04)',
          backdropFilter: isLight ? undefined : 'blur(12px)',
          padding: '12px 16px 8px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: scrollable ? 'auto' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>

      {/* ── Bottom HUD Footer Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px 0px',
          fontSize: 10.5,
          fontFamily: 'var(--font-mono)',
          color: isLight ? '#64748B' : '#64748B',
          flexShrink: 0,
          letterSpacing: 0.5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span><strong style={{ color: resolvedAccent }}>STATUS:</strong> NOMINAL</span>
          <span><strong style={{ color: resolvedAccent }}>RENDER:</strong> ECHARTS 60FPS HARDWARE ACCELERATED</span>
          <span><strong style={{ color: resolvedAccent }}>MODE:</strong> HIGH PRECISION TIME SERIES</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>INTERACTION: <span style={{ color: isLight ? '#475569' : '#94A3B8' }}>PAN / MOUSE WHEEL ZOOM ACTIVE</span></span>
          <span style={{ color: resolvedAccent }}>● ANUPONG SPACE WEATHER LAB</span>
        </div>
      </div>
    </div>
  );
}
