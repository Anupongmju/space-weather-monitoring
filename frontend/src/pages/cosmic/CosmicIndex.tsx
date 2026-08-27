import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Atom, ArrowRight, Map } from 'lucide-react'
import { fetchAllCosmic } from '../../services/cosmicService'
import StatusBadge from '../../components/ui/StatusBadge'

const STATIONS = [
  { id: 'OULU',  label: 'Oulu',         country: 'Finland',     lat: '65.05°N', lon: '25.47°E' },
  { id: 'KIEL2', label: 'Kiel',         country: 'Germany',     lat: '54.33°N', lon: '10.13°E' },
  { id: 'JUNG1', label: 'Jungfraujoch', country: 'Switzerland', lat: '46.55°N', lon: '7.98°E'  },
  { id: 'THUL',  label: 'Thule',        country: 'Greenland',   lat: '76.60°N', lon: '68.70°W' },
  { id: 'PSNM',  label: 'Doi Inthanon', country: 'Thailand',    lat: '18.59°N', lon: '98.49°E' },
]
export default function CosmicIndex(){
  const navigate = useNavigate()
  const [loading,setLoading] =useState(false)
  const [status,setStatus] =useState(null)
  const [hovered,setHovered] =useState(null)
  const [btnHover,setBtnHover] =useState(false)

  const handleFetchAll =async () =>{
    setLoading(true); setStatus(null)
    try{
      await fetchAllCosmic()
      setStatus({ok:true ,msg:'Cosmic ray data fetched and saved successfully '})
    } catch (e) {
      setStatus({ok:false,msg:e.message})
    }finally {setLoading(false)}
  }
  return(
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        marginBottom: 28, padding: '28px 28px 24px',
        background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(168,85,247,0.02))',
        border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>⚛</span>
            <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: '#F8F8FF', margin: 0 }}>
              COSMIC <span style={{ color: '#A855F7' }}>RAY</span>
            </h1>
          </div>
          <p style={{ color: '#A0A0B8', fontSize: 13, fontFamily: "'Rajdhani', sans-serif", margin: 0 }}>
            Neutron Monitor Database · NMDB Real-time Network
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
              background: btnHover ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.5)',
              borderRadius: 8, color: '#A855F7',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            {loading ? 'Fetching...' : '⬇ Fetch OULU Data'}
          </button>
        </div>
      </div>

      {/* Action Banners Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Global Earth Map Card */}
        <div
          onClick={() => navigate('/cosmic/map')}
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.03))',
            border: '1px solid rgba(56,189,248,0.35)',
            borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(56,189,248,0.18)'
            e.currentTarget.style.borderColor = '#38BDF8'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.03))'
            e.currentTarget.style.borderColor = 'rgba(56,189,248,0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 8,
              background: 'rgba(56,189,248,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Map size={22} color="#38BDF8" />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700, color: '#38BDF8' }}>
                GLOBAL EARTH MAP
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Fullscreen real Earth satellite stations map
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="#38BDF8" />
        </div>

        {/* Multi-Station Telemetry Card */}
        <div
          onClick={() => navigate('/cosmic/neutron')}
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.03))',
            border: '1px solid rgba(168,85,247,0.35)',
            borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(168,85,247,0.18)'
            e.currentTarget.style.borderColor = '#A855F7'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.03))'
            e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 8,
              background: 'rgba(168,85,247,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Atom size={22} color="#A855F7" />
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700, color: '#A855F7' }}>
                NEUTRON MONITOR
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                Real-time count rate · % Variation plots
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="#A855F7" />
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: status.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${status.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 8, color: status.ok ? '#22C55E' : '#EF4444',
          fontFamily: 'var(--font-mono)', fontSize: 12,
        }}>
          {status.ok ? '✓' : '✗'} {status.msg}
        </div>
      )}

      {/* Info box */}
      <div style={{
        marginBottom: 24, padding: '16px 20px',
        background: 'rgba(168,85,247,0.05)',
        border: '1px solid rgba(168,85,247,0.15)',
        borderRadius: 10,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: '#A0A0B8', lineHeight: 1.8,
      }}>
        <span style={{ color: '#A855F7', fontWeight: 700 }}>NMDB</span> — Neutron Monitor Database provides real-time cosmic ray data
        from ground-based neutron monitors worldwide. Count rate variations indicate
        changes in galactic cosmic ray flux, often caused by solar activity (Forbush decreases).
      </div>

      {/* Station cards */}
      <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: '#606075', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>
        Featured Monitoring Stations
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>
        {STATIONS.map(st => {
          const isHov = hovered === st.id
          return (
            <div
              key={st.id}
              onClick={() => navigate(`/cosmic/neutron?station=${st.id}`)}
              onMouseEnter={() => setHovered(st.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? '#1C1C28' : '#16161F',
                border: `1px solid ${isHov ? 'rgba(168,85,247,0.4)' : 'rgba(52,152,219,0.15)'}`,
                borderRadius: 10, padding: '16px 18px',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isHov ? '0 0 20px rgba(168,85,247,0.1)' : '0 4px 24px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700, color: isHov ? '#A855F7' : '#F8F8FF', marginBottom: 4 }}>
                    {st.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#A0A0B8', marginBottom: 8 }}>{st.country}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#606075' }}>
                    {st.lat} · {st.lon}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#A855F7', marginTop: 4 }}>
                    ID: {st.id}
                  </div>
                </div>
                <ArrowRight size={15} color={isHov ? '#A855F7' : '#606075'} style={{ transition: 'all 0.2s', marginTop: 2 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}