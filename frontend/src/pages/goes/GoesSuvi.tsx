import { useState, useEffect, useRef } from 'react';
import { Maximize2, Play, Pause, X, RefreshCw, Film, Image as ImageIcon } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { loadSuviLoop } from '../../services/goesService';
import SuviFullscreenModal from '../../components/goes/SuviFullscreenModal';
import { useTheme } from '../../context/ThemeContext';

interface SdoWavelength {
  code: string;
  name: string;
  color: string;
  colorName: string;
  desc: string;
  url: string;
  temp: string;
}

const SDO_WAVELENGTHS: SdoWavelength[] = [
  {
    code: '0094',
    name: '094Å',
    color: '#06b6d4',
    colorName: 'Teal/Cyan',
    desc: 'พลาสมาร้อนจัดช่วงโซลาร์แฟลร์ (Solar Flares)',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0094.mp4',
    temp: '~6,000,000 °C'
  },
  {
    code: '0131',
    name: '131Å',
    color: '#0ea5e9',
    colorName: 'Teal/Blue',
    desc: 'พื้นที่อุณหภูมิสูงสุดในชั้นบรรยากาศโคโรนา',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0131.mp4',
    temp: '~10,000,000 °C'
  },
  {
    code: '0171',
    name: '171Å',
    color: '#fbbf24',
    colorName: 'Gold/Yellow',
    desc: 'โครงสร้างวงโค้งสนามแม่เหล็ก (Coronal Loops)',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0171.mp4',
    temp: '~1,000,000 °C'
  },
  {
    code: '0193',
    name: '193Å',
    color: '#22c55e',
    colorName: 'Green',
    desc: 'ช่องโหว่โคโรนา (Coronal Holes) แหล่งลมสุริยะความเร็วสูง',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0193.mp4',
    temp: '~1,500,000 °C'
  },
  {
    code: '0211',
    name: '211Å',
    color: '#a855f7',
    colorName: 'Purple',
    desc: 'ชั้นบรรยากาศโคโรนาส่วนที่กว้างขวาง และรูโหว่โคโรนา',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0211.mp4',
    temp: '~2,000,000 °C'
  },
  {
    code: '0304',
    name: '304Å',
    color: '#ef4444',
    colorName: 'Red',
    desc: 'พวยแก๊สร้อนปะทุ (Prominences) และเส้นใยสุริยะ (Filaments)',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0304.mp4',
    temp: '~80,000 °C'
  },
  {
    code: '0335',
    name: '335Å',
    color: '#3b82f6',
    colorName: 'Deep Blue',
    desc: 'บริเวณที่เกิดกิจกรรมรุนแรงบนชั้นโคโรนาชั้นนอก',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_0335.mp4',
    temp: '~2,500,000 °C'
  },
  {
    code: 'composite',
    name: 'Thematic',
    color: '#ec4899',
    colorName: 'Multicolor',
    desc: 'ภาพสังเคราะห์ 3 ช่องแสง (304, 211, 171) แสดงโครงสร้างแบบผสม',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_304211171.mp4',
    temp: 'หลายระดับ'
  },
  {
    code: 'hmib',
    name: 'HMI Mag',
    color: '#ffffff',
    colorName: 'Bipolar Black/White',
    desc: 'ขั้วสนามแม่เหล็กเหนี่ยวนำขั้วบวก (ขาว) และขั้วลบ (ดำ)',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_HMIB.mp4',
    temp: 'โฟโตสเฟียร์'
  }
];

interface SuviWavelength {
  code: string;
  name: string;
  color: string;
  colorName: string;
  desc: string;
  url: string;
  temp: string;
}

