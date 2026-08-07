import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const DATA_SOURCES = [
  {
    section: 'ACE', 
    items: [
      { label: 'ACE Real-Time Solar Wind', path: '/ace/swepam', tag: 'L1' },
      { label: 'ACE Magnetic Field ', path: '/ace/Mag', tag: 'MAG' },
      { label: 'ACE Solar Isotope Spectrometer (SIS)', path: '/ace/sis', tag: 'SIS' },
      { label: 'ACE Energetic Particle Spectrometer (Epam)', path: '/ace/epam', tag: 'EPAM' },
      
    ]
  },
  {
    section:'GOES',
    items:[
      { label: 'GOES X-ray Flux', path: '/goes/xray', tag: 'XRS' },
      { label: 'GOES Proton Flux', path: '/goes/proton', tag: 'PRT' },
      { label: 'GOES Electron Flux', path: '/goes/electron', tag: 'ELC' },
      { label: 'GOES Magnetometer', path: '/goes/mag', tag: 'MAG' },
      { label: 'GOES SolarWind', path: '/goes/wind', tag: 'SW' },
      { label: 'GOES SolarSUVI', path: '/goes/suvi', tag: 'SUV' },

    ]
  },
  {
    section: 'GROUND-BASED & LUNAR',
    items: [
      { label: 'Radiation & Particles', path: '/radiation', tag: 'RAD' },
      { label: 'NeutronMonitor', path: '/cosmic/neutron', tag: 'NM' },
      { label: 'MAW Pressure', path: '/cosmic/maw/pressure', tag: 'PS' },
      { label: 'MAW Counts', path: '/cosmic/maw/counts', tag: 'MC' },
      { label: 'MAW Scatter', path: '/cosmic/maw/scatter', tag: 'MST' },
      { label: 'MAW Tubes', path: '/cosmic/maw/tubes', tag: 'MT' },
    ]
  },
]

export default function Navbar() {
  const [time, setTime] = useState(new Date())
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const linkStyle = {
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '8px 14px',
    transition: 'color 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }

  const activeLinkStyle = {
    ...linkStyle,
    color: '#3498DB',
  }

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 var(--gutter, 40px)',
      borderBottom: '1px solid rgba(52, 152, 219, 0.2)',
      fontFamily: 'var(--font-mono)',
      background: 'rgba(5, 14, 30, 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      height: '60px'
    }}>

      {/* Left: Logo + nav links */}
      <div style={{ display: 'flex', gap: '0', alignItems: 'center' }}>
        <Link to="/" style={{
          ...activeLinkStyle,
          fontSize: '12px',
          fontWeight: '700',
          color: '#ffffff',
          paddingLeft: 0,
          marginRight: '20px',
          gap: '10px'
        }}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span>
          SPACE WEATHER
        </Link>

        <Link to="/" style={activeLinkStyle}
          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.color = '#3498DB'}
        >Hub</Link>

        

        {/* Data Sources dropdown */}
        <div
          ref={dropdownRef}
          style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <Link
            to="/conditions"
            onClick={() => setDropdownOpen(false)}
            style={{
              ...linkStyle,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              color: dropdownOpen ? '#ffffff' : 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={e => !dropdownOpen && (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            Current Conditions
            <span style={{
              fontSize: '8px',
              marginLeft: '4px',
              transition: 'transform 0.2s',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
              color: dropdownOpen ? '#3498DB' : 'inherit',
            }}>▼</span>
          </Link>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0px)',
              left: '0',
              background: 'rgba(5,7,13,0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderTop: '2px solid #3498DB',
              padding: '20px 0',
              minWidth: '580px',
              zIndex: 1000,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
            }}>
              {DATA_SOURCES.map((group) => (
                <div key={group.section} style={{ padding: '0 24px' }}>
                  <div style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '2px',
                    color: '#3498DB',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    // {group.section}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.items.map((item) => (
                      <Link
                        to={item.path}
                        key={item.label}

                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '7px 0',
                          color: 'rgba(255,255,255,0.6)',
                          textDecoration: 'none',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          transition: 'color 0.15s',
                          gap: '12px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                      >
                        <span>{item.label}</span>
                        <span style={{
                          fontSize: '8px',
                          color: '#3498DB',
                          letterSpacing: '1px',
                          flexShrink: 0
                        }}>{item.tag}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {[
          { label: 'Radiation', to: '/radiation' },
          { label: 'Analysis', to: '/analysis' },
          { label: 'News', to: '/news' },
          { label: 'Report', to: '/report' },
          { label: 'Help', to: '/help' },
          { label: 'About', to: '/about' },
        ].map(({ label, to }) => (
          <Link key={label} to={to} style={linkStyle}
            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >{label}</Link>
        ))}
      </div>

      {/* Right: Clock + Lang */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 6px #22c55e' }}></span>
          <span style={{ color: '#606075', letterSpacing: '1px' }}>UTC</span>
          <span style={{ color: '#ffffff', letterSpacing: '2px' }}>{time.toUTCString().slice(17, 25)}</span>
        </div>
        <div style={{
          display: 'flex',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: '10px'
        }}>
          <button style={{ padding: '5px 10px', background: '#3498DB', color: '#000', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '1px', fontWeight: '700' }}>EN</button>
          <button style={{ padding: '5px 10px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>TH</button>
        </div>
      </div>
    </nav>
  )
}