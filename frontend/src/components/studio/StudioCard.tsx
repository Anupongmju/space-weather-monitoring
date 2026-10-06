// frontend/src/components/studio/StudioCard.tsx
import React, { useState, useRef, useMemo } from 'react'
import {
  ArrowUp,
  ArrowDown,
  X,
  Maximize2,
  Minimize2,
  Clock,
  Radio,
  Zap,
  Activity,
  Layers,
  Wind,
  ShieldAlert,
  Compass,
  Mountain,
  Snowflake,
  Globe,
  Sun,
  Moon,
  Flame,
  Sparkles,
} from 'lucide-react'
import { StudioCardConfig, ChartCatalogItem, POPULAR_STATIONS } from './studioTypes'
import { TimeRange, TIME_LABELS } from '../ui/DateRangeToolbar'
import { useTheme } from '../../context/ThemeContext'
import StudioChartRenderer from './charts/StudioChartRenderer'
import ExportChartMenu from '../ui/ExportChartMenu'
import { ExportColumn } from '../../utils/exportHelpers'

export interface StudioCardProps {
  card: StudioCardConfig
  catalogItem: ChartCatalogItem
  globalTimeRange: TimeRange
  globalCustomRange: { startDate: string; endDate: string } | null
  index: number
  totalCards: number
  onMove: (index: number, direction: 'up' | 'down') => void
  onRemove: (instanceId: string) => void
  onTimeOverride: (instanceId: string, range: TimeRange | null) => void
  onStationChange?: (instanceId: string, station: string) => void
}

const ICON_MAP: Record<string, any> = {
  Zap,
  ShieldAlert,
  Radio,
  Compass,
  Wind,
  Layers,
  Activity,
  Mountain,
  Snowflake,
  Globe,
  Sun,
  Moon,
  Flame,
  Sparkles,
}

