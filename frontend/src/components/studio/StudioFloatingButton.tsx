// frontend/src/components/studio/StudioFloatingButton.tsx
import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Sparkles } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { prefetchRoute } from '../../utils/routePrefetch'

const STORAGE_KEY = 'space_weather_custom_studio_state_v2'

export default function StudioFloatingButton() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const location = useLocation()
  const isStudioPage = location.pathname === '/custom-studio'

  const [cardCount, setCardCount] = useState<number>(4)

  // Listen to localStorage updates to display dynamic count of active cards
  useEffect(() => {
    const updateCount = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed.cards)) {
            setCardCount(parsed.cards.length)
          }
        }
      } catch (e) {}
    }

    updateCount()
    const interval = setInterval(updateCount, 2000)
    return () => clearInterval(interval)
  }, [])

  // Do not render floating button on the Studio page itself to keep it ultra clean
  if (isStudioPage) return null

  return (
    <Link
      to="/custom-studio"
      title="Open Custom Multi-Chart Studio"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 990,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 30,
        background: isLight
          ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.95) 0%, rgba(14, 165, 233, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(14, 165, 233, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)',
        color: '#FFFFFF',
        textDecoration: 'none',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: isLight
          ? '0 8px 24px rgba(2, 132, 199, 0.35), 0 2px 6px rgba(0, 0, 0, 0.1)'
          : '0 8px 30px rgba(14, 165, 233, 0.45), 0 0 20px rgba(99, 102, 241, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'var(--font-mono), monospace',
      }}
      onMouseEnter={e => {
        prefetchRoute('/custom-studio')
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'
        e.currentTarget.style.boxShadow = isLight
          ? '0 12px 30px rgba(2, 132, 199, 0.45)'
          : '0 12px 36px rgba(14, 165, 233, 0.6), 0 0 25px rgba(99, 102, 241, 0.5)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = isLight
          ? '0 8px 24px rgba(2, 132, 199, 0.35)'
          : '0 8px 30px rgba(14, 165, 233, 0.45), 0 0 20px rgba(99, 102, 241, 0.3)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <BarChart3 size={18} />
        <span
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 6px #22C55E',
          }}
        />
      </div>

      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>
        Custom Studio
      </span>

      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          background: 'rgba(255, 255, 255, 0.25)',
          padding: '2px 7px',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        {cardCount}
      </span>
    </Link>
  )
}
