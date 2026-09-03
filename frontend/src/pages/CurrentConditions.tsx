import { useNavigate } from 'react-router-dom'
import { Satellite, Globe, Radio, ArrowRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const CATEGORIES = [
  {
    tag: 'ACE',
    num: '01',
    label: 'L1 Solar Wind Observations',
    desc: 'Real-time solar wind data from the ACE satellite stationed at the L1 Lagrange point, ~1.5M km upstream of Earth.',
    color: '#0284C7',
    darkColor: '#38BDF8',
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
    color: '#059669',
    darkColor: '#34D399',
    icon: Radio,
    items: [
      { text: 'X-ray Flux (XRS 1–8 Å)', path: '/goes/xray', sub: 'XRS · Solar flare classification' },
      { text: 'Proton Flux (≥10 MeV)', path: '/goes/proton', sub: 'EPS · Radiation storm indicator' },
      { text: 'Electron Flux (≥2 MeV)', path: '/goes/electron', sub: 'EPS · Satellite charging risk' },
      { text: 'Magnetometer (Bz)', path: '/goes/mag', sub: 'MAG · Geosynchronous field' },
      { text: 'SUVI Solar Imagery', path: '/goes/suvi', sub: 'SUVI · Ultraviolet imager' },
    ],
  },
  {
    tag: 'COSMIC',
    num: '03',
    label: 'Ground-Based Neutron Monitors',
    desc: 'Cosmic ray count rates from the NMDB global neutron monitor network, sensitive to galactic and solar energetic particle events.',
    color: '#7C3AED',
    darkColor: '#C084FC',
    icon: Globe,
    items: [
      { text: 'Neutron Monitor Multi-Station', path: '/cosmic/neutron', sub: 'NMDB network · Global comparison' },
      { text: 'Mawson Station Total Counts', path: '/cosmic/maw/counts', sub: 'Mawson Antarctic Station' },
      { text: 'Atmospheric Pressure Correction', path: '/cosmic/maw/pressure', sub: 'Barometric correction factor' },
      { text: 'Neutron Monitor Tubes (24 Ch)', path: '/cosmic/maw/tubes', sub: '18 Standard + 6 Bare detectors' },
      { text: 'Pressure-Count Scatter', path: '/cosmic/maw/scatter', sub: 'Linear regression analysis' },
    ],
  },
  {
    tag: 'MARS & MOON',
    num: '04',
    label: 'Planetary & Heliospheric Dosimetry',
    desc: 'Surface radiation dose rate and charged/neutral particle telemetry from MSL Curiosity Rover at Gale Crater on Mars and Moon orbit.',
    color: '#DC2626',
    darkColor: '#F87171',
    icon: Radio,
    items: [
      { text: 'Moon Orbit (GSE & Magnetosphere)', path: '/moon', sub: 'NASA SSCWeb 4D · 27 Event positions & Magnetotail' },
      { text: 'Mars Radiation Dashboard', path: '/mars', sub: 'RAD · Surface dosimetry & Sol telemetry' },
      { text: 'Heliospheric & Lunar Radiation', path: '/radiation', sub: 'CRaTER & STEREO particle environment' },
    ],
  },
]

const STATS = [
  { label: 'DATA SOURCES', value: '4', unit: 'networks', color: '#0284C7', darkColor: '#38BDF8' },
  { label: 'INSTRUMENTS', value: '18', unit: 'channels', color: '#059669', darkColor: '#34D399' },
  { label: 'UPDATE CADENCE', value: '60', unit: 'seconds', color: '#7C3AED', darkColor: '#C084FC' },
  { label: 'MARS MISSION', value: 'MSL', unit: 'Curiosity RAD', color: '#DC2626', darkColor: '#F87171' },
]

export default function CurrentConditions() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 26, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16, borderBottom: isLight ? '1px solid rgba(2, 132, 199, 0.15)' : '1px solid rgba(255,255,255,0.08)',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26, fontWeight: 700, color: isLight ? '#0369A1' : '#38BDF8', margin: 0, letterSpacing: -0.5,
          }}>
            CURRENT CONDITIONS
          </h1>
          <p style={{ color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Products & Data — Live Instrument Telemetry · ACE · GOES · COSMIC · MARS & MOON
          </p>
        </div>
      </div>

      {/* Telemetry Stats Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        {STATS.map(s => {
          const color = isLight ? s.color : s.darkColor
          return (
            <div
              key={s.label}
              style={{
                padding: '14px 18px',
                background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                border: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 6,
                boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.03)' : undefined,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color }}>
                  {s.value}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                  {s.unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Category Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const color = isLight ? cat.color : cat.darkColor
          return (
            <div
              key={cat.tag}
              style={{
                background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 8,
                padding: '24px 28px',
                boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.03)' : undefined,
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${color}18`,
                    border: `1px solid ${color}40`, flexShrink: 0,
                    color
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontFamily: "'Orbitron', var(--font-sans), monospace",
                        fontSize: 18, fontWeight: 700, color, letterSpacing: 0.5,
                      }}>
                        {cat.tag}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isLight ? '#64748B' : '#94A3B8' }}>
                        {cat.num} / 04
                      </span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: isLight ? '#0F172A' : '#F8FAFC', margin: '2px 0 0' }}>
                      {cat.label}
                    </h2>
                  </div>
                </div>
              </div>

              <p style={{ color: isLight ? '#475569' : '#CBD5E1', fontSize: 13, lineHeight: 1.6, margin: '0 0 18px', fontFamily: 'var(--font-mono)' }}>
                {cat.desc}
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

              {/* Items List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {cat.items.map(item => (
                  <button
                    key={item.text}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px',
                      background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderLeft: '3px solid transparent',
                      borderRadius: 6,
                      cursor: 'pointer', textAlign: 'left', gap: 12,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderLeftColor = color
                      e.currentTarget.style.background = isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.transform = 'translateX(2px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderLeftColor = 'transparent'
                      e.currentTarget.style.background = isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: isLight ? '#0F172A' : '#F8FAFC', lineHeight: 1.4, marginBottom: 2 }}>
                        {item.text}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isLight ? '#64748B' : '#94A3B8' }}>
                        {item.sub}
                      </div>
                    </div>
                    <ArrowRight size={14} color={color} style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Sources */}
      <div style={{
        marginTop: 32, paddingTop: 16,
        borderTop: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: isLight ? '#475569' : '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
          <span><strong style={{ color: isLight ? '#0284C7' : '#38BDF8' }}>ACE</strong> NASA L1 Science Center</span>
          <span><strong style={{ color: isLight ? '#059669' : '#34D399' }}>GOES</strong> NOAA SWPC</span>
          <span><strong style={{ color: isLight ? '#7C3AED' : '#C084FC' }}>NMDB</strong> Neutron Monitor Database</span>
          <span><strong style={{ color: isLight ? '#DC2626' : '#F87171' }}>MARS</strong> NASA MSL Curiosity RAD</span>
        </div>
        <span style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
          NARIT LOCAL DATABASE · AUTO-REFRESH 60s
        </span>
      </div>
    </div>
  )
}
