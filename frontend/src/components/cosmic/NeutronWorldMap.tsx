import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Crosshair,
  SlidersHorizontal,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Compass,
  Activity
} from 'lucide-react'
import {
  NEUTRON_STATIONS,
  NeutronStation,
  MAGNETIC_EQUATOR_POINTS,
  getRigidityColor,
  getShieldingDescription,
  getGLE77Data,
  getGLE77MarkerStyle,
  GLE77StationData,
  GLEEnhancementTier,
  GLEAveragingWindow,
  GLE77_STATION_MAP
} from '../../services/neutronStationsData'
import { ISO_RIGIDITY_CONTOURS } from '../../services/geomagneticContours'
import { loadNeutron, loadGLE77Timeline, GLE77TimelinePayload } from '../../services/cosmicService'

export type RigidityFilter = 'all' | 'polar' | 'mid' | 'equatorial'
export type MapDisplayMode = 'rigidity' | 'gle77'

interface NeutronWorldMapProps {
  onSelectStation: (station: NeutronStation) => void
  selectedStation: NeutronStation | null
  rigidityFilter?: RigidityFilter
  mapMode?: MapDisplayMode
  averagingWindow?: GLEAveragingWindow
  onAveragingWindowChange?: (win: GLEAveragingWindow) => void
}

type BasemapStyle = 'satellite_day' | 'night_lights' | 'dark_space'

