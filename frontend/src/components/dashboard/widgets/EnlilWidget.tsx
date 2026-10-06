import React, { useState, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import API_BASE from '../../../config';
import EnlilFullscreenModal from './EnlilFullscreenModal';
import { useTheme } from '../../../context/ThemeContext';

export default function EnlilWidget() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [videoInfo, setVideoInfo] = useState<{
    latest_video_url?: string;
    size_bytes?: number;
    fetched_at?: string;
    last_modified?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const loadLatestVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/enlil/latest`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status === 'success') {
        setVideoInfo(data);
      } else {
        setError(data.message || 'Failed to load ENLIL video');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchClick = async () => {
    try {
      setFetching(true);
      setError(null);
      const res = await fetch(`${API_BASE}/enlil/fetch`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status === 'success') {
        setVideoInfo(data);
      } else {
        setError(data.message || 'Failed to fetch latest ENLIL video');
      }
    } catch (err: any) {
      setError(err.message || 'Fetch failed');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadLatestVideo();
  }, []);

  const videoSrc = React.useMemo(() => {
    const t = videoInfo?.last_modified || 0;
    const path = videoInfo?.latest_video_url || '/static/enlil_latest.mp4';
    return `${API_BASE}${path}${t ? `?t=${t}` : ''}`;
  }, [videoInfo?.latest_video_url, videoInfo?.last_modified]);

  const cornerColor = isLight ? 'rgba(2, 132, 199, 0.7)' : 'rgba(56, 189, 248, 0.7)';

  return (
    <>
      <div style={{
        background: 'var(--bg-surface, #050A14)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card, 0 8px 24px rgba(0, 0, 0, 0.4))',
        border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(52, 152, 219, 0.25)',
        fontFamily: 'var(--font-mono)',
        position: 'relative'
      }}>
        {/* Sci-Fi Tech Corner Brackets */}
        <div style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTop: `2px solid ${cornerColor}`, borderLeft: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderTop: `2px solid ${cornerColor}`, borderRight: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -1, left: -1, width: 8, height: 8, borderBottom: `2px solid ${cornerColor}`, borderLeft: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottom: `2px solid ${cornerColor}`, borderRight: `2px solid ${cornerColor}`, pointerEvents: 'none' }} />

        {/* Widget Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          paddingBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: "'Orbitron', monospace",
              color: isLight ? '#0C1E35' : '#3498DB',
              letterSpacing: '1.2px',
              textTransform: 'uppercase'
            }}>
              WSA-ENLIL CME MODEL
            </span>
            <span style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(52, 152, 219, 0.15)',
              border: isLight ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(52, 152, 219, 0.3)',
              color: isLight ? '#0284C7' : '#38BDF8',
              fontWeight: 600
            }}>
              NOAA SWPC
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Fullscreen Preview Icon Button */}
            <button
              onClick={() => setIsFullscreenOpen(true)}
              style={{
                background: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.12)',
                border: isLight ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid rgba(56, 189, 248, 0.35)',
                color: isLight ? '#0284C7' : '#38BDF8',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="Maximize Preview"
            >
              <Maximize2 size={13} />
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleFetchClick}
              disabled={fetching}
              style={{
                background: fetching ? 'rgba(52,152,219,0.2)' : 'transparent',
                border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(52, 152, 219, 0.4)',
                color: isLight ? '#1A6DB5' : '#3498DB',
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: fetching ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600
              }}
              onMouseEnter={e => { if (!fetching) e.currentTarget.style.background = isLight ? 'rgba(2,132,199,0.08)' : 'rgba(52,152,219,0.2)'; }}
              onMouseLeave={e => { if (!fetching) e.currentTarget.style.background = 'transparent'; }}
            >
              {fetching ? 'FETCHING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Video Viewport (Clickable with Hover Overlay) */}
        <div
          onClick={() => setIsFullscreenOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'relative',
            width: '100%',
            background: '#000',
            border: isHovered
              ? (isLight ? '1px solid #0284C7' : '1px solid #38BDF8')
              : (isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.08)'),
            borderRadius: '4px',
            overflow: 'hidden',
            minHeight: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isHovered ? (isLight ? '0 0 16px rgba(2,132,199,0.25)' : '0 0 16px rgba(56,189,248,0.25)') : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? (
            <div style={{ color: 'var(--text-secondary, #A0AEC0)', fontSize: '13px' }}>LOADING MODEL VIDEO...</div>
          ) : error ? (
            <div style={{ color: '#E53E3E', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
              ⚠ {error}
            </div>
          ) : (
            <>
              <video
                key={videoSrc}
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  maxHeight: '320px',
                  userSelect: 'none'
                }}
              />

              {/* Hover Badge Overlay */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(2, 6, 23, 0.45)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  zIndex: 10,
                  transition: 'all 0.2s'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '7px 14px',
                    background: 'rgba(2, 132, 199, 0.9)',
                    border: '1px solid rgba(56, 189, 248, 0.6)',
                    borderRadius: '20px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    boxShadow: '0 0 16px rgba(56, 189, 248, 0.5)'
                  }}>
                    <Maximize2 size={14} />
                    <span>CLICK TO PREVIEW</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
                    WSA-ENLIL CME 3D Simulation
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: isLight ? '#64748B' : '#718096',
          letterSpacing: '0.5px'
        }}>
          <span>3D MHD SOLAR WIND SIMULATION</span>
          <span>
            {videoInfo?.size_bytes ? `${(videoInfo.size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'READY'}
          </span>
        </div>
      </div>

      {/* Fullscreen Interactive Simulation Modal */}
      <EnlilFullscreenModal
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        videoSrc={videoSrc}
        videoInfo={videoInfo}
        onRefresh={handleFetchClick}
        fetching={fetching}
      />
    </>
  );
}

