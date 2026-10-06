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
  posterUrl?: string;
  fov?: string;
  gifUrl?: string;
}

interface SuviFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: 'sdo' | 'suvi' | 'lasco';
  setSource: (s: 'sdo' | 'suvi' | 'lasco') => void;
  suviWavelengths: SuviWlItem[];
  sdoWavelengths: SuviWlItem[];
  lascoWavelengths?: SuviWlItem[];
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
  lascoWavelengths = [],
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
  const currentList = source === 'suvi' ? suviWavelengths : source === 'lasco' ? lascoWavelengths : sdoWavelengths;

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

  // Registry of all channels across missions
  const allAvailableItems = [
    ...sdoWavelengths.map(w => ({ ...w, mission: 'sdo' as const })),
    ...lascoWavelengths.map(w => ({ ...w, mission: 'lasco' as const })),
    ...suviWavelengths.map(w => ({ ...w, mission: 'suvi' as const })),
  ];

  // Preset count selection (1, 2, 3, 4, 6)
  const applyPresetCount = (targetCount: number) => {
    setCount(targetCount);
    if (targetCount === 1) {
      setSelectedCodes([selectedCodes[0] || (source === 'lasco' ? 'c2' : source === 'suvi' ? '171' : '0171')]);
    } else if (targetCount === 2) {
      if (source === 'lasco') {
        setSelectedCodes(['c2', 'c3']);
      } else {
        // SDO (or SUVI) 2 Dual: SDO + LASCO C2 side-by-side!
        setSelectedCodes([source === 'suvi' ? '171' : '0171', 'c2']);
      }
    } else if (targetCount === 3) {
      if (source === 'lasco') {
        setSelectedCodes(['c2', 'c3', '0171']);
      } else {
        setSelectedCodes([source === 'suvi' ? '171' : '0171', source === 'suvi' ? '304' : '0304', 'c2']);
      }
    } else if (targetCount === 4) {
      if (source === 'lasco') {
        setSelectedCodes(['c2', 'c3', '0171', '0304']);
      } else {
        // 4 Quad: 2 SDO + 2 LASCO!
        setSelectedCodes([source === 'suvi' ? '171' : '0171', source === 'suvi' ? '304' : '0304', 'c2', 'c3']);
      }
    } else if (targetCount >= 6) {
      if (source === 'lasco') {
        setSelectedCodes(['c2', 'c3', '0171', '0304', '0193', '0211']);
      } else if (source === 'suvi') {
        setSelectedCodes(['094', '131', '171', '195', '284', '304']);
      } else {
        // 4 SDO + LASCO C2 + LASCO C3!
        setSelectedCodes(['0171', '0304', '0193', '0211', 'c2', 'c3']);
      }
    }
  };

  // Focus directly into single view for a chosen wavelength
  const handleFocusSingle = (code: string) => {
    setSelectedCodes([code]);
    setCount(1);
  };

  // Active wavelength items (resolved across SDO, LASCO, and SUVI)
  const activeItems = selectedCodes
    .map(code => allAvailableItems.find(item => item.code === code))
    .filter(Boolean) as (SuviWlItem & { mission?: 'sdo' | 'suvi' | 'lasco' })[];

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
              <button
                onClick={() => {
                  setSource('lasco');
                  setSelectedCodes(['c2']);
                  setCount(1);
                }}
                style={{
                  padding: '5px 13px',
                  borderRadius: 4,
                  border: 'none',
                  background: source === 'lasco' ? '#0284C7' : 'transparent',
                  color: source === 'lasco' ? '#FFFFFF' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                SOHO LASCO (C2/C3)
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
                {
                  label: source === 'sdo' ? '2 Dual (SDO+C2)' : source === 'lasco' ? '2 Dual (C2+C3)' : '2 Dual',
                  val: 2,
                },
                {
                  label: source === 'sdo' ? '3 Triple (+C2)' : '3 Triple',
                  val: 3,
                },
                {
                  label: source === 'sdo' ? '4 Quad (SDO+LASCO)' : source === 'lasco' ? '4 Quad (LASCO+SDO)' : '4 Quad',
                  val: 4,
                },
                {
                  label: source === 'suvi' ? 'All 6 SUVI' : '6 Multi',
                  val: 6,
                },
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
              CHOOSE CHANNELS TO DISPLAY (คลิกเลือกดูหลายช่องสัญญาณพร้อมกัน):
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
              Selected: {selectedCodes.length} channels
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Primary Mission Channel Chips */}
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginBottom: 5, fontWeight: 700, letterSpacing: '0.5px' }}>
                {source === 'sdo' ? '☀️ NASA SDO (SOLAR DISK & CORONA)' : source === 'suvi' ? '🛰️ GOES-R SUVI (SOLAR DISK)' : '🛰️ SOHO LASCO (CORONAGRAPHS)'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(source === 'sdo' ? sdoWavelengths : source === 'suvi' ? suviWavelengths : lascoWavelengths).map(wl => {
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

            {/* Cross-Mission: SOHO LASCO Coronagraphs when in SDO or SUVI mode */}
            {source !== 'lasco' && lascoWavelengths.length > 0 && (
              <div style={{ paddingTop: 8, borderTop: '1px dashed rgba(56, 189, 248, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#f87171', fontWeight: 700, letterSpacing: '0.5px' }}>
                    🛰️ SOHO LASCO (CORONAGRAPH & CME - เลือกดูร่วมกับ {source === 'sdo' ? 'SDO' : 'SUVI'} ได้พร้อมกัน):
                  </span>
                  <span style={{ fontSize: 9, background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '1px 6px', borderRadius: 3, border: '1px solid rgba(239, 68, 68, 0.3)', fontFamily: 'var(--font-mono)' }}>
                    CROSS-MISSION
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {lascoWavelengths.map(wl => {
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
                          border: `1px solid ${isSelected ? wl.color : 'rgba(239, 68, 68, 0.3)'}`,
                          background: isSelected ? `${wl.color}25` : 'rgba(30, 10, 15, 0.5)',
                          color: isSelected ? '#FFFFFF' : '#cbd5e1',
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
            )}

            {/* Cross-Mission: NASA SDO Channels when in LASCO mode */}
            {source === 'lasco' && sdoWavelengths.length > 0 && (
              <div style={{ paddingTop: 8, borderTop: '1px dashed rgba(56, 189, 248, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.5px' }}>
                    ☀️ NASA SDO (SOLAR DISK - เลือกดูคู่กับ LASCO CME):
                  </span>
                  <span style={{ fontSize: 9, background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', padding: '1px 6px', borderRadius: 3, border: '1px solid rgba(56, 189, 248, 0.3)', fontFamily: 'var(--font-mono)' }}>
                    CROSS-MISSION
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sdoWavelengths.map(wl => {
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
                          border: `1px solid ${isSelected ? wl.color : 'rgba(56, 189, 248, 0.2)'}`,
                          background: isSelected ? `${wl.color}25` : 'rgba(8, 22, 44, 0.6)',
                          color: isSelected ? '#FFFFFF' : '#cbd5e1',
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
            )}
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
          const itemMission = wl.mission || (
            sdoWavelengths.some(s => s.code === wl.code) ? 'sdo' :
            lascoWavelengths.some(l => l.code === wl.code) ? 'lasco' : 'suvi'
          );

          const isItemSdo = itemMission === 'sdo';
          const isItemLasco = itemMission === 'lasco';
          const isItemSuvi = itemMission === 'suvi';

          const photoUrl = isItemSuvi
            ? `${wl.url}?t=${cacheBuster}`
            : isItemLasco
              ? `${wl.posterUrl || wl.url}?t=${cacheBuster}`
              : `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${wl.code}.jpg?t=${cacheBuster}`;

          const streamVideoUrl = isItemSdo
            ? `${wl.url}?t=${cacheBuster}`
            : isItemLasco
              ? (wl.gifUrl ? `${wl.gifUrl}?t=${cacheBuster}` : `https://soho.nascom.nasa.gov/data/LATEST/current_${wl.code}.gif?t=${cacheBuster}`)
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
                {/* Mission Badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isItemSdo
                      ? 'rgba(56, 189, 248, 0.18)'
                      : isItemLasco
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                    color: isItemSdo ? '#38bdf8' : isItemLasco ? '#f87171' : '#4ade80',
                    border: `1px solid ${
                      isItemSdo
                        ? 'rgba(56, 189, 248, 0.4)'
                        : isItemLasco
                          ? 'rgba(239, 68, 68, 0.4)'
                          : 'rgba(34, 197, 94, 0.4)'
                    }`,
                    fontFamily: "'Orbitron', monospace",
                    letterSpacing: '0.5px',
                  }}
                >
                  {isItemSdo ? 'SDO' : isItemLasco ? 'LASCO' : 'SUVI'}
                </span>

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

              {/* Media Content: Proportional fit (SDO streams MP4, LASCO streams GIF loop, Photo displays HD still) */}
              {displayMode === 'stream' && isItemSdo ? (
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
                  src={displayMode === 'stream' && isItemLasco ? streamVideoUrl : photoUrl}
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
