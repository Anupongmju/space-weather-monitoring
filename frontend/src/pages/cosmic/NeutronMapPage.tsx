import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import NeutronWorldMap from '../../components/cosmic/NeutronWorldMap'
import StationDetailDrawer from '../../components/cosmic/StationDetailDrawer'
import { NeutronStation } from '../../services/neutronStationsData'

export default function NeutronMapPage() {
  const navigate = useNavigate()
  const [selectedStation, setSelectedStation] = useState<NeutronStation | null>(null)

  const handleSelectStation = (station: NeutronStation) => {
    setSelectedStation(prev => (prev?.id === station.id ? null : station))
  }

  const handleNavigateToTelemetry = (stationId: string) => {
    navigate(`/cosmic/neutron?station=${encodeURIComponent(stationId)}`, {
      state: { targetStation: stationId }
    })
  }

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: 'calc(100vh - 60px)',
      overflow: 'hidden',
      background: '#020617'
    }}>
      {/* ── TOP ACTION BAR OVERLAY ── */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(6, 13, 31, 0.78)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 4,
        padding: '5px 10px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        transition: 'all 0.2s ease'
      }}>
        <button
          onClick={() => {
            if (selectedStation) {
              handleNavigateToTelemetry(selectedStation.id)
            } else {
              navigate('/cosmic/neutron')
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#CBD5E1',
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 3,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
          onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
        >
          <BarChart3 size={13} color="#C084FC" />
          <span>MULTI-STATION TELEMETRY PLOT</span>
        </button>
      </div>

      {/* ── FULLSCREEN 2D MAP ── */}
      <NeutronWorldMap
        onSelectStation={handleSelectStation}
        selectedStation={selectedStation}
      />

      {/* ── STATION DETAIL DRAWER (SLIDES IN WHEN CLICKED) ── */}
      <StationDetailDrawer
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
        onNavigateToFullTelemetry={handleNavigateToTelemetry}
      />
    </div>
  )
}
