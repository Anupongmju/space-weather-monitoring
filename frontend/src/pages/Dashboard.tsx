import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllACE, loadSwepam, loadMag } from '../services/aceService'
import { fetchAllGOES, loadProton, loadXray } from '../services/goesService'
import { fetchAllCosmic, loadNeutron, loadNeutronWithFallback } from '../services/cosmicService'
import { useAutoFetch } from '../hooks/useAutoFetch'

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes fadein {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bounce-ind {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%       { transform: translateX(-50%) translateY(8px); }
  }
  @keyframes sun-pulse {
    0%, 100% { filter: blur(40px); opacity: 0.8; }
    50%       { filter: blur(50px); opacity: 1; }
  }
  @keyframes mag-pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 0.8; }
  }

  .shimmer-text {
    background: linear-gradient(90deg,
      rgba(255,255,255,0.2) 0%,
      rgba(255,255,255,0.9) 30%,
      rgba(52,152,219,0.8)  50%,
      rgba(255,255,255,0.9) 70%,
      rgba(255,255,255,0.2) 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: shimmer 10s linear infinite;
  }
  .fadein { animation: fadein 0.8s ease forwards; }
  .bounce-ind { animation: bounce-ind 2s ease-in-out infinite; }
  .sun-glow { animation: sun-pulse 4s ease-in-out infinite; }
  .mag-line { animation: mag-pulse 3s ease-in-out infinite; }

  .flex-cards {
    display: flex; gap: 2px;
    max-width: 1200px; margin: 0 auto;
    height: 420px;
  }
  .glass-card {
    position: relative; flex: 1;
    border: 1px solid #1a1a1a;
    background: #090909;
    cursor: pointer; overflow: hidden;
    transition: flex 0.6s cubic-bezier(0.4,0,0.2,1), border-color 0.3s;
  }
  .glass-card.active { flex: 4; border-color: rgba(255, 255, 255, 0.3); }
  .glass-card:hover { border-color: #333; }
  .glass-card .bg-grad {
    position: absolute; inset: 0;
    background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.06) 0%, transparent 70%);
    opacity: 0; transition: opacity 0.5s;
  }
  .glass-card.active .bg-grad { opacity: 1; }
  .card-desc {
    max-height: 0; overflow: hidden;
    transition: max-height 0.5s ease, opacity 0.5s ease;
    opacity: 0;
  }
  .glass-card.active .card-desc { max-height: 200px; opacity: 1; }
  .card-tag-vert {
    position: absolute; bottom: 32px; right: 24px;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    opacity: 0.15; transition: opacity 0.3s;
  }
  .glass-card.active .card-tag-vert { opacity: 0; }
