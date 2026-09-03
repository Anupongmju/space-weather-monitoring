import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Zap, RadioTower, Waves, Magnet, Wind, ArrowRight, Sun } from 'lucide-react'
import { fetchAllGOES } from '../../services/goesService'
import StatusBadge from '../../components/ui/StatusBadge'
import { useTheme } from '../../context/ThemeContext'

const cards = [
  { path: '/goes/xray', icon: Zap, color: '#3498DB', label: 'X-RAY FLUX', sub: '1–8 Å & 0.5–4 Å', desc: 'Solar X-ray flux for flare classification A/B/C/M/X' },
  { path: '/goes/proton', icon: RadioTower, color: '#3b82f6', label: 'PROTON FLUX', sub: 'Integral proton flux', desc: 'Multi-energy band proton flux >1, >5, >10, >50, >100 MeV' },
  { path: '/goes/electron', icon: Waves, color: '#a855f7', label: 'ELECTRON FLUX', sub: 'Integral electron flux', desc: '>0.8 MeV and >2 MeV relativistic electrons' },
  { path: '/goes/mag', icon: Magnet, color: '#22c55e', label: 'MAGNETIC FLUX', sub: 'Geosynchronous magnetic field Hp, He, Hn, Ht components' },
  { path: '/goes/wind', icon: Wind, color: '#f59e0b', label: 'SOLAR WIND', sub: 'Solar wind density, bulk speed, temperature at GEO orbit' },
  { path: '/goes/suvi', icon: Sun, color: '#38bdf8', label: 'SUVI IMAGERY', sub: 'Solar Ultraviolet Imager', desc: 'Extreme ultraviolet solar corona in 6 wavelengths: 94, 131, 171, 195, 284, 304 Å' },
]

export default function GoesIndex() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [btnHover, setBtnHover] = useState(false)

  const handleFetchAll = async () => {
    setLoading(true); setStatus(null)
    try {
      await fetchAllGOES()
      setStatus({ ok: true, msg: 'All GOES data fetched and saved successfully' })
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        marginBottom: 28, padding: '28px 28px 24px',
        background: isLight ? '#FFFFFF' : 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
        border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(59,130,246,0.2)',
        boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.05)' : undefined,
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>🌍</span>
            <h1 style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 26,
              fontWeight: 900,
              color: isLight ? '#0C1E35' : '#F8F8FF',
              margin: 0
            }}>
              GOES <span style={{ color: isLight ? '#1A6DB5' : '#3B82F6' }}>SATELLITE</span>
            </h1>
          </div>
          <p style={{ color: isLight ? '#475569' : '#A0A0B8', fontSize: 13, fontFamily: 'var(--font-mono)', margin: 0 }}>
            Geostationary Operational Environmental Satellite · NOAA / SWPC
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <StatusBadge status="normal" label="Online" />
          <button
            onClick={handleFetchAll}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            disabled={loading}
            style={{
              padding: '8px 18px',
              background: btnHover ? (isLight ? '#1A6DB5' : 'rgba(59,130,246,0.25)') : (isLight ? '#F0F9FF' : 'rgba(59,130,246,0.12)'),
              border: isLight ? '1px solid #BAE6FD' : '1px solid rgba(59,130,246,0.5)',
              borderRadius: 8,
              color: btnHover && isLight ? '#FFFFFF' : (isLight ? '#0284C7' : '#3B82F6'),
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Fetching...' : '⬇ Fetch All GOES Data'}
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: status.ok ? (isLight ? '#F0FDF4' : 'rgba(34,197,94,0.08)') : (isLight ? '#FEF2F2' : 'rgba(239,68,68,0.08)'),
          border: `1px solid ${status.ok ? (isLight ? '#BBF7D0' : 'rgba(34,197,94,0.3)') : (isLight ? '#FECACA' : 'rgba(239,68,68,0.3)')}`,
          borderRadius: 8,
          color: status.ok ? (isLight ? '#166534' : '#22C55E') : (isLight ? '#991B1B' : '#EF4444'),
          fontFamily: 'var(--font-mono)', fontSize: 13,
        }}>
          {status.ok ? '✓' : '✗'} {status.msg}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {cards.map(card => {
          const Icon = card.icon
          const isHov = hovered === card.path
          return (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              onMouseEnter={() => setHovered(card.path)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isLight
                  ? (isHov ? '#F8FAFC' : '#FFFFFF')
                  : (isHov ? '#1C1C28' : '#16161F'),
                border: `1px solid ${isHov
                  ? card.color + (isLight ? '88' : '55')
                  : (isLight ? 'rgba(26, 109, 181, 0.15)' : 'rgba(52,152,219,0.15)')}`,
                borderRadius: 12, padding: 22,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isLight
                  ? (isHov ? `0 8px 24px rgba(0,0,0,0.08)` : '0 2px 10px rgba(0,0,0,0.04)')
                  : (isHov ? `0 0 20px ${card.color}18` : '0 4px 24px rgba(0,0,0,0.4)'),
                transform: isHov ? 'translateY(-2px)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: card.color + (isLight ? '18' : '18'),
                  border: `1px solid ${card.color + (isLight ? '44' : '33')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={22} color={card.color} />
                </div>
                <ArrowRight size={18} color={isHov ? card.color : (isLight ? '#94A3B8' : '#606075')} style={{ transition: 'all 0.2s' }} />
              </div>
              <div style={{
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 14,
                fontWeight: 800,
                color: card.color,
                marginBottom: 4,
                letterSpacing: 0.3
              }}>
                {card.label}
              </div>
              <div style={{ fontSize: 13, color: isLight ? '#475569' : '#A0A0B8', marginBottom: 8, fontWeight: 700 }}>
                {card.sub}
              </div>
              <div style={{ fontSize: 13, color: isLight ? '#64748B' : '#606075', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                {card.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}