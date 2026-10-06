// frontend/src/components/studio/ChartCatalogModal.tsx
import React, { useEffect, useState } from 'react'
import { X, Check, Trash2, Plus, Minus } from 'lucide-react'
import { ChartId, POPULAR_STATIONS } from './studioTypes'
import { useTheme } from '../../context/ThemeContext'

export interface ChartCatalogModalProps {
  isOpen: boolean
  onClose: () => void
  onAddChart: (chartId: ChartId, station?: string) => void
  onRemoveChart?: (chartId: ChartId) => void
  onToggleChart?: (chartId: ChartId, station?: string) => void
  onClearAll?: () => void
  activeChartIds: ChartId[]
}

interface CatalogColumnItem {
  id: ChartId
  label: string
  tag: string
}

interface CatalogColumn {
  section: string
  tag: string
  color: string
  lightColor: string
  info?: string
  items: CatalogColumnItem[]
}

const CATALOG_COLUMNS: CatalogColumn[] = [
  {
    section: 'ACE + SOLAR-1',
    tag: 'L1',
    color: '#38BDF8',
    lightColor: '#0284C7',
    items: [
      { id: 'ace-swepam', label: 'ACE Solar Wind', tag: 'SWEPAM' },
      { id: 'ace-mag', label: 'ACE Magnetic Field', tag: 'MAG' },
      { id: 'ace-sis', label: 'ACE Solar Isotope', tag: 'SIS' },
      { id: 'ace-epam', label: 'ACE Energetic Part...', tag: 'EPAM' },
      { id: 'solar1-plasma', label: 'SOLAR-1 Solar Wind', tag: 'SWiPS' },
      { id: 'solar1-mag', label: 'SOLAR-1 Mag Field', tag: 'MAG' },
      { id: 'solar1-particles', label: 'SOLAR-1 Particles', tag: 'STIS' },
    ],
  },
  {
    section: 'GOES',
    tag: 'GEO',
    color: '#34D399',
    lightColor: '#059669',
    items: [
      { id: 'goes-xray', label: 'GOES X-ray Flux', tag: 'XRS' },
      { id: 'goes-proton', label: 'GOES Proton Flux', tag: 'PRT' },
      { id: 'goes-electron', label: 'GOES Electron Flux', tag: 'ELC' },
      { id: 'goes-mag', label: 'GOES Magnetometer', tag: 'MAG' },
    ],
  },
  {
    section: 'GROUND',
    tag: 'NMDB',
    color: '#C084FC',
    lightColor: '#7C3AED',
    items: [
      { id: 'sunspot-number', label: 'Sunspot Number', tag: 'SSN' },
      { id: 'neutron-monitor', label: 'Neutron Monitor', tag: 'NMDB' },
    ],
  },
  {
    section: 'MOON & DEEP',
    tag: 'LUNAR',
    color: '#FBBF24',
    lightColor: '#D97706',
    info: 'LRO Orbit · STEREO-A Heliocentric',
    items: [
      { id: 'moon-crater', label: 'Moon Radiation (CRaTER)', tag: 'RAD' },
      { id: 'stereo-particles', label: 'STEREO-A Particles', tag: 'SEPT' },
    ],
  },
  {
    section: 'MARS',
    tag: 'PLANETARY',
    color: '#F87171',
    lightColor: '#DC2626',
    info: 'Curiosity Surface · MAVEN Orbit',
    items: [
      { id: 'mars-rad', label: 'Surface RAD (Curiosity)', tag: 'SURFACE' },
      { id: 'mars-maven', label: 'Orbital Particles (MAVEN)', tag: 'ORBIT' },
    ],
  },
]

