import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OrbitBackground from '../components/space/OrbitBackground'

// ── Animated Counter Hook ──────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return value
}

// ── Data ───────────────────────────────────────────────────────────────────
const DATA_SOURCES = [
  {
    name: 'NOAA SWPC',
    full: 'Space Weather Prediction Center',
    desc: 'Primary source for geomagnetic storm alerts, solar flare data, and 3-day outlooks.',
    url: 'https://www.swpc.noaa.gov/',
    color: '#3498DB',
    tags: ['Kp Index', 'Alerts', 'Forecasts'],
  },
  {
    name: 'ACE / DSCOVR',
    full: 'Advanced Composition Explorer · Deep Space Climate Observatory',
    desc: 'Real-time solar wind plasma, magnetic field, and energetic particle measurements from L1.',
    url: 'https://www.swpc.noaa.gov/products/ace-real-time-solar-wind',
    color: '#3b82f6',
    tags: ['SWEPAM', 'MAG', 'EPAM', 'SIS'],
  },
  {
    name: 'GOES Network',
    full: 'Geostationary Operational Environmental Satellites',
    desc: 'X-ray flux, proton/electron fluxes, magnetometer readings from GOES-16 & GOES-18.',
    url: 'https://www.swpc.noaa.gov/products/goes-x-ray-flux',
    color: '#22c55e',
    tags: ['XRS', 'Proton', 'Electron', 'Magnetometer'],
  },
  {
    name: 'NASA JPL Horizons',
    full: 'Jet Propulsion Laboratory Solar System Dynamics',
    desc: 'High-precision ephemeris data for real-time Moon position and orbital mechanics visualization.',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
    color: '#a78bfa',
    tags: ['Ephemeris', 'Moon RA', 'Orbital'],
  },
  {
    name: 'Cosmic Ray Stations',
    full: 'MAW Ground-Based Neutron Monitor Network',
    desc: 'Ground-based neutron monitor counts, pressure, and tube data tracking galactic cosmic rays.',
    url: '#',
    color: '#06b6d4',
    tags: ['NM Counts', 'Pressure', 'Scatter'],
  },
  {
    name: 'NASA SDO',
    full: 'Solar Dynamics Observatory',
    desc: 'Real-time 304Å EUV solar imagery revealing coronal structures and solar activity.',
    url: 'https://sdo.gsfc.nasa.gov/',
    color: '#f59e0b',
    tags: ['EUV 304Å', 'Imagery', 'Coronal'],
  },
]

const TECH_STACK = [
  { name: 'React + Vite', role: 'Frontend Framework', icon: '⚛' },
  { name: 'TypeScript', role: 'Type Safety', icon: '🔷' },
  { name: 'SVG Canvas', role: 'Orbit Visualization', icon: '🌐' },
  { name: 'Recharts', role: 'Data Visualization', icon: '📊' },
  { name: 'React Router', role: 'Client Routing', icon: '🔗' },
  { name: 'WebSocket', role: 'Real-Time Data', icon: '⚡' },
]

const TEAM = [
  {
    role: 'Lead Developer',
    icon: '🚀',
    desc: 'Full-stack development, API integration, and system architecture.',
  },
  {
    role: 'Space Physics',
    icon: '🌞',
    desc: 'Scientific accuracy of space weather data interpretation and visualizations.',
  },
  {
    role: 'UI/UX Design',
    icon: '🎨',
    desc: 'Dashboard design, information hierarchy, and user experience.',
  },
]