const SUVI_WAVELENGTHS: SuviWavelength[] = [
  {
    code: '094',
    name: '094Å',
    color: '#06b6d4',
    colorName: 'Teal/Cyan',
    desc: 'พลาสมาร้อนจัดช่วงโซลาร์แฟลร์ (Solar Flares)',
    url: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/094/latest.png',
    temp: '~6,000,000 °C'
  },
  {
    code: '131',
    name: '131Å',
    color: '#0ea5e9',
    colorName: 'Teal/Blue',
    desc: 'พื้นที่อุณหภูมิสูงสุดในชั้นบรรยากาศโคโรนา',
    url: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/131/latest.png',
    temp: '~10,000,000 °C'
  },
  {
    code: '171',
    name: '171Å',
    color: '#fbbf24',
    colorName: 'Gold/Yellow',
    desc: 'โครงสร้างวงโค้งสนามแม่เหล็ก (Coronal Loops)',
    url: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/171/latest.png',
    temp: '~1,000,000 °C'
  },
  {
    code: '195',
    name: '195Å',
    color: '#22c55e',
    colorName: 'Green',
    desc: 'ช่องโหว่โคโรนา (Coronal Holes) แหล่งลมสุริยะเร็วสูง',
    url: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
    temp: '~1,500,000 °C'
  },
  {
    code: '284',
    name: '284Å',
    color: '#ca8a04',
    colorName: 'Bronze',
    desc: 'พื้นที่เกิดปฏิกิริยารุนแรง (Active Regions)',
    url: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/284/latest.png',
    temp: '~2,000,000 °C'
  },
  {
    code: '304',
    name: '304Å',
    color: '#ef4444',
    colorName: 'Red',
    desc: 'พวยแก๊สร้อนพุ่งปะทุ (Prominences) ขอบดวงอาทิตย์',
    url: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/304/latest.png',
    temp: '~80,000 °C'
  }
];

