import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NeutronWorldMap, { RigidityFilter, MapDisplayMode } from '../../components/cosmic/NeutronWorldMap'
import StationDetailDrawer from '../../components/cosmic/StationDetailDrawer'
import { NeutronStation, NEUTRON_STATIONS, GLEAveragingWindow } from '../../services/neutronStationsData'

export default function NeutronMapPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedStation, setSelectedStation] = useState<NeutronStation | null>(null)
  const [rigidityFilter, setRigidityFilter] = useState<RigidityFilter>('all')
  const [mapMode, setMapMode] = useState<MapDisplayMode>('gle77')
  const [averagingWindow, setAveragingWindow] = useState<GLEAveragingWindow>(30)

  const handleSelectStation = (station: NeutronStation) => {
    setSelectedStation(prev => (prev?.id === station.id ? null : station))
  }

  const handleNavigateToTelemetry = (stationId: string) => {
    navigate(`/cosmic/neutron?station=${encodeURIComponent(stationId)}`, {
      state: { targetStation: stationId }
    })
  }

  const activeCount = NEUTRON_STATIONS.filter(s => s.status === 'active').length
  const totalCount = NEUTRON_STATIONS.length

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: 'calc(100vh - 60px)',
      overflow: 'hidden',
      background: '#020617',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* ── EXTERNAL HEADER DECK (OUTSIDE THE MAP) ── */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(5, 10, 24, 0.98)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
      }}>
        {/* ROW 1: TITLE BADGE, MODE SWITCHER & RIGIDITY FILTER CHIPS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          gap: 16,
          flexWrap: 'wrap'
        }}>
          {/* Left: Global Neutron Stations Title & Live Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 13.5,
              fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: 1
            }}>
              {t('cosmic.map_title').toUpperCase()}
            </span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ADE80',
              padding: '2px 8px',
              borderRadius: 3,
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
              {activeCount} {t('common.live')} / {totalCount} TOTAL
            </span>

            {/* Mode Switcher: Cutoff Rc vs GLE#77 Event (% Increase) */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(3, 7, 18, 0.85)',
              padding: '2px',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.14)',
              marginLeft: 4
            }}>
              <button
                onClick={() => setMapMode('gle77')}
                style={{
                  padding: '4px 10px',
                  background: mapMode === 'gle77' ? 'rgba(250, 204, 21, 0.22)' : 'transparent',
                  border: `1px solid ${mapMode === 'gle77' ? '#FACC15' : 'transparent'}`,
                  color: mapMode === 'gle77' ? '#FEF08A' : '#94A3B8',
                  fontFamily: 'monospace',
                  fontSize: 11.5,
                  fontWeight: mapMode === 'gle77' ? 800 : 500,
                  borderRadius: 3,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s'
                }}
              >
                <span>🟡</span>
                {t('cosmic.mode_gle77')}
              </button>
              <button
                onClick={() => setMapMode('rigidity')}
                style={{
                  padding: '4px 10px',
                  background: mapMode === 'rigidity' ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                  border: `1px solid ${mapMode === 'rigidity' ? '#38BDF8' : 'transparent'}`,
                  color: mapMode === 'rigidity' ? '#E0F2FE' : '#94A3B8',
                  fontFamily: 'monospace',
                  fontSize: 11.5,
                  fontWeight: mapMode === 'rigidity' ? 800 : 500,
                  borderRadius: 3,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s'
                }}
              >
                <span>🌐</span>
                {t('cosmic.mode_rigidity')}
              </button>
            </div>

            {/* Averaging Window Selector (10m, 20m, 30m, 40m) */}
            {mapMode === 'gle77' && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(250, 204, 21, 0.08)',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                borderRadius: 4,
                padding: '2px 5px',
                marginLeft: 4
              }}>
                <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#FACC15', fontWeight: 800, paddingLeft: 4, paddingRight: 2 }}>
                  {t('cosmic.avg_label')}
                </span>
                {([10, 20, 30] as GLEAveragingWindow[]).map(win => {
                  const isSelected = averagingWindow === win
                  return (
                    <button
                      key={win}
                      onClick={() => setAveragingWindow(win)}
                      title={`Calculate peak increase using ${win}-minute rolling average`}
                      style={{
                        padding: '2px 9px',
                        background: isSelected ? 'rgba(250, 204, 21, 0.35)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected ? '1px solid #FACC15' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 3,
                        color: isSelected ? '#FEF08A' : '#CBD5E1',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        fontWeight: isSelected ? 800 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {win} {t('cosmic.min')}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Rigidity Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: t('cosmic.filter_all'), color: '#38BDF8' },
              { id: 'polar', label: t('cosmic.filter_polar'), color: '#EF4444' },
              { id: 'mid', label: t('cosmic.filter_mid'), color: '#EAB308' },
              { id: 'equatorial', label: t('cosmic.filter_equatorial'), color: '#A855F7' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setRigidityFilter(f.id as RigidityFilter)}
                style={{
                  padding: '4px 10px',
                  background: rigidityFilter === f.id ? `${f.color}35` : 'rgba(6, 13, 31, 0.78)',
                  border: `1px solid ${rigidityFilter === f.id ? f.color : 'rgba(255, 255, 255, 0.14)'}`,
                  color: rigidityFilter === f.id ? '#FFFFFF' : '#CBD5E1',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: rigidityFilter === f.id ? 700 : 500,
                  cursor: 'pointer',
                  borderRadius: 3,
                  transition: 'all 0.15s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ROW 2: ADAPTIVE LEGEND (GLE#77 % INCREASE OR CUTOFF RC) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          background: 'rgba(3, 7, 18, 0.6)'
        }}>
          {mapMode === 'gle77' ? (
            /* GLE#77 % Increase Legend */
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <span style={{
                fontSize: 11.5,
                fontFamily: 'monospace',
                color: '#FACC15',
                fontWeight: 800,
                letterSpacing: 0.8,
                whiteSpace: 'nowrap'
              }}>
                GLE#77 ({averagingWindow}-{t('cosmic.min').toUpperCase()} {t('cosmic.event_peak')} %):
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
                {[
                  {
                    label: t('cosmic.legend_gle_vhigh'),
                    desc: 'South Pole, Sanae IV, Mawson, Nain, Newark, Oulu...',
                    color: '#FACC15',
                    borderColor: '#713F12',
                    size: 14
                  },
                  {
                    label: t('cosmic.legend_gle_mod'),
                    desc: 'Calgary, Fort Smith, Inuvik, Kerguelen, Jang Bogo, Thule...',
                    color: '#FB923C',
                    borderColor: '#7C2D12',
                    size: 11
                  },
                  {
                    label: t('cosmic.legend_gle_low'),
                    desc: 'Irkutsk, Kiel, Dourbes, Lomnicky Stit, Rome, Mexico City...',
                    color: '#EF4444',
                    borderColor: '#450A0A',
                    size: 9
                  },
                  {
                    label: t('cosmic.legend_gle_none'),
                    desc: 'Doi Inthanon, Tibet, Chacaltaya, Hermanus, Tsumeb (Cutoff Exceeded)',
                    color: '#090D16',
                    borderColor: '#FFFFFF',
                    size: 6
                  },
                  {
                    label: `🧲 ${t('cosmic.legend_equator')}`,
                    color: '#F97316',
                    isLine: true
                  }
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }} title={item.desc}>
                    {item.isLine ? (
                      <span style={{ width: 14, height: 2, background: item.color, borderTop: '1px dashed #F97316', boxShadow: `0 0 6px ${item.color}` }} />
                    ) : (
                      <span style={{
                        width: item.size,
                        height: item.size,
                        borderRadius: '50%',
                        background: item.color,
                        border: `1.5px solid ${item.borderColor}`,
                        boxShadow: item.color === '#090D16' ? 'none' : `0 0 6px ${item.color}`,
                        display: 'inline-block'
                      }} />
                    )}
                    <span style={{
                      color: item.isLine ? '#FDBA74' : '#E2E8F0',
                      fontSize: 11.5,
                      fontFamily: 'monospace',
                      fontWeight: 700
                    }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Cutoff Rigidity Chips */
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <span style={{
                fontSize: 11.5,
                fontFamily: 'monospace',
                color: '#94A3B8',
                fontWeight: 700,
                letterSpacing: 0.8,
                whiteSpace: 'nowrap'
              }}>
                VERTICAL {t('cosmic.cutoff_rc').toUpperCase()} (Rc):
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
                {[
                  { label: `< 1 GV (${t('cosmic.filter_polar')})`, color: '#EF4444' },
                  { label: '1 - 3 GV', color: '#F97316' },
                  { label: '3 - 5 GV', color: '#EAB308' },
                  { label: '5 - 8 GV', color: '#22C55E' },
                  { label: '8 - 12 GV', color: '#06B6D4' },
                  { label: '12 - 15 GV', color: '#3B82F6' },
                  { label: `> 15 GV (${t('cosmic.legend_max')})`, color: '#A855F7' },
                  { label: t('cosmic.legend_offline'), color: '#64748B' },
                  { label: `🧲 ${t('cosmic.legend_equator')}`, color: '#F97316', isLine: true }
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                    {item.isLine ? (
                      <span style={{ width: 14, height: 2, background: item.color, borderTop: '1px dashed #F97316', boxShadow: `0 0 6px ${item.color}` }} />
                    ) : (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                    )}
                    <span style={{
                      color: item.isLine ? '#FDBA74' : '#CBD5E1',
                      fontSize: 11.5,
                      fontFamily: 'monospace',
                      fontWeight: item.isLine ? 700 : 500
                    }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Info: Live Network Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: mapMode === 'gle77' ? '#FACC15' : '#64748B',
              letterSpacing: 0.5,
              fontWeight: mapMode === 'gle77' ? 700 : 400
            }}>
              {mapMode === 'gle77' ? 'GLE#77 EVENT DATA · MAY 2024' : 'NMDB GLOBAL NETWORK · REAL-TIME'}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAP CONTAINER (Takes full remaining space) ── */}
      <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
        <NeutronWorldMap
          onSelectStation={handleSelectStation}
          selectedStation={selectedStation}
          rigidityFilter={rigidityFilter}
          mapMode={mapMode}
          averagingWindow={averagingWindow}
          onAveragingWindowChange={setAveragingWindow}
        />
      </div>

      {/* ── STATION DETAIL DRAWER (SLIDES IN WHEN CLICKED) ── */}
      <StationDetailDrawer
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
        onNavigateToFullTelemetry={handleNavigateToTelemetry}
      />
    </div>
  )
}
