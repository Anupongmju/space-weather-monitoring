import { useNavigate } from 'react-router-dom'
import { Satellite, Globe, Radio, ArrowRight } from 'lucide-react'

const CATEGORIES = [
  {
    tag: 'ACE',
    num: '01',
    label: 'L1 Solar Wind Observations',
    desc: 'Real-time solar wind data from the ACE satellite stationed at the L1 Lagrange point, ~1.5M km upstream of Earth.',
    color: '#38BDF8',
    icon: Satellite,
    items: [
      { text: 'Solar Wind Speed & Density', path: '/ace/swepam', sub: 'SWEPAM · Plasma instrument' },
      { text: 'Interplanetary Magnetic Field', path: '/ace/mag', sub: 'MAG · Vector magnetometer' },
      { text: 'Energetic Particles (EPAM)', path: '/ace/epam', sub: 'EPAM · Electron & proton monitor' },
      { text: 'Solar Isotope Spectrometer', path: '/ace/sis', sub: 'SIS · Heavy ion composition' },
    ],
  },
  {
    tag: 'GOES',
    num: '02',
    label: 'Geostationary Solar Flux',
    desc: 'X-ray, proton and electron flux data from NOAA GOES satellites in geostationary orbit at 35,786 km altitude.',
    color: '#34D399',
    icon: Radio,
    items: [
      { text: 'X-ray Flux (XRS 1–8 Å)', path: '/goes/xray', sub: 'XRS · Solar flare classification' },
      { text: 'Proton Flux (≥10 MeV)', path: '/goes/proton', sub: 'EPS · Radiation storm indicator' },
      { text: 'Electron Flux (≥2 MeV)', path: '/goes/electron', sub: 'EPS · Satellite charging risk' },
      { text: 'Magnetometer (Bz)', path: '/goes/mag', sub: 'MAG · Geosynchronous field' },
      { text: 'Solar Wind', path: '/goes/wind', sub: 'SWPC · Solar wind data' },
      { text: 'SUVI Solar Imagery', path: '/goes/suvi', sub: 'SUVI · Ultraviolet imager' },
    ],
  },
  {
    tag: 'COSMIC',
    num: '03',
    label: 'Ground-Based Neutron Monitors',
    desc: 'Cosmic ray count rates from the NMDB global neutron monitor network, sensitive to galactic and solar energetic particle events.',
    color: '#A5B4FC',
    icon: Globe,
    items: [
      { text: 'Neutron Monitor Multi-Station', path: '/cosmic/neutron', sub: 'NMDB network · Global comparison' },
      { text: 'Neutron Monitor Raw Counts', path: '/cosmic/maw/counts', sub: 'Mawson Station · Raw data' },
      { text: 'Atmospheric Pressure Correction', path: '/cosmic/maw/pressure', sub: 'Barometric correction factor' },
      { text: 'Neutron Monitor Tubes', path: '/cosmic/maw/tubes', sub: 'Mawson Station · Tube-level data' },
      { text: 'Pressure-Count Scatter', path: '/cosmic/maw/scatter', sub: 'Mawson Station · Scatter analysis' },
    ],
  },
]

const STATS = [
  { label: 'DATA SOURCES', value: '3', unit: 'networks', color: '#38BDF8' },
  { label: 'INSTRUMENTS', value: '15', unit: 'channels', color: '#34D399' },
  { label: 'UPDATE CYCLE', value: '60', unit: 'seconds', color: '#A5B4FC' },
  { label: 'COVERAGE', value: '7', unit: 'days max', color: '#FBBF24' },
]

export default function CurrentConditions() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 80px' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26, fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: -0.5,
          }}>
            CURRENT CONDITIONS
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Products & Data — Live Instrument Access · ACE · GOES · COSMIC
          </p>
        </div>
      </div>

      {/* ── Telemetry Stats Strip ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, marginBottom: 32, padding: '0 8px',
        background: 'transparent', border: 'none',
      }}>
        {STATS.map((s, idx) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: s.color }}>
                  {s.value}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                  {s.unit}
                </span>
              </div>
            </div>
            {idx < STATS.length - 1 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
          </div>
        ))}
      </div>

      {/* ── Category Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <div
              key={cat.tag}
              style={{
                background: 'rgba(10, 15, 30, 0.45)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${cat.color}`,
                padding: '24px 28px',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `rgba(${cat.color === '#38BDF8' ? '56,189,248' : cat.color === '#34D399' ? '52,211,153' : '165,180,252'},0.1)`,
                    border: `1px solid ${cat.color}30`, flexShrink: 0,
                  }}>
                    <Icon size={18} color={cat.color} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{
                        fontFamily: "'Orbitron', var(--font-sans), monospace",
                        fontSize: 18, fontWeight: 700, color: cat.color, letterSpacing: 1,
                      }}>
                        {cat.tag}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                        {cat.num} / 03
                      </span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                      {cat.label}
                    </h2>
                  </div>
                </div>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.7, margin: '0 0 20px', fontFamily: 'var(--font-mono)', maxWidth: 600 }}>
                {cat.desc}
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />

              {/* Items List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                {cat.items.map((item) => (
                  <button
                    key={item.text}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderLeft: '2px solid transparent',
                      cursor: 'pointer', textAlign: 'left', gap: 12,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderLeftColor = cat.color
                      e.currentTarget.style.background = `rgba(${cat.color === '#38BDF8' ? '56,189,248' : cat.color === '#34D399' ? '52,211,153' : '165,180,252'},0.05)`
                      e.currentTarget.style.paddingLeft = '16px'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderLeftColor = 'transparent'
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.paddingLeft = '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, marginBottom: 2 }}>
                        {item.text}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 }}>
                        {item.sub}
                      </div>
                    </div>
                    <ArrowRight size={12} color={cat.color} style={{ flexShrink: 0, opacity: 0.5 }} />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Footer Sources ── */}
      <div style={{
        marginTop: 32, paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
          <span><strong style={{ color: '#38BDF8' }}>ACE</strong> NASA L1 Science Center</span>
          <span><strong style={{ color: '#34D399' }}>GOES</strong> NOAA SWPC</span>
          <span><strong style={{ color: '#A5B4FC' }}>NMDB</strong> Neutron Monitor Database</span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
          NARIT LOCAL DATABASE · AUTO-REFRESH 60s
        </span>
      </div>

    </div>
  )
}