export default function ChartCatalogModal({
  isOpen,
  onClose,
  onAddChart,
  onRemoveChart,
  onToggleChart,
  onClearAll,
  activeChartIds,
}: ChartCatalogModalProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [selectedStation, setSelectedStation] = useState<string>('OULU')

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleToggle = (chartId: ChartId, station?: string) => {
    const st = chartId === 'neutron-monitor' ? (station || selectedStation) : undefined
    if (onToggleChart) {
      onToggleChart(chartId, st)
    } else {
      const isAlreadyAdded = activeChartIds.includes(chartId)
      if (isAlreadyAdded && onRemoveChart) {
        onRemoveChart(chartId)
      } else {
        onAddChart(chartId, st)
      }
    }
  }

  const uniqueActiveCount = new Set(activeChartIds).size

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1120,
          background: isLight ? '#FFFFFF' : '#080E1E',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(56, 189, 248, 0.28)',
          borderRadius: 12,
          boxShadow: isLight
            ? '0 20px 50px rgba(0, 0, 0, 0.18)'
            : '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isLight ? '#F8FAFC' : 'rgba(15, 23, 42, 0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: isLight ? '#0F172A' : '#F8FAFC',
              }}
            >
              CHART CATALOG
            </span>

            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                background: uniqueActiveCount > 0
                  ? (isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.18)')
                  : (isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'),
                color: uniqueActiveCount > 0
                  ? (isLight ? '#0284C7' : '#38BDF8')
                  : (isLight ? '#64748B' : '#94A3B8'),
                border: uniqueActiveCount > 0
                  ? (isLight ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(56, 189, 248, 0.35)')
                  : '1px solid transparent',
              }}
            >
              {uniqueActiveCount} Selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {uniqueActiveCount > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: isLight ? '1px solid #FECACA' : '1px solid rgba(248, 113, 113, 0.3)',
                  background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                  color: isLight ? '#DC2626' : '#F87171',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <Trash2 size={12} />
                <span>Clear All</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isLight ? '#475569' : '#CBD5E1',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── 5 COLUMN GRID (EXACT NAVBAR MEGA MENU STYLE) ── */}
        <div
          style={{
            padding: '18px 16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 0,
            overflowX: 'auto',
            background: isLight ? '#FFFFFF' : '#080E1E',
          }}
        >
          {CATALOG_COLUMNS.map((group, idx) => {
            const sectionColor = isLight ? group.lightColor : group.color

            return (
              <div
                key={group.section}
                style={{
                  padding: '0 14px',
                  borderRight: idx < CATALOG_COLUMNS.length - 1
                    ? (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)')
                    : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minWidth: 185,
                }}
              >
                <div>
                  {/* Section Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: 1,
                        color: sectionColor,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      // {group.section}
                    </span>

                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 5px',
                        borderRadius: 3,
                        background: `${sectionColor}18`,
                        color: sectionColor,
                        border: `1px solid ${sectionColor}35`,
                        letterSpacing: 0.5,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.tag}
                    </span>
                  </div>

                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {group.items.map(item => {
                      const count = activeChartIds.filter(id => id === item.id).length
                      const isAdded = count > 0

                      return (
                        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div
                            onClick={() => handleToggle(item.id, selectedStation)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 8px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12.5,
                              fontFamily: 'var(--font-mono)',
                              lineHeight: 1.3,
                              transition: 'all 0.15s ease',
                              gap: 8,
                              background: isAdded
                                ? (isLight ? `${sectionColor}18` : `${sectionColor}22`)
                                : 'transparent',
                              border: isAdded
                                ? `1px solid ${sectionColor}50`
                                : '1px solid transparent',
                              color: isAdded
                                ? (isLight ? '#0F172A' : '#FFFFFF')
                                : (isLight ? '#334155' : 'rgba(255,255,255,0.7)'),
                            }}
                            onMouseEnter={e => {
                              if (!isAdded) {
                                e.currentTarget.style.color = isLight ? '#0F172A' : '#FFFFFF'
                                e.currentTarget.style.background = isLight ? `${sectionColor}10` : 'rgba(255,255,255,0.06)'
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isAdded) {
                                e.currentTarget.style.color = isLight ? '#334155' : 'rgba(255,255,255,0.7)'
                              }
                            }}
                          >
                            {/* Label + checkmark */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                              {isAdded && (
                                <Check
                                  size={12}
                                  strokeWidth={3}
                                  color={sectionColor}
                                  style={{ flexShrink: 0 }}
                                />
                              )}
                              <span
                                style={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  fontWeight: isAdded ? 700 : 500,
                                }}
                              >
                                {item.label}
                              </span>
                            </div>

                            {/* Tag + Count controls if added */}
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                              onClick={e => e.stopPropagation()}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  color: sectionColor,
                                  letterSpacing: 0.5,
                                  fontWeight: 700,
                                  opacity: isAdded ? 1 : 0.85,
                                }}
                              >
                                {item.tag}
                              </span>

                              {isAdded && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
                                  {count > 1 && onRemoveChart && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveChart(item.id)}
                                      title="Remove one instance"
                                      style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: 2,
                                        border: `1px solid ${sectionColor}50`,
                                        background: 'transparent',
                                        color: sectionColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: 0,
                                      }}
                                    >
                                      <Minus size={9} />
                                    </button>
                                  )}

                                  {count > 1 && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                        color: sectionColor,
                                      }}
                                    >
                                      x{count}
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => onAddChart(item.id, selectedStation)}
                                    title="Add duplicate instance"
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: 2,
                                      border: `1px solid ${sectionColor}50`,
                                      background: 'transparent',
                                      color: sectionColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      padding: 0,
                                    }}
                                  >
                                    <Plus size={9} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Station Selector for Neutron Monitor */}
                          {item.id === 'neutron-monitor' && (
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{
                                marginTop: 2,
                                marginBottom: 4,
                                padding: '3px 6px',
                                borderRadius: 4,
                                background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                                border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span style={{ fontSize: 9.5, color: sectionColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                STN:
                              </span>
                              <select
                                value={selectedStation}
                                onChange={e => setSelectedStation(e.target.value)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isLight ? '#0F172A' : '#F8FAFC',
                                  fontSize: 11,
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600,
                                  outline: 'none',
                                  cursor: 'pointer',
                                  flex: 1,
                                  width: '100%',
                                }}
                              >
                                {POPULAR_STATIONS.map(st => (
                                  <option
                                    key={st.id}
                                    value={st.id}
                                    style={{ background: isLight ? '#FFFFFF' : '#0B132B', color: isLight ? '#0F172A' : '#FFFFFF' }}
                                  >
                                    {st.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Optional info footer at bottom of column */}
                {group.info && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '6px 8px',
                      borderRadius: 4,
                      background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                      border: isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: isLight ? '#64748B' : '#94A3B8',
                      textAlign: 'center',
                    }}
                  >
                    {group.info}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── FOOTER ── */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.08)',
            background: isLight ? '#F8FAFC' : 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: isLight ? '#64748B' : '#94A3B8',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Click any item to select or deselect from board
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '5px 16px',
              borderRadius: 4,
              background: isLight ? '#0284C7' : '#38BDF8',
              color: isLight ? '#FFFFFF' : '#0B132B',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
