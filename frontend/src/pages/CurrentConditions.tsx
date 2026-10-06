import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface Instrument {
  name: string
  tag: string
  desc: string
  path: string
}

interface Section {
  id: string
  num: string
  title: string
  domain: string
  badge: string
  desc: string
  color: string
  darkColor: string
  items: Instrument[]
}

const SECTIONS: Section[] = [
  {
    id: 'ace',
    num: '01',
    title: 'ACE Satellite',
    domain: 'L1 Lagrange Point · 1.5M km Upstream',
    badge: 'L1 SCIENCE CENTER',
    desc: 'Solar wind, magnetic field & energetic particles at L1',
    color: '#0284C7',
    darkColor: '#38BDF8',
    items: [
      { name: 'Solar Wind Speed & Density', tag: 'SWEPAM', desc: 'Solar wind speed, density & temperature', path: '/ace/swepam' },
      { name: 'Interplanetary Magnetic Field', tag: 'MAG', desc: 'Interplanetary magnetic field (IMF)', path: '/ace/mag' },
      { name: 'Energetic Particles', tag: 'EPAM', desc: 'Low-energy solar particles', path: '/ace/epam' },
      { name: 'Solar Isotope Spectrometer', tag: 'SIS', desc: 'Solar energetic particles & isotopes', path: '/ace/sis' },
    ],
  },
  {
    id: 'goes',
    num: '02',
    title: 'GOES Satellites',
    domain: 'Geostationary Orbit · 35,786 km',
    badge: 'NOAA SWPC',
    desc: 'Solar flares, radiation storms & geomagnetic field',
    color: '#059669',
    darkColor: '#34D399',
    items: [
      { name: 'Solar X-ray Irradiance', tag: 'XRS', desc: 'Solar flare X-ray flux', path: '/goes/xray' },
      { name: 'High-Energy Proton Flux', tag: 'PRT', desc: 'Solar radiation storms', path: '/goes/proton' },
      { name: 'Relativistic Electron Flux', tag: 'ELC', desc: 'Spacecraft charging electron flux', path: '/goes/electron' },
      { name: 'Geosynchronous Magnetometer', tag: 'MAG', desc: 'Geostationary magnetic field', path: '/goes/mag' },
      { name: 'Solar Ultraviolet Imagery', tag: 'SUV', desc: 'Live full-disk Sun imagery', path: '/goes/suvi' },
    ],
  },
  {
    id: 'ground',
    num: '03',
    title: 'Ground-Based Observatories',
    domain: 'Worldwide NMDB & SILSO',
    badge: 'NMDB & SILSO',
    desc: 'Ground cosmic ray monitors & sunspot tracking',
    color: '#7C3AED',
    darkColor: '#C084FC',
    items: [
      { name: 'Neutron Monitor Multi-Station', tag: 'NM', desc: 'Global cosmic ray count rates', path: '/cosmic/neutron' },
      { name: 'Global Neutron Station Map', tag: 'MAP', desc: 'Worldwide detector station map', path: '/cosmic/map' },
      { name: 'Sunspot Number (SILSO)', tag: 'SSN', desc: 'Sunspot numbers & solar cycle', path: '/solar/sunspot' },
      { name: 'Mawson Cosmic Ray Observatory', tag: 'MAW', desc: 'Antarctic cosmic ray & pressure diagnostics', path: '/cosmic/maw' },
    ],
  },
  {
    id: 'moon',
    num: '04',
    title: 'Moon Orbit',
    domain: 'NASA SSCWeb & Magnetotail',
    badge: 'LUNAR TRAJECTORY',
    desc: 'Lunar orbit trajectory & radiation environment',
    color: '#D97706',
    darkColor: '#FBBF24',
    items: [
      { name: 'Moon Orbit (GSE & Magnetosphere)', tag: 'MOON', desc: 'Lunar orbit & magnetotail crossings', path: '/moon' },
      { name: 'Heliospheric & Lunar Radiation', tag: 'RAD', desc: 'Lunar & deep space radiation', path: '/radiation' },
    ],
  },
  {
    id: 'mars',
    num: '05',
    title: 'Mars Telemetry',
    domain: 'Gale Crater · MSL Curiosity',
    badge: 'MARS SURFACE',
    desc: 'Surface radiation telemetry from Curiosity rover',
    color: '#DC2626',
    darkColor: '#F87171',
    items: [
      { name: 'Mars Radiation Dashboard', tag: 'MARS', desc: 'Curiosity rover surface radiation', path: '/mars' },
    ],
  },
]