export default function GoesSuvi() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [source, setSource] = useState<'sdo' | 'suvi'>('sdo'); // Default to NASA SDO
  const [activeSdoWl, setActiveSdoWl] = useState<SdoWavelength>(SDO_WAVELENGTHS[2]); // Default 171Å
  const [activeSuviWl, setActiveSuviWl] = useState<SuviWavelength>(SUVI_WAVELENGTHS[2]); // Default 171Å
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  // SUVI Frame loop states
  const [suviFrames, setSuviFrames] = useState<string[]>([]);
  const [currentSuviFrame, setCurrentSuviFrame] = useState(0);
  const [loadingSuvi, setLoadingSuvi] = useState(false);
  const [playingSuvi, setPlayingSuvi] = useState(true);
  const [fps, setFps] = useState(6);
  const [loopLimit, setLoopLimit] = useState(20);
  const playInterval = useRef<any>(null);

  // Lightbox Modal States
  const [lightboxContent, setLightboxContent] = useState<{ type: 'video' | 'photo'; wl: SdoWavelength | SuviWavelength } | null>(null);
  const [isFsModalOpen, setIsFsModalOpen] = useState(false);

  const handleOpenFullscreen = () => {
    setIsFsModalOpen(true);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const activeWl = source === 'sdo' ? activeSdoWl : activeSuviWl;

  // Load SUVI frame loop when in suvi mode
  useEffect(() => {
    if (source !== 'suvi') return;
    let active = true;
    setLoadingSuvi(true);

    loadSuviLoop(activeSuviWl.code, loopLimit)
      .then(res => {
        if (!active) return;
        if (res && res.urls && res.urls.length > 0) {
          setSuviFrames(res.urls);
          setCurrentSuviFrame(res.urls.length - 1);
        }
        setLoadingSuvi(false);
      })
      .catch(() => {
        if (active) setLoadingSuvi(false);
      });

    return () => {
      active = false;
    };
  }, [activeSuviWl.code, loopLimit, source]);

  // SUVI Loop frame animation player
  useEffect(() => {
    if (source !== 'suvi' || suviFrames.length === 0 || !playingSuvi) {
      if (playInterval.current) clearInterval(playInterval.current);
      return;
    }

    playInterval.current = setInterval(() => {
      setCurrentSuviFrame(prev => (prev + 1) % suviFrames.length);
    }, 1000 / fps);

    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
    };
  }, [suviFrames, playingSuvi, fps, source]);

  const handleRefresh = () => {
    setRefreshing(true);
    setCacheBuster(Date.now());
    if (source === 'suvi') {
      loadSuviLoop(activeSuviWl.code, loopLimit)
        .then(res => {
          if (res && res.urls && res.urls.length > 0) {
            setSuviFrames(res.urls);
            setCurrentSuviFrame(res.urls.length - 1);
          }
          setRefreshing(false);
        })
        .catch(() => setRefreshing(false));
    } else {
      // SDO simply reloads the video element src via caching buster
      setTimeout(() => {
        setRefreshing(false);
      }, 800);
    }
  };

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>

      {/* Seamless Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 26, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(26, 109, 181, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#0C1E35' : '#F8FAFC',
            margin: 0,
            letterSpacing: -0.5
          }}>
            {source === 'sdo' ? 'NASA / SDO IMAGERY' : 'GOES / SUVI IMAGERY'}
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            {source === 'sdo'
              ? 'Solar Dynamics Observatory · High Definition Real-time Solar Corona Videos'
              : 'Solar Ultraviolet Imager · Extreme Ultraviolet Solar Corona Observations'}
          </p>
        </div>

        {/* Source Toggle + Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex', gap: 4,
            background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.65)',
            padding: '4px',
            borderRadius: 6,
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setSource('sdo')}
              style={{
                padding: '6px 14px',
                background: source === 'sdo' ? (isLight ? '#FFFFFF' : 'rgba(56, 189, 248, 0.25)') : 'transparent',
                border: 'none',
                borderBottom: source === 'sdo' ? `2px solid ${activeWl.color}` : '2px solid transparent',
                color: source === 'sdo' ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: source === 'sdo' ? 700 : 500,
                cursor: 'pointer', borderRadius: 4,
                boxShadow: isLight && source === 'sdo' ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
                transition: 'all 0.15s ease'
              }}
            >
              NASA SDO (HD Video)
            </button>
            <button
              onClick={() => setSource('suvi')}
              style={{
                padding: '6px 14px',
                background: source === 'suvi' ? (isLight ? '#FFFFFF' : 'rgba(56, 189, 248, 0.25)') : 'transparent',
                border: 'none',
                borderBottom: source === 'suvi' ? `2px solid ${activeWl.color}` : '2px solid transparent',
                color: source === 'suvi' ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: source === 'suvi' ? 700 : 500,
                cursor: 'pointer', borderRadius: 4,
                boxShadow: isLight && source === 'suvi' ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
                transition: 'all 0.15s ease'
              }}
            >
              GOES SUVI
            </button>
          </div>

          <StatusBadge status="normal" label="Live Stream" />
          
          {/* Fullscreen Multi-View Button */}
          <button
            onClick={handleOpenFullscreen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: isLight ? '#F0F9FF' : 'rgba(56, 189, 248, 0.12)',
              border: isLight ? '1px solid #BAE6FD' : '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 6,
              color: isLight ? '#0284C7' : '#38BDF8',
              fontFamily: "'Orbitron', var(--font-sans), sans-serif",
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'all 0.2s ease',
              boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.05)' : '0 0 14px rgba(56, 189, 248, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isLight ? '#0284C7' : '#38BDF8';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isLight ? '#F0F9FF' : 'rgba(56, 189, 248, 0.12)';
              e.currentTarget.style.color = isLight ? '#0284C7' : '#38BDF8';
            }}
          >
            <Maximize2 size={13} />
            FULLSCREEN MULTI-VIEW
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
              border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: isLight ? '#475569' : '#a0a0b8',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
              transition: 'all 0.2s',
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : undefined,
            }}
            onMouseEnter={(e) => !refreshing && (e.currentTarget.style.background = isLight ? '#F8FAFC' : 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)')}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', flexWrap: 'wrap' }}>

        {/* Left Side: Video/Frame Player Block (60% width) */}
        <div style={{ flex: '3 1 520px', display: 'flex', flexDirection: 'column' }}>

          {/* THE SUN (EUV) Unified Tab Selector */}
          <div style={{
            background: isLight ? '#F1F5F9' : '#0D0D14',
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px 12px 0 0',
            padding: '12px 16px 8px',
            borderBottom: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <span style={{
              fontSize: 12,
              color: isLight ? '#475569' : '#606075',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              THE SUN ({source === 'sdo' ? 'SDO / EUV & HMI' : 'GOES-R SUVI'})
            </span>

            {/* Scrollable wavelength tabs */}
            <div style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 4
            }}>
              {(source === 'sdo' ? SDO_WAVELENGTHS : SUVI_WAVELENGTHS).map((wl) => {
                const isActive = activeWl.code === wl.code;
                return (
                  <button
                    key={wl.code}
                    onClick={() => {
                      if (source === 'sdo') setActiveSdoWl(wl as SdoWavelength);
                      else setActiveSuviWl(wl as SuviWavelength);
                    }}
                    style={{
                      background: isActive ? wl.color : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)'),
                      color: isActive ? '#000' : (isLight ? '#334155' : 'rgba(255,255,255,0.6)'),
                      border: `1px solid ${isActive ? wl.color : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)')}`,
                      borderRadius: 4,
                      padding: '6px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? `0 0 12px ${wl.color}66` : (isLight ? '0 1px 3px rgba(0,0,0,0.04)' : 'none')
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.18)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
                    }}
                  >
                    {wl.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            background: isLight ? '#FFFFFF' : '#09090E',
            border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : `1px solid ${activeWl.color}33`,
            borderRadius: '0 0 12px 12px',
            padding: 16,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : `0 8px 32px ${activeWl.color}05`,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {/* Screen Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1/1',
              background: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {source === 'sdo' ? (
                // SDO MP4 Video Player with instant high-res poster (zero wait time)
                <video
                  key={`${activeSdoWl.code}-${cacheBuster}`}
                  src={`${activeSdoWl.url}?t=${cacheBuster}`}
                  poster={`https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${activeSdoWl.code}.jpg`}
                  preload="auto"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                // SUVI PNG Frames Loop Player: instant preview latest image while buffering
                loadingSuvi && suviFrames.length === 0 ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={`${activeSuviWl.url}?t=${cacheBuster}`}
                      alt="Latest SUVI"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.8)', padding: '5px 14px', borderRadius: 20,
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}>
                      <LoadingSpinner />
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 600 }}>
                        BUFFERING SUVI LOOP...
                      </span>
                    </div>
                  </div>
                ) : suviFrames.length > 0 ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {suviFrames.map((url, idx) => (
                      <img
                        key={url}
                        src={url}
                        alt={`Frame ${idx}`}
                        style={{
                          position: 'absolute',
                          top: 0, left: 0,
                          width: '100%', height: '100%',
                          objectFit: 'contain',
                          opacity: idx === currentSuviFrame ? 1 : 0,
                          pointerEvents: idx === currentSuviFrame ? 'auto' : 'none',
                          transition: 'none'
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <img
                    src={`${activeSuviWl.url}?t=${cacheBuster}`}
                    alt="Latest Frame"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )
              )}

              {/* Watermark overlay info */}
              <div style={{
                position: 'absolute', top: 12, left: 12,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                padding: '4px 10px', borderRadius: 4,
                fontSize: 13, fontFamily: 'var(--font-mono)', color: activeWl.color,
                border: `1px solid ${activeWl.color}33`,
                letterSpacing: '0.5px'
              }}>
                {source === 'sdo'
                  ? `NASA SDO / AIA · ${activeSdoWl.name} · REAL-TIME VIDEO`
                  : `GOES-R SUVI · ${activeSuviWl.name} · LOOP PLAYBACK`}
              </div>

              {/* Fullscreen Button overlay */}
              <button
                onClick={handleOpenFullscreen}
                title="Open Fullscreen Multi-View (เลือก Å ได้)"
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6,
                  background: 'rgba(5, 15, 30, 0.8)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  color: '#38BDF8', cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: "'Orbitron', var(--font-mono)", fontSize: 11, fontWeight: 700,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#38BDF8'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(5, 15, 30, 0.8)'; e.currentTarget.style.color = '#38BDF8'; }}
              >
                <Maximize2 size={12} />
                <span>FULLSCREEN</span>
              </button>
            </div>

            {/* SUVI Loop Controls (hidden when playing SDO mp4) */}
            {source === 'suvi' && suviFrames.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: isLight ? '#F1F5F9' : '#0D0D14',
                border: isLight ? '1px solid rgba(26, 109, 181, 0.15)' : undefined,
                padding: 10, borderRadius: 6, gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setPlayingSuvi(!playingSuvi)}
                    style={{
                      background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                      border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4, width: 28, height: 28,
                      color: isLight ? '#0F172A' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                  >
                    {playingSuvi ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: isLight ? '#475569' : '#606075' }}>
                    Frame {currentSuviFrame + 1} / {suviFrames.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: isLight ? '#475569' : '#606075' }}>FPS: {fps}</span>
                  <input
                    type="range" min="1" max="15" value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    style={{ accentColor: '#3498DB', width: 70, height: 4, cursor: 'pointer' }}
                  />
                  <select
                    value={loopLimit} onChange={e => setLoopLimit(Number(e.target.value))}
                    style={{
                      background: isLight ? '#FFFFFF' : '#000',
                      border: isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 4,
                      color: isLight ? '#0F172A' : '#888',
                      padding: '3px 6px', fontSize: 13, fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <option value={15}>15F Loop (Fast)</option>
                    <option value={20}>20F Loop</option>
                    <option value={40}>40F Loop</option>
                  </select>
                </div>
              </div>
            )}

            {/* Wavelength Description Card */}
            <div style={{
              background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.12)' : '1px solid rgba(255,255,255,0.04)',
              borderRadius: 8, padding: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: activeWl.color }}>{activeWl.name} - {activeWl.colorName}</span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: isLight ? '#64748B' : '#606075' }}>อุณหภูมิคัดแยก: {activeWl.temp}</span>
              </div>
              <p style={{ color: isLight ? '#334155' : '#888898', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{activeWl.desc}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Information & Technical Details (40% width) */}
        <div style={{ flex: '2 1 360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Static Reference Card - disable redundant card-level fs button */}
          <Card
            title="📷 PHOTO REFERENCE"
            allowFullscreen={false}
            style={{
              background: isLight ? '#FFFFFF' : undefined,
              boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
            }}
          >
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1/1',
              background: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src={source === 'sdo'
                  ? `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_${activeSdoWl.code}.jpg`
                  : `${activeSuviWl.url}?t=${cacheBuster}`
                }
                alt="Static JPEG Reference"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: 4,
                fontSize: 12, fontFamily: 'var(--font-mono)', color: '#a0a0b8',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                📷 HIGH-RES REFERENCE IMAGE
              </div>

              <button
                onClick={() => setLightboxContent({ type: 'photo', wl: activeWl })}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10, transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.color = '#fff'; }}
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </Card>

          {/* Info Card */}
          <Card
            title={source === 'sdo' ? '☀️ NASA SDO MISSION INFO' : '🛰️ GOES SUVI MISSION INFO'}
            style={{
              background: isLight ? '#FFFFFF' : undefined,
              boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : undefined,
              border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : undefined,
            }}
          >
            <p style={{ color: isLight ? '#334155' : '#888898', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px 0', textAlign: 'justify' }}>
              {source === 'sdo'
                ? 'กล้องถ่ายภาพสุริยะ AIA (Atmospheric Imaging Assembly) บนดาวเทียม SDO ของ NASA จะถ่ายภาพสภาพความเคลื่อนไหวของดวงอาทิตย์ในย่านคลื่นอัลตราไวโอเลตยิ่งยวด (EUV) ทุก ๆ 12 วินาที ครอบคลุม 10 ย่านแสง ช่วยให้สามารถจำแนกสภาวะพลาสม่าตั้งแต่ชั้นนอกไปจนถึงสนามแม่เหล็กดวงอาทิตย์ได้อย่างละเอียดสูงสุด'
                : 'เครื่องมือ SUVI (Solar Ultraviolet Imager) ติดตั้งบนดาวเทียมอุตุนิยมวิทยา GOES-R ตระกูลค้างฟ้า ทำหน้าที่สแกนดวงอาทิตย์ใน 6 ย่านคลื่นรังสีอัลตราไวโอเลต เพื่อเฝ้าระวังภัยพิบัติสภาพอวกาศ เช่น การระเบิดปะทุจ้า (Solar Flares), รูโหว่โคโรนา (Coronal Holes), และมวลโคโรนาปะทุ (CMEs) ก่อนจะส่งผลกระทบถึงระบบการสื่อสารและโครงข่ายไฟฟ้าบนโลก'}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: isLight ? '#475569' : '#A0A0B0', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 0', color: isLight ? '#64748B' : '#606075', fontWeight: 600 }}>OPERATOR</td>
                  <td style={{ padding: '6px 0', color: isLight ? '#0C1E35' : '#FFF', fontWeight: 600 }}>{source === 'sdo' ? 'NASA / GSFC' : 'NOAA / SWPC'}</td>
                </tr>
                <tr style={{ borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 0', color: isLight ? '#64748B' : '#606075', fontWeight: 600 }}>ORBIT TYPE</td>
                  <td style={{ padding: '6px 0', color: isLight ? '#0C1E35' : '#FFF' }}>{source === 'sdo' ? 'Geosynchronous' : 'Geostationary'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: isLight ? '#64748B' : '#606075', fontWeight: 600 }}>UPDATE RATE</td>
                  <td style={{ padding: '6px 0', color: isLight ? '#0C1E35' : '#FFF' }}>{source === 'sdo' ? '12 Seconds (Movies hourly)' : '1 Minute'}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxContent && (
        <div
          onClick={() => setLightboxContent(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.96)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <button
            onClick={() => setLightboxContent(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <X size={18} />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', width: '100%', textAlign: 'center' }}
          >
            <h3 style={{
              fontFamily: "'Orbitron', monospace",
              color: lightboxContent.wl.color,
              fontSize: 18, fontWeight: 700, margin: '0 0 4px 0'
            }}>
              {source === 'sdo' ? 'NASA SDO' : 'GOES SUVI'} — {lightboxContent.wl.name} ({lightboxContent.type === 'video' ? 'VIDEO LOOP' : 'STATIC PHOTO'})
            </h3>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: '#606075', marginBottom: 16 }}>
              {lightboxContent.wl.colorName} · {lightboxContent.wl.temp} · {lightboxContent.wl.desc}
            </div>

            <div style={{
              background: '#000', borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: `0 0 40px ${lightboxContent.wl.color}22`,
              border: `1px solid ${lightboxContent.wl.color}44`,
              maxWidth: '620px', width: '100%',
              aspectRatio: '1/1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
              position: 'relative'
            }}>
              {lightboxContent.type === 'photo' ? (
                <img
                  src={source === 'sdo'
                    ? `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${(lightboxContent.wl as SdoWavelength).code}.jpg`
                    : `${(lightboxContent.wl as SuviWavelength).url}?t=${cacheBuster}`
                  }
                  alt="Full JPEG"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                source === 'sdo' ? (
                  <video
                    key={`${(lightboxContent.wl as SdoWavelength).code}-lightbox`}
                    src={`${(lightboxContent.wl as SdoWavelength).url}`}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {suviFrames.map((url, idx) => (
                      <img
                        key={url}
                        src={url}
                        alt="frame"
                        style={{
                          position: 'absolute',
                          top: 0, left: 0,
                          width: '100%', height: '100%',
                          objectFit: 'contain',
                          opacity: idx === currentSuviFrame ? 1 : 0,
                          pointerEvents: idx === currentSuviFrame ? 'auto' : 'none',
                          transition: 'none'
                        }}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Multi-View Modal (Customizable Wavelength Count & Selection) */}
      <SuviFullscreenModal
        isOpen={isFsModalOpen}
        onClose={() => setIsFsModalOpen(false)}
        source={source}
        setSource={setSource}
        suviWavelengths={SUVI_WAVELENGTHS}
        sdoWavelengths={SDO_WAVELENGTHS}
        initialWlCode={activeWl.code}
        cacheBuster={cacheBuster}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
