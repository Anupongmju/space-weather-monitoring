import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { prefetchRoute } from '../../utils/routePrefetch'
import './Navbar.css'

const DATA_SOURCES = [
  {
    section: 'ACE + SOLAR-1', 
    sectionKey: 'ace',
    color: '#38BDF8',
    lightColor: '#0284C7',
    tag: 'L1',
    items: [
      { key: 'swepam', label: 'ACE Solar Wind', path: '/ace/swepam', tag: 'SWEPAM' },
      { key: 'mag_ace', label: 'ACE Magnetic Field', path: '/ace/mag', tag: 'MAG' },
      { key: 'sis', label: 'ACE Solar Isotope', path: '/ace/sis', tag: 'SIS' },
      { key: 'epam', label: 'ACE Energetic Particles', path: '/ace/epam', tag: 'EPAM' },
    ]
  },
  {
    section: 'GOES',
    sectionKey: 'goes',
    color: '#34D399',
    lightColor: '#059669',
    tag: 'GEO',
    items: [
      { key: 'xray', label: 'GOES X-ray Flux', path: '/goes/xray', tag: 'XRS' },
      { key: 'proton', label: 'GOES Proton Flux', path: '/goes/proton', tag: 'PRT' },
      { key: 'electron', label: 'GOES Electron Flux', path: '/goes/electron', tag: 'ELC' },
      { key: 'mag_goes', label: 'GOES Magnetometer', path: '/goes/mag', tag: 'MAG' },
      { key: 'suvi', label: 'GOES SolarSUVI', path: '/goes/suvi', tag: 'SUV' },
    ]
  },
  {
    section: 'GROUND',
    sectionKey: 'ground',
    color: '#C084FC',
    lightColor: '#7C3AED',
    tag: 'NMDB',
    items: [
      { key: 'sunspot', label: 'Sunspot Number', path: '/solar/sunspot', tag: 'SSN' },
      { key: 'neutron_map', label: 'Global Neutron Map', path: '/cosmic/map', tag: 'MAP' },
      { key: 'neutron_monitor', label: 'Neutron Monitor', path: '/cosmic/neutron', tag: 'NM' },
      { key: 'maw_observatory', label: 'Mawson Observatory', path: '/cosmic/maw', tag: 'MAW' },
      { key: 'psnm_observatory', label: 'Doi Inthanon (PSNM)', path: '/cosmic/psnm', tag: 'PSNM' },
    ]
  },
  {
    section: 'MOON',
    sectionKey: 'moon',
    color: '#FBBF24',
    lightColor: '#D97706',
    tag: 'LUNAR',
    info: 'NASA SSCWeb · 4D Ephemeris',
    items: [
      { key: 'moon_orbit', label: 'Moon Orbit (GSE)', path: '/moon', tag: 'MOON' },
      { key: 'moon_rad', label: 'Radiation & Particles', path: '/radiation', tag: 'RAD' },
    ]
  },
  {
    section: 'MARS',
    sectionKey: 'mars',
    color: '#F87171',
    lightColor: '#DC2626',
    tag: 'PLANETARY',
    info: 'Curiosity Surface · MAVEN Orbit',
    items: [
      { key: 'mars_surface', label: 'Surface RAD (Curiosity)', path: '/mars?tab=surface', tag: 'SURFACE' },
      { key: 'mars_orbit', label: 'Orbital Particles (MAVEN)', path: '/mars?tab=orbit', tag: 'ORBIT' },
    ]
  },
]

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language?.startsWith('th') ? 'th' : 'en'

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
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase' as const,
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
    <nav
      className="navbar"
      style={{
        borderBottom: isLight ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(52, 152, 219, 0.2)',
      }}
    >

      {/* Left: Logo + nav links */}
      <div className="navbar-left">
        <Link to="/" className="navbar-logo" style={{
          ...activeLinkStyle,
          color: isLight ? '#0C1E35' : '#ffffff',
        }}>
          <img
            src="/CE-7-Match.png"
            alt="CE-7 Logo"
            style={{
              height: '28px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          SPACE WEATHER
        </Link>

        <Link to="/" className="navbar-link" style={activeLinkStyle}
          onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--primary, #3498DB)'}
        >{t('nav.hub')}</Link>

        {/* Data Sources dropdown */}
        <div
          ref={dropdownRef}
          style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <Link
            to="/conditions"
            className="navbar-link"
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
            onMouseEnter={e => {
              prefetchRoute('/conditions')
              e.currentTarget.style.color = linkHoverColor
            }}
            onMouseLeave={e => !dropdownOpen && (e.currentTarget.style.color = linkTextColor)}
          >
            {t('nav.current_conditions')}
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
            <div
              className="navbar-dropdown-panel"
              style={{
                background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(5, 10, 24, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: isLight ? '1px solid rgba(56, 189, 248, 0.22)' : '1px solid rgba(56, 189, 248, 0.2)',
                boxShadow: isLight ? '0 16px 40px rgba(0,0,0,0.14)' : '0 24px 60px rgba(0,0,0,0.85), 0 0 30px rgba(56, 189, 248, 0.08)',
              }}
            >
              {/* 5 Column Grid */}
              <div className="navbar-dropdown-grid">
                {DATA_SOURCES.map((group, idx) => {
                  const sectionColor = isLight ? group.lightColor : group.color
                  return (
                    <div
                      key={group.section}
                      style={{
                        padding: '0 16px',
                        borderRight: idx < DATA_SOURCES.length - 1
                          ? (isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)')
                          : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        {/* Section Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                          paddingBottom: '8px',
                          borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
                          gap: '6px',
                        }}>
                          <span style={{
                            fontSize: '12px',
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '1px',
                            color: sectionColor,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}>
                            // {t('nav.sections.' + group.sectionKey, group.section)}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            background: `${sectionColor}18`,
                            color: sectionColor,
                            border: `1px solid ${sectionColor}35`,
                            letterSpacing: '0.5px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}>
                            {group.tag}
                          </span>
                        </div>

                        {/* Items List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {group.items.map((item) => (
                            <Link
                              to={item.path}
                              key={item.label}
                              onClick={() => setDropdownOpen(false)}
                              style={{
                                display: 'flex',
                                justifySelf: 'stretch',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                color: isLight ? '#334155' : 'rgba(255,255,255,0.7)',
                                textDecoration: 'none',
                                fontSize: '12.5px',
                                fontFamily: 'var(--font-mono)',
                                lineHeight: '1.3',
                                transition: 'all 0.15s ease',
                                gap: '8px',
                              }}
                              onMouseEnter={e => {
                                prefetchRoute(item.path)
                                e.currentTarget.style.color = isLight ? '#0F172A' : '#FFFFFF'
                                e.currentTarget.style.background = isLight ? `${sectionColor}14` : 'rgba(255,255,255,0.06)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = isLight ? '#334155' : 'rgba(255,255,255,0.7)'
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t('nav.items.' + item.key, item.label)}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                color: sectionColor,
                                letterSpacing: '0.5px',
                                flexShrink: 0,
                                fontWeight: 600,
                                opacity: 0.9,
                              }}>
                                {item.tag}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Optional Info Badge for shorter columns */}
                      {group.info && (
                        <div style={{
                          marginTop: '16px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                          border: isLight ? '1px dashed rgba(0,0,0,0.1)' : '1px dashed rgba(255,255,255,0.08)',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          color: isLight ? '#64748B' : 'rgba(255,255,255,0.4)',
                          textAlign: 'center',
                          letterSpacing: '0.5px',
                        }}>
                          📡 {group.info}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bottom Strip */}
              <div style={{
                marginTop: '14px',
                paddingTop: '10px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderTop: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: isLight ? '#64748B' : 'rgba(255,255,255,0.45)',
                letterSpacing: '0.5px',
              }}>
                <span>
                  {t('nav.live_telemetry')} · <strong style={{ color: 'var(--primary, #38BDF8)' }}>5 {t('nav.domains')}</strong> · 19 {t('nav.instruments')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Link
                    to="/custom-studio"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      color: isLight ? '#0284C7' : '#38BDF8',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 700,
                      background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)',
                      padding: '3px 9px',
                      borderRadius: '4px',
                      border: isLight ? '1px solid rgba(2, 132, 199, 0.22)' : '1px solid rgba(56, 189, 248, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={() => prefetchRoute('/custom-studio')}
                  >
                    <span>📊 {t('nav.custom_studio', 'Custom Studio')}</span>
                  </Link>

                  <Link
                    to="/conditions"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      color: isLight ? '#0284C7' : '#38BDF8',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    <span>{t('nav.overview')}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {[
          { label: t('nav.moon'), to: '/moon' },
          { label: t('nav.mars'), to: '/mars' },
          { label: t('nav.radiation'), to: '/radiation' },
          { label: t('nav.analysis'), to: '/analysis' },
          { label: t('nav.news'), to: '/news' },
          { label: t('nav.report'), to: '/report' },
          { label: t('nav.help'), to: '/help' },
          { label: t('nav.about'), to: '/about' },
        ].map(({ label, to }) => (
          <Link key={to} to={to} className="navbar-link" style={linkStyle}
            onMouseEnter={e => {
              prefetchRoute(to)
              e.currentTarget.style.color = linkHoverColor
            }}
            onMouseLeave={e => e.currentTarget.style.color = linkTextColor}
          >{label}</Link>
        ))}
      </div>

      {/* Right: Theme Toggle + UTC Clock + Lang */}
      <div className="navbar-right">
          {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          title={isLight ? (currentLang === 'th' ? 'เปลี่ยนเป็นโหมดมืด (Deep Space)' : 'Switch to Dark Mode (Deep Space)') : (currentLang === 'th' ? 'เปลี่ยนเป็นโหมดสว่าง (Daylight Blue)' : 'Switch to Light Mode (Daylight Blue)')}
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
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
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
              <span>{t('nav.theme_dark')}</span>
            </>
          ) : (
            <>
              <Sun size={14} color="#FBBF24" />
              <span style={{ color: '#FBBF24' }}>{t('nav.theme_light')}</span>
            </>
          )}
        </button>

        {/* UTC Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 6px #22c55e', flexShrink: 0 }}></span>
          <span className="navbar-utc-label" style={{ color: isLight ? '#5A84A8' : '#606075', letterSpacing: '1px' }}>UTC</span>
          <span style={{ color: 'var(--text-primary)', letterSpacing: '1.5px', fontFamily: 'var(--font-mono)' }}>{time.toUTCString().slice(17, 25)}</span>
        </div>

        {/* Lang switcher */}
        <div style={{
          display: 'flex',
          border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(255,255,255,0.12)',
          fontSize: '12px',
          borderRadius: '4px',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={() => i18n.changeLanguage('en')}
            style={{
              padding: '4px 8px',
              background: currentLang === 'en' ? 'var(--primary, #3498DB)' : 'transparent',
              color: currentLang === 'en' ? '#fff' : (isLight ? '#5A84A8' : 'rgba(255,255,255,0.4)'),
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '1px',
              fontWeight: currentLang === 'en' ? '700' : '500',
              transition: 'all 0.15s ease',
            }}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => i18n.changeLanguage('th')}
            style={{
              padding: '4px 8px',
              background: currentLang === 'th' ? 'var(--primary, #3498DB)' : 'transparent',
              color: currentLang === 'th' ? '#fff' : (isLight ? '#5A84A8' : 'rgba(255,255,255,0.4)'),
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '1px',
              fontWeight: currentLang === 'th' ? '700' : '500',
              transition: 'all 0.15s ease',
            }}
          >
            TH
          </button>
        </div>
      </div>
    </nav>
  )
}