export default function NeutronWorldMap({
  onSelectStation,
  selectedStation,
  rigidityFilter = 'all',
  mapMode = 'gle77',
  averagingWindow = 30,
  onAveragingWindowChange
}: NeutronWorldMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  // Map Pan & Zoom Transform State
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Refs for latest values used in native event handlers (avoid stale closures)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Keep refs in sync with state
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

  // HUD & View Configuration
  const [basemap, setBasemap] = useState<BasemapStyle>('satellite_day')
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showRigidityContours, setShowRigidityContours] = useState(false)
  const [showMagneticEquator, setShowMagneticEquator] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── GLE#77 Time-Series Looping Playback State ──
  const [timelinePayload, setTimelinePayload] = useState<GLE77TimelinePayload | null>(null)
  const [currentFrame, setCurrentFrame] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2) // 2x default speed for fluid animation
  const [isLooping, setIsLooping] = useState<boolean>(true)
  const [isLoadingTimeline, setIsLoadingTimeline] = useState<boolean>(false)

  // Fetch timeline dataset whenever mapMode is 'gle77' or averagingWindow changes
  useEffect(() => {
    if (mapMode !== 'gle77') return
    let isCancelled = false
    setIsLoadingTimeline(true)
    const win = (averagingWindow === 20 || averagingWindow === 30) ? averagingWindow : 10
    loadGLE77Timeline(win)
      .then(payload => {
        if (!isCancelled) {
          setTimelinePayload(payload)
          // Start ~2.5 hours before peak flare so the build-up & shockwave are immediately seen
          const framesBefore = Math.round(150 / win)
          const onset = Math.max(0, (payload.stats?.peakFrame ?? 0) - framesBefore)
          setCurrentFrame(onset)
          setIsLoadingTimeline(false)
        }
      })
      .catch(err => {
        console.error('Failed to load GLE77 timeline:', err)
        if (!isCancelled) setIsLoadingTimeline(false)
      })
    return () => { isCancelled = true }
  }, [mapMode, averagingWindow])

  // Continuous animation ticker loop (starts before peak and loops event cycle)
  useEffect(() => {
    if (mapMode !== 'gle77' || !isPlaying || !timelinePayload || timelinePayload.data.length === 0) return
    const total = timelinePayload.data.length
    const win = timelinePayload.window || averagingWindow || 10
    const framesBefore = Math.round(150 / win)
    const onset = Math.max(0, (timelinePayload.stats?.peakFrame ?? 0) - framesBefore)
    const timer = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= total - 1) {
          // Loop back to onset so user constantly sees the dramatic expansion cycle
          return onset
        }
        return prev + 1
      })
    }, 2000)

    return () => clearInterval(timer)
  }, [mapMode, isPlaying, timelinePayload])

  // Map station ID -> current % increase for the active frame
  const currentStationValues = useMemo(() => {
    if (mapMode !== 'gle77' || !timelinePayload || !timelinePayload.data[currentFrame]) {
      return new Map<string, number>()
    }
    const map = new Map<string, number>()
    const frameData = timelinePayload.data[currentFrame]
    timelinePayload.stations.forEach((stId, idx) => {
      map.set(stId, frameData[idx] ?? 0)
    })
    return map
  }, [mapMode, timelinePayload, currentFrame])

  const currentTimestamp = timelinePayload?.timestamps[currentFrame] || ''
  const totalFrames = timelinePayload?.timestamps.length || 0
  // Hover state & sparkline cache
  const [hoveredStation, setHoveredStation] = useState<NeutronStation | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [sparklines, setSparklines] = useState<Record<string, { loading: boolean; data: any[] }>>({})

  // Fetch telemetry trend on hover for active stations
  useEffect(() => {
    if (!hoveredStation || hoveredStation.status !== 'active') return
    const id = hoveredStation.id
    if (sparklines[id]?.data && sparklines[id].data.length > 0) return

    setSparklines(prev => ({ ...prev, [id]: { loading: true, data: prev[id]?.data || [] } }))
    loadNeutron(id, 60)
      .then(res => {
        setSparklines(prev => ({
          ...prev,
          [id]: { loading: false, data: Array.isArray(res) ? res : [] }
        }))
      })
      .catch(() => {
        setSparklines(prev => ({ ...prev, [id]: { loading: false, data: [] } }))
      })
  }, [hoveredStation])

  // Map dimensions (Equirectangular 2:1 aspect ratio)
  const MAP_W = 2400
  const MAP_H = 1200

  // Coordinate projection from (lat, lon) -> (x, y)
  const projectCoordinates = useCallback((lat: number, lon: number) => {
    // lon: -180..+180 -> 0..MAP_W
    const x = ((lon + 180) / 360) * MAP_W
    // lat: +90..-90 -> 0..MAP_H
    // South Pole is at -90.0. Clamping to -80.0 brings SOPO safely inside the Antarctic
    // ice sheet (~67px above bottom edge), clearly visible and clickable without leaving any black gap below.
    const safeLat = Math.max(-80.0, Math.min(85, lat))
    const y = ((90 - safeLat) / 180) * MAP_H
    return { x, y }
  }, [MAP_W, MAP_H])

  // Filter stations
  const filteredStations = useMemo(() => {
    return NEUTRON_STATIONS.filter(st => {
      // Rigidity filter
      if (rigidityFilter === 'polar') return st.cutoffRigidity < 2.0
      if (rigidityFilter === 'mid') return st.cutoffRigidity >= 2.0 && st.cutoffRigidity <= 10.0
      if (rigidityFilter === 'equatorial') return st.cutoffRigidity > 10.0

      return true
    })
  }, [rigidityFilter])

  // Pan boundary clamp to prevent map from being lost
  const clampPan = useCallback((px: number, py: number, z: number): { x: number; y: number } => {
    const el = containerRef.current
    if (!el) return { x: px, y: py }
    const { width, height } = el.getBoundingClientRect()
    const scaledW = MAP_W * z
    const scaledH = MAP_H * z

    const clampedX = scaledW <= width
      ? (width - scaledW) / 2
      : Math.min(0, Math.max(width - scaledW, px))

    const clampedY = scaledH <= height
      ? (height - scaledH) / 2
      : Math.min(0, Math.max(height - scaledH, py))

    return { x: clampedX, y: clampedY }
  }, [MAP_W, MAP_H])

  const getMinZoom = useCallback((): number => {
    const el = containerRef.current
    if (!el) return 0.5
    const { width, height } = el.getBoundingClientRect()
    return Math.max(width / MAP_W, height / MAP_H)
  }, [MAP_W, MAP_H])

  // Mouse pan & zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click, not on buttons/inputs
    if (e.button !== 0) return
    e.preventDefault()
    const startX = e.clientX - panRef.current.x
    const startY = e.clientY - panRef.current.y
    setIsDragging(true)
    isDraggingRef.current = true
    setDragStart({ x: startX, y: startY })
    dragStartRef.current = { x: startX, y: startY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    const rawPan = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    }
    const clamped = clampPan(rawPan.x, rawPan.y, zoomRef.current)
    panRef.current = clamped
    setPan(clamped)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    isDraggingRef.current = false
  }

  // ── Attach non-passive wheel listener so preventDefault() actually works ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
      const currentZoom = zoomRef.current
      const currentPan = panRef.current
      const minZoom = Math.max(rect.width / MAP_W, rect.height / MAP_H)
      const nextZoom = Math.min(Math.max(currentZoom * zoomFactor, minZoom), 8.0)

      // Zoom centered towards cursor position
      const scaleChange = nextZoom - currentZoom
      const rawPan = {
        x: currentPan.x - (cursorX - currentPan.x) * (scaleChange / currentZoom),
        y: currentPan.y - (cursorY - currentPan.y) * (scaleChange / currentZoom)
      }
      const newPan = clampPan(rawPan.x, rawPan.y, nextZoom)

      zoomRef.current = nextZoom
      panRef.current = newPan
      setZoom(nextZoom)
      setPan(newPan)
    }

    // { passive: false } is critical — allows preventDefault() to suppress page scroll
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [clampPan, MAP_W, MAP_H])

  const handleZoomIn = () => {
    const next = Math.min(zoom * 1.3, 8.0)
    const clamped = clampPan(pan.x, pan.y, next)
    setZoom(next)
    setPan(clamped)
  }

  const handleZoomOut = () => {
    const minZ = getMinZoom()
    const next = Math.max(zoom * 0.7, minZ)
    const clamped = clampPan(pan.x, pan.y, next)
    setZoom(next)
    setPan(clamped)
  }

  const handleResetView = () => {
    // Reset to full width and align bottom to show SOPO without needing to scroll
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const z = Math.max(width / MAP_W, height / MAP_H)
    const scaledW = MAP_W * z
    const scaledH = MAP_H * z
    const cx = (width - scaledW) / 2
    const cy = height - scaledH
    const clamped = clampPan(cx, cy, z)
    zoomRef.current = z
    panRef.current = clamped
    setZoom(z)
    setPan(clamped)
  }

  // Fly to station
  const handleFlyToStation = (station: NeutronStation) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const { x, y } = projectCoordinates(station.lat, station.lon)
    const targetZoom = 2.5

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const clamped = clampPan(centerX - x * targetZoom, centerY - y * targetZoom, targetZoom)
    setZoom(targetZoom)
    setPan(clamped)
    onSelectStation(station)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { })
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { })
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ── On mount (and resize): fill width (no side black space) and align bottom to show SOPO directly ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const fitToViewport = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!width || !height) return
      // Fill entire width with zero side margins, and position bottom flush to show Antarctica & SOPO
      const z = Math.max(width / MAP_W, height / MAP_H)
      const scaledW = MAP_W * z
      const scaledH = MAP_H * z
      const cx = (width - scaledW) / 2
      const cy = height - scaledH
      const clamped = clampPan(cx, cy, z)
      zoomRef.current = z
      panRef.current = clamped
      setZoom(z)
      setPan(clamped)
    }

    // Run once on mount
    fitToViewport()

    // Re-run on resize so it stays full-coverage
    const ro = new ResizeObserver(fitToViewport)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally only on mount; MAP_W/H are constants

  // Generate Latitude Graticule Lines (-80 to +80 every 20 degrees)
  const latLines = useMemo(() => {
    const lines: { lat: number; y: number }[] = []
    for (let lat = -80; lat <= 80; lat += 20) {
      lines.push({ lat, y: ((90 - lat) / 180) * MAP_H })
    }
    return lines
  }, [MAP_H])

  // Generate Longitude Graticule Lines (-180 to +180 every 30 degrees)
  const lonLines = useMemo(() => {
    const lines: { lon: number; x: number }[] = []
    for (let lon = -180; lon <= 180; lon += 30) {
      lines.push({ lon, x: ((lon + 180) / 360) * MAP_W })
    }
    return lines
  }, [MAP_W])

  // Generate Magnetic Equator (Dip Equator) SVG Path directly from stlat++.txt
  const magneticEquatorPath = useMemo(() => {
    const pts = MAGNETIC_EQUATOR_POINTS.map(p => {
      const { x, y } = projectCoordinates(p.lat, p.lon)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M ${pts.join(' L ')}`
  }, [projectCoordinates])

  // Generate Iso-Rigidity Contour Paths (1 - 17 GV) based on exact GLE#77 / IGRF Model
  const rigidityContourPaths = useMemo(() => {
    return ISO_RIGIDITY_CONTOURS.map(contour => {
      const pts = contour.points.map(p => {
        const { x, y } = projectCoordinates(p.lat, p.lon)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      const pathD = `M ${pts.join(' L ')} ${contour.isClosed ? 'Z' : ''}`
      
      // Calculate label coordinates along the contour
      let labelX = 0
      let labelY = 0
      if (contour.labelPos) {
        const lp = projectCoordinates(contour.labelPos.lat, contour.labelPos.lon)
        labelX = lp.x
        labelY = lp.y
      } else if (contour.isClosed) {
        const lp = projectCoordinates(7.5, 71.0)
        labelX = lp.x
        labelY = lp.y
      } else {
        const targetLon = contour.hemisphere === 'north' ? -45.0 : -25.0
        const pt = contour.points.find(p => Math.abs(p.lon - targetLon) < 6) || contour.points[Math.floor(contour.points.length / 2)]
        const lp = projectCoordinates(pt.lat, pt.lon)
        labelX = lp.x
        labelY = lp.y
      }

      return {
        ...contour,
        pathD,
        labelX,
        labelY
      }
    })
  }, [projectCoordinates])

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        background: '#020617',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'none'
      }}
    >
      <style>{`
        @keyframes radarPulse {
          0%   { transform: scale(1); opacity: 0.8; }
          70%  { transform: scale(3.5); opacity: 0; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes badgeGlow {
          0%, 100% { filter: drop-shadow(0 0 4px currentColor); }
          50%      { filter: drop-shadow(0 0 10px currentColor); }
        }
        .station-marker-group:hover .marker-label {
          opacity: 1 !important;
          transform: translateY(-2px);
        }
      `}</style>

      {/* ═══════════════════════ MAP CANVAS LAYER ═══════════════════════ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: MAP_W,
          height: MAP_H,
          transformOrigin: '0 0',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        {/* Real Earth Satellite Image Background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {basemap === 'satellite_day' && (
            <img
              src="/assets/earth_day.jpg"
              alt="Real Earth Visible Satellite Map"
              draggable={false}
              onDragStart={e => e.preventDefault()}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                display: 'block',
                filter: 'brightness(0.92) contrast(1.1)',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            />
          )}

          {basemap === 'night_lights' && (
            <img
              src="/assets/earth_night.jpg"
              alt="Real Earth Night Lights Map"
              draggable={false}
              onDragStart={e => e.preventDefault()}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                display: 'block',
                filter: 'brightness(1.1) contrast(1.15)'
              }}
            />
          )}

          {basemap === 'dark_space' && (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 50% 50%, #0c1427 0%, #030712 100%)',
              border: '1px solid rgba(56,189,248,0.2)'
            }}>
              <img
                src="/assets/earth_day.jpg"
                alt="Earth Shadow Map"
                draggable={false}
                onDragStart={e => e.preventDefault()}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  opacity: 0.25,
                  filter: 'grayscale(1) invert(0.2)',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Graticule / Coordinate Grid Overlay */}
        {showGrid && (
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            {/* Latitude Grid Lines */}
            {latLines.map(({ lat, y }) => (
              <g key={`lat-${lat}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={MAP_W}
                  y2={y}
                  stroke={lat === 0 ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.12)'}
                  strokeWidth={lat === 0 ? 1.5 : 0.75}
                  strokeDasharray={lat === 0 ? 'none' : '4 4'}
                />
                <text
                  x={12}
                  y={y - 4}
                  fill={lat === 0 ? '#38BDF8' : 'rgba(255, 255, 255, 0.5)'}
                  fontSize={11 / Math.sqrt(zoom)}
                  fontFamily="monospace"
                  fontWeight={lat === 0 ? 700 : 400}
                >
                  {lat === 0 ? '0° (EQUATOR)' : lat > 0 ? `+${lat}°N` : `${lat}°S`}
                </text>
                <text
                  x={MAP_W - 55}
                  y={y - 4}
                  fill={lat === 0 ? '#38BDF8' : 'rgba(255, 255, 255, 0.5)'}
                  fontSize={11 / Math.sqrt(zoom)}
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {lat > 0 ? `+${lat}°` : `${lat}°`}
                </text>
              </g>
            ))}

            {/* Longitude Grid Lines */}
            {lonLines.map(({ lon, x }) => (
              <g key={`lon-${lon}`}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={MAP_H}
                  stroke={lon === 0 ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.12)'}
                  strokeWidth={lon === 0 ? 1.5 : 0.75}
                  strokeDasharray={lon === 0 ? 'none' : '4 4'}
                />
                <text
                  x={x + 4}
                  y={22 / Math.sqrt(zoom)}
                  fill={lon === 0 ? '#38BDF8' : 'rgba(255, 255, 255, 0.5)'}
                  fontSize={11 / Math.sqrt(zoom)}
                  fontFamily="monospace"
                  fontWeight={lon === 0 ? 700 : 400}
                >
                  {lon === 0 ? '0° (PRIME)' : lon > 0 ? `+${lon}°E` : `${lon}°W`}
                </text>
              </g>
            ))}
          </svg>
        )}

        {/* ── Geomagnetic Cutoff Rigidity Contours Layer (GLE#77 Model) ── */}
        {(showRigidityContours || showMagneticEquator) && (
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 6
            }}
          >
            <defs>
              <filter id="geomagGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Iso-Rigidity Contour Lines (1 - 17 GV) */}
            {showRigidityContours && rigidityContourPaths.map(contour => (
              <g key={`contour-${contour.id}`}>
                {/* Subtle outer glow */}
                <path
                  d={contour.pathD}
                  fill="none"
                  stroke={contour.color}
                  strokeWidth={(contour.isClosed ? 4.5 : 3.5) / Math.sqrt(zoom)}
                  opacity={0.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#geomagGlow)"
                />

                {/* Main Crisp Contour Line */}
                <path
                  d={contour.pathD}
                  fill={contour.isClosed ? `${contour.color}15` : 'none'}
                  stroke={contour.color}
                  strokeWidth={(contour.isClosed ? 2.2 : 1.4) / Math.sqrt(zoom)}
                  strokeDasharray={contour.rc <= 2 ? 'none' : 'none'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />

                {/* Level Number Label directly on contour (Matching GLE#77 chart) */}
                {contour.labelX > 0 && contour.labelY > 0 && (
                  <text
                    x={contour.labelX}
                    y={contour.labelY + 4 / Math.sqrt(zoom)}
                    fill="#FFFFFF"
                    fontSize={11.5 / Math.sqrt(zoom)}
                    fontFamily="monospace"
                    fontWeight={900}
                    textAnchor="middle"
                    style={{
                      paintOrder: 'stroke fill',
                      stroke: 'rgba(0, 0, 0, 0.95)',
                      strokeWidth: 3.5 / Math.sqrt(zoom),
                      strokeLinejoin: 'round'
                    }}
                  >
                    {contour.label}
                  </text>
                )}
              </g>
            ))}

            {/* Magnetic Equator (Dip Equator) Dashed Orange Line */}
            {showMagneticEquator && (
              <g key="magnetic-equator-group">
                <path
                  d={magneticEquatorPath}
                  fill="none"
                  stroke="rgba(249, 115, 22, 0.4)"
                  strokeWidth={5 / Math.sqrt(zoom)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#geomagGlow)"
                />
                <path
                  d={magneticEquatorPath}
                  fill="none"
                  stroke="#F97316"
                  strokeWidth={2 / Math.sqrt(zoom)}
                  strokeDasharray="9 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Labels along Magnetic Equator */}
                {[-130, -20, 140].map(targetLon => {
                  const pt = MAGNETIC_EQUATOR_POINTS.find(p => Math.abs(p.lon - targetLon) < 15) || MAGNETIC_EQUATOR_POINTS[0]
                  const { x, y } = projectCoordinates(pt.lat, pt.lon)
                  return (
                    <text
                      key={`mag-lbl-${targetLon}`}
                      x={x}
                      y={y - 8 / Math.sqrt(zoom)}
                      fill="#F97316"
                      fontSize={10.5 / Math.sqrt(zoom)}
                      fontFamily="monospace"
                      fontWeight={700}
                      letterSpacing={0.8}
                      textAnchor="middle"
                      style={{ textShadow: '0 0 6px rgba(0,0,0,0.9), 0 0 10px rgba(249,115,22,0.8)' }}
                    >
                      Magnetic Equator
                    </text>
                  )
                })}
              </g>
            )}
          </svg>
        )}

        {/* Station Markers Overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
          {filteredStations.map(station => {
            const { x, y } = projectCoordinates(station.lat, station.lon)
            const isOnline = station.status === 'active'
            const isSelected = selectedStation?.id === station.id
            const isHovered = hoveredStation?.id === station.id

            // Scale marker size dynamically so it stays visible and crisp at all zoom levels
            const baseScale = Math.max(0.85, Math.min(1.5, 1.25 / Math.sqrt(zoom)))

            // Check if station has recorded data in the GLE#77 event dataset
            const hasGle77Data = Boolean(
              timelinePayload
                ? timelinePayload.stations.includes(station.id)
                : (station.id in GLE77_STATION_MAP)
            )
            const isNoDataOrOffline = mapMode === 'gle77' ? !hasGle77Data : !isOnline

            // Determine marker color, size, and styling based on active mapMode
            let color = getRigidityColor(station.cutoffRigidity, isOnline)
            let markerSize = isSelected ? 15 : (isOnline ? 11 : 6)
            let borderWidth = isOnline ? 2 : 1
            let borderColor = isSelected ? color : (isOnline ? '#070C17' : '#334155')
            let glow = isOnline ? `0 0 10px ${color}, 0 0 20px ${color}80` : 'none'
            let hasRadarPulse = isOnline && (isSelected || isHovered)
            let radarPulseSize = isSelected ? 28 : 18
            let radarPulseColor = `${color}40`
            let zIndexPriority = isSelected ? 50 : isHovered ? 40 : (isOnline ? 20 : 5)
            let gleData: GLE77StationData | null = null
            let dynamicPct = 0.0

            if (mapMode === 'gle77') {
              if (!hasGle77Data) {
                // Station has NO DATA in this GLE#77 event / detector is offline:
                // Clear slate node (8.5px) with crisp border and subtle ambient shadow
                markerSize = isSelected ? 12 : 8.5
                color = '#64748B'
                borderWidth = 1.5
                borderColor = '#CBD5E1'
                glow = '0 0 6px rgba(100, 116, 139, 0.4)'
                hasRadarPulse = false
                zIndexPriority = isSelected ? 35 : 8
              } else {
                const currentVal = currentStationValues.get(station.id) ?? 0.0
                dynamicPct = currentVal
                const val = Math.max(0, currentVal)

                if (val <= 0.5) {
                  // Active monitor baseline quiet: Hollow ring (transparent inside with crisp silver border)
                  markerSize = isSelected ? 14 : 10
                  color = 'rgba(15, 23, 42, 0.4)'
                  borderWidth = 2
                  borderColor = isSelected ? '#38BDF8' : '#CBD5E1'
                  glow = isSelected ? '0 0 8px rgba(56, 189, 248, 0.6)' : 'none'
                  hasRadarPulse = false
                  zIndexPriority = isSelected ? 50 : 15
                } else if (val < 15.0) {
                  // Low enhancement (1-15%): Grows to 16-24px, bright coral/orange
                  markerSize = Math.round(15 + (val / 15) * 9)
                  color = '#FB923C'
                  borderWidth = 2.5
                  borderColor = '#FFFFFF'
                  glow = '0 0 16px rgba(251, 146, 60, 0.85)'
                  hasRadarPulse = false
                  zIndexPriority = isSelected ? 50 : 25
                } else if (val < 45.0) {
                  // Moderate enhancement (15-45%): Grows to 25-37px, vibrant amber
                  markerSize = Math.round(25 + ((val - 15) / 30) * 12)
                  color = '#F59E0B'
                  borderWidth = 3
                  borderColor = '#FEF08A'
                  glow = '0 0 24px rgba(245, 158, 11, 0.9), 0 0 40px rgba(245, 158, 11, 0.5)'
                  hasRadarPulse = true
                  radarPulseSize = markerSize + 12
                  radarPulseColor = 'rgba(245, 158, 11, 0.4)'
                  zIndexPriority = isSelected ? 50 : 30
                } else if (val < 85.0) {
                  // High enhancement (45-85%): Expands to 38-52px, radiant golden sun
                  markerSize = Math.round(38 + ((val - 45) / 40) * 14)
                  color = '#FACC15'
                  borderWidth = 3.5
                  borderColor = '#FFFFFF'
                  glow = '0 0 32px #FACC15, 0 0 55px rgba(250, 204, 21, 0.85)'
                  hasRadarPulse = true
                  radarPulseSize = markerSize + 18
                  radarPulseColor = 'rgba(250, 204, 21, 0.5)'
                  zIndexPriority = isSelected ? 55 : 35
                } else {
                  // Super surge (>85%): Expands to 53-70px, colossal white-gold orb!
                  markerSize = Math.round(53 + Math.min(17, ((val - 85) / 60) * 17))
                  color = '#FEF08A'
                  borderWidth = 4
                  borderColor = '#FFFFFF'
                  glow = '0 0 45px #FEF08A, 0 0 85px rgba(250, 204, 21, 0.95), 0 0 120px rgba(250, 204, 21, 0.6)'
                  hasRadarPulse = true
                  radarPulseSize = markerSize + 26
                  radarPulseColor = 'rgba(254, 240, 138, 0.7)'
                  zIndexPriority = isSelected ? 65 : 45
                }
              }
            }

            return (
              <div
                key={station.id}
                className="station-marker-group"
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: Math.max(48, markerSize + 20),
                  height: Math.max(48, markerSize + 20),
                  transform: `translate(-50%, -50%) scale(${baseScale})`,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  zIndex: zIndexPriority,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isNoDataOrOffline ? (isHovered || isSelected ? 1 : 0.72) : 1,
                  transition: 'opacity 0.2s ease'
                }}
                onClick={e => {
                  e.stopPropagation()
                  onSelectStation(station)
                }}
                onMouseEnter={e => {
                  setHoveredStation(station)
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    })
                  }
                }}
                onMouseMove={e => {
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    })
                  }
                }}
                onMouseLeave={() => setHoveredStation(null)}
              >
                {/* Generous hover/click hitbox area */}
                <div
                  style={{
                    position: 'absolute',
                    inset: -14,
                    borderRadius: '50%',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                />

                {/* Outer Radar Ring (In standard rigidity mode for live streams or in gle77 during large surges) */}
                {hasRadarPulse && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: radarPulseSize,
                      height: radarPulseSize,
                      marginTop: -(radarPulseSize / 2),
                      marginLeft: -(radarPulseSize / 2),
                      borderRadius: '50%',
                      background: radarPulseColor,
                      border: `1px solid ${color}`,
                      animation: 'radarPulse 1.8s cubic-bezier(0.2, 0.8, 0.4, 1) infinite',
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* Second Selection Ring */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: markerSize + 14,
                      height: markerSize + 14,
                      marginTop: -((markerSize + 14) / 2),
                      marginLeft: -((markerSize + 14) / 2),
                      borderRadius: '50%',
                      border: `1.5px dashed ${color}`,
                      animation: 'radarPulse 3s cubic-bezier(0.2, 0.8, 0.4, 1) 0.8s infinite',
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* Core Station Circle / Marker with smooth size and color morphing transitions */}
                <div
                  style={{
                    width: markerSize,
                    height: markerSize,
                    borderRadius: '50%',
                    background: (mapMode === 'rigidity' && isSelected) ? '#FFFFFF' : color,
                    border: `${borderWidth}px solid ${borderColor}`,
                    boxShadow: glow,
                    transition: mapMode === 'gle77'
                      ? 'width 0.8s ease-out, height 0.8s ease-out, background 0.8s ease-out, border-color 0.8s ease-out, box-shadow 0.8s ease-out'
                      : 'width 0.8s cubic-bezier(0.34, 1.35, 0.64, 1), height 0.8s cubic-bezier(0.34, 1.35, 0.64, 1), background 0.6s ease, border-color 0.6s ease, box-shadow 0.6s ease, transform 0.2s ease',
                    transform: isHovered || isSelected ? 'scale(1.25)' : 'scale(1)',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}
                />

                {/* Station Tag / Label (Positioned cleanly below the circle with high-contrast text) */}
                {(showLabels || isHovered || isSelected) && (() => {
                  const isPolarSouth = station.lat < -70
                  const margin = 5
                  const halfSize = Math.round(markerSize / 2)
                  return (
                    <div
                      className="marker-label"
                      style={{
                        position: 'absolute',
                        ...(isPolarSouth
                          ? { bottom: `calc(50% + ${halfSize + margin}px)` }
                          : { top: `calc(50% + ${halfSize + margin}px)` }
                        ),
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        background: isNoDataOrOffline ? 'rgba(15, 23, 42, 0.85)' : 'rgba(3, 7, 18, 0.85)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        border: `1px ${isNoDataOrOffline ? 'dashed' : 'solid'} ${isSelected ? color : isHovered ? color : isNoDataOrOffline ? 'rgba(203, 213, 225, 0.55)' : 'rgba(255, 255, 255, 0.22)'}`,
                        padding: '1px 5px',
                        borderRadius: 3,
                        fontSize: isNoDataOrOffline ? 10.5 : 11,
                        fontFamily: 'monospace',
                        fontWeight: isNoDataOrOffline ? 700 : 800,
                        color: isNoDataOrOffline ? '#CBD5E1' : '#F8FAFC',
                        letterSpacing: 0.6,
                        pointerEvents: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        transition: 'top 0.4s ease-out, bottom 0.4s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 30
                      }}
                    >
                      <span>{station.id}</span>
                    </div>
                  )
                })()}



              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════ FLOATING HUD CONTROLS ═══════════════════════ */}
      {/* Top Right: Zoom & Layer Control Toolbar */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: selectedStation ? 450 : 16, // Shift left if station drawer is open
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'right 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Zoom Controls */}
        <div style={{
          background: 'rgba(5, 10, 24, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
            onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
            onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleResetView}
            title="Reset View"
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
            onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* View Toggles */}
        <div style={{
          background: 'rgba(5, 10, 24, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Basemap Switcher */}
          <button
            onClick={() => {
              if (basemap === 'satellite_day') setBasemap('night_lights')
              else if (basemap === 'night_lights') setBasemap('dark_space')
              else setBasemap('satellite_day')
            }}
            title={`Basemap: ${basemap}`}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            {basemap === 'satellite_day' ? <Sun size={16} /> : basemap === 'night_lights' ? <Moon size={16} /> : <Layers size={16} />}
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title={`Grid: ${showGrid ? 'ON' : 'OFF'}`}
            style={{
              padding: 8,
              background: showGrid ? 'rgba(56,189,248,0.15)' : 'transparent',
              border: 'none',
              color: showGrid ? '#38BDF8' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <Crosshair size={16} />
          </button>

          {/* Station Labels Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            title={`Station Labels: ${showLabels ? 'ON' : 'OFF'}`}
            style={{
              padding: 8,
              background: showLabels ? 'rgba(56,189,248,0.15)' : 'transparent',
              border: 'none',
              color: showLabels ? '#38BDF8' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          {/* Iso-Rigidity Contours Toggle (1-17 GV) */}
          <button
            onClick={() => setShowRigidityContours(!showRigidityContours)}
            title={`Cutoff Rigidity Contours (1-17 GV): ${showRigidityContours ? 'ON' : 'OFF'}`}
            style={{
              padding: 8,
              background: showRigidityContours ? 'rgba(56,189,248,0.18)' : 'transparent',
              border: 'none',
              color: showRigidityContours ? '#38BDF8' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <Activity size={16} />
          </button>

          {/* Magnetic Equator Layer Toggle */}
          <button
            onClick={() => setShowMagneticEquator(!showMagneticEquator)}
            title={`Magnetic Equator: ${showMagneticEquator ? 'ON' : 'OFF'}`}
            style={{
              padding: 8,
              background: showMagneticEquator ? 'rgba(249,115,22,0.2)' : 'transparent',
              border: 'none',
              color: showMagneticEquator ? '#F97316' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <Compass size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Subtle GLE#77 Loop Status Badge (Non-intrusive corner pill) */}
      {mapMode === 'gle77' && timelinePayload && (
        <div style={{
          position: 'absolute',
          bottom: 14,
          right: 16,
          zIndex: 40,
          background: 'rgba(3, 7, 18, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(250, 204, 21, 0.35)',
          borderRadius: 6,
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          boxShadow: '0 4px 18px rgba(0,0,0,0.7)',
          fontFamily: 'monospace'
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
          <span style={{ fontSize: 11, color: '#FACC15', fontWeight: 800 }}>
            GLE#77 LOOP ({averagingWindow}m):
          </span>
          <span style={{ fontSize: 11.5, color: '#F8FAFC', fontWeight: 700 }}>
            {currentTimestamp || '---'} UTC
          </span>
        </div>
      )}


      {/* Hover Tooltip (Follows Cursor) with Real-Time Sparkline Graph */}
      {hoveredStation && !selectedStation && (() => {
        const isOnline = hoveredStation.status === 'active'
        const hasGle77Data = Boolean(
          timelinePayload
            ? timelinePayload.stations.includes(hoveredStation.id)
            : (hoveredStation.id in GLE77_STATION_MAP)
        )
        const gleData = getGLE77Data(hoveredStation.id, hoveredStation.cutoffRigidity, averagingWindow)
        const gStyle = getGLE77MarkerStyle(gleData.tier, false, gleData.increasePercent)
        const color = mapMode === 'gle77'
          ? (!hasGle77Data ? '#64748B' : gleData.tier === 'none' ? '#CBD5E1' : gStyle.color)
          : getRigidityColor(hoveredStation.cutoffRigidity, isOnline)
        const sparkline = sparklines[hoveredStation.id]
        const rawPoints = sparkline?.data || []
        const validPoints = rawPoints.filter(p => p && p.count_rate > 0)

        // Tooltip geometry
        const tooltipWidth = 260
        const tooltipHeight = mapMode === 'gle77' ? (isOnline ? 180 : 125) : (isOnline ? 150 : 100)
        const left = Math.min(Math.max(tooltipPos.x + 18, 16), (containerRef.current?.clientWidth || 800) - tooltipWidth - 16)
        const top = tooltipPos.y > tooltipHeight + 20
          ? tooltipPos.y - tooltipHeight
          : tooltipPos.y + 20

        return (
          <div style={{
            position: 'absolute',
            left,
            top,
            zIndex: 80,
            background: 'rgba(6, 13, 31, 0.96)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${color}`,
            borderLeft: `4px solid ${color}`,
            padding: '10px 12px',
            borderRadius: 4,
            boxShadow: '0 10px 30px rgba(0,0,0,0.85)',
            pointerEvents: 'none',
            width: tooltipWidth,
            transition: 'opacity 0.1s ease'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <span style={{
                color,
                fontWeight: 700,
                fontSize: 15,
                fontFamily: "'Orbitron', monospace",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {hoveredStation.name}
              </span>
              <span style={{
                color: isOnline ? '#22C55E' : '#94A3B8',
                background: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                padding: '1px 5px',
                borderRadius: 2,
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {isOnline ? 'LIVE' : 'NO STREAM'}
              </span>
            </div>

            {/* GLE#77 Special Event Badge (When in GLE#77 mode) */}
            {mapMode === 'gle77' && (() => {
              if (!hasGle77Data) {
                return (
                  <div style={{
                    margin: '6px 0',
                    padding: '6px 8px',
                    borderRadius: 4,
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px dashed rgba(100, 116, 139, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: '#94A3B8' }}>
                      GLE#77 TELEMETRY:
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: hoveredStation.status === 'offline' ? '#EF4444' : '#64748B'
                    }}>
                      {hoveredStation.status === 'offline' ? 'STATION OFFLINE' : 'NO RECORDED DATA'}
                    </span>
                  </div>
                )
              }

              const liveVal = currentStationValues.get(hoveredStation.id) ?? 0.0
              const liveColor = liveVal >= 65 ? '#FEF08A' : liveVal >= 30 ? '#FACC15' : liveVal >= 5 ? '#FB923C' : '#CBD5E1'
              return (
                <div style={{
                  margin: '6px 0',
                  padding: '6px 8px',
                  borderRadius: 4,
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: `1px solid ${liveColor}50`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}>
                  {/* Current Frame Value */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: '#CBD5E1', fontWeight: 700 }}>
                      {t('cosmic.current_flux')} ({currentTimestamp || t('common.live')}):
                    </span>
                    <span style={{
                      fontSize: 14,
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: liveColor,
                      textShadow: liveVal >= 5 ? `0 0 10px ${liveColor}` : 'none'
                    }}>
                      {liveVal > 0 ? `+${liveVal.toFixed(1)}%` : `${liveVal.toFixed(1)}%`}
                    </span>
                  </div>

                  {/* Event Peak Value */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 3 }}>
                    <span style={{ fontSize: 8.5, fontFamily: 'monospace', color: '#64748B' }}>
                      {t('cosmic.event_peak')} ({averagingWindow}{t('cosmic.min')}):
                    </span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: gStyle.color }}>
                      {gleData.increasePercent > 0 ? `+${gleData.increasePercent.toFixed(1)}%` : '0.0%'}
                    </span>
                  </div>

                  {gleData.notes && (
                    <div style={{ fontSize: 8.5, color: '#94A3B8', lineHeight: 1.2, marginTop: 1 }}>
                      {gleData.notes}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Metrics */}
            <div style={{ fontSize: 9.5, color: '#CBD5E1', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <div>
                <span style={{ color: '#64748B' }}>{t('cosmic.coords')}:</span> {hoveredStation.lat.toFixed(2)}°, {hoveredStation.lon.toFixed(2)}° ({hoveredStation.altitude}m)
              </div>
              <div>
                <span style={{ color: '#64748B' }}>{t('cosmic.cutoff_rc')}:</span>{' '}
                <strong style={{ color: isOnline ? color : '#94A3B8' }}>
                  {hoveredStation.cutoffRigidity.toFixed(2)} GV
                </strong>
              </div>
            </div>

            {/* Live Sparkline Graph */}
            {isOnline && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {sparkline?.loading ? (
                  <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 12, fontFamily: 'monospace' }}>
                    {t('cosmic.loading_telemetry')}
                  </div>
                ) : validPoints.length >= 2 ? (() => {
                  const values = validPoints.map(p => p.count_rate)
                  const min = Math.min(...values)
                  const max = Math.max(...values)
                  const range = max - min || 1
                  const w = 216
                  const h = 34
                  const padY = 3

                  const pts = values.map((v, i) => {
                    const x = (i / (values.length - 1)) * w
                    const y = h - padY - ((v - min) / range) * (h - padY * 2)
                    return `${x.toFixed(1)},${y.toFixed(1)}`
                  })

                  const latest = values[values.length - 1]
                  const first = values[0]
                  const diffPct = first ? ((latest - first) / first) * 100 : 0

                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 8.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                          COUNT RATE (1H)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', fontFamily: 'monospace' }}>
                            {latest.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </span>
                          <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>cpm</span>
                          <span style={{
                            fontSize: 8.5,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: diffPct >= 0 ? '#4ADE80' : '#F87171'
                          }}>
                            {diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                      <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
                        <defs>
                          <linearGradient id={`grad-tt-${hoveredStation.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d={`M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`} fill={`url(#grad-tt-${hoveredStation.id})`} />
                        <path d={`M ${pts.join(' L ')}`} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <circle
                          cx={w}
                          cy={h - padY - ((latest - min) / range) * (h - padY * 2)}
                          r="2.5"
                          fill="#FFF"
                          stroke={color}
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  )
                })() : (
                  <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 12, fontFamily: 'monospace' }}>
                    TELEMETRY FRAMES SYNCING...
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
