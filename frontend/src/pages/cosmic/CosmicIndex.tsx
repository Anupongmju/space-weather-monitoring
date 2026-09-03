import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Atom, ArrowRight, Map, Compass, RefreshCw } from 'lucide-react'
import { fetchAllCosmic } from '../../services/cosmicService'
import StatusBadge from '../../components/ui/StatusBadge'
import { useTheme } from '../../context/ThemeContext'

const STATIONS = [
  { id: 'PSNM',  label: 'Doi Inthanon', country: 'Thailand',    lat: '18.59°N', lon: '98.49°E', rc: '16.8 GV' },
  { id: 'OULU',  label: 'Oulu',         country: 'Finland',     lat: '65.05°N', lon: '25.47°E', rc: '0.81 GV' },
  { id: 'SOPO',  label: 'South Pole',   country: 'Antarctica',  lat: '90.00°S', lon: '0.00°E',  rc: '0.05 GV' },
  { id: 'JUNG1', label: 'Jungfraujoch', country: 'Switzerland', lat: '46.55°N', lon: '7.98°E',  rc: '4.49 GV' },
  { id: 'THUL',  label: 'Thule',        country: 'Greenland',   lat: '76.60°N', lon: '68.70°W', rc: '0.30 GV' },
  { id: 'KIEL2', label: 'Kiel',         country: 'Germany',     lat: '54.33°N', lon: '10.13°E', rc: '2.36 GV' },
  { id: 'MOSC',  label: 'Moscow',       country: 'Russia',      lat: '55.47°N', lon: '37.32°E', rc: '2.43 GV' },
  { id: 'MWSN',  label: 'Mawson',       country: 'Antarctica',  lat: '67.60°S', lon: '62.88°E', rc: '0.22 GV' },
]

