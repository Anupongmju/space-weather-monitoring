import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function Footer() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const linkColor = isLight ? '#334155' : '#ffffff';
  const linkHoverColor = isLight ? '#1A6DB5' : '#3498DB';
  const headingColor = isLight ? '#0C1E35' : '#ffffff';
  const mutedTextColor = isLight ? '#64748B' : 'rgba(255,255,255,0.6)';

  return (
    <footer style={{
      background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 18, 25, 0.95)',
      borderTop: isLight ? '2px solid var(--primary, #1A6DB5)' : '2px solid #3498DB',
      color: isLight ? '#475569' : '#E2E8F0',
      fontFamily: 'var(--font-mono)',
      padding: '20px 24px 12px',
      marginTop: 'auto',
      fontSize: '12px',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: isLight ? '0 -4px 20px rgba(0,0,0,0.03)' : 'none',
      transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '24px',
        marginBottom: '16px'
      }}>
        {/* Column 1 */}
        <div>
          <h3 style={{ color: headingColor, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            About Space Weather Hub
          </h3>
          <p style={{ lineHeight: '1.5', color: mutedTextColor, textAlign: 'justify', margin: 0, fontSize: '11.5px' }}>
            Space Weather Hub is a comprehensive dashboard providing near real-time data about Astronomy, Space Weather, aurora, and related subjects. Our mission is to promote scientific awareness of space environment events onto the worldwide web.
          </p>
        </div>

        {/* Column 2 */}
        <div>
          <h3 style={{ color: headingColor, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            Our Data Sources
          </h3>
          <ul style={{ listStyleType: 'disc', paddingLeft: '18px', color: mutedTextColor, lineHeight: '1.6', margin: 0, fontSize: '11.5px' }}>
            <li>
              <a
                href="https://www.swpc.noaa.gov/"
                target="_blank"
                rel="noreferrer"
                style={{ color: linkColor, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
                onMouseLeave={e => e.currentTarget.style.color = linkColor}
              >
                NOAA SWPC
              </a>
            </li>
            <li>
              <Link
                to="/ace"
                style={{ color: linkColor, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
                onMouseLeave={e => e.currentTarget.style.color = linkColor}
              >
                DSCOVR / ACE Satellite
              </Link>
            </li>
            <li>
              <Link
                to="/goes"
                style={{ color: linkColor, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
                onMouseLeave={e => e.currentTarget.style.color = linkColor}
              >
                GOES Network
              </Link>
            </li>
            <li>
              <Link
                to="/cosmic"
                style={{ color: linkColor, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = linkHoverColor}
                onMouseLeave={e => e.currentTarget.style.color = linkColor}
              >
                Cosmic Ray Stations
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3 */}
        <div>
          <h3 style={{ color: headingColor, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            About
          </h3>
          <p style={{ lineHeight: '1.5', color: mutedTextColor, marginBottom: '10px', fontSize: '11.5px' }}>
            SpaceWeatherHub is a near-live platform where you can follow space weather from the Sun to Earth and know exactly when you can see aurora.
          </p>
          <Link
            to="/about"
            style={{ 
              display: 'inline-block',
              background: isLight ? 'rgba(26, 109, 181, 0.06)' : 'transparent',
              border: isLight ? '1px solid rgba(26, 109, 181, 0.25)' : '1px solid rgba(255,255,255,0.2)',
              color: isLight ? '#1A6DB5' : 'rgba(255,255,255,0.8)',
              padding: '3px 12px',
              cursor: 'pointer',
              fontSize: '11px',
              borderRadius: '4px',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-mono)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isLight ? 'rgba(26, 109, 181, 0.15)' : 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = isLight ? 'rgba(26, 109, 181, 0.5)' : 'rgba(255,255,255,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isLight ? 'rgba(26, 109, 181, 0.06)' : 'transparent';
              e.currentTarget.style.borderColor = isLight ? 'rgba(26, 109, 181, 0.25)' : 'rgba(255,255,255,0.2)';
            }}
          >
            More info...
          </Link>
        </div>
      </div>

      {/* Copyright & Disclaimer */}
      <div style={{
        textAlign: 'center',
        paddingTop: '10px',
        borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.06)',
        color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div>
          <span style={{ color: headingColor }}>Copyright © 2024-2026 Space Weather Hub</span> · All rights reserved
        </div>
        <div>
          <Link
            to="/about"
            style={{ color: isLight ? '#1A6DB5' : '#3b82f6', textDecoration: 'none' }} 
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            Disclaimer
          </Link>
          <span style={{ margin: '0 8px' }}>-</span>
          <Link
            to="/about"
            style={{ color: isLight ? '#1A6DB5' : '#3b82f6', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}