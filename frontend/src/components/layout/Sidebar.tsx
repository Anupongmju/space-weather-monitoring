import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'

const navItems = [
  { label: 'DASHBOARD', path: '/' },
  {
    label: 'ACE', prefix: '/ace', tag: 'SAT-A',
    children: [
      { label: 'OVERVIEW',  path: '/ace' },
      { label: 'SWEPAM',   path: '/ace/swepam' },
      { label: 'MAG',      path: '/ace/mag' },
      { label: 'EPAM',     path: '/ace/epam' },
      { label: 'SIS',      path: '/ace/sis' },
      // { label: 'SWICS',    path: '/ace/swics' },
    ]
  },
  {
    label: 'GOES', prefix: '/goes', tag: 'SAT-G',
    children: [
      { label: 'OVERVIEW',       path: '/goes' },
      { label: 'X-RAY FLUX',     path: '/goes/xray' },
      { label: 'PROTON FLUX',    path: '/goes/proton' },
      { label: 'ELECTRON FLUX',  path: '/goes/electron' },
      { label: 'MAGNETIC FIELD', path: '/goes/mag' },
      { label: 'SOLAR WIND',     path: '/goes/wind' },
    ]
  },
  {
    label: 'COSMIC RAY', prefix: '/cosmic', tag: 'GND-N',
    children: [
      { label: 'OVERVIEW',        path: '/cosmic' },
      { label: 'NEUTRON MONITOR', path: '/cosmic/neutron' },
      { label:'MAW OVERVIEW' ,    path:'/cosmic/maw'},
      { label:"MAW COUNTS",       path:"/cosmic/maw/counts"},
      { label:'MAW PRESSURE',     path:'/cosmic/maw/pressure'},
      { label:'MAW TUBES',        path:'/cosmic/maw/tubes'},
      { label:'MAW SCATTER',        path:'/cosmic/maw/scatter'}

    ]
  },
]

const EXPANDED_W = '240px'
const COLLAPSED_W = '56px'

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const [open, setOpen] = useState({ ACE: true, GOES: false, 'COSMIC RAY': false })
  const toggle = (k) => setOpen(p => ({ ...p, [k]: !p[k] }))

  const isCollapsed = collapsed

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0,
      width: isCollapsed ? COLLAPSED_W : EXPANDED_W,
      height: '100vh',
      background: 'var(--bg)',
      borderRight: '3px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, overflowY: 'auto', overflowX: 'hidden',
      transition: 'width 0.25s ease',
      fontFamily: 'var(--font-mono)',
    }}>

      {/* Logo */}
      <div style={{
        padding: isCollapsed ? '20px 0' : '20px 20px 16px',
        borderBottom: '3px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        minHeight: 64,
        transition: 'padding 0.25s',
      }}>
        {!isCollapsed && (
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 4 }}>
              NARIT · MONITOR
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, lineHeight: 1.2 }}>
              SPACE<br />
              <span style={{ color: 'var(--accent)' }}>WEATHER</span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <span style={{ fontSize: 18, color: 'var(--accent)' }}>☀</span>
        )}

        <button
          onClick={onToggle}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center',
            borderRadius: 4, transition: 'color 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {navItems.map(item => {

          // Single item (Dashboard)
          if (!item.children) {
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                title={isCollapsed ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: 10, padding: isCollapsed ? '10px 0' : '9px 20px',
                  fontSize: 10, letterSpacing: 2,
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  transition: 'all 0.15s', textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 14 }}>⊟</span>
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            )
          }

          const isGroupOpen = open[item.label]
          const isGroupActive = location.pathname.startsWith(item.prefix)

          return (
            <div key={item.label}>

              {/* Group header */}
              <button
                onClick={() => {
                  if (isCollapsed) onToggle()
                  else toggle(item.label)
                }}
                title={isCollapsed ? item.label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'space-between',
                  padding: isCollapsed ? '10px 0' : '9px 20px',
                  background: 'none', border: 'none',
                  borderLeft: `2px solid ${isGroupActive ? 'var(--accent)' : 'transparent'}`,
                  color: isGroupActive ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 10, letterSpacing: 2,
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font-mono)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = isGroupActive ? 'var(--text)' : 'var(--text-muted)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isCollapsed ? (
                    <span style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1 }}>
                      {item.tag}
                    </span>
                  ) : (
                    <>
                      <span style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1, minWidth: 36 }}>
                        {item.tag}
                      </span>
                      <span>{item.label}</span>
                    </>
                  )}
                </div>
                {!isCollapsed && (
                  isGroupOpen
                    ? <ChevronDown size={11} />
                    : <ChevronRight size={11} />
                )}
              </button>

              {/* Children */}
              {isGroupOpen && !isCollapsed && (
                <div style={{
                  borderBottom: '2px solid var(--border)',
                  paddingBottom: 4, marginBottom: 4,
                }}>
                  {item.children.map(child => {
                    const isActive = location.pathname === child.path
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end={child.path === item.prefix}
                        style={{
                          display: 'block',
                          padding: '7px 20px 7px 52px',
                          fontSize: 10, letterSpacing: 1,
                          color: isActive ? 'var(--accent)' : '#444',
                          borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                          background: isActive ? 'rgba(52,152,219,0.08)' : 'transparent',
                          transition: 'all 0.15s', textDecoration: 'none',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#444' }}
                      >
                        {child.label}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{
        padding: isCollapsed ? '16px 0' : '14px 20px',
        borderTop: '2px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: 8, transition: 'padding 0.25s',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#4caf50', boxShadow: '0 0 6px #4caf50',
          flexShrink: 0,
        }} />
        {!isCollapsed && (
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2 }}>
            BACKEND ONLINE
          </span>
        )}
      </div>
    </aside>
  )
}