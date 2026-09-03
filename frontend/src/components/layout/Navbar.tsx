import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

const DATA_SOURCES = [
  {
    section: 'ACE + SOLAR-1 ', 
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
      { label: 'GOES SolarSUVI', path: '/goes/suvi', tag: 'SUV' },
    ]
  },
  {
    section: 'GROUND, LUNAR & MARS',
    items: [
      { label: 'Moon Orbit (GSE)', path: '/moon', tag: 'MOON' },
      { label: 'Mars RAD (Curiosity)', path: '/mars', tag: 'MARS' },
      { label: 'Radiation & Particles', path: '/radiation', tag: 'RAD' },
      { label: 'Sunspot Number (SILSO)', path: '/solar/sunspot', tag: 'SSN' },
      { label: 'Global Neutron Map', path: '/cosmic/map', tag: 'MAP' },
      { label: 'Neutron Monitor', path: '/cosmic/neutron', tag: 'NM' },
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const linkTextColor = isLight ? '#2E5B8A' : 'rgba(255,255,255,0.7)'
  const linkHoverColor = isLight ? '#1A6DB5' : '#FFFFFF'

  const linkStyle = {
    color: linkTextColor,
    textDecoration: 'none',
    fontSize: '15px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    padding: '8px 14px',
    transition: 'color 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }

  const activeLinkStyle = {
    ...linkStyle,
    color: 'var(--primary, #3498DB)',
  }

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 var(--gutter, 40px)',
      fontFamily: 'var(--font-mono)',
      background: 'var(--navbar-bg, rgba(5, 14, 30, 0.92))',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      height: '60px',
      borderBottom: isLight ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(52, 152, 219, 0.2)',
      boxShadow: isLight ? '0 2px 20px rgba(0, 0, 0, 0.4)' : '0 2px 20px rgba(0, 0, 0, 0.5)',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    }}>

      {/* Left: Logo + nav links */}
      <div style={{ display: 'flex', gap: '0', alignItems: 'center' }}>
        <Link to="/" style={{
          ...activeLinkStyle,
          fontSize: '16px',
          fontWeight: '700',
          color: isLight ? '#0C1E35' : '#ffffff',
          paddingLeft: 0,
          marginRight: '20px',
          gap: '10px'
        }}>
          <span style={{ width: '8px', height: '8px', background: 'var(--primary, #3498DB)', borderRadius: '50%' }}></span>
          SPACE WEATHER
        </Link>

        <Link to="/" style={activeLinkStyle}
          onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--primary, #3498DB)'}
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
              color: dropdownOpen ? linkHoverColor : linkTextColor,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
            onMouseLeave={e => !dropdownOpen && (e.currentTarget.style.color = linkTextColor)}
          >
            Current Conditions
            <span style={{
              fontSize: '11px',
              marginLeft: '4px',
              transition: 'transform 0.2s',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
              color: dropdownOpen ? 'var(--primary, #3498DB)' : 'inherit',
            }}>▼</span>
          </Link>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0px)',
              left: '0',
              background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(5, 7, 13, 0.98)',
              backdropFilter: 'blur(20px)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderTop: '2px solid var(--primary, #3498DB)',
              boxShadow: isLight ? '0 12px 30px rgba(0,0,0,0.12)' : '0 12px 30px rgba(0,0,0,0.7)',
              padding: '20px 0',
              minWidth: '580px',
              zIndex: 1000,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
            }}>
              {DATA_SOURCES.map((group) => (
                <div key={group.section} style={{ padding: '0 24px' }}>
                  <div style={{
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '2px',
                    color: 'var(--primary, #3498DB)',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)'
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
                          color: isLight ? '#475569' : 'rgba(255,255,255,0.6)',
                          textDecoration: 'none',
                          fontSize: '14.5px',
                          fontFamily: 'var(--font-mono)',
                          borderBottom: isLight ? '1px solid rgba(0,0,0,0.04)' : '1px solid rgba(255,255,255,0.04)',
                          transition: 'color 0.15s',
                          gap: '12px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = linkHoverColor }}
                        onMouseLeave={e => { e.currentTarget.style.color = isLight ? '#475569' : 'rgba(255,255,255,0.6)' }}
                      >
                        <span>{item.label}</span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--primary, #3498DB)',
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
          { label: 'Moon', to: '/moon' },
          { label: 'Mars', to: '/mars' },
          { label: 'Radiation', to: '/radiation' },
          { label: 'Analysis', to: '/analysis' },
          { label: 'News', to: '/news' },
          { label: 'Report', to: '/report' },
          { label: 'Help', to: '/help' },
          { label: 'About', to: '/about' },
        ].map(({ label, to }) => (
          <Link key={label} to={to} style={linkStyle}
            onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
            onMouseLeave={e => e.currentTarget.style.color = linkTextColor}
          >{label}</Link>
        ))}
      </div>

      {/* Right: Theme Toggle + UTC Clock + Lang */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
          {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          title={isLight ? 'Switch to Dark Mode (Deep Space)' : 'Switch to Light Mode (Daylight Blue)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isLight ? 'rgba(26, 109, 181, 0.08)' : 'rgba(255, 255, 255, 0.06)',
            border: isLight ? '1px solid rgba(26, 109, 181, 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
            color: isLight ? '#1A6DB5' : 'rgba(255,255,255,0.75)',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '12.5px',
            fontWeight: 700,
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.background = isLight ? 'rgba(26, 109, 181, 0.15)' : 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = isLight ? 'rgba(26, 109, 181, 0.3)' : 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.background = isLight ? 'rgba(26, 109, 181, 0.08)' : 'rgba(255, 255, 255, 0.06)';
          }}
        >
          {isLight ? (
            <>
              <Moon size={14} />
              <span>DARK</span>
            </>
          ) : (
            <>
              <Sun size={14} color="#FBBF24" />
              <span style={{ color: '#FBBF24' }}>LIGHT</span>
            </>
          )}
        </button>

        {/* UTC Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 6px #22c55e' }}></span>
          <span style={{ color: isLight ? '#5A84A8' : '#606075', letterSpacing: '1px' }}>UTC</span>
          <span style={{ color: 'var(--text-primary)', letterSpacing: '2px' }}>{time.toUTCString().slice(17, 25)}</span>
        </div>

        {/* Lang switcher */}
        <div style={{
          display: 'flex',
          border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(255,255,255,0.12)',
          fontSize: '13px',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <button style={{ padding: '5px 10px', background: 'var(--primary, #3498DB)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '1px', fontWeight: '700' }}>EN</button>
          <button style={{ padding: '5px 10px', background: 'transparent', color: isLight ? '#5A84A8' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>TH</button>
        </div>
      </div>
    </nav>
  )
}