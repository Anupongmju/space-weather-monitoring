import { useState, useEffect, useRef } from 'react';
import { Maximize2, Play, Pause, X, RefreshCw, Film, Image as ImageIcon } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { loadSuviLoop } from '../../services/goesService';

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
  const [fps, setFps] = useState(5);
  const [loopLimit, setLoopLimit] = useState(30);
  const playInterval = useRef<any>(null);

  // Lightbox Modal States
  const [lightboxContent, setLightboxContent] = useState<{ type: 'video' | 'photo'; wl: SdoWavelength | SuviWavelength } | null>(null);

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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>

      {/* Seamless Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 26, fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: -0.5 }}>
            {source === 'sdo' ? 'NASA / SDO IMAGERY' : 'GOES / SUVI IMAGERY'}
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            {source === 'sdo'
              ? 'Solar Dynamics Observatory · High Definition Real-time Solar Corona Videos'
              : 'Solar Ultraviolet Imager · Extreme Ultraviolet Solar Corona Observations'}
          </p>
        </div>

        {/* Source Toggle + Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSource('sdo')}
              style={{
                padding: '4px 10px', background: 'transparent', border: 'none',
                borderBottom: source === 'sdo' ? `2px solid ${activeWl.color}` : '2px solid transparent',
                color: source === 'sdo' ? '#F8FAFC' : '#94A3B8',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: source === 'sdo' ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
            >
              NASA SDO (HD Video)
            </button>
            <button
              onClick={() => setSource('suvi')}
              style={{
                padding: '4px 10px', background: 'transparent', border: 'none',
                borderBottom: source === 'suvi' ? `2px solid ${activeWl.color}` : '2px solid transparent',
                color: source === 'suvi' ? '#F8FAFC' : '#94A3B8',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: source === 'suvi' ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
            >
              GOES SUVI
            </button>
          </div>

          <StatusBadge status="normal" label="Live Stream" />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7,
              color: '#a0a0b8',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => !refreshing && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
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
            background: '#0D0D14',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px 12px 0 0',
            padding: '12px 16px 8px',
            borderBottom: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <span style={{
              fontSize: 9,
              color: '#606075',
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
                      background: isActive ? wl.color : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#000' : 'rgba(255,255,255,0.6)',
                      border: `1px solid ${isActive ? wl.color : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 4,
                      padding: '6px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? `0 0 12px ${wl.color}66` : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    {wl.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            background: '#09090E',
            border: `1px solid ${activeWl.color}33`,
            borderRadius: '0 0 12px 12px',
            padding: 16,
            boxShadow: `0 8px 32px ${activeWl.color}05`,
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
                // SDO MP4 Video Player
                <video
                  key={`${activeSdoWl.code}-${cacheBuster}`}
                  src={`${activeSdoWl.url}?t=${cacheBuster}`}
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
                // SUVI PNG Frames Loop Player
                loadingSuvi ? (
                  <LoadingSpinner />
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
                  <div style={{ color: '#606075', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    Failed to load animation loop
                  </div>
                )
              )}

              {/* Watermark overlay info */}
              <div style={{
                position: 'absolute', top: 12, left: 12,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                padding: '4px 10px', borderRadius: 4,
                fontSize: 10, fontFamily: 'var(--font-mono)', color: activeWl.color,
                border: `1px solid ${activeWl.color}33`,
                letterSpacing: '0.5px'
              }}>
                {source === 'sdo'
                  ? `NASA SDO / AIA · ${activeSdoWl.name} · REAL-TIME VIDEO`
                  : `GOES-R SUVI · ${activeSuviWl.name} · LOOP PLAYBACK`}
              </div>

              {/* Maximize Button overlay */}
              <button
                onClick={() => setLightboxContent({ type: 'video', wl: activeWl })}
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

            {/* SUVI Loop Controls (hidden when playing SDO mp4) */}
            {source === 'suvi' && suviFrames.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0D0D14', padding: 10, borderRadius: 6, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setPlayingSuvi(!playingSuvi)}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4, width: 28, height: 28, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                  >
                    {playingSuvi ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#606075' }}>
                    Frame {currentSuviFrame + 1} / {suviFrames.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#606075' }}>FPS: {fps}</span>
                  <input
                    type="range" min="1" max="15" value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    style={{ accentColor: '#3498DB', width: 70, height: 4, cursor: 'pointer' }}
                  />
                  <select
                    value={loopLimit} onChange={e => setLoopLimit(Number(e.target.value))}
                    style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#888', padding: '3px 6px', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  >
                    <option value={30}>30F Loop</option>
                    <option value={60}>60F Loop</option>
                  </select>
                </div>
              </div>
            )}

            {/* Wavelength Description Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: activeWl.color }}>{activeWl.name} - {activeWl.colorName}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#606075' }}>อุณหภูมิคัดแยก: {activeWl.temp}</span>
              </div>
              <p style={{ color: '#888898', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{activeWl.desc}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Information & Technical Details (40% width) */}
        <div style={{ flex: '2 1 360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Static Reference Card */}
          <Card title="📷 PHOTO REFERENCE">
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1/1',
              background: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.03)',
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
                fontSize: 9, fontFamily: 'var(--font-mono)', color: '#a0a0b8',
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
          <Card title={source === 'sdo' ? '☀️ NASA SDO MISSION INFO' : '🛰️ GOES SUVI MISSION INFO'}>
            <p style={{ color: '#888898', fontSize: 12, lineHeight: 1.6, margin: '0 0 12px 0', textAlign: 'justify' }}>
              {source === 'sdo'
                ? 'กล้องถ่ายภาพสุริยะ AIA (Atmospheric Imaging Assembly) บนดาวเทียม SDO ของ NASA จะถ่ายภาพสภาพความเคลื่อนไหวของดวงอาทิตย์ในย่านคลื่นอัลตราไวโอเลตยิ่งยวด (EUV) ทุก ๆ 12 วินาที ครอบคลุม 10 ย่านแสง ช่วยให้สามารถจำแนกสภาวะพลาสม่าตั้งแต่ชั้นนอกไปจนถึงสนามแม่เหล็กดวงอาทิตย์ได้อย่างละเอียดสูงสุด'
                : 'เครื่องมือ SUVI (Solar Ultraviolet Imager) ติดตั้งบนดาวเทียมอุตุนิยมวิทยา GOES-R ตระกูลค้างฟ้า ทำหน้าที่สแกนดวงอาทิตย์ใน 6 ย่านคลื่นรังสีอัลตราไวโอเลต เพื่อเฝ้าระวังภัยพิบัติสภาพอวกาศ เช่น การระเบิดปะทุจ้า (Solar Flares), รูโหว่โคโรนา (Coronal Holes), และมวลโคโรนาปะทุ (CMEs) ก่อนจะส่งผลกระทบถึงระบบการสื่อสารและโครงข่ายไฟฟ้าบนโลก'}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#A0A0B0', fontFamily: 'var(--font-mono)' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 0', color: '#606075' }}>OPERATOR</td>
                  <td style={{ padding: '6px 0', color: '#FFF' }}>{source === 'sdo' ? 'NASA / GSFC' : 'NOAA / SWPC'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 0', color: '#606075' }}>ORBIT TYPE</td>
                  <td style={{ padding: '6px 0', color: '#FFF' }}>{source === 'sdo' ? 'Geosynchronous' : 'Geostationary'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#606075' }}>UPDATE RATE</td>
                  <td style={{ padding: '6px 0', color: '#FFF' }}>{source === 'sdo' ? '12 Seconds (Movies hourly)' : '1 Minute'}</td>
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
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#606075', marginBottom: 16 }}>
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

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
