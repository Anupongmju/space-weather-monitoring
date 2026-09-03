import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, RotateCcw, ChevronDown } from 'lucide-react'
import MoonOrbitBackground from '../../components/moon/MoonOrbitBackground'
import MoonChartSection from '../../components/moon/MoonChartSection'
import {
  loadMoonEventPositions,
  loadMoonEventDetail,
  MoonEventPosition,
  PRESET_EVENT_DATES,
  computeMoonPositionClient,
} from '../../services/moonService'
import { useTheme } from '../../context/ThemeContext'

export default function MoonDashboard() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const navigate = useNavigate()
  const location = useLocation()
  const orbitRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const [events, setEvents] = useState<MoonEventPosition[]>(() =>
    PRESET_EVENT_DATES.map((dateStr, idx) => computeMoonPositionClient(dateStr, idx + 1))
  )
  const [selectedEvent, setSelectedEvent] = useState<MoonEventPosition | null>(null)
  const [hoveredEvent, setHoveredEvent]   = useState<MoonEventPosition | null>(null)
  const [replayIntroTrigger, setReplayIntroTrigger] = useState(0)

  useEffect(() => {
    loadMoonEventPositions()
      .then(data => { if (data?.length) setEvents(data) })
      .catch(err => console.warn('Backend fallback active:', err))
  }, [])

  const handleSelectEvent = useCallback((evt: MoonEventPosition) => {
    if (!evt?.id) { setSelectedEvent(null); return }
    setSelectedEvent(prev => prev?.id === evt.id ? null : evt)

    // If event has lightweight/sampled series, fetch the full 13-channel dataset on demand
    if (evt && (!evt.goes_proton?.series || evt.goes_proton.series.length < 500)) {
      loadMoonEventDetail(evt.id).then(fullEvt => {
        if (fullEvt) {
          setSelectedEvent(prev => (prev?.id === evt.id ? fullEvt : prev))
          setEvents(prev => prev.map(e => (e.id === evt.id ? fullEvt : e)))
        }
      })
    }
  }, [])


  const scrollToCharts = useCallback(() => chartRef.current?.scrollIntoView({ behavior: 'smooth' }), [])
  const scrollToOrbit  = useCallback(() => orbitRef.current?.scrollIntoView({ behavior: 'smooth' }), [])

  const activeDisplayId = hoveredEvent?.id ?? selectedEvent?.id
  const activeDisplay = activeDisplayId ? events.find(e => e.id === activeDisplayId) || null : null

  const formatDose = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A'
    if (val >= 1) return val.toFixed(3)
    if (val < 0.0001) return val.toExponential(2)
    return val.toFixed(4)
  }

  return (
    <div style={{ width: '100vw', overflowY: 'auto', overflowX: 'hidden', background: isLight ? '#F1F5F9' : '#000' }}>
      <style>{`
        @keyframes moonFadeInHeader {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes chevronBounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(7px); }
        }
        .moon-anim-header { animation: moonFadeInHeader 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .chevron-bounce { animation: chevronBounce 2.4s ease-in-out infinite; }
        .chevron-bounce:hover { animation-play-state: paused; }
      `}</style>

      {/* ═══════════════════════ SECTION 1 — 100VH ORBIT VIEW ═══════════════════════ */}
      <div ref={orbitRef} style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

        {/* Orbit 3-D canvas (absolute-fills parent) */}
        <MoonOrbitBackground
          events={events}
          selectedEvent={selectedEvent}
          hoveredEvent={hoveredEvent}
          onSelectEvent={handleSelectEvent}
          onHoverEvent={setHoveredEvent}
          initialPosition={(location.state as any)?.startPos || 'dashboard'}
          replayIntroTrigger={replayIntroTrigger}
        />

        {/* ── TOP HEADER OVERLAY ── */}
        <div className="moon-anim-header" style={{
          position: 'relative', zIndex: 10, pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '24px 36px', flexWrap: 'wrap', gap: 16,
        }}>
          {/* LEFT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(5,10,24,0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#CBD5E1',
                padding: '8px 14px', borderRadius: 3, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 14,
                display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#FFF'
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.8)'
                e.currentTarget.style.background = 'rgba(56,189,248,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#CBD5E1'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.background = 'rgba(5,10,24,0.75)'
              }}
            >
              <ArrowLeft size={14} /><span>HOME</span>
            </button>

            <button
              onClick={() => setReplayIntroTrigger(p => p + 1)}
              title="Replay 1-Round Orbit Sweep"
              style={{
                background: 'rgba(5,10,24,0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(251,191,36,0.5)',
                color: '#FDE68A',
                padding: '8px 12px', borderRadius: 3, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#FFF'
                e.currentTarget.style.background = 'rgba(251,191,36,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(251,191,36,0.5)'
                e.currentTarget.style.background = 'rgba(5,10,24,0.75)'
              }}
            >
              <RotateCcw size={13} /><span>REPLAY 1-LAP</span>
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBF24', boxShadow: '0 0 12px #FBBF24' }} />
                <span style={{ fontSize: 13, letterSpacing: 3, color: '#FDE68A', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  CRaTER LUNAR DOSIMETRY · ORBIT TRAJECTORY & RADIATION DOSERATES
                </span>
              </div>
              <h1 style={{
                fontSize: 'clamp(20px,2.2vw,28px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
                margin: 0,
                fontFamily: 'var(--font-sans)',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)'
              }}>
                MOON ORBIT <span style={{ color: '#FBBF24' }}>& CRaTER DOSERATES</span>
              </h1>
            </div>
          </div>

          {/* RIGHT — status badges */}
          {activeDisplay ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, pointerEvents: 'auto' }}>
              <div style={{
                background: 'rgba(5,10,24,0.88)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(251,191,36,0.5)',
                padding: '6px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
              }}>
                <span style={{ color: '#94A3B8' }}>{hoveredEvent ? 'HOVERED: ' : 'SELECTED: '}</span>
                <strong style={{ color: '#FBBF24' }}>#{activeDisplay.id} ({activeDisplay.date})</strong>
                <span style={{ color: '#64748B' }}> · </span>
                <span style={{ color: '#38BDF8' }}>{activeDisplay.phase_name} ({activeDisplay.illumination_pct}%)</span>
                <span style={{ color: '#64748B' }}> · </span>
                <span style={{ color: '#CBD5E1' }}>{activeDisplay.distance_km?.toLocaleString()} km</span>
              </div>
              <div style={{
                background: 'rgba(5,10,24,0.88)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(244,114,182,0.5)',
                padding: '6px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
              }}>
                <span style={{ color: '#94A3B8' }}>CRaTER DOSE: </span>
                {activeDisplay.doserate?.status === 'VALID' && activeDisplay.doserate?.d56 !== null ? (
                  <>
                    <span style={{ color: '#4ADE80' }}>D12={formatDose(activeDisplay.doserate?.d12)}</span>
                    <span style={{ color: '#64748B' }}> · </span>
                    <span style={{ color: '#38BDF8' }}>D34={formatDose(activeDisplay.doserate?.d34)}</span>
                    <span style={{ color: '#64748B' }}> · </span>
                    <strong style={{ color: '#F472B6' }}>D56={formatDose(activeDisplay.doserate?.d56)} cGy/yr</strong>
                  </>
                ) : <span style={{ color: '#EF4444' }}>DATA GAP</span>}
              </div>
              {activeDisplay.goes_proton?.status === 'VALID' && (
                <div style={{
                  background: 'rgba(5,10,24,0.88)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(56,189,248,0.5)',
                  padding: '6px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}>
                  <span style={{ color: '#94A3B8' }}>{activeDisplay.goes_proton.satellite} PROTON {activeDisplay.goes_proton.mode === 'DIFFERENTIAL' ? 'DIFF' : 'INT'}: </span>
                  <span style={{ color: '#38BDF8' }}>{activeDisplay.goes_proton.channel_low_label}={formatDose(activeDisplay.goes_proton.avg_low)}</span>
                  <span style={{ color: '#64748B' }}> · </span>
                  <span style={{ color: '#FBBF24' }}>{activeDisplay.goes_proton.channel_mid_label}={formatDose(activeDisplay.goes_proton.avg_mid)}</span>
                  <span style={{ color: '#64748B' }}> · </span>
                  <strong style={{ color: '#C084FC' }}>{activeDisplay.goes_proton.channel_high_label}={formatDose(activeDisplay.goes_proton.avg_high)}</strong>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, pointerEvents:'auto' }}>
              <div style={{
                background: 'rgba(5,10,24,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(251,191,36,0.5)',
                padding: '5px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
                color: '#FBBF24',
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                fontWeight: 700
              }}>
                💡 LUNAR POSITION EXPLORER (26 DATES)
              </div>
              <div style={{
                background: 'rgba(5,10,24,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '5px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 14,
                color: '#E2E8F0',
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
              }}>
                <span style={{ color: '#94A3B8' }}>HOVER: </span>
                <span>Hover any of the 26 positions to view CRaTER & GOES graphs</span>
              </div>
              <div style={{
                background: 'rgba(5,10,24,0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '5px 14px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontSize: 10.5,
                color: '#94A3B8',
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
              }}>
                <span style={{ color: '#38BDF8' }}>SCROLL: </span>
                <span>Scroll down for full 24H radiation spectrum charts</span>
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM FADE: orbit stars fade DOWN into pure black (40px) ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 40, pointerEvents: 'none', zIndex: 5,
          background: 'linear-gradient(to bottom, transparent 0%, #000000 100%)',
        }} />

        {/* ── SCROLL DOWN BUTTON ── */}
        <button
          onClick={scrollToCharts}
          className="chevron-bounce"
          style={{
            position: 'absolute', bottom: 20, left: '50%', zIndex: 25,
            background: 'rgba(6,12,28,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(244,114,182,0.5)',
            color: '#F472B6',
            padding: '9px 24px', borderRadius: 24,
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9,
            boxShadow: '0 4px 24px rgba(244,114,182,0.2)',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#F472B6'
            e.currentTarget.style.background = 'rgba(244,114,182,0.18)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(244,114,182,0.5)'
            e.currentTarget.style.background = 'rgba(6,12,28,0.88)'
          }}
        >
          <span>24H RADIATION SPECTRUM CHARTS</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* ═══════════════════════ SECTION 2 — CHARTS ═══════════════════════ */}
      <div ref={chartRef}>
        <MoonChartSection
          events={events}
          selectedEvent={selectedEvent}
          onSelectEvent={handleSelectEvent}
          onScrollToOrbit={scrollToOrbit}
        />
      </div>
    </div>
  )
}