`

import OrbitBackground from '../components/space/OrbitBackground'
import LeftColumn from '../components/dashboard/LeftColumn'
import RightColumn from '../components/dashboard/RightColumn'
import StatusBar from '../components/dashboard/StatusBar'

// ── Expanding Card ─────────────────────────────────────────────────────────────
function DataCard({ index, tag, icon, title, sub, desc, path, isActive, onHover, onLeave, navigate }) {
  return (
    <div
      className={`glass-card${isActive ? ' active' : ''}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => navigate(path)}
    >
      <div className="bg-grad" />
      <div style={{ position: 'relative', zIndex: 10, padding: 32, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
            color: isActive ? '#000' : 'rgba(255,255,255,0.25)',
            fontSize: 18, transition: 'all 0.4s',
            boxShadow: isActive ? '0 0 20px rgba(52,152,219,0.35)' : 'none',
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
              {tag}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, letterSpacing: 1,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
              transition: 'color 0.4s', fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </div>
          </div>
        </div>

        <div className="card-desc">
          <div style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
            {sub}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-sans)', margin: '0 0 24px' }}>
            {desc}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2 }}>
            <span>EXPLORE DATA</span>
            <div style={{ width: 40, height: 1, background: 'rgba(52,152,219,0.4)' }} />
            <span>→</span>
          </div>
        </div>

        <div style={{ position: 'absolute', top: 24, right: 24, fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
          0{index + 1} / 03
        </div>

        <div className="card-tag-vert">
          <div style={{ width: 1, height: 40, background: 'white' }} />
          <span style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', fontSize: 8, letterSpacing: 4, fontFamily: 'var(--font-mono)', color: 'white' }}>
            {tag}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [activeCard, setActiveCard] = useState(null)
  const [time, setTime] = useState(new Date())
  const [summary, setSummary] = useState({
    speed: null,
    density: null,
    xray: null,
    protonFlux: null,
    bz: null,
    kp: null,
    cosmic: null,
    loading: true,
  })

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-fetch data
  useAutoFetch(async () => {
    try { await fetchAllACE() } catch { }
    try { await fetchAllGOES() } catch { }
    try { await fetchAllCosmic() } catch { }
  }, 5 * 60 * 1000)

  // Load summary values
  useEffect(() => {
    let active = true;
    async function loadSummaryData() {
      try {
        const [swepamData, magData, protonData, xrayData, cosmicRes] = await Promise.all([
          loadSwepam(60).catch(() => []),
          loadMag(60).catch(() => []),
          loadProton(60).catch(() => []),
          loadXray(60).catch(() => []),
          loadNeutronWithFallback(['OULU', 'SOPO', 'JUNG1', 'THUL', 'MOSC'], 60).catch(() => ({ station: 'OULU', data: [] }))
        ]);

        const cosmicData = cosmicRes.data;

        let kpVal = null;
        try {
          const kpRes = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
          const kpData = await kpRes.json();
          if (kpData && kpData.length > 0) {
            kpVal = kpData[kpData.length - 1].Kp;
          }
        } catch (e) {
          console.error("Error loading Kp index:", e);
        }

        if (!active) return;

        const latestSwepam = swepamData.length > 0 ? swepamData[swepamData.length - 1] : null;
        const latestMag = magData.length > 0 ? magData[magData.length - 1] : null;
        const tenMevProtons = protonData.filter(d => d.energy === '>=10 MeV');
        const latestProton = tenMevProtons.length > 0 ? tenMevProtons[tenMevProtons.length - 1] : null;
        const latestXray = xrayData.length > 0 ? xrayData[xrayData.length - 1] : null;
        const latestCosmic = cosmicData.length > 0 ? cosmicData[cosmicData.length - 1] : null;

        setSummary({
          speed: latestSwepam ? latestSwepam.bulk_speed : null,
          density: latestSwepam ? latestSwepam.proton_density : null,
          xray: latestXray ? latestXray.flux_long : null,
          bz: latestMag ? latestMag.bz : null,
          kp: kpVal,
          protonFlux: latestProton ? latestProton.flux : null,
          cosmic: latestCosmic ? latestCosmic.count_rate : null,
          loading: false,
        });
      } catch (err) {
        console.error("Summary load error:", err);
        if (active) {
          setSummary(prev => ({ ...prev, loading: false }));
        }
      }
    }

    loadSummaryData();
    const interval = setInterval(loadSummaryData, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);



  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <style>{css}</style>

      {/* ── Hero with Orbit Background ── */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'transparent', overflow: 'hidden',
      }}>

        {/* Text content */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 32px' }} className="fadein">

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 6px #4caf50' }} />
            <span style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
              REAL-TIME MONITORING
            </span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <h1 style={{
              fontSize: 'clamp(40px, 8vw, 80px)',
              fontWeight: 800, letterSpacing: '-0.04em',
              color: 'white', margin: 0, lineHeight: 1,
              fontFamily: 'var(--font-sans)',
              textShadow: '0 0 60px rgba(0,0,0,0.8)',
            }}>
              SPACE WEATHER
            </h1>
            <h1 className="shimmer-text" style={{
              fontSize: 'clamp(28px, 5vw, 52px)',
              fontWeight: 800, letterSpacing: '-0.03em',
              margin: 0, lineHeight: 1.1,
              fontFamily: 'var(--font-sans)',
            }}>
              MONITORING
            </h1>
          </div>

          {/* Subtitle */}
          <p style={{
            fontSize: 10, color: 'rgba(255,255,255,0.35)',
            letterSpacing: 4, textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)', marginBottom: 20,
          }}>
            ACE · GOES · COSMIC RAY
          </p>

          {/* Summary Box (3x2 Grid) */}
          <StatusBar summary={summary} />

          {/* CTA */}
          <button
            onClick={() => navigate('/conditions')}
            style={{
              border: '1px solid var(--accent)', color: 'var(--accent)',
              background: 'rgba(0,0,0,0.3)', padding: '10px 24px',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: 3, cursor: 'pointer', transition: 'all 0.25s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#424242ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.color = 'var(--accent)' }}
          >
            → VIEW LIVE DATA
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="bounce-ind" style={{
          position: 'absolute', bottom: 36, left: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          opacity: 0.3, zIndex: 10,
        }}>
          <span style={{ fontSize: 8, letterSpacing: 3, fontFamily: 'var(--font-mono)', color: 'white' }}>MOON BACKGROUND IS RELTIME</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, white, transparent)' }} />
        </div>
      </section>

      {/* ── Dashboard Content ── */}
      <section style={{ width: '100%', padding: '60px 5vw', position: 'relative', zIndex: 10, background: '#03060C', borderTop: '1px solid rgba(52, 152, 219, 0.15)', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(52, 152, 219, 0.15)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#3498DB', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
              // SECTION_01 / LIVE SENSOR DATA
            </p>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.025em', margin: 0, lineHeight: '1.1' }}>
              Live <em style={{ color: '#3498DB', fontStyle: 'normal' }}>sensor</em> readings.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: '30px' }}>
            <LeftColumn />
            <RightColumn />
          </div>
        </div>
      </section>
    </div>
  )
}
