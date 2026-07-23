import React, { useState, useEffect } from 'react';
import API_BASE from '../../../config';

export default function EnlilWidget() {
  const [videoInfo, setVideoInfo] = useState<{
    latest_video_url?: string;
    size_bytes?: number;
    fetched_at?: string;
    last_modified?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatestVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/enlil/latest`);
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
      const res = await fetch(`${API_BASE}/api/enlil/fetch`, { method: 'POST' });
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

  const videoSrc = `${API_BASE}/static/enlil_latest.mp4`;

  return (
    <div style={{
      background: '#050A14',
      backdropFilter: 'blur(8px)',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(52, 152, 219, 0.2)',
      fontFamily: 'var(--font-mono)'
    }}>
      {/* Widget Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: "'Orbitron', monospace",
            color: '#3498DB',
            letterSpacing: '1.5px',
            textTransform: 'uppercase'
          }}>
            WSA-ENLIL CME MODEL
          </span>
          <span style={{
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(52, 152, 219, 0.15)',
            border: '1px solid rgba(52, 152, 219, 0.3)',
            color: '#A0AEC0'
          }}>
            NOAA SWPC
          </span>
        </div>

        <button
          onClick={handleFetchClick}
          disabled={fetching}
          style={{
            background: fetching ? 'rgba(52,152,219,0.2)' : 'transparent',
            border: '1px solid rgba(52, 152, 219, 0.4)',
            color: '#3498DB',
            fontSize: '10px',
            padding: '4px 8px',
            cursor: fetching ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-mono)'
          }}
          onMouseEnter={e => { if (!fetching) e.currentTarget.style.background = 'rgba(52,152,219,0.2)'; }}
          onMouseLeave={e => { if (!fetching) e.currentTarget.style.background = 'transparent'; }}
        >
          {fetching ? 'FETCHING...' : 'REFRESH'}
        </button>
      </div>

      {/* Video Viewport */}
      <div style={{
        position: 'relative',
        width: '100%',
        background: '#000',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '4px',
        overflow: 'hidden',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        {loading ? (
          <div style={{ color: '#A0AEC0', fontSize: '11px' }}>LOADING MODEL VIDEO...</div>
        ) : error ? (
          <div style={{ color: '#E53E3E', fontSize: '11px', textAlign: 'center', padding: '16px' }}>
            ⚠ {error}
          </div>
        ) : (
          <video
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
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          />
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '9px',
        color: '#718096',
        letterSpacing: '0.5px'
      }}>
        <span>3D MHD SOLAR WIND SIMULATION</span>
        <span>
          {videoInfo?.size_bytes ? `${(videoInfo.size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'READY'}
        </span>
      </div>
    </div>
  );
}