const STATS = [
  { label: 'Data Sources', value: 6, suffix: '' },
  { label: 'Instruments', value: 14, suffix: '+' },
  { label: 'Update Rate', value: 60, suffix: 's' },
  { label: 'Years of Data', value: 10, suffix: '+' },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function About() {
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  // Intersection observer to trigger counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const counters = STATS.map(s => useCounter(s.value, 1600, statsVisible))

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', boxSizing: 'border-box' }}>
      {/* ── Orbit Background ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.45 }}>
        <OrbitBackground />
      </div>

      {/* ── Page Content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ═══════════════════════════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════════════════════════ */}
        <section style={{
          padding: '80px 40px 60px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Eyebrow label */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#3498DB',
            marginBottom: '24px',
            padding: '6px 16px',
            border: '1px solid rgba(52,152,219,0.3)',
            background: 'rgba(52,152,219,0.06)',
          }}>
            <span style={{ width: '6px', height: '6px', background: '#3498DB', borderRadius: '50%', boxShadow: '0 0 8px #3498DB' }} />
            ABOUT SPACE WEATHER HUB
          </div>

          <h1 style={{
            fontSize: '52px',
            fontWeight: '700',
            letterSpacing: '-1.5px',
            margin: '0 0 24px',
            fontFamily: 'var(--font-sans)',
            background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: '1.1',
          }}>
            Monitoring the Sun–Earth<br />Connection in Real Time
          </h1>

          <p style={{
            maxWidth: '620px',
            margin: '0 auto 40px',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: '1.7',
            fontSize: '15px',
            fontFamily: 'var(--font-sans)',
          }}>
            Space Weather Hub aggregates near-real-time data from orbiting satellites,
            ground-based monitors, and space agencies worldwide — presenting the dynamic
            relationship between solar activity and Earth's geomagnetic environment
            through an immersive, data-driven interface.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              background: '#3498DB',
              color: '#000',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontWeight: '700',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              ↗ Open Dashboard
            </Link>
            <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noreferrer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            >
              ↗ NOAA SWPC
            </a>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            STATS SECTION
        ═══════════════════════════════════════════════════════════ */}
        <section
          ref={statsRef}
          style={{
            padding: '60px 40px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: 'rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: 'rgba(5,7,13,0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                color: '#ffffff',
                letterSpacing: '-2px',
                lineHeight: '1',
              }}>
                <span style={{ color: '#3498DB' }}>{counters[i]}</span>
                <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.5)' }}>{stat.suffix}</span>
              </div>
              <div style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            MISSION SECTION
        ═══════════════════════════════════════════════════════════ */}
        <section style={{ padding: '80px 40px', maxWidth: '1000px', margin: '0 auto' }}>
          <SectionLabel label="Our Mission" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
            alignItems: 'start',
          }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{
                fontSize: '36px',
                fontWeight: '600',
                color: '#ffffff',
                letterSpacing: '-1px',
                lineHeight: '1.2',
                margin: '0 0 20px',
              }}>
                Making Space Weather<br />
                <span style={{ color: '#3498DB' }}>Accessible to Everyone</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', fontSize: '14px', marginBottom: '16px' }}>
                Space weather events — solar flares, coronal mass ejections, geomagnetic storms —
                can impact satellites, power grids, aviation, and GPS systems. Understanding
                these phenomena is critical for modern infrastructure.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', fontSize: '14px' }}>
                Our platform synthesizes data from multiple scientific instruments into clear,
                actionable visualizations — bridging the gap between raw telemetry and public
                understanding of the space environment.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: '🛰', title: 'Real-Time Telemetry', desc: 'Data refreshed every 60 seconds from operational satellites and ground networks.' },
                { icon: '📡', title: 'Multi-Source Fusion', desc: 'ACE, GOES, DSCOVR, and ground-based stations combined into a unified view.' },
                { icon: '🌏', title: 'Thailand Perspective', desc: 'Orbital animations synchronized with Bangkok local time and geographic position.' },
              ].map(item => (
                <FeatureCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            DATA SOURCES SECTION
        ═══════════════════════════════════════════════════════════ */}
        <section style={{
          padding: '80px 40px',
          background: 'rgba(5,7,13,0.6)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <SectionLabel label="Data Sources" />
            <h2 style={{
              fontSize: '32px',
              color: '#ffffff',
              letterSpacing: '-0.5px',
              margin: '0 0 8px',
              textAlign: 'center',
            }}>
              Scientific Instruments & Networks
            </h2>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '48px', letterSpacing: '1px' }}>
              ALL DATA IS SOURCED FROM PUBLICLY ACCESSIBLE SCIENTIFIC APIs
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '16px',
            }}>
              {DATA_SOURCES.map(src => (
                <DataSourceCard key={src.name} source={src} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            TECH STACK SECTION
        ═══════════════════════════════════════════════════════════ */}
        <section style={{ padding: '80px 40px', maxWidth: '1000px', margin: '0 auto' }}>
          <SectionLabel label="Technology" />
          <h2 style={{
            fontSize: '32px',
            color: '#ffffff',
            letterSpacing: '-0.5px',
            margin: '0 0 48px',
            textAlign: 'center',
          }}>
            Built With Modern Web Technologies
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}>
            {TECH_STACK.map(tech => (
              <TechCard key={tech.name} tech={tech} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            TEAM SECTION
        ═══════════════════════════════════════════════════════════ */}
        <section style={{
          padding: '80px 40px',
          background: 'rgba(5,7,13,0.6)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <SectionLabel label="The Team" />
            <h2 style={{ fontSize: '32px', color: '#ffffff', letterSpacing: '-0.5px', margin: '0 0 48px', textAlign: 'center' }}>
              Behind Space Weather Hub
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {TEAM.map(member => (
                <div key={member.role} style={{
                  padding: '32px 24px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  textAlign: 'center',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,152,219,0.3)'
                    ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(52,152,219,0.04)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
                    ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>{member.icon}</div>
                  <div style={{ color: '#3498DB', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {member.role}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                    {member.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            DISCLAIMER SECTION
        ═══════════════════════════════════════════════════════════ */}
        <section style={{ padding: '60px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <SectionLabel label="Disclaimer" />
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '12px',
            lineHeight: '1.8',
            fontFamily: 'var(--font-mono)',
            borderLeft: '2px solid rgba(52,152,219,0.4)',
            padding: '20px 24px',
            background: 'rgba(52,152,219,0.04)',
            textAlign: 'left',
            margin: '0 auto',
          }}>
            // DATA PRESENTED ON THIS PLATFORM IS DERIVED FROM PUBLICLY ACCESSIBLE SCIENTIFIC
            SOURCES INCLUDING NOAA, NASA, AND ASSOCIATED NETWORKS. SPACE WEATHER HUB IS AN
            EDUCATIONAL AND INFORMATIONAL RESOURCE. FOR OFFICIAL SPACE WEATHER ADVISORIES,
            WARNINGS, AND WATCHES, PLEASE REFER DIRECTLY TO{' '}
            <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noreferrer"
              style={{ color: '#3498DB', textDecoration: 'none' }}>
              NOAA SWPC
            </a>.
          </p>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Dashboard', to: '/' },
              { label: 'Current Conditions', to: '/conditions' },
              { label: 'News', to: '/news' },
              { label: 'Report', to: '/report' },
            ].map(link => (
              <Link key={link.label} to={link.to} style={{
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '24px',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        color: '#3498DB',
        padding: '4px 12px',
        border: '1px solid rgba(52,152,219,0.3)',
      }}>
        // {label}
      </span>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
      padding: '20px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,152,219,0.3)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{title}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: '1.5' }}>{desc}</div>
      </div>
    </div>
  )
}

function DataSourceCard({ source }: { source: typeof DATA_SOURCES[0] }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        padding: '24px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        textDecoration: 'none',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = source.color + '55'
        el.style.background = source.color + '0a'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'rgba(255,255,255,0.07)'
        el.style.background = 'rgba(255,255,255,0.02)'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: source.color }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px' }}>{source.name}</div>
        <span style={{ color: source.color, fontSize: '12px', opacity: 0.8 }}>↗</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginBottom: '12px' }}>
        {source.full}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', lineHeight: '1.6', margin: '0 0 16px' }}>
        {source.desc}
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {source.tags.map(tag => (
          <span key={tag} style={{
            padding: '2px 8px',
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '1px',
            color: source.color,
            border: `1px solid ${source.color}44`,
            background: source.color + '11',
          }}>
            {tag}
          </span>
        ))}
      </div>
    </a>
  )
}

function TechCard({ tech }: { tech: typeof TECH_STACK[0] }) {
  return (
    <div style={{
      padding: '24px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,152,219,0.3)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(52,152,219,0.04)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'
      }}
    >
      <div style={{ fontSize: '28px', flexShrink: 0 }}>{tech.icon}</div>
      <div>
        <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px' }}>{tech.name}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
          {tech.role}
        </div>
      </div>
    </div>
  )
}
