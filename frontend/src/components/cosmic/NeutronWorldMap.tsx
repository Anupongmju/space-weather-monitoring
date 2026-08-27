import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
  getShieldingDescription
} from '../../services/neutronStationsData'
import { ISO_RIGIDITY_CONTOURS } from '../../services/geomagneticContours'
import { loadNeutron } from '../../services/cosmicService'

interface NeutronWorldMapProps {
  onSelectStation: (station: NeutronStation) => void
  selectedStation: NeutronStation | null
}

type BasemapStyle = 'satellite_day' | 'night_lights' | 'dark_space'
type RigidityFilter = 'all' | 'polar' | 'mid' | 'equatorial'

export default function NeutronWorldMap({
  onSelectStation,
  selectedStation
}: NeutronWorldMapProps) {
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
  const [rigidityFilter, setRigidityFilter] = useState<RigidityFilter>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    const y = ((90 - lat) / 180) * MAP_H
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

  // ── Clamp pan so map always fills the viewport (no empty black edges) ──
  const clampPan = useCallback((px: number, py: number, z: number): { x: number; y: number } => {
    const el = containerRef.current
    if (!el) return { x: px, y: py }
    const { width, height } = el.getBoundingClientRect()
    const scaledW = MAP_W * z
    const scaledH = MAP_H * z
    // If the scaled map is smaller than the viewport on an axis, center it
    const clampedX = scaledW <= width
      ? (width - scaledW) / 2
      : Math.min(0, Math.max(width - scaledW, px))
    const clampedY = scaledH <= height
      ? (height - scaledH) / 2
      : Math.min(0, Math.max(height - scaledH, py))
    return { x: clampedX, y: clampedY }
  }, [MAP_W, MAP_H])

  // ── Compute minimum zoom so map always fully covers the viewport ──
  const getMinZoom = useCallback((): number => {
    const el = containerRef.current
    if (!el) return 0.8
    const { width, height } = el.getBoundingClientRect()
    const minByW = width / MAP_W
    const minByH = height / MAP_H
    return Math.max(minByW, minByH, 0.5)
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
      const minZoom = (() => {
        const w = rect.width
        const h = rect.height
        return Math.max(w / MAP_W, h / MAP_H, 0.5)
      })()
      const nextZoom = Math.min(Math.max(currentZoom * zoomFactor, minZoom), 8.0)

      // Zoom centered towards cursor position
      const scaleChange = nextZoom - currentZoom
      const rawPan = {
        x: currentPan.x - (cursorX - currentPan.x) * (scaleChange / currentZoom),
        y: currentPan.y - (cursorY - currentPan.y) * (scaleChange / currentZoom)
      }
      const newPan = (() => {
        const scaledW = MAP_W * nextZoom
        const scaledH = MAP_H * nextZoom
        const clampedX = scaledW <= rect.width
          ? (rect.width - scaledW) / 2
          : Math.min(0, Math.max(rect.width - scaledW, rawPan.x))
        const clampedY = scaledH <= rect.height
          ? (rect.height - scaledH) / 2
          : Math.min(0, Math.max(rect.height - scaledH, rawPan.y))
        return { x: clampedX, y: clampedY }
      })()

      zoomRef.current = nextZoom
      panRef.current = newPan
      setZoom(nextZoom)
      setPan(newPan)
    }

    // { passive: false } is critical — allows preventDefault() to suppress page scroll
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, []) // empty deps: el ref is stable, we read fresh values via zoomRef/panRef

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
    // Reset to min-zoom that fills the screen, centered
    const minZ = getMinZoom()
    const z = Math.max(1, minZ)
    const el = containerRef.current
    if (!el) { setZoom(z); setPan({ x: 0, y: 0 }); return }
    const { width, height } = el.getBoundingClientRect()
    const cx = (width - MAP_W * z) / 2
    const cy = (height - MAP_H * z) / 2
    const clamped = clampPan(cx, cy, z)
    setZoom(z)
    setPan(clamped)
  }

  // Fly to station
  const handleFlyToStation = (station: NeutronStation) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const { x, y } = projectCoordinates(station.lat, station.lon)
    const targetZoom = 2.5

    const mapScale = rect.width / MAP_W
    const stationPixelX = x * mapScale
    const stationPixelY = y * mapScale

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    setZoom(targetZoom)
    setPan({
      x: centerX - stationPixelX * targetZoom,
      y: centerY - stationPixelY * targetZoom
    })
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

  // ── On mount (and resize): auto-fit the map to cover the viewport ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const fitToViewport = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!width || !height) return
      // Pick the zoom that makes the map cover the screen (cover strategy)
      const z = Math.max(width / MAP_W, height / MAP_H, 0.5)
      // Center the map
      const cx = (width - MAP_W * z) / 2
      const cy = (height - MAP_H * z) / 2
      zoomRef.current = z
      panRef.current = { x: cx, y: cy }
      setZoom(z)
      setPan({ x: cx, y: cy })
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
        minHeight: 'calc(100vh - 60px)',
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
            const color = getRigidityColor(station.cutoffRigidity, isOnline)
            const isSelected = selectedStation?.id === station.id
            const isHovered = hoveredStation?.id === station.id

            // Scale marker size dynamically so it stays visible and crisp at all zoom levels
            const baseScale = Math.max(0.85, Math.min(1.5, 1.25 / Math.sqrt(zoom)))

            return (
              <div
                key={station.id}
                className="station-marker-group"
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: 36,
                  height: 36,
                  transform: `translate(-50%, -50%) scale(${baseScale})`,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  zIndex: isSelected ? 40 : isHovered ? 30 : 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isOnline ? 1 : 0.7
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
                {/* Invisible generous hover/click hitbox area */}
                <div
                  style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: '50%',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                />

                {/* Outer Pulsing Radar Ring (Active for Online or when Selected/Hovered) */}
                {(isOnline || isSelected || isHovered) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: isSelected ? 26 : 18,
                      height: isSelected ? 26 : 18,
                      marginTop: isSelected ? -13 : -9,
                      marginLeft: isSelected ? -13 : -9,
                      borderRadius: '50%',
                      background: `${color}40`,
                      border: `1px solid ${color}`,
                      animation: isOnline ? 'radarPulse 2.4s cubic-bezier(0.2, 0.8, 0.4, 1) infinite' : 'none',
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* Second Radar Ring for selected stations */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 36,
                      height: 36,
                      marginTop: -18,
                      marginLeft: -18,
                      borderRadius: '50%',
                      border: `1.5px dashed ${color}`,
                      animation: 'radarPulse 3s cubic-bezier(0.2, 0.8, 0.4, 1) 0.8s infinite',
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* Core Station Dot */}
                <div
                  style={{
                    width: isSelected ? 15 : 11,
                    height: isSelected ? 15 : 11,
                    borderRadius: '50%',
                    background: isSelected ? '#FFFFFF' : color,
                    border: `2px solid ${isSelected ? color : '#070C17'}`,
                    boxShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
                    transition: 'all 0.15s ease',
                    transform: isHovered || isSelected ? 'scale(1.4)' : 'scale(1)',
                    pointerEvents: 'none'
                  }}
                />

                {/* Station Tag / Label */}
                {(showLabels || isHovered || isSelected) && (
                  <div
                    className="marker-label"
                    style={{
                      position: 'absolute',
                      top: isSelected ? 24 : 20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      background: 'rgba(5, 10, 24, 0.92)',
                      backdropFilter: 'blur(6px)',
                      border: `1px solid ${isSelected ? color : isHovered ? color : 'rgba(255, 255, 255, 0.2)'}`,
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: isSelected ? '#FFFFFF' : color,
                      letterSpacing: 0.5,
                      pointerEvents: 'none',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.8)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {station.id}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════ FLOATING HUD CONTROLS ═══════════════════════ */}
      {/* Top Left: Title & Filter Controls */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 500,
        width: 'max-content'
      }}>
        {/* Title Badge */}
        <div style={{
          background: 'rgba(6, 13, 31, 0.78)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderLeft: '4px solid #38BDF8',
          padding: '10px 14px',
          borderRadius: 4,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, whiteSpace: 'nowrap' }}>
            <span style={{
              fontFamily: "'Orbitron', var(--font-sans), monospace",
              fontSize: 13,
              fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: 1,
              whiteSpace: 'nowrap'
            }}>
              GLOBAL NEUTRON STATIONS
            </span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ADE80',
              padding: '3px 8px',
              borderRadius: 3,
              fontFamily: 'monospace',
              fontSize: 10,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E', flexShrink: 0 }} />
              {NEUTRON_STATIONS.filter(s => s.status === 'active').length} LIVE / {NEUTRON_STATIONS.length} TOTAL
            </span>
          </div>
          <p style={{
            margin: '4px 0 0',
            color: '#94A3B8',
            fontSize: 10.5,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}>
            Real-time planetary cosmic ray & solar particle monitoring network
          </p>
        </div>

        {/* Rigidity Filter Chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All', color: '#38BDF8' },
            { id: 'polar', label: 'Polar (<2 GV)', color: '#EF4444' },
            { id: 'mid', label: 'Mid (2-10 GV)', color: '#EAB308' },
            { id: 'equatorial', label: 'Equatorial (>10 GV)', color: '#A855F7' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setRigidityFilter(f.id as RigidityFilter)}
              style={{
                padding: '4px 9px',
                background: rigidityFilter === f.id ? `${f.color}35` : 'rgba(6, 13, 31, 0.78)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${rigidityFilter === f.id ? f.color : 'rgba(255,255,255,0.12)'}`,
                color: rigidityFilter === f.id ? '#FFFFFF' : '#CBD5E1',
                fontFamily: 'monospace',
                fontSize: 10,
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

      {/* Bottom Bar: Cutoff Rigidity Legend & Info */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 60,
        background: 'rgba(6, 13, 31, 0.78)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '10px 16px',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        maxWidth: 'calc(100% - 32px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#94A3B8', fontWeight: 600, letterSpacing: 1 }}>
          VERTICAL CUTOFF RIGIDITY (Rc):
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '< 1 GV (Polar)', color: '#EF4444' },
            { label: '1 - 3 GV', color: '#F97316' },
            { label: '3 - 5 GV', color: '#EAB308' },
            { label: '5 - 8 GV', color: '#22C55E' },
            { label: '8 - 12 GV', color: '#06B6D4' },
            { label: '12 - 15 GV', color: '#3B82F6' },
            { label: '> 15 GV (Doi Inthanon)', color: '#A855F7' },
            { label: 'No Stream / Offline', color: '#64748B' },
            { label: '🧲 Magnetic Equator', color: '#F97316', isLine: true }
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {item.isLine ? (
                <span style={{ width: 14, height: 2, background: item.color, borderTop: '1px dashed #F97316', boxShadow: `0 0 6px ${item.color}` }} />
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
              )}
              <span style={{ color: item.isLine ? '#FDBA74' : '#CBD5E1', fontSize: 10, fontFamily: 'monospace', fontWeight: item.isLine ? 700 : 400 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip (Follows Cursor) with Real-Time Sparkline Graph */}
      {hoveredStation && !selectedStation && (() => {
        const isOnline = hoveredStation.status === 'active'
        const color = getRigidityColor(hoveredStation.cutoffRigidity, isOnline)
        const sparkline = sparklines[hoveredStation.id]
        const rawPoints = sparkline?.data || []
        const validPoints = rawPoints.filter(p => p && p.count_rate > 0)

        // Tooltip geometry
        const tooltipWidth = 240
        const tooltipHeight = isOnline ? 150 : 100
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
            background: 'rgba(6, 13, 31, 0.95)',
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
                fontSize: 12,
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
                fontSize: 9,
                fontFamily: 'monospace',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {isOnline ? 'LIVE' : 'NO STREAM'}
              </span>
            </div>

            {/* Metrics */}
            <div style={{ fontSize: 9.5, color: '#CBD5E1', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <div>
                <span style={{ color: '#64748B' }}>Coords:</span> {hoveredStation.lat.toFixed(2)}°, {hoveredStation.lon.toFixed(2)}° ({hoveredStation.altitude}m)
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Cutoff Rc:</span>{' '}
                <strong style={{ color: isOnline ? color : '#94A3B8' }}>
                  {hoveredStation.cutoffRigidity.toFixed(2)} GV
                </strong>
              </div>
            </div>

            {/* Live Sparkline Graph */}
            {isOnline && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {sparkline?.loading ? (
                  <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 9, fontFamily: 'monospace' }}>
                    LOADING TELEMETRY...
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
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC', fontFamily: 'monospace' }}>
                            {latest.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </span>
                          <span style={{ fontSize: 8, color: '#64748B', fontFamily: 'monospace' }}>cpm</span>
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
                  <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 9, fontFamily: 'monospace' }}>
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
