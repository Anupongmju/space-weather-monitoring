import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      background: 'rgba(15, 18, 25, 0.95)', // Matches the dark aesthetic of the dashboard
      borderTop: '2px solid #3498DB', // Orange accent line
      color: '#E2E8F0',
      fontFamily: 'var(--font-mono)',
      padding: '40px 40px 20px',
      marginTop: 'auto', // Pushes the footer to the bottom of the flex container
      fontSize: '12px',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '40px',
        marginBottom: '40px'
      }}>
        {/* Column 1 */}
        <div>
          <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 'bold', marginBottom: '16px' }}>
            About Space Weather Hub
          </h3>
          <p style={{ lineHeight: '1.6', color: 'rgba(255,255,255,0.6)', textAlign: 'justify' }}>
            Space Weather Hub is a comprehensive dashboard providing near real-time data about Astronomy, Space Weather, aurora, and related subjects. Our mission is to promote scientific awareness of space environment events onto the worldwide web.
          </p>
        </div>

        {/* Column 2 */}
        <div>
          <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 'bold', marginBottom: '16px' }}>
            Our Data Sources
          </h3>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.8' }}>
            <li>
              <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noreferrer" style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#3498DB'} onMouseLeave={e => e.currentTarget.style.color = '#ffffff'}>
                NOAA SWPC
              </a>
            </li>
            <li>
              <Link to="/ace" style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#3498DB'} onMouseLeave={e => e.currentTarget.style.color = '#ffffff'}>
                DSCOVR / ACE Satellite
              </Link>
            </li>
            <li>
              <Link to="/goes" style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#3498DB'} onMouseLeave={e => e.currentTarget.style.color = '#ffffff'}>
                GOES Network
              </Link>
            </li>
            <li>
              <Link to="/cosmic" style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#3498DB'} onMouseLeave={e => e.currentTarget.style.color = '#ffffff'}>
                Cosmic Ray Stations
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3 */}
        <div>
          <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 'bold', marginBottom: '16px' }}>
            About
          </h3>
          <p style={{ lineHeight: '1.6', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
            SpaceWeatherHub is a near-live platform where you can follow space weather from the Sun to Earth and know exactly when you can see aurora.
          </p>
          <Link to="/about" style={{ 
            display: 'inline-block',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.8)',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '4px',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          >
            More info...
          </Link>
        </div>
      </div>

      {/* Copyright & Disclaimer */}
      <div style={{
        textAlign: 'center',
        paddingTop: '20px',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div>
          <span style={{ color: '#ffffff' }}>Copyright © 2024-2026 Space Weather Hub</span> © All rights reserved - Developed by your team
        </div>
        <div>
          <Link to="#" style={{ color: '#3b82f6', textDecoration: 'none' }} 
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >Disclaimer</Link>
          <span style={{ margin: '0 8px' }}>-</span>
          <Link to="#" style={{ color: '#3b82f6', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}