export default function CosmicIndex() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const handleFetchAll = async () => {
    setLoading(true)
    setStatus(null)
    try {
      await fetchAllCosmic()
      setStatus({ ok: true, msg: 'Cosmic ray telemetry fetched and synced successfully.' })
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message || 'Fetch failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        marginBottom: 28, padding: '24px 28px',
        background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
        border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.04)' : undefined
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 24, fontWeight: 700,
              color: isLight ? '#0F172A' : '#F8FAFC', margin: 0
            }}>
              COSMIC <span style={{ color: isLight ? '#7C3AED' : '#C084FC' }}>RAY OBSERVATIONS</span>
            </h1>
          </div>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '4px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Neutron Monitor Database (NMDB) · Global Terrestrial Secondary Neutron Network
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StatusBadge status="normal" label="NMDB LIVE" />
          <button
            onClick={handleFetchAll}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px',
              background: isLight ? '#7C3AED' : '#C084FC',
              border: 'none',
              borderRadius: 6,
              color: '#FFFFFF',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: isLight ? '0 2px 6px rgba(124, 58, 237, 0.25)' : undefined
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'FETCHING ALL...' : 'FETCH ALL COSMIC DATA'}</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {status && (
        <div style={{
          marginBottom: 20, padding: '12px 18px',
          background: status.ok ? (isLight ? '#DCFCE7' : 'rgba(34,197,94,0.1)') : (isLight ? '#FEE2E2' : 'rgba(239,68,68,0.1)'),
          border: `1px solid ${status.ok ? (isLight ? '#BBF7D0' : 'rgba(34,197,94,0.3)') : (isLight ? '#FECACA' : 'rgba(239,68,68,0.3)')}`,
          borderRadius: 6,
          color: status.ok ? (isLight ? '#166534' : '#4ADE80') : (isLight ? '#991B1B' : '#F87171'),
          fontFamily: 'var(--font-mono)', fontSize: 14,
        }}>
          {status.ok ? '✓' : '✗'} {status.msg}
        </div>
      )}

      {/* Primary Navigation Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
        marginBottom: 28
      }}>
        {/* Global Earth Map Card */}
        <div
          onClick={() => navigate('/cosmic/map')}
          style={{
            padding: '24px',
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.2)'}`,
            borderLeft: `4px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = isLight ? '0 12px 30px rgba(0,0,0,0.08)' : '0 10px 25px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: isLight ? '#E0F2FE' : 'rgba(56,189,248,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isLight ? '#0284C7' : '#38BDF8'
            }}>
              <Map size={22} />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 14, fontWeight: 700, color: isLight ? '#0284C7' : '#38BDF8' }}>
                GLOBAL EARTH MAP
              </div>
              <div style={{ fontSize: 13, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Interactive 3D Globe & Flat Earth station telemetry
              </div>
            </div>
          </div>
          <ArrowRight size={18} color={isLight ? '#0284C7' : '#38BDF8'} />
        </div>

        {/* Multi-Station Telemetry Card */}
        <div
          onClick={() => navigate('/cosmic/neutron')}
          style={{
            padding: '24px',
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.25)' : 'rgba(168, 85, 247, 0.2)'}`,
            borderLeft: `4px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = isLight ? '0 12px 30px rgba(0,0,0,0.08)' : '0 10px 25px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: isLight ? '#F5F3FF' : 'rgba(168,85,247,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isLight ? '#7C3AED' : '#C084FC'
            }}>
              <Atom size={22} />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 14, fontWeight: 700, color: isLight ? '#7C3AED' : '#C084FC' }}>
                NEUTRON MONITOR
              </div>
              <div style={{ fontSize: 13, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Real-time count rate · % Variation multi-station plot
              </div>
            </div>
          </div>
          <ArrowRight size={18} color={isLight ? '#7C3AED' : '#C084FC'} />
        </div>

        {/* Mawson Antarctic Station Card */}
        <div
          onClick={() => navigate('/cosmic/maw')}
          style={{
            padding: '24px',
            background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${isLight ? 'rgba(217, 119, 6, 0.25)' : 'rgba(245, 158, 11, 0.2)'}`,
            borderLeft: `4px solid ${isLight ? '#D97706' : '#F59E0B'}`,
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s',
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = isLight ? '0 12px 30px rgba(0,0,0,0.08)' : '0 10px 25px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = isLight ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: isLight ? '#FFFBEB' : 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isLight ? '#D97706' : '#F59E0B'
            }}>
              <Compass size={22} />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', var(--font-sans), monospace", fontSize: 14, fontWeight: 700, color: isLight ? '#D97706' : '#F59E0B' }}>
                MAWSON OBSERVATORY
              </div>
              <div style={{ fontSize: 13, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Antarctic station · Counts, Pressure & Tube telemetry
              </div>
            </div>
          </div>
          <ArrowRight size={18} color={isLight ? '#D97706' : '#F59E0B'} />
        </div>
      </div>

      {/* Featured Monitoring Stations Grid */}
      <div style={{
        padding: '24px',
        background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
        border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 8,
        boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 16,
            fontWeight: 700,
            color: isLight ? '#0F172A' : '#F8FAFC',
            margin: 0,
            letterSpacing: 0.5
          }}>
            FEATURED GLOBAL MONITORING STATIONS
          </h2>
          <span style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
            Select any station to open telemetry plot
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {STATIONS.map(st => {
            const isHov = hovered === st.id
            return (
              <div
                key={st.id}
                onClick={() => navigate(`/cosmic/neutron?station=${st.id}`)}
                onMouseEnter={() => setHovered(st.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHov
                    ? (isLight ? '#F5F3FF' : 'rgba(124, 58, 237, 0.15)')
                    : (isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)'),
                  border: `1px solid ${isHov ? (isLight ? '#C084FC' : '#A855F7') : (isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)')}`,
                  borderRadius: 6,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isHov ? '0 4px 12px rgba(124, 58, 237, 0.15)' : undefined
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{
                      fontFamily: "'Orbitron', var(--font-sans), monospace",
                      fontSize: 14,
                      fontWeight: 700,
                      color: isHov ? (isLight ? '#7C3AED' : '#C084FC') : (isLight ? '#0F172A' : '#F8FAFC'),
                      marginBottom: 4
                    }}>
                      {st.label} ({st.id})
                    </div>
                    <div style={{ fontSize: 13, color: isLight ? '#475569' : '#CBD5E1', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
                      {st.country}
                    </div>
                    <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      {st.lat} · {st.lon}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: isLight ? '#7C3AED' : '#C084FC',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      marginTop: 4
                    }}>
                      Cutoff Rigidity: {st.rc}
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    color={isHov ? (isLight ? '#7C3AED' : '#C084FC') : (isLight ? '#94A3B8' : '#64748B')}
                    style={{ transition: 'all 0.2s', marginTop: 2 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}