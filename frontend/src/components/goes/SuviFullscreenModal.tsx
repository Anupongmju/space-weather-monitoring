import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Film,
  Image as ImageIcon,
  Check,
  ChevronUp,
  ChevronDown,
  Sliders
} from 'lucide-react';

export interface SuviWlItem {
  code: string;
  name: string;
  color: string;
  colorName: string;
  desc: string;
  url: string;
  temp: string;
}

interface SuviFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: 'sdo' | 'suvi';
  setSource: (s: 'sdo' | 'suvi') => void;
  suviWavelengths: SuviWlItem[];
  sdoWavelengths: SuviWlItem[];
  initialWlCode?: string;
  cacheBuster: number;
}

export default function SuviFullscreenModal({
  isOpen,
  onClose,
  source,
  setSource,
  suviWavelengths,
  sdoWavelengths,
  initialWlCode = '171',
  cacheBuster,
}: SuviFullscreenModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBrowserFs, setIsBrowserFs] = useState(false);
  const [displayMode, setDisplayMode] = useState<'stream' | 'photo'>('stream');

  // How many views to show: 1, 2, 4, 6
  const [count, setCount] = useState<number>(1);

  // Which wavelengths are currently active
  const [selectedCodes, setSelectedCodes] = useState<string[]>([initialWlCode]);

  // Drawer / HUD Collapse state (แถบเลือกพับเก็บเข้า-ออกได้)
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  // Sync active satellite list
  const currentList = source === 'suvi' ? suviWavelengths : sdoWavelengths;

  // Sync initial code if modal is opened with a specific wavelength
  useEffect(() => {
    if (isOpen) {
      if (!selectedCodes.includes(initialWlCode)) {
        setSelectedCodes([initialWlCode]);
      }
      // Request browser fullscreen when modal mounts
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(() => {});
      }
    }
  }, [isOpen, initialWlCode]);

  // Prevent browser scrollbar on html and body when in fullscreen modal
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

  // Track native F11 browser fullscreen changes - when user hits ESC, exit cleanly
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsBrowserFs(isFs);
      if (!isFs && isOpen) {
        onClose();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [isOpen, onClose]);

  // Keyboard shortcut: ESC to close drawer or modal, C to toggle drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isControlsOpen) {
          setIsControlsOpen(false);
        } else {
          handleClose();
        }
      } else if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'h') {
        setIsControlsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isControlsOpen]);

  if (!isOpen) return null;

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  };

  // Toggle selection of a specific wavelength
  const toggleWavelength = (code: string) => {
    let next: string[];
    if (selectedCodes.includes(code)) {
      if (selectedCodes.length === 1) return; // Keep at least one
      next = selectedCodes.filter(c => c !== code);
    } else {
      next = [...selectedCodes, code];
    }
    setSelectedCodes(next);
    setCount(next.length);
  };

  // Preset count selection (1, 2, 4, 6)
  const applyPresetCount = (targetCount: number) => {
    setCount(targetCount);
    if (targetCount === 1) {
      setSelectedCodes([selectedCodes[0] || currentList[0].code]);
    } else if (targetCount === 2) {
      const first2 = currentList.slice(0, 2).map(w => w.code);
      setSelectedCodes(first2);
    } else if (targetCount === 4) {
      const first4 = currentList.slice(0, 4).map(w => w.code);
      setSelectedCodes(first4);
    } else if (targetCount >= 6) {
      const first6 = currentList.slice(0, Math.min(6, currentList.length)).map(w => w.code);
      setSelectedCodes(first6);
    }
  };

  // Focus directly into single view for a chosen wavelength
  const handleFocusSingle = (code: string) => {
    setSelectedCodes([code]);
    setCount(1);
  };

  // Active wavelength items
  const activeItems = currentList.filter(item => selectedCodes.includes(item.code));

  // Determine grid template: seamless edge-to-edge pure black layout
  const getGridStyle = () => {
    if (count === 1) {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        padding: 0,
        margin: 0,
        boxSizing: 'border-box' as const,
        overflow: 'hidden',
        background: '#000000',
      };
    }
    if (count === 2) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr',
        width: '100vw',
        height: '100vh',
        gap: '1px',
        padding: 0,
        margin: 0,
        boxSizing: 'border-box' as const,
        overflow: 'hidden',
        background: '#000000',
      };
    }
    if (count === 3 || count === 4) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        width: '100vw',
        height: '100vh',
        gap: '1px',
        padding: 0,
        margin: 0,
        boxSizing: 'border-box' as const,
        overflow: 'hidden',
        background: '#000000',
      };
    }
    return {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      width: '100vw',
      height: '100vh',
      gap: '1px',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box' as const,
      overflow: 'hidden',
      background: '#000000',
    };
  };

  const gridLayout = getGridStyle();

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#000000',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        /* Complete scrollbar elimination in Fullscreen */
        ::-webkit-scrollbar { width: 0px !important; height: 0px !important; display: none !important; }
        * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        html, body { overflow: hidden !important; }
        
        .hud-blue-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .hud-blue-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.2);
        }
      `}</style>

      {/* ── 1. Floating Capsule Toggle Bar (ธีมสีฟ้าน้ำเงิน Navy & Sky Blue) ── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 70,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* Toggle Controls Drawer Button */}
        <button
          onClick={() => setIsControlsOpen(!isControlsOpen)}
          className="hud-blue-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 18px',
            borderRadius: 999,
            background: isControlsOpen ? 'linear-gradient(135deg, #0284C7, #0369A1)' : 'rgba(7, 18, 38, 0.92)',
            backdropFilter: 'blur(16px)',
            border: isControlsOpen ? '1px solid #38BDF8' : '1px solid rgba(56, 189, 248, 0.38)',
            color: isControlsOpen ? '#FFFFFF' : '#38BDF8',
            fontFamily: "'Orbitron', var(--font-mono)",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '1px',
            boxShadow: isControlsOpen
              ? '0 4px 24px rgba(2, 132, 199, 0.5), 0 0 20px rgba(56, 189, 248, 0.4)'
              : '0 4px 20px rgba(0, 0, 0, 0.8), 0 0 15px rgba(2, 132, 199, 0.2)',
          }}
        >
          <Sliders size={13} strokeWidth={2.5} />
          <span>{isControlsOpen ? 'HIDE CONTROLS' : 'SELECT Å & LAYOUT'}</span>
          {isControlsOpen ? <ChevronUp size={14} strokeWidth={2.5} /> : <ChevronDown size={14} strokeWidth={2.5} />}
        </button>

        {/* Quick Action Pills: Browser FS & Exit (Navy Blue Theme) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleBrowserFullscreen}
            className="hud-blue-btn"
            title="Toggle Native Browser Fullscreen (F11)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              borderRadius: 999,
              background: 'rgba(7, 18, 38, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#94A3B8',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {isBrowserFs ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isBrowserFs ? 'WINDOW' : 'F11'}</span>
          </button>

          <button
            onClick={handleClose}
            className="hud-blue-btn"
            title="Exit Fullscreen Mode (ESC)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 16px',
              borderRadius: 999,
              background: 'rgba(7, 18, 38, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.38)',
              color: '#38BDF8',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <X size={14} />
            <span>EXIT</span>
          </button>
        </div>
      </div>

      {/* ── 2. Collapsible Control Drawer (ธีมฟ้าน้ำเงินพรีเมียม) ── */}
      <div
        style={{
          position: 'absolute',
          top: isControlsOpen ? 64 : -450,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(94vw, 1100px)',
          background: 'rgba(4, 13, 28, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: 14,
          padding: '16px 20px',
          zIndex: 60,
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.9), 0 0 35px rgba(2, 132, 199, 0.2)',
          transition: 'top 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
          opacity: isControlsOpen ? 1 : 0,
          pointerEvents: isControlsOpen ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Row 1: Source Selector + View Count Presets + Stream/Photo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          {/* Source Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 700 }}>
              SATELLITE:
            </span>
            <div
              style={{
                display: 'flex',
                background: 'rgba(2, 6, 18, 0.8)',
                padding: 3,
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <button
                onClick={() => {
                  setSource('suvi');
                  setSelectedCodes(['171']);
                  setCount(1);
                }}
                style={{
                  padding: '5px 13px',
                  borderRadius: 4,
                  border: 'none',
                  background: source === 'suvi' ? '#0284C7' : 'transparent',
                  color: source === 'suvi' ? '#FFFFFF' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                GOES-R SUVI (6 Å)
              </button>
              <button
                onClick={() => {
                  setSource('sdo');
                  setSelectedCodes(['0171']);
                  setCount(1);
                }}
                style={{
                  padding: '5px 13px',
                  borderRadius: 4,
                  border: 'none',
                  background: source === 'sdo' ? '#0284C7' : 'transparent',
                  color: source === 'sdo' ? '#FFFFFF' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                NASA SDO (9 Å)
              </button>
            </div>
          </div>

          {/* View Count Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 700 }}>
              LAYOUT:
            </span>
            <div
              style={{
                display: 'flex',
                background: 'rgba(2, 6, 18, 0.8)',
                padding: 3,
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.2)',
                gap: 3,
              }}
            >
              {[
                { label: '1 View', val: 1 },
                { label: '2 Dual', val: 2 },
                { label: '4 Quad', val: 4 },
                { label: 'All 6', val: 6 },
              ].map(preset => (
                <button
                  key={preset.val}
                  onClick={() => applyPresetCount(preset.val)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 4,
                    border: 'none',
                    background: count === preset.val ? '#0284C7' : 'transparent',
                    color: count === preset.val ? '#FFFFFF' : '#94A3B8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stream / Photo Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(2, 6, 18, 0.8)',
                padding: 3,
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.2)',
                gap: 3,
              }}
            >
              <button
                onClick={() => setDisplayMode('stream')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 11px',
                  borderRadius: 4,
                  border: 'none',
                  background: displayMode === 'stream' ? '#0284C7' : 'transparent',
                  color: displayMode === 'stream' ? '#FFFFFF' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Film size={12} />
                <span>STREAM</span>
              </button>
              <button
                onClick={() => setDisplayMode('photo')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 11px',
                  borderRadius: 4,
                  border: 'none',
                  background: displayMode === 'photo' ? '#0284C7' : 'transparent',
                  color: displayMode === 'photo' ? '#FFFFFF' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ImageIcon size={12} />
                <span>HD PHOTO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Wavelength Selector Chips */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.5px' }}>
              CHOOSE WAVELENGTHS TO DISPLAY (คลิกเพื่อเลือกแสดงแต่ละ Å):
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
              Selected: {count} of {currentList.length} wavelengths
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {currentList.map(wl => {
              const isSelected = selectedCodes.includes(wl.code);
              return (
                <button
                  key={wl.code}
                  onClick={() => toggleWavelength(wl.code)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: `1px solid ${isSelected ? wl.color : 'rgba(56, 189, 248, 0.15)'}`,
                    background: isSelected ? `${wl.color}25` : 'rgba(8, 22, 44, 0.6)',
                    color: isSelected ? '#FFFFFF' : '#94A3B8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 12px ${wl.color}44` : 'none',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: wl.color,
                      boxShadow: isSelected ? `0 0 6px ${wl.color}` : 'none',
                    }}
                  />
                  <span>{wl.name}</span>
                  <span style={{ fontSize: 10, opacity: 0.75 }}>({wl.temp})</span>
                  {isSelected && <Check size={13} strokeWidth={3} color={wl.color} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Close Bar */}
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button
            onClick={() => setIsControlsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 10px',
            }}
          >
            <ChevronUp size={14} />
            <span>หุบแถบควบคุมเข้า (HIDE CONTROLS)</span>
          </button>
        </div>
      </div>

      {/* ── 3. Solar Multi-Grid (Proportional Fit: เห็นดวงอาทิตย์ครบทั้งดวง พอดิบพอดีกับวิดีโอ) ── */}
      <div style={gridLayout}>
        {activeItems.map((wl) => {
          const photoUrl = source === 'suvi'
            ? `${wl.url}?t=${cacheBuster}`
            : `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${wl.code}.jpg?t=${cacheBuster}`;

          const streamVideoUrl = source === 'sdo'
            ? `${wl.url}?t=${cacheBuster}`
            : `${wl.url}?t=${cacheBuster}`;

          return (
            <div
              key={wl.code}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: '#000000',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 0,
                border: 'none',
              }}
            >
              {/* Overlay Badge for Wavelength Info (มุมซ้ายล่าง ไม่ทับแถบเมนูด้านบน) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 14,
                  left: 14,
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(4, 13, 28, 0.88)',
                  backdropFilter: 'blur(10px)',
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.7)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: wl.color,
                    boxShadow: `0 0 8px ${wl.color}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: count === 1 ? 15 : 13,
                    fontWeight: 800,
                    color: wl.color,
                    letterSpacing: '1px',
                  }}
                >
                  {wl.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: count === 1 ? 13 : 11,
                    color: '#94A3B8',
                  }}
                >
                  {wl.temp}
                </span>

                {/* Solo View Button (when in multi-view) */}
                {count > 1 && (
                  <button
                    onClick={() => handleFocusSingle(wl.code)}
                    title={`Zoom to ${wl.name} only`}
                    style={{
                      background: 'rgba(2, 132, 199, 0.25)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38BDF8',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginLeft: 4,
                    }}
                  >
                    SOLO ↗
                  </button>
                )}
              </div>

              {/* Media Content: Proportional fit (พอดีกับวิดีโอ ไม่โดนตัดขอบ) */}
              {displayMode === 'stream' && source === 'sdo' ? (
                <video
                  key={`${wl.code}-${cacheBuster}`}
                  src={streamVideoUrl}
                  poster={photoUrl}
                  preload="auto"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              ) : (
                <img
                  src={photoUrl}
                  alt={`${wl.name} Solar Corona`}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