export default function StudioCard({
  card,
  catalogItem,
  globalTimeRange,
  globalCustomRange,
  index,
  totalCards,
  onMove,
  onRemove,
  onTimeOverride,
  onStationChange,
}: StudioCardProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const chartRef = useRef<any>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loadedData, setLoadedData] = useState<any[]>([])
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([])

  // Resolve effective time limit
  const isOverridden = card.timeRangeOverride !== null && card.timeRangeOverride !== undefined
  const effectiveLimit: TimeRange = isOverridden ? card.timeRangeOverride! : globalTimeRange
  const effectiveCustomRange = isOverridden ? null : globalCustomRange

  // Icon component
  const IconComponent = ICON_MAP[catalogItem.icon] || Activity
  const accentColor = isLight ? catalogItem.lightAccentColor : catalogItem.accentColor

  const handleToggleFullscreen = () => {
    if (!cardRef.current) return
    if (!document.fullscreenElement) {
      cardRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Sync fullscreen change via event
  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === cardRef.current)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const exportMetadata = useMemo(
    () => ({
      station: `${catalogItem.domain} // ${catalogItem.tag}`,
      viewTitle: `${catalogItem.title} - Space Weather Studio`,
      description: catalogItem.description,
      timeRangeText: effectiveCustomRange
        ? `${effectiveCustomRange.startDate} to ${effectiveCustomRange.endDate}`
        : `${TIME_LABELS[effectiveLimit]} UTC Interval`,
      totalRecords: loadedData.length,
    }),
    [catalogItem, effectiveCustomRange, effectiveLimit, loadedData.length]
  )

  return (
    <div
      ref={cardRef}
      style={{
        background: isLight
          ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)'
          : 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.92) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isLight ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: 12,
        padding: isFullscreen ? 24 : 16,
        boxShadow: isLight
          ? '0 4px 18px rgba(0, 0, 0, 0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        transition: 'all 0.2s ease',
        height: isFullscreen ? '100vh' : 'auto',
        overflow: 'hidden',
      }}
    >
      {/* ── CARD TOP HEADER ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 10,
        }}
      >
        {/* Left: Domain Badge + Title + Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: '1 1 auto' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
            }}
          >
            <IconComponent size={18} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono), monospace',
                  color: isLight ? '#0F172A' : '#F8FAFC',
                  letterSpacing: '0.3px',
                }}
              >
                {catalogItem.title}{card.chartId === 'neutron-monitor' && card.station ? ` (${card.station})` : ''}
              </span>

              {/* Domain & Tag badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono), monospace',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: `${accentColor}18`,
                  color: accentColor,
                  border: `1px solid ${accentColor}30`,
                }}
              >
                {catalogItem.domain} · {catalogItem.tag}
              </span>
            </div>

            <span
              style={{
                fontSize: 11,
                color: isLight ? '#64748B' : '#94A3B8',
                fontFamily: 'var(--font-mono), monospace',
              }}
            >
              {catalogItem.subtitle}
            </span>
          </div>
        </div>

        {/* Right: Actions Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
          {/* Time Range Override Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '2px 6px',
            }}
            title={isOverridden ? 'Independent time range active' : 'Inheriting global studio time range'}
          >
            <Clock size={12} color={isOverridden ? accentColor : isLight ? '#64748B' : '#94A3B8'} />
            <select
              value={card.timeRangeOverride ?? 'global'}
              onChange={e => {
                const val = e.target.value
                onTimeOverride(card.instanceId, val === 'global' ? null : (Number(val) as TimeRange))
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: isOverridden ? accentColor : isLight ? '#334155' : '#E2E8F0',
                fontSize: 11,
                fontFamily: 'var(--font-mono), monospace',
                fontWeight: isOverridden ? 700 : 500,
                cursor: 'pointer',
                outline: 'none',
                padding: '2px 0',
              }}
            >
              <option value="global" style={{ background: isLight ? '#FFFFFF' : '#0F172A', color: isLight ? '#0F172A' : '#FFF' }}>
                Global ({TIME_LABELS[globalTimeRange]})
              </option>
              <option value="1440" style={{ background: isLight ? '#FFFFFF' : '#0F172A', color: isLight ? '#0F172A' : '#FFF' }}>
                1D (24h)
              </option>
              <option value="4320" style={{ background: isLight ? '#FFFFFF' : '#0F172A', color: isLight ? '#0F172A' : '#FFF' }}>
                3D (72h)
              </option>
              <option value="10080" style={{ background: isLight ? '#FFFFFF' : '#0F172A', color: isLight ? '#0F172A' : '#FFF' }}>
                7D (1W)
              </option>
              <option value="43200" style={{ background: isLight ? '#FFFFFF' : '#0F172A', color: isLight ? '#0F172A' : '#FFF' }}>
                30D (1M)
              </option>
            </select>
          </div>

          {/* Station Selector for Neutron Monitor */}
          {card.chartId === 'neutron-monitor' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: isLight ? 'rgba(168, 85, 247, 0.08)' : 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: 6,
                padding: '2px 6px',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: '#A855F7', fontFamily: 'var(--font-mono)' }}>
                STN:
              </span>
              <select
                value={card.station || 'OULU'}
                onChange={e => onStationChange?.(card.instanceId, e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#6B21A8' : '#E9D5FF',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono), monospace',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {POPULAR_STATIONS.map(s => (
                  <option
                    key={s.id}
                    value={s.id}
                    style={{ background: isLight ? '#FFFFFF' : '#1E1B4B', color: isLight ? '#0F172A' : '#FFF' }}
                  >
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Menu */}
          <ExportChartMenu
            chartRef={chartRef}
            data={loadedData}
            columns={exportColumns}
            metadata={exportMetadata}
            filenameBase={`studio_${catalogItem.id}`}
            accentColor={accentColor}
          />

          {/* Reorder Buttons */}
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, 'up')}
            title="Move graph up"
            style={{
              background: 'transparent',
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: index === 0 ? (isLight ? '#CBD5E1' : '#475569') : isLight ? '#334155' : '#CBD5E1',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowUp size={13} />
          </button>

          <button
            type="button"
            disabled={index === totalCards - 1}
            onClick={() => onMove(index, 'down')}
            title="Move graph down"
            style={{
              background: 'transparent',
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: index === totalCards - 1 ? (isLight ? '#CBD5E1' : '#475569') : isLight ? '#334155' : '#CBD5E1',
              cursor: index === totalCards - 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowDown size={13} />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            style={{
              background: 'transparent',
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLight ? '#334155' : '#CBD5E1',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Remove Button */}
          <button
            type="button"
            onClick={() => onRemove(card.instanceId)}
            title="Remove from custom board"
            style={{
              background: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 6,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── CARD BODY (CHART RENDERER) ── */}
      <div style={{ flex: 1, minHeight: isFullscreen ? 'calc(100vh - 100px)' : 310, position: 'relative' }}>
        <StudioChartRenderer
          chartId={card.chartId}
          limit={effectiveLimit}
          customRange={effectiveCustomRange}
          chartRef={chartRef}
          height={isFullscreen ? window.innerHeight - 120 : 310}
          station={card.station}
          onDataLoaded={(data, cols) => {
            setLoadedData(data)
            setExportColumns(cols)
          }}
        />
      </div>
    </div>
  )
}