export default function CurrentConditions() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <div style={{
      maxWidth: 1140,
      margin: '0 auto',
      padding: '36px 24px 90px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Page Header */}
      <div style={{
        marginBottom: 44,
        paddingBottom: 22,
        borderBottom: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{
          fontSize: 11.5,
          fontFamily: 'var(--font-mono)',
          color: isLight ? '#1A6DB5' : '#38BDF8',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 6,
        }}>
          // OBSERVATIONAL TELEMETRY DIRECTORY
        </div>
        <h1 style={{
          fontFamily: "'Orbitron', var(--font-sans), monospace",
          fontSize: 'clamp(22px, 2.5vw, 28px)',
          fontWeight: 800,
          color: isLight ? '#0C1E35' : '#FFFFFF',
          margin: 0,
          letterSpacing: '-0.3px',
        }}>
          Current Conditions
        </h1>
        <p style={{
          color: isLight ? '#64748B' : '#94A3B8',
          fontSize: 15,
          margin: '6px 0 0',
          fontFamily: 'var(--font-sans)',
        }}>
          Live space weather observation streams by platform.
        </p>
      </div>

      {/* Divided Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
        {SECTIONS.map((sec, idx) => {
          const accentColor = isLight ? sec.color : sec.darkColor
          return (
            <section
              key={sec.id}
              style={{
                position: 'relative',
                paddingBottom: idx < SECTIONS.length - 1 ? 48 : 0,
                borderBottom: idx < SECTIONS.length - 1
                  ? (isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)')
                  : 'none',
              }}
            >
              {/* Section Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 20,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: accentColor,
                      letterSpacing: '1px',
                    }}>
                      // {sec.num}
                    </span>
                    <h2 style={{
                      fontFamily: "'Orbitron', var(--font-sans), monospace",
                      fontSize: 20,
                      fontWeight: 700,
                      color: isLight ? '#0F172A' : '#F8FAFC',
                      margin: 0,
                      letterSpacing: '-0.2px',
                    }}>
                      {sec.title}
                    </h2>
                    <span style={{
                      fontSize: 13,
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      color: isLight ? '#64748B' : '#94A3B8',
                      marginLeft: 4,
                    }}>
                      · {sec.domain}
                    </span>
                  </div>

                  <p style={{
                    color: isLight ? '#475569' : '#94A3B8',
                    fontSize: 14,
                    fontFamily: 'var(--font-sans)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    {sec.desc}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 10.5,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: `${accentColor}14`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                    letterSpacing: '0.8px',
                  }}>
                    {sec.badge}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: isLight ? '#64748B' : '#64748B',
                  }}>
                    ({sec.items.length} {sec.items.length === 1 ? 'stream' : 'streams'})
                  </span>
                </div>
              </div>

              {/* Items Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                gap: 10,
              }}>
                {sec.items.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '13px 16px',
                      background: isLight ? '#FFFFFF' : 'rgba(10, 16, 30, 0.45)',
                      border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      gap: 14,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = accentColor
                      e.currentTarget.style.background = isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)'
                      e.currentTarget.style.background = isLight ? '#FFFFFF' : 'rgba(10, 16, 30, 0.45)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: `${accentColor}18`,
                          color: accentColor,
                          letterSpacing: '0.5px',
                          flexShrink: 0,
                        }}>
                          {item.tag}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 15,
                          fontWeight: 700,
                          color: isLight ? '#0F172A' : '#F8FAFC',
                          letterSpacing: '0.2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.name}
                        </span>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: isLight ? '#64748B' : '#94A3B8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.desc}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: isLight ? '#94A3B8' : '#64748B',
                      flexShrink: 0,
                    }}>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Clean Footer Bar */}
      <div style={{
        marginTop: 56,
        paddingTop: 20,
        borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        fontSize: 13,
        fontFamily: 'var(--font-sans)',
        color: isLight ? '#64748B' : '#64748B',
      }}>
        <div>
          TELEMETRY NETWORKS: ACE (NASA) · GOES (NOAA) · NMDB GLOBAL · SILSO BELGIUM · NASA SSCWEB · MSL CURIOSITY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
          <span>NARIT SPACE WEATHER MONITORING · 60s REFRESH</span>
        </div>
      </div>
    </div>
  )
}
