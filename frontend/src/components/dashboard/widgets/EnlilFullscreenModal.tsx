import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Maximize2,
  Minimize2,
  X,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export interface EnlilFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string;
  videoInfo?: {
    latest_video_url?: string;
    size_bytes?: number;
    fetched_at?: string;
    last_modified?: number;
  } | null;
  onRefresh?: () => void;
  fetching?: boolean;
}

export default function EnlilFullscreenModal({
  isOpen,
  onClose,
  videoSrc,
  videoInfo,
}: EnlilFullscreenModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [isBrowserFs, setIsBrowserFs] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.overflow = prevBodyOverflow;
      };
    }
  }, [isOpen]);

  // Keyboard shortcuts (ESC, Space, Left/Right arrow)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(-0.1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepFrame(0.1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, duration]);

  // Track native browser fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsBrowserFs(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Sync video time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.loop = isLooping;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stepFrame = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const nextTime = Math.max(0, Math.min(duration || 100, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await modalContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00.0';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  if (!isOpen) return null;

  const accentColor = isLight ? '#0284C7' : '#38BDF8';
  const cornerBorder = isLight ? 'rgba(2, 132, 199, 0.8)' : 'rgba(56, 189, 248, 0.8)';

  // Render via createPortal directly into document.body to prevent any parent stacking context or navbar bleeding
  return createPortal(
    <div
      ref={modalContainerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000000,
        background: isLight ? 'rgba(241, 245, 249, 0.98)' : '#020617',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ── Top Header Bar (Fixed at top) ── */}
      <div style={{
        width: '100%',
        maxWidth: '1440px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(11, 25, 44, 0.85)',
        border: isLight ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '8px',
        boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.06)' : '0 4px 20px rgba(0,0,0,0.5)',
        boxSizing: 'border-box',
        flexShrink: 0,
        marginBottom: '14px',
        gap: '12px',
      }}>
        {/* Left: Model Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)',
            border: `1px solid ${accentColor}`,
            padding: '4px 10px',
            borderRadius: '6px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }} />
            <h2 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 800,
              fontFamily: "'Orbitron', monospace",
              color: isLight ? '#0C1E35' : '#38BDF8',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
            }}>
              WSA-ENLIL CME MODEL
            </h2>
          </div>

          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
            border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.15)',
            color: isLight ? '#334155' : '#94A3B8',
            fontWeight: 600,
          }}>
            NOAA SWPC
          </span>

          <span style={{
            fontSize: '12px',
            color: isLight ? '#64748B' : '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Sparkles size={13} color={accentColor} />
            3D MHD Solar Wind &amp; CME Simulation
          </span>
        </div>

        {/* Right: Fullscreen & Close Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Native Browser Fullscreen Button */}
          <button
            onClick={toggleBrowserFullscreen}
            style={{
              padding: '6px 12px',
              background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
              border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: isLight ? '#0F172A' : '#F8FAFC',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
              fontFamily: 'var(--font-mono)',
            }}
            title={isBrowserFs ? 'Exit Browser Fullscreen (F11)' : 'Browser Fullscreen (F11)'}
          >
            {isBrowserFs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isBrowserFs ? 'EXIT FULL' : 'FULLSCREEN'}</span>
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              background: '#EF4444',
              border: '1px solid #DC2626',
              borderRadius: '6px',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.15s',
              fontFamily: 'var(--font-mono)',
            }}
            title="Close Preview (ESC)"
          >
            <X size={15} />
            <span>CLOSE</span>
          </button>
        </div>
      </div>

      {/* ── Main Stage: Cinematic Video Player ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1440px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          border: isLight ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '8px',
          boxShadow: isLight
            ? '0 10px 40px rgba(2, 132, 199, 0.15)'
            : '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
        }}>
          {/* Tech HUD Corner Accents */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTop: `3px solid ${cornerBorder}`, borderLeft: `3px solid ${cornerBorder}`, zIndex: 10, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderTop: `3px solid ${cornerBorder}`, borderRight: `3px solid ${cornerBorder}`, zIndex: 10, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 14, height: 14, borderBottom: `3px solid ${cornerBorder}`, borderLeft: `3px solid ${cornerBorder}`, zIndex: 10, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: `3px solid ${cornerBorder}`, borderRight: `3px solid ${cornerBorder}`, zIndex: 10, pointerEvents: 'none' }} />

          {/* Video Container (Expands to fill all available space) */}
          <div
            onClick={togglePlayPause}
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              minHeight: 0,
              backgroundColor: '#000000',
            }}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              loop={isLooping}
              muted
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 'calc(100vh - 165px)',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {/* ── Control Bar Directly Below Video ── */}
          <div style={{
            width: '100%',
            background: isLight ? '#FFFFFF' : '#0B192C',
            borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '10px 18px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0,
          }}>
            {/* Scrubber Progress Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
              <span style={{
                fontSize: '12px',
                color: isLight ? '#0284C7' : '#38BDF8',
                fontWeight: 700,
                minWidth: '60px',
                fontFamily: "'Orbitron', monospace",
              }}>
                {formatTime(currentTime)}
              </span>

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  flex: 1,
                  accentColor: accentColor,
                  cursor: 'pointer',
                  height: '6px',
                }}
              />

              <span style={{
                fontSize: '12px',
                color: isLight ? '#64748B' : '#94A3B8',
                fontWeight: 600,
                minWidth: '60px',
                fontFamily: "'Orbitron', monospace",
              }}>
                {formatTime(duration)}
              </span>
            </div>

            {/* Bottom Row Controls: Buttons, Speeds, Looping */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              {/* Left playback buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={togglePlayPause}
                  style={{
                    padding: '6px 14px',
                    background: accentColor,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                    boxShadow: `0 2px 10px ${accentColor}40`,
                    fontFamily: 'var(--font-mono)',
                  }}
                  title="Play / Pause (Space)"
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                {/* Step Back Frame */}
                <button
                  onClick={() => stepFrame(-0.1)}
                  style={{
                    padding: '6px 10px',
                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                    border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: isLight ? '#1E293B' : '#E2E8F0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                  title="Step -0.1s (Arrow Left)"
                >
                  <SkipBack size={13} />
                  <span>-0.1s</span>
                </button>

                {/* Step Forward Frame */}
                <button
                  onClick={() => stepFrame(0.1)}
                  style={{
                    padding: '6px 10px',
                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                    border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: isLight ? '#1E293B' : '#E2E8F0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                  title="Step +0.1s (Arrow Right)"
                >
                  <SkipForward size={13} />
                  <span>+0.1s</span>
                </button>

                {/* Restart */}
                <button
                  onClick={handleRestart}
                  style={{
                    padding: '6px 10px',
                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                    border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: isLight ? '#1E293B' : '#E2E8F0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                  title="Restart playback"
                >
                  <RotateCcw size={13} />
                  <span>RESTART</span>
                </button>

                {/* Loop toggle */}
                <button
                  onClick={() => {
                    setIsLooping(prev => {
                      if (videoRef.current) videoRef.current.loop = !prev;
                      return !prev;
                    });
                  }}
                  style={{
                    padding: '6px 10px',
                    background: isLooping ? (isLight ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.2)') : 'transparent',
                    border: `1px solid ${isLooping ? accentColor : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: '6px',
                    color: isLooping ? accentColor : isLight ? '#64748B' : '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: isLooping ? 700 : 500,
                    fontFamily: 'var(--font-mono)',
                  }}
                  title="Toggle auto-loop"
                >
                  LOOP: {isLooping ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Right: Playback Speeds */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: isLight ? '#64748B' : '#94A3B8', marginRight: '4px' }}>
                  SPEED:
                </span>
                {[0.25, 0.5, 1, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: playbackRate === rate ? accentColor : isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                      color: playbackRate === rate ? '#FFFFFF' : isLight ? '#475569' : '#CBD5E1',
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
