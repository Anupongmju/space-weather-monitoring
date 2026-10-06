// frontend/src/pages/studio/CustomStudio.tsx
import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Columns,
  Bookmark,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Trash2,
  Activity,
  Globe,
  Satellite,
  BarChart3,
} from 'lucide-react'
import { useStudioState } from '../../components/studio/useStudioState'
import {
  CHART_CATALOG,
  ChartCatalogItem,
  BUILT_IN_PRESETS,
} from '../../components/studio/studioTypes'
import StudioCard from '../../components/studio/StudioCard'
import SynchronizedMultiTierCanvas from '../../components/studio/SynchronizedMultiTierCanvas'
import ChartCatalogModal from '../../components/studio/ChartCatalogModal'
import SavePresetModal from '../../components/studio/SavePresetModal'
import DateRangeToolbar, { TimeRange } from '../../components/ui/DateRangeToolbar'
import StatusBadge from '../../components/ui/StatusBadge'
import { useTheme } from '../../context/ThemeContext'

export default function CustomStudio() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const {
    cards,
    layout,
    globalTimeRange,
    globalCustomRange,
    activePresetId,
    allPresets,
    setLayout,
    setGlobalTimeRange,
    setGlobalCustomRange,
    addCard,
    removeCard,
    removeCardByChartId,
    toggleChart,
    clearAllCards,
    moveCard,
    setCardStation,
    setCardTimeOverride,
    applyPreset,
    saveUserPreset,
    deleteUserPreset,
    resetToDefault,
  } = useStudioState()

  // Modals & view mode state
  const [viewMode, setViewMode] = useState<'synchronized' | 'grid'>('synchronized')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false)

  // Map catalog for instant lookup
  const catalogMap = useMemo(() => {
    const map = new Map<string, ChartCatalogItem>()
    CHART_CATALOG.forEach(item => map.set(item.id, item))
    return map
  }, [])

  // Active chart ids for the modal
  const activeChartIds = useMemo(() => cards.map(c => c.chartId), [cards])

  // Get active preset name
  const currentPreset = allPresets.find(p => p.id === activePresetId)

  // Subtitle list of active instrument names
  const tierSubtitle = useMemo(() => {
    if (cards.length === 0) return 'Assemble Cross-Domain Telemetry'
    const names = cards.map(c => {
      const item = catalogMap.get(c.chartId)
      return item?.title || c.chartId
    })
    return names.join(' · ')
  }, [cards, catalogMap])

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 'min(96%, 1640px)',
          margin: '0 auto',
          padding: '24px 20px 60px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* ── TOP NAV TABS (Matching StandardOverview & CosmicHelioOverview 1:1) ── */}
        <div
          style={{
            display: 'inline-flex',
            gap: 6,
            background: isLight ? '#F1F5F9' : 'rgba(15, 23, 42, 0.75)',
            padding: '4px',
            border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6,
            marginBottom: 20,
          }}
        >
          <Link
            to="/analysis"
            style={{
              padding: '6px 16px',
              background: 'transparent',
              textDecoration: 'none',
              border: 'none',
              borderBottom: '2px solid transparent',
              color: isLight ? '#64748B' : '#94A3B8',
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Globe size={13} /> STANDARD OVERVIEW
          </Link>
          <Link
            to="/analysis?view=cosmic"
            style={{
              padding: '6px 16px',
              background: 'transparent',
              textDecoration: 'none',
              border: 'none',
              borderBottom: '2px solid transparent',
              color: isLight ? '#64748B' : '#94A3B8',
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Satellite size={13} /> COSMIC & HELIOSPHERE (9-TIER)
          </Link>
          <div
            style={{
              padding: '6px 16px',
              background: isLight ? '#FFFFFF' : 'rgba(99, 102, 241, 0.25)',
              borderBottom: `2px solid ${isLight ? '#4F46E5' : '#818CF8'}`,
              color: isLight ? '#4338CA' : '#818CF8',
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BarChart3 size={13} /> CUSTOM STUDIO 📊
          </div>
        </div>

        {/* ── SEAMLESS HEADER (Matching StandardOverview 1:1) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 16,
            borderBottom: isLight ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Orbitron', var(--font-sans), monospace",
                fontSize: 26,
                fontWeight: 700,
                color: isLight ? '#3730A3' : '#F8FAFC',
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              SPACE WEATHER CUSTOM STUDIO
            </h1>
            <p
              style={{
                color: isLight ? '#475569' : '#CBD5E1',
                fontSize: 13,
                margin: '6px 0 0',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Synchronized {cards.length}-Tier Analytics: {tierSubtitle}
            </p>
          </div>

          {/* Action Controls Top Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Preset Selector Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setPresetDropdownOpen(prev => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                  border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: isLight ? '#334155' : '#94A3B8',
                  fontSize: 12.5,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 4,
                  transition: 'all 0.2s',
                }}
              >
                <Sparkles size={13} color="var(--primary, #38BDF8)" />
                <span>PRESET: {currentPreset ? currentPreset.name : 'CUSTOM'}</span>
                <ChevronDown size={12} />
              </button>

              {presetDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    zIndex: 50,
                    width: 300,
                    background: isLight ? '#FFFFFF' : '#0B132B',
                    border: isLight ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: 8,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                    padding: '6px 0',
                  }}
                >
                  <div
                    style={{
                      padding: '6px 14px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: isLight ? '#94A3B8' : '#64748B',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Standard Presets
                  </div>
                  {BUILT_IN_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        applyPreset(preset.id)
                        setPresetDropdownOpen(false)
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 14px',
                        background:
                          preset.id === activePresetId
                            ? isLight
                              ? '#F0F9FF'
                              : 'rgba(56, 189, 248, 0.15)'
                            : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color:
                            preset.id === activePresetId
                              ? 'var(--primary, #0284C7)'
                              : isLight
                              ? '#0F172A'
                              : '#F8FAFC',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {preset.name}
                      </span>
                      <span style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                        {preset.description.substring(0, 50)}...
                      </span>
                    </button>
                  ))}

                  {allPresets.filter(p => !p.isBuiltIn).map(preset => (
                    <div
                      key={preset.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 14px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          applyPreset(preset.id)
                          setPresetDropdownOpen(false)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: 0,
                          flex: 1,
                          color: isLight ? '#0F172A' : '#F8FAFC',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {preset.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUserPreset(preset.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          padding: 2,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Preset Button */}
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isLight ? '#334155' : '#94A3B8',
                fontSize: 12.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'all 0.2s',
              }}
            >
              <Bookmark size={13} color="#F59E0B" />
              <span>SAVE</span>
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={resetToDefault}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isLight ? '#64748B' : '#94A3B8',
                fontSize: 12.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'all 0.2s',
              }}
            >
              <RotateCcw size={13} />
              <span>RESET</span>
            </button>

            {/* + ADD GRAPH BUTTON */}
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                background: isLight ? '#4F46E5' : '#6366F1',
                border: 'none',
                color: '#FFFFFF',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 4,
                transition: 'all 0.2s',
              }}
            >
              <Plus size={14} />
              <span>ADD GRAPH ({cards.length})</span>
            </button>

            <StatusBadge status="normal" label="Normal" />
          </div>
        </div>

        {/* ── WHEN IN CARDS GRID MODE: RENDER LAYOUT BAR & DATE TOOLBAR ── */}
        {viewMode === 'grid' && cards.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isLight ? '#64748B' : '#94A3B8',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                LAYOUT:
              </span>
              <button
                type="button"
                onClick={() => setLayout('2col')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  background:
                    layout === '2col'
                      ? isLight
                        ? '#4F46E5'
                        : 'rgba(99, 102, 241, 0.3)'
                      : 'transparent',
                  color:
                    layout === '2col'
                      ? isLight
                        ? '#FFFFFF'
                        : '#A5B4FC'
                      : isLight
                      ? '#64748B'
                      : '#94A3B8',
                  border:
                    '1px solid ' +
                    (layout === '2col'
                      ? '#6366F1'
                      : isLight
                      ? '#CBD5E1'
                      : 'rgba(255,255,255,0.15)'),
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                2-COLUMN
              </button>
              <button
                type="button"
                onClick={() => setLayout('1col')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  background:
                    layout === '1col'
                      ? isLight
                        ? '#4F46E5'
                        : 'rgba(99, 102, 241, 0.3)'
                      : 'transparent',
                  color:
                    layout === '1col'
                      ? isLight
                        ? '#FFFFFF'
                        : '#A5B4FC'
                      : isLight
                      ? '#64748B'
                      : '#94A3B8',
                  border:
                    '1px solid ' +
                    (layout === '1col'
                      ? '#6366F1'
                      : isLight
                      ? '#CBD5E1'
                      : 'rgba(255,255,255,0.15)'),
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                1-COLUMN
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DateRangeToolbar
                limit={globalTimeRange}
                onLimitChange={setGlobalTimeRange}
                appliedRange={globalCustomRange}
                onApplyRange={setGlobalCustomRange}
                presets={[1440, 4320, 10080]}
                accentColor={isLight ? '#4F46E5' : '#818CF8'}
              />
              <button
                type="button"
                onClick={() => setViewMode('synchronized')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                  border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: isLight ? '#334155' : '#94A3B8',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                <Activity size={12} />
                <span>SYNCED TIERS</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT (SYNCHRONIZED CANVAS OR CARDS GRID) ── */}
        {cards.length === 0 ? (
          <div
            style={{
              padding: '80px 24px',
              textAlign: 'center',
              background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
              border: isLight ? '2px dashed rgba(0,0,0,0.1)' : '2px dashed rgba(255,255,255,0.1)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: isLight ? 'rgba(99, 102, 241, 0.1)' : 'rgba(129, 140, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isLight ? '#4F46E5' : '#818CF8',
              }}
            >
              <Activity size={28} />
            </div>

            <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-mono)' }}>
              Your Custom Board is Empty
            </h3>
            <p
              style={{
                margin: 0,
                maxWidth: 480,
                fontSize: 13,
                color: isLight ? '#64748B' : '#94A3B8',
                lineHeight: 1.5,
              }}
            >
              Click "+ Add Graph" to select telemetry streams from GOES, ACE, Neutron Monitors, Moon CRaTER, or Mars.
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCatalogOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 22px',
                  borderRadius: 6,
                  background: isLight ? '#4F46E5' : '#6366F1',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <Plus size={16} />
                <span>Browse Chart Catalog</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('solar-storm')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 6,
                  background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                  border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.15)',
                  color: isLight ? '#0F172A' : '#FFF',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <Sparkles size={16} color="#F59E0B" />
                <span>Load Solar Storm Preset</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'synchronized' ? (
          /* ── SYNCHRONIZED MULTI-TIER CANVAS (MATCHES ANALYSIS / RADIATION SCREENSHOT) ── */
          <SynchronizedMultiTierCanvas
            cards={cards}
            limit={globalTimeRange}
            appliedRange={globalCustomRange}
            onLimitChange={setGlobalTimeRange}
            onApplyRange={setGlobalCustomRange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onMoveCard={moveCard}
            onRemoveCard={removeCard}
            onStationChange={setCardStation}
            onOpenCatalog={() => setCatalogOpen(true)}
          />
        ) : (
          /* ── MODULAR CARDS GRID ── */
          <div
            style={{
              display: layout === '1col' ? 'flex' : 'grid',
              flexDirection: layout === '1col' ? 'column' : undefined,
              gridTemplateColumns:
                layout === '2col'
                  ? 'repeat(auto-fit, minmax(min(100%, 580px), 1fr))'
                  : undefined,
              gap: 20,
            }}
          >
            {cards.map((card, idx) => {
              const catalogItem = catalogMap.get(card.chartId) || CHART_CATALOG[0]
              return (
                <StudioCard
                  key={card.instanceId}
                  card={card}
                  catalogItem={catalogItem}
                  globalTimeRange={globalTimeRange}
                  globalCustomRange={globalCustomRange}
                  index={idx}
                  totalCards={cards.length}
                  onMove={moveCard}
                  onRemove={removeCard}
                  onStationChange={setCardStation}
                  onTimeOverride={setCardTimeOverride}
                />
              )
            })}
          </div>
        )}

        {/* ── MODALS ── */}
        <ChartCatalogModal
          isOpen={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          onAddChart={(chartId, station) => addCard(chartId, station)}
          onRemoveChart={chartId => removeCardByChartId(chartId)}
          onToggleChart={(chartId, station) => toggleChart(chartId, station)}
          onClearAll={clearAllCards}
          activeChartIds={activeChartIds}
        />

        <SavePresetModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          onSave={(name, desc) => saveUserPreset(name, desc)}
          activeCardCount={cards.length}
        />
      </div>
    </div>
  )
}
