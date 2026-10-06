import React, { useEffect, useRef, useState } from 'react'
import { MoonEventPosition } from '../../services/moonService'
import { useTheme } from '../../context/ThemeContext'

interface MoonOrbitBackgroundProps {
  events: MoonEventPosition[]
  selectedEvent: MoonEventPosition | null
  hoveredEvent: MoonEventPosition | null
  onSelectEvent: (event: MoonEventPosition) => void
  onHoverEvent: (event: MoonEventPosition | null) => void
  initialPosition?: 'dashboard' | 'center'
  replayIntroTrigger?: number
}

export default React.memo(function MoonOrbitBackground({
  events,
  selectedEvent,
  hoveredEvent,
  onSelectEvent,
  onHoverEvent,
  initialPosition = 'dashboard',
  replayIntroTrigger = 0,
}: MoonOrbitBackgroundProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // SVG Canvas dimensions matching OrbitBackground.tsx (1920x1080)
  const W = 1920
  const H = 1080

  // Earth centered in the screen
  const EARTH_X = 960
  const CY = 540
  const EARTH_R = 140 // Large, majestic Earth matching OrbitBackground.tsx

  // Moon Orbit Ellipse (Perfect golden ratio framing for all screens)
  const MOON_RX = 620
  const MOON_RY = 325
  const MOON_R = 32 // Base radius

  // Auto-Zoom on Hover / Selection toggle
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(false)

  // Sticky persistent focused event (latches during Cinematic Zoom so camera glide doesn't slip off cursor)
  const [stickyFocusedEvent, setStickyFocusedEvent] = useState<MoonEventPosition | null>(null)

  // Active Tooltip Sparkline Tab ('crater' | 'goes')
  const [tooltipGraphTab, setTooltipGraphTab] = useState<'crater' | 'goes'>('crater')

  // ── 1-ROUND INTRO REVOLUTION ANIMATION (360° ORBIT SWEEP) ──
  const [isIntroActive, setIsIntroActive] = useState(true)
  const introStartTimeRef = useRef(performance.now())
  const introActiveRef = useRef(true)
  const revealedSetRef = useRef<Set<number>>(new Set())
  const heroMoonGroupRef = useRef<SVGGElement | null>(null)
  const heroTrailPathRef = useRef<SVGPathElement | null>(null)
  const heroTrailGlowPathRef = useRef<SVGPathElement | null>(null)
  const hudProgressRef = useRef<HTMLSpanElement | null>(null)
  const INTRO_DURATION_MS = 5500 // Smooth full 360° revolution

  // ── HOVER DEBOUNCE / BRIDGING / STICKY FOCUS ──
  const hoverTimeoutRef = useRef<any>(null)

  const handleMoonEnter = (evt: MoonEventPosition) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (autoZoomEnabled) {
      setStickyFocusedEvent(evt)
    }
    onHoverEvent(evt)
  }

  const handleMoonLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (!autoZoomEnabled) {
      hoverTimeoutRef.current = setTimeout(() => {
        onHoverEvent(null)
      }, 140)
    }
  }

  const handleTooltipEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }

  const handleTooltipLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (!autoZoomEnabled) {
      hoverTimeoutRef.current = setTimeout(() => {
        onHoverEvent(null)
      }, 140)
    }
  }

  // When moving mouse near outer edges of the viewport (within 70px), release sticky zoom
  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!autoZoomEnabled || !stickyFocusedEvent || selectedEvent) return
    const edgeThreshold = 70
    const { clientX, clientY } = e
    const isNearEdge =
      clientX < edgeThreshold ||
      clientX > window.innerWidth - edgeThreshold ||
      clientY < edgeThreshold ||
      clientY > window.innerHeight - edgeThreshold

    if (isNearEdge) {
      setStickyFocusedEvent(null)
      onHoverEvent(null)
    }
  }

  // Replay handler
  const handleReplayIntro = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    introStartTimeRef.current = performance.now()
    introActiveRef.current = true
    revealedSetRef.current.clear()
    setIsIntroActive(true)
    setStickyFocusedEvent(null)
    onHoverEvent(null)
    onSelectEvent({} as MoonEventPosition)

    // Reset station elements directly in DOM
    events.forEach(evt => {
      const el = document.getElementById(`moon-station-${evt.id}`)
      if (el) {
        el.setAttribute('data-revealed', 'false')
        el.style.opacity = '0'
        el.style.transform = 'scale(0)'
      }
    })
    if (hudProgressRef.current) {
      hudProgressRef.current.textContent = `0° / 360° · 0/${events.length} stations active`
    }
  }

  // Fast-forward / skip intro
  const handleSkipIntro = () => {
    introActiveRef.current = false
    setIsIntroActive(false)
    events.forEach(evt => {
      revealedSetRef.current.add(evt.id)
      const el = document.getElementById(`moon-station-${evt.id}`)
      if (el) {
        el.setAttribute('data-revealed', 'true')
        el.style.opacity = '1'
        el.style.transform = 'scale(1)'
      }
    })
    if (heroTrailPathRef.current) heroTrailPathRef.current.setAttribute('opacity', '0')
    if (heroTrailGlowPathRef.current) heroTrailGlowPathRef.current.setAttribute('opacity', '0')
  }

  // Listen to external replay trigger if passed
  const lastReplayTriggerRef = useRef(replayIntroTrigger)
  useEffect(() => {
    if (replayIntroTrigger !== lastReplayTriggerRef.current) {
      lastReplayTriggerRef.current = replayIntroTrigger
      handleReplayIntro()
    }
  }, [replayIntroTrigger])

  // Camera Physics LERP state refs:
  // Starts directly at Center (X=EARTH_X, Y=CY, Scale=1.0) — completely stationary on page load
  const cameraGroupRef = useRef<SVGGElement | null>(null)
  const currentCamX = useRef(EARTH_X)
  const currentCamY = useRef(CY)
  const currentCamZoom = useRef(1.0)
  const targetCamX = useRef(EARTH_X)
  const targetCamY = useRef(CY)
  const targetCamZoom = useRef(1.0)

  // Refs for orbital satellite animations
  const rotatingEarthRef = useRef<SVGGElement | null>(null)
  const thailandRef = useRef<SVGGElement | null>(null)
  const goesSatRef = useRef<SVGGElement | null>(null)
  const issSatRef = useRef<SVGGElement | null>(null)

  // Calculate Screen (X, Y) on the large Moon Orbit Ellipse (Counter-Clockwise orbit around Earth)
  const getMoonScreenPos = (elongationDeg: number) => {
    const angleRad = Math.PI - (elongationDeg * Math.PI) / 180.0
    return {
      x: EARTH_X + MOON_RX * Math.cos(angleRad),
      y: CY + MOON_RY * Math.sin(angleRad),
    }
  }

  // Active target for dynamic camera zoom and tooltip display
  const activeEvent = selectedEvent || hoveredEvent || (autoZoomEnabled ? stickyFocusedEvent : null)
  const activeMoonPos = (autoZoomEnabled && activeEvent)
    ? getMoonScreenPos(activeEvent.elongation_deg)
    : null

  // Update target coordinates whenever activeMoonPos changes
  useEffect(() => {
    if (activeMoonPos) {
      targetCamX.current = EARTH_X * 0.32 + activeMoonPos.x * 0.68
      targetCamY.current = CY * 0.32 + activeMoonPos.y * 0.68
      targetCamZoom.current = 1.32
    } else {
      targetCamX.current = EARTH_X
      targetCamY.current = CY
      targetCamZoom.current = 1.0
    }
  }, [activeMoonPos])

  // Reset focus when clicking on empty background
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'rect') {
      setStickyFocusedEvent(null)
      onHoverEvent(null)
      onSelectEvent({} as MoonEventPosition)
    }
  }

  // Format doserate numbers nicely
  const formatDose = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A'
    if (val >= 1.0) return val.toFixed(3)
    if (val < 0.0001) return val.toExponential(2)
    return val.toFixed(4)
  }

  const formatProtonVal = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A'
    if (val >= 1000) return val.toFixed(0)
    if (val >= 10) return val.toFixed(1)
    if (val >= 1.0) return val.toFixed(2)
    if (val >= 0.001) return val.toFixed(4)
    return val.toExponential(1)
  }

  // Helper to build SVG sparkline path from hourly/5m numbers (with fast downsampling for 60+ FPS performance)
  const buildSparkline = (
    pts: (number | null | undefined)[],
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    globalMin?: number,
    globalMax?: number
  ) => {
    if (!pts || pts.length === 0) return ''
    // Downsample large series (e.g. 288 5-min pts) to 48 pts for instant SVG path rendering
    let samplePts = pts
    if (pts.length > 50) {
      const step = Math.ceil(pts.length / 48)
      samplePts = []
      for (let i = 0; i < pts.length; i += step) {
        samplePts.push(pts[i])
      }
      if (samplePts[samplePts.length - 1] !== pts[pts.length - 1]) {
        samplePts.push(pts[pts.length - 1])
      }
    }

    const valid = samplePts.filter((p): p is number => p !== null && p !== undefined && !isNaN(p))
    if (valid.length === 0) return ''

    const mn = globalMin !== undefined ? Math.min(globalMin, Math.min(...valid)) : Math.min(...valid)
    const mx = globalMax !== undefined ? Math.max(globalMax, Math.max(...valid)) : Math.max(...valid)
    const range = mx - mn === 0 ? 1 : mx - mn

    return samplePts
      .map((val, idx) => {
        const px = cx + (idx / Math.max(1, samplePts.length - 1)) * cw
        const safe = val !== null && val !== undefined && !isNaN(val) ? val : mn
        const py = cy + ch - ((safe - mn) / range) * (ch - 4) - 2
        return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
      })
      .join(' ')
  }

  // Helper: cubic easeInOut for buttery smooth intro sweep acceleration & deceleration
  const easeInOutCubic = (x: number): number => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
  }

  // 120 FPS Continuous Physics LERP Animation Loop
  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const animate = (nowTime: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (nowTime - lastTime) / 1000))
      lastTime = nowTime
      const t = nowTime / 1000

      // Physics exponential decay damping for camera motion (buttery smooth inertia)
      const factor = 1.0 - Math.exp(-3.6 * dt)

      currentCamX.current += (targetCamX.current - currentCamX.current) * factor
      currentCamY.current += (targetCamY.current - currentCamY.current) * factor
      currentCamZoom.current += (targetCamZoom.current - currentCamZoom.current) * factor

      if (cameraGroupRef.current) {
        const cx = currentCamX.current
        const cy = currentCamY.current
        const cz = currentCamZoom.current
        cameraGroupRef.current.setAttribute(
          'transform',
          `translate(${EARTH_X}, ${CY}) scale(${cz.toFixed(4)}) translate(-${cx.toFixed(2)}, -${cy.toFixed(2)})`
        )
      }

      // Earth & Thailand real-time rotation
      const now = new Date()
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600
      const bangkokHours = (utcHours + 7) % 24
      const thTargetAngle = 360 - (bangkokHours / 24) * 360
      const earthRotation = thTargetAngle - 50

      if (rotatingEarthRef.current) {
        rotatingEarthRef.current.setAttribute('transform', `rotate(${earthRotation.toFixed(2)}, ${EARTH_X}, ${CY})`)
      }

      if (thailandRef.current) {
        const thRadius = 116.05
        const thAngleRad = (thTargetAngle * Math.PI) / 180
        const thX = EARTH_X + thRadius * Math.cos(thAngleRad)
        const thY = CY + thRadius * Math.sin(thAngleRad)
        thailandRef.current.setAttribute('transform', `translate(${thX.toFixed(2)}, ${thY.toFixed(2)})`)
      }

      // GOES satellite counter-clockwise orbit
      if (goesSatRef.current) {
        const goesAngle = -t * 0.08 + Math.PI
        const rx = 190
        const ry = 190
        const gx = EARTH_X + rx * Math.cos(goesAngle)
        const gy = CY + ry * Math.sin(goesAngle)
        const toEarthAngle = Math.atan2(CY - gy, EARTH_X - gx)
        const rotateDeg = (toEarthAngle * 180) / Math.PI + 90
        goesSatRef.current.setAttribute(
          'transform',
          `translate(${gx.toFixed(2)}, ${gy.toFixed(2)}) rotate(${rotateDeg.toFixed(2)})`
        )
      }

      // ISS fast LEO orbit (accurately mapped to the 28° tilted ellipse)
      if (issSatRef.current) {
        const issAngle = -t * 0.18 + Math.PI * 0.35
        const rLeo = 158
        const tiltRad = (28 * Math.PI) / 180

        const x0 = rLeo * Math.cos(issAngle)
        const y0 = rLeo * Math.sin(issAngle)

        const ix = EARTH_X + (x0 * Math.cos(tiltRad) - y0 * Math.sin(tiltRad))
        const iy = CY + (x0 * Math.sin(tiltRad) + y0 * Math.cos(tiltRad))

        const toEarthAngle = Math.atan2(CY - iy, EARTH_X - ix)
        const rotateDeg = (toEarthAngle * 180) / Math.PI + 90

        issSatRef.current.setAttribute(
          'transform',
          `translate(${ix.toFixed(2)}, ${iy.toFixed(2)}) rotate(${rotateDeg.toFixed(2)})`
        )
      }

      // ── 1-ROUND INTRO REVOLUTION SWEEP (360° ORBIT AROUND EARTH) ──
      if (introActiveRef.current) {
        const elapsed = nowTime - introStartTimeRef.current
        const rawProgress = Math.min(1.0, Math.max(0.0, elapsed / INTRO_DURATION_MS))
        const easedP = easeInOutCubic(rawProgress)
        const currentAngleDeg = easedP * 360 // sweeps 0 -> 360 degrees counter-clockwise

        // Update Hero Revolving Moon screen coordinate
        const heroPos = getMoonScreenPos(currentAngleDeg)
        if (heroMoonGroupRef.current) {
          heroMoonGroupRef.current.setAttribute(
            'transform',
            `translate(${heroPos.x.toFixed(2)}, ${heroPos.y.toFixed(2)})`
          )
        }

        // Update glowing orbital wake trail along the ellipse arc behind Hero Moon
        const trailLengthDeg = Math.min(150, currentAngleDeg)
        const trailStartAngle = currentAngleDeg - trailLengthDeg
        if (trailLengthDeg > 1) {
          const steps = 20
          const arcPts: string[] = []
          for (let s = 0; s <= steps; s++) {
            const a = trailStartAngle + (s / steps) * trailLengthDeg
            const p = getMoonScreenPos(a)
            arcPts.push(`${s === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          }
          const dStr = arcPts.join(' ')
          if (heroTrailPathRef.current) {
            heroTrailPathRef.current.setAttribute('d', dStr)
            heroTrailPathRef.current.setAttribute('opacity', '1')
          }
          if (heroTrailGlowPathRef.current) {
            heroTrailGlowPathRef.current.setAttribute('d', dStr)
            heroTrailGlowPathRef.current.setAttribute('opacity', '0.4')
          }
        } else {
          if (heroTrailPathRef.current) heroTrailPathRef.current.setAttribute('d', '')
          if (heroTrailGlowPathRef.current) heroTrailGlowPathRef.current.setAttribute('d', '')
        }

        // Check which numbered moons have been passed and reveal them DIRECTLY in DOM (0ms React overhead!)
        for (const evt of events) {
          if (currentAngleDeg >= evt.elongation_deg && !revealedSetRef.current.has(evt.id)) {
            revealedSetRef.current.add(evt.id)
            const el = document.getElementById(`moon-station-${evt.id}`)
            if (el) {
              el.setAttribute('data-revealed', 'true')
              el.style.opacity = '1'
              el.style.transform = 'scale(1)'
            }
          }
        }

        // Update HUD text directly in DOM (zero re-renders)
        if (hudProgressRef.current) {
          hudProgressRef.current.textContent = `${Math.round(currentAngleDeg)}° / 360° · ${revealedSetRef.current.size}/${events.length} stations active`
        }

        // 1 Full Round Completed!
        if (rawProgress >= 1.0) {
          introActiveRef.current = false
          setIsIntroActive(false)
          events.forEach(evt => {
            revealedSetRef.current.add(evt.id)
            const el = document.getElementById(`moon-station-${evt.id}`)
            if (el) {
              el.setAttribute('data-revealed', 'true')
              el.style.opacity = '1'
              el.style.transform = 'scale(1)'
            }
          })
          if (heroTrailPathRef.current) heroTrailPathRef.current.setAttribute('opacity', '0')
          if (heroTrailGlowPathRef.current) heroTrailGlowPathRef.current.setAttribute('opacity', '0')
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [events])

  return (
    <div
      onMouseMove={handleContainerMouseMove}
      onClick={handleBackgroundClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#000000',
        overflow: 'hidden',
        zIndex: 0,
        userSelect: 'none',
      }}
    >
      <style>{`
        .ghost-moon-station {
          transform-origin: 0px 0px;
          cursor: pointer !important;
        }
        .ghost-moon-station * {
          cursor: pointer !important;
        }
        .ghost-moon-body {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
          transform-origin: 0px 0px;
          will-change: transform, opacity;
          cursor: pointer !important;
        }
        .ghost-moon-halo {
          transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: 0px 0px;
          will-change: transform, opacity;
        }
        .ghost-moon-badge {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), fill 0.2s ease, stroke 0.2s ease;
          transform-origin: 0px 0px;
          cursor: pointer !important;
        }
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .ghost-moon-overlay-tooltip {
          animation: tooltipFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: auto;
          cursor: pointer !important;
        }
        .ghost-moon-overlay-tooltip * {
          cursor: pointer !important;
        }
      `}</style>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100vw', height: '100vh', display: 'block' }}
      >
        <defs>
          {/* Hero Moon Orbital Trail Gradients */}
          <linearGradient id="heroTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#FBBF24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>

          {/* Earth Pattern & Gradient Shading */}
          <pattern id="realEarthTexture" x="0" y="0" width="1" height="1" viewBox="0 0 280 280">
            <image
              href="https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78349/arctic_vir_2012147.jpg"
              x="0"
              y="0"
              width="280"
              height="280"
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>

          <radialGradient id="bgEarthBase" cx="35%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="45%" stopColor="#1E40AF" />
            <stop offset="85%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          <linearGradient id="earthNightShadow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="30%" stopColor="black" stopOpacity="0" />
            <stop offset="60%" stopColor="black" stopOpacity="0.6" />
            <stop offset="90%" stopColor="black" stopOpacity="0.9" />
            <stop offset="100%" stopColor="black" stopOpacity="0.95" />
          </linearGradient>

          {/* Moon Texture Pattern & Gradients */}
          <pattern id="realMoonTexturePattern" width="1" height="1" patternContentUnits="objectBoundingBox">
            <image
              href="/assets/moon.jpg"
              x="0"
              y="0"
              width="1"
              height="1"
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>

          <radialGradient id="bgMoonBase" cx="30%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#e6e6e6" />
            <stop offset="40%" stopColor="#a0a0a0" />
            <stop offset="70%" stopColor="#555555" />
            <stop offset="100%" stopColor="#111111" />
          </radialGradient>

          <linearGradient id="moonTerminatorShadow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="25%" stopColor="black" stopOpacity="0" />
            <stop offset="55%" stopColor="black" stopOpacity="0.65" />
            <stop offset="90%" stopColor="black" stopOpacity="0.95" />
          </linearGradient>

          {/* GOES Solar Panels */}
          <linearGradient id="goesSolarPanel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Background Stars Pattern */}
          <pattern id="orbitBgStars" width="500" height="500" patternUnits="userSpaceOnUse">
            <circle cx="40" cy="90" r="1.3" fill="#ffffff" opacity="0.35" />
            <circle cx="130" cy="40" r="0.8" fill="#ffffff" opacity="0.25" />
            <circle cx="260" cy="170" r="1.5" fill="#a2d5f2" opacity="0.45" />
            <circle cx="380" cy="110" r="1.0" fill="#ffffff" opacity="0.35" />
            <circle cx="80" cy="320" r="1.4" fill="#ffffff" opacity="0.3" />
            <circle cx="210" cy="410" r="0.9" fill="#a2d5f2" opacity="0.4" />
            <circle cx="340" cy="310" r="1.6" fill="#ffffff" opacity="0.25" />
            <circle cx="450" cy="460" r="1.1" fill="#ffffff" opacity="0.35" />
          </pattern>
        </defs>

        {/* ── BACKGROUND STARS (Fixed in canvas) ── */}
        <rect width="100%" height="100%" fill="url(#orbitBgStars)" />

        {/* ── 120 FPS CINEMATIC CAMERA VIEWPORT (GLIDES SILKY SMOOTH VIA PHYSICS LERP) ── */}
        <g ref={cameraGroupRef}>
          {/* ── LARGE MOON ORBIT PATH ELLIPSE ── */}
          <g>
            <ellipse
              cx={EARTH_X}
              cy={CY}
              rx={MOON_RX}
              ry={MOON_RY}
              fill="none"
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth="2"
              strokeDasharray="6 12"
            />

            {/* Cardinal Phase Labels (Counter-Clockwise arrangement) */}
            <g fontFamily="var(--font-mono)" fontSize="11" fill="#94A3B8" opacity="0.8">
              {/* New Moon (Left: 0° Elongation) */}
              <circle cx={EARTH_X - MOON_RX} cy={CY} r="4" fill="#64748B" />
              <text x={EARTH_X - MOON_RX - 16} y={CY - 8} textAnchor="end" fontWeight="700">
                NEW MOON
              </text>

              {/* First Quarter (Bottom: 90° Elongation in CCW) */}
              <circle cx={EARTH_X} cy={CY + MOON_RY} r="4" fill="#64748B" />
              <text x={EARTH_X} y={CY + MOON_RY + 24} textAnchor="middle" fontWeight="700">
                FIRST QUARTER
              </text>

              {/* Full Moon (Right: 180° Elongation) */}
              <circle cx={EARTH_X + MOON_RX} cy={CY} r="4" fill="#64748B" />
              <text x={EARTH_X + MOON_RX + 16} y={CY - 8} textAnchor="start" fontWeight="700">
                FULL MOON
              </text>

              {/* Third Quarter (Top: 270° Elongation in CCW) */}
              <circle cx={EARTH_X} cy={CY - MOON_RY} r="4" fill="#64748B" />
              <text x={EARTH_X} y={CY - MOON_RY - 16} textAnchor="middle" fontWeight="700">
                THIRD QUARTER
              </text>
            </g>
          </g>

          {/* ── REAL EARTH AT CENTER ── */}
          <g>
            {/* Rotating Earth Body */}
            <g ref={rotatingEarthRef}>
              <circle cx={EARTH_X} cy={CY} r={EARTH_R} fill="url(#bgEarthBase)" />
              <circle cx={EARTH_X} cy={CY} r={EARTH_R} fill="url(#realEarthTexture)" />
            </g>

            {/* GOES Orbit Ring */}
            <ellipse
              cx={EARTH_X}
              cy={CY}
              rx={190}
              ry={190}
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
              strokeDasharray="4 8"
            />

            {/* ISS LEO Orbit Ring */}
            <ellipse
              cx={EARTH_X}
              cy={CY}
              rx={158}
              ry={158}
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
              strokeDasharray="4 6"
              transform={`rotate(28, ${EARTH_X}, ${CY})`}
            />

            {/* Nightside Terminator Shadow on Right */}
            <circle cx={EARTH_X} cy={CY} r={EARTH_R} fill="url(#earthNightShadow)" />
            <circle cx={EARTH_X} cy={CY} r={EARTH_R} fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

            {/* Thailand Indicator */}
            <g ref={thailandRef} transform={`translate(${EARTH_X + 74.6}, ${CY + 88.9})`}>
              <circle cx="0" cy="0" r="5" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.8">
                <animate attributeName="r" values="2;9" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="2" fill="#00e5ff" />
              <text x="6" y="3" fill="rgba(0, 229, 255, 0.95)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="bold">
                THAI
              </text>
            </g>

            {/* GOES Satellite */}
            <g ref={goesSatRef}>
              <circle cx="0" cy="0" r="12" fill="rgba(0,229,255,0.12)" />
              <rect x="-24" y="-2" width="12" height="8" rx="1" fill="url(#goesSolarPanel)" stroke="rgba(0,229,255,0.6)" strokeWidth="0.5" />
              <rect x="12" y="-2" width="12" height="8" rx="1" fill="url(#goesSolarPanel)" stroke="rgba(0,229,255,0.6)" strokeWidth="0.5" />
              <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="#E2E8F0" stroke="#0284C7" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="2.5" fill="#00e5ff">
                <animate attributeName="r" values="2;6" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x="0" y="14" fill="#00e5ff" fontSize="8" fontFamily="var(--font-mono)" fontWeight="bold" textAnchor="middle">
                GOES
              </text>
            </g>

            {/* ISS Satellite */}
            <g ref={issSatRef}>
              <circle cx="0" cy="0" r="14" fill="rgba(96, 165, 250, 0.15)" />
              <rect x="-26" y="-8" width="10" height="16" rx="1" fill="#1E293B" stroke="#60A5FA" strokeWidth="0.6" />
              <rect x="16" y="-8" width="10" height="16" rx="1" fill="#1E293B" stroke="#60A5FA" strokeWidth="0.6" />
              <line x1="-24" y1="0" x2="24" y2="0" stroke="#CBD5E1" strokeWidth="1.5" />
              <rect x="-4" y="-6" width="8" height="12" rx="1.5" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="2" fill="#3B82F6" />
              <text x="0" y="15" fill="#60A5FA" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="bold" textAnchor="middle">
                ISS
              </text>
            </g>

            {/* Earth Label */}
            <text
              x={EARTH_X}
              y={CY + EARTH_R + 32}
              fill="#38BDF8"
              fontSize="15"
              fontFamily="var(--font-mono)"
              fontWeight="800"
              textAnchor="middle"
              letterSpacing="2"
            >
              EARTH
            </text>
          </g>

          {/* ── 1-ROUND HERO REVOLVING MOON & ORBITAL PLASMA TRAIL ── */}
          <g>
            {/* Dual Layer High-Performance Glowing Plasma Trail */}
            <path
              ref={heroTrailGlowPathRef}
              d=""
              fill="none"
              stroke="#38BDF8"
              strokeWidth="10"
              strokeLinecap="round"
              style={{ opacity: 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}
            />
            <path
              ref={heroTrailPathRef}
              d=""
              fill="none"
              stroke="url(#heroTrailGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{ opacity: 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}
            />

            {/* Hero Revolving Moon (Sweeps 1 Full Lap around Earth) */}
            <g
              ref={heroMoonGroupRef}
              transform={`translate(${getMoonScreenPos(0).x}, ${getMoonScreenPos(0).y})`}
              style={{
                display: isIntroActive ? 'block' : 'none',
                pointerEvents: 'none',
              }}
            >
              {/* Outer Energy Halo & Pulsing Beacon Ring */}
              <circle cx="0" cy="0" r={MOON_R + 12} fill="rgba(251, 191, 36, 0.3)" />
              <circle cx="0" cy="0" r={MOON_R + 22} fill="none" stroke="#FDE68A" strokeWidth="2" strokeDasharray="8 6" />

              {/* Real Moon Texture Sphere */}
              <circle cx="0" cy="0" r={MOON_R + 3} fill="url(#bgMoonBase)" />
              <circle cx="0" cy="0" r={MOON_R + 3} fill="url(#realMoonTexturePattern)" />
              <circle cx="0" cy="0" r={MOON_R + 3} fill="url(#moonTerminatorShadow)" />
              <circle cx="0" cy="0" r={MOON_R + 3} fill="none" stroke="#FFFFFF" strokeWidth="2.5" />

              {/* Dynamic Beacon Center Flare */}
              <circle cx="0" cy="0" r="5" fill="#FFFFFF" />

              {/* Active Scanner Tag */}
              <g transform={`translate(0, ${MOON_R + 28})`}>
                <rect
                  x="-55"
                  y="-9"
                  width="110"
                  height="18"
                  rx="3"
                  fill="rgba(5, 10, 24, 0.92)"
                  stroke="#FBBF24"
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="4"
                  fill="#FDE68A"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fontWeight="900"
                  textAnchor="middle"
                  letterSpacing="1"
                >
                  ORBIT SCAN · 1-LAP
                </text>
              </g>
            </g>
          </g>

          {/* ── GHOST MOONS ALONG THE ORBIT (STABLE DOM RENDERING FOR ZERO JITTER) ── */}
          <g>
            {events.map((evt) => {
              const { x, y } = getMoonScreenPos(evt.elongation_deg)
              const isSelected = selectedEvent?.id === evt.id
              const isHovered = hoveredEvent?.id === evt.id
              const isHighlighted = isHovered || isSelected

              return (
                <g
                  key={`ghost-moon-${evt.id}`}
                  transform={`translate(${x}, ${y})`}
                  className="ghost-moon-station"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectEvent(evt)
                  }}
                  onMouseEnter={() => handleMoonEnter(evt)}
                  onMouseLeave={handleMoonLeave}
                >
                  {/* Precise Non-Overlapping Circular Hitbox */}
                  <circle cx="0" cy="0" r={MOON_R + 5} fill="transparent" style={{ pointerEvents: 'auto', cursor: 'pointer' }} />

                  {/* Inner Content (Revealed during/after 1-lap intro sweep) */}
                  <g
                    id={`moon-station-${evt.id}`}
                    data-revealed={isIntroActive ? 'false' : 'true'}
                    style={{
                      opacity: isIntroActive ? 0 : 1,
                      transform: isIntroActive ? 'scale(0)' : 'scale(1)',
                      transition: 'opacity 0.28s ease, transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1)',
                      transformOrigin: '0px 0px',
                      pointerEvents: 'none',
                    }}
                  >
                    {/* 1. Luminous Glowing Halo & Beacon Ring */}
                    <g
                      className="ghost-moon-halo"
                      style={{
                        opacity: isHighlighted ? 1 : 0,
                        transform: isHighlighted ? 'scale(1)' : 'scale(0.75)',
                        pointerEvents: 'none',
                      }}
                    >
                      <circle cx="0" cy="0" r={MOON_R + 10} fill="rgba(251, 191, 36, 0.3)" />
                      <circle cx="0" cy="0" r={MOON_R + 18} fill="none" stroke="#FBBF24" strokeWidth="2" opacity="0.9" />
                    </g>

                    {/* Ambient faint halo in inactive state */}
                    <circle
                      cx="0"
                      cy="0"
                      r={MOON_R + 3}
                      fill="rgba(255, 255, 255, 0.06)"
                      style={{
                        opacity: isHighlighted ? 0 : 1,
                        transition: 'opacity 0.2s ease',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* 2. Moon Body with Smooth Scale and Opacity */}
                    <g
                      className="ghost-moon-body"
                      style={{
                        opacity: isHovered ? 1.0 : isSelected ? 0.95 : 0.75,
                        transform: isHovered ? 'scale(1.2)' : isSelected ? 'scale(1.12)' : 'scale(1)',
                        pointerEvents: 'none',
                      }}
                    >
                      <circle cx="0" cy="0" r={MOON_R} fill="url(#bgMoonBase)" />
                      <circle cx="0" cy="0" r={MOON_R} fill="url(#realMoonTexturePattern)" />
                      {/* Phase Shadow */}
                      <circle cx="0" cy="0" r={MOON_R} fill="url(#moonTerminatorShadow)" />
                      <circle
                        cx="0"
                        cy="0"
                        r={MOON_R}
                        fill="none"
                        stroke={isHighlighted ? '#FBBF24' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={isHighlighted ? 2.5 : 1.2}
                        style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
                      />
                    </g>

                    {/* 3. Number Badge (#1..#26) placed cleanly below the moon */}
                    <g
                      className="ghost-moon-badge"
                      style={{
                        transform: isHighlighted ? 'translate(0px, 46px) scale(1.06)' : 'translate(0px, 44px) scale(1)',
                        pointerEvents: 'none',
                      }}
                    >
                      <rect
                        x="-14"
                        y="-9"
                        width="28"
                        height="18"
                        rx="3"
                        fill={isHighlighted ? '#FBBF24' : 'rgba(5, 10, 24, 0.92)'}
                        stroke={isHighlighted ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                        strokeWidth={isHighlighted ? 1.5 : 1.0}
                        style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
                      />
                      <text
                        x="0"
                        y="4"
                        fill={isHighlighted ? '#000000' : '#FFFFFF'}
                        fontSize="10.5"
                        fontFamily="var(--font-mono)"
                        fontWeight="900"
                        textAnchor="middle"
                        style={{ transition: 'fill 0.2s ease' }}
                      >
                        {evt.id}
                      </text>
                    </g>
                  </g>
                </g>
              )
            })}
          </g>

          {/* ── TOP LAYER: SINGLE ACTIVE TOOLTIP (PLACED OUTSIDE THE ORBIT IN ALL 4 QUADRANTS) ── */}
          {(() => {
            const activeTooltipEvent = hoveredEvent || selectedEvent || (autoZoomEnabled ? stickyFocusedEvent : null)
            if (!activeTooltipEvent) return null

            const { x, y } = getMoonScreenPos(activeTooltipEvent.elongation_deg)
            const W_CARD = 278
            const H_CARD = 168

            const dx = (x - EARTH_X) / MOON_RX
            const dy = (y - CY) / MOON_RY
            const angle = Math.atan2(dy, dx) // -PI to +PI

            let cardX = 0
            let cardY = 0

            // 4 Radial Sectors:
            // - TOP / BOTTOM: Point INWARDS towards Earth (into the wide open space between Moon and Earth)
            // - LEFT / RIGHT: Point OUTWARDS into the wide screen side margins
            if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) {
              // TOP SECTOR (Third Quarter area) -> Place BELOW the moon (towards Earth/inward)
              cardX = -W_CARD / 2 + dx * 25
              cardY = MOON_R + 20
            } else if (angle >= Math.PI * 0.25 && angle <= Math.PI * 0.75) {
              // BOTTOM SECTOR (First Quarter area) -> Place ABOVE the moon (towards Earth/inward)
              cardX = -W_CARD / 2 + dx * 25
              cardY = -MOON_R - 20 - H_CARD
            } else if (Math.abs(angle) > Math.PI * 0.75) {
              // LEFT SECTOR (New Moon area) -> Place to the LEFT (outward)
              cardX = -MOON_R - 20 - W_CARD
              cardY = -H_CARD / 2 + dy * 20
            } else {
              // RIGHT SECTOR (Full Moon area) -> Place to the RIGHT (outward)
              cardX = MOON_R + 20
              cardY = -H_CARD / 2 + dy * 20
            }

            // Keep within SVG horizontal bounds (margin 25px)
            if (x + cardX < 25) {
              cardX = 25 - x
            } else if (x + cardX + W_CARD > W - 25) {
              cardX = W - 25 - W_CARD - x
            }

            // Keep within SVG vertical bounds (margin 25px)
            if (y + cardY < 25) {
              cardY = 25 - y
            } else if (y + cardY + H_CARD > H - 25) {
              cardY = H - 25 - H_CARD - y
            }

            // Data sources
            const dose = activeTooltipEvent.doserate
            const hasValidDose = dose && dose.status !== 'DATA_GAP' && (dose.d12 !== null || dose.d56 !== null)

            const goes = activeTooltipEvent.goes_proton
            const hasValidGoes = goes && goes.status !== 'DATA_GAP' && (goes.avg_low !== null || goes.avg_mid !== null || (goes.series && goes.series.length > 0))

            const chartX = cardX + 10
            const chartY = cardY + 74
            const chartW = 258
            const chartH = 50

            // 1. CRaTER Sparkline Paths
            const hourlyPts = dose?.hourly || []
            const d12Pts = hourlyPts.map(h => h.d12)
            const d34Pts = hourlyPts.map(h => h.d34)
            const d56Pts = hourlyPts.map(h => h.d56)

            const d12Path = buildSparkline(d12Pts, chartX, chartY, chartW, chartH)
            const d34Path = buildSparkline(d34Pts, chartX, chartY, chartW, chartH)
            const d56Path = buildSparkline(d56Pts, chartX, chartY, chartW, chartH)

            // 2. GOES Proton Sparkline Paths
            const goesPts = goes?.series || []
            const pLowPts = goesPts.map(g => g.p_low)
            const pMidPts = goesPts.map(g => g.p_mid)
            const pHighPts = goesPts.map(g => g.p_high)

            const pLowPath = buildSparkline(pLowPts, chartX, chartY, chartW, chartH)
            const pMidPath = buildSparkline(pMidPts, chartX, chartY, chartW, chartH)
            const pHighPath = buildSparkline(pHighPts, chartX, chartY, chartW, chartH)

            return (
              <g
                key={`active-tooltip-${activeTooltipEvent.id}`}
                transform={`translate(${x}, ${y})`}
                style={{ pointerEvents: 'none' }}
              >
                <g
                  className="ghost-moon-overlay-tooltip"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onMouseEnter={handleTooltipEnter}
                  onMouseLeave={handleTooltipLeave}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectEvent(activeTooltipEvent)
                  }}
                >
                  {/* Tooltip Card Frame */}
                  <rect
                    x={cardX}
                    y={cardY}
                    width={W_CARD}
                    height={H_CARD}
                    rx="6"
                    fill="rgba(5, 10, 24, 0.95)"
                    stroke="#FBBF24"
                    strokeWidth="1.5"
                    style={{
                      cursor: 'pointer',
                      filter: 'drop-shadow(0 8px 28px rgba(0, 0, 0, 0.9))',
                    }}
                  />

                  {/* Header: Point # and Date */}
                  <rect x={cardX} y={cardY} width={W_CARD} height="24" rx="5" fill="rgba(251, 191, 36, 0.16)" />
                  <text x={cardX + 10} y={cardY + 16} fill="#FBBF24" fontSize="11" fontFamily="var(--font-mono)" fontWeight="700">
                    POINT #{activeTooltipEvent.id} · {activeTooltipEvent.date}
                  </text>
                  <text x={cardX + W_CARD - 10} y={cardY + 16} fill="#CBD5E1" fontSize="9.5" fontFamily="var(--font-mono)" textAnchor="end">
                    {activeTooltipEvent.phase_name} ({activeTooltipEvent.illumination_pct}%)
                  </text>

                  {/* ── INTERACTIVE TAB SWITCHER (CRaTER vs GOES PROTON) ── */}
                  <g transform={`translate(0, ${cardY + 28})`}>
                    {/* Tab 1: CRaTER DOSE */}
                    <g
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTooltipGraphTab('crater')
                      }}
                    >
                      <rect
                        x={cardX + 8}
                        y="0"
                        width="128"
                        height="20"
                        rx="4"
                        fill={tooltipGraphTab === 'crater' ? 'rgba(244, 114, 182, 0.22)' : 'rgba(255, 255, 255, 0.05)'}
                        stroke={tooltipGraphTab === 'crater' ? '#F472B6' : 'rgba(255, 255, 255, 0.15)'}
                        strokeWidth="1"
                      />
                      <text
                        x={cardX + 72}
                        y="13.5"
                        fill={tooltipGraphTab === 'crater' ? '#FDE68A' : '#94A3B8'}
                        fontSize="9.5"
                        fontFamily="var(--font-mono)"
                        fontWeight={tooltipGraphTab === 'crater' ? '700' : '500'}
                        textAnchor="middle"
                      >
                        🌙 CRaTER DOSE
                      </text>
                    </g>

                    {/* Tab 2: GOES PROTON DIFF */}
                    <g
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTooltipGraphTab('goes')
                      }}
                    >
                      <rect
                        x={cardX + 142}
                        y="0"
                        width="128"
                        height="20"
                        rx="4"
                        fill={tooltipGraphTab === 'goes' ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.05)'}
                        stroke={tooltipGraphTab === 'goes' ? '#38BDF8' : 'rgba(255, 255, 255, 0.15)'}
                        strokeWidth="1"
                      />
                      <text
                        x={cardX + 206}
                        y="13.5"
                        fill={tooltipGraphTab === 'goes' ? '#38BDF8' : '#94A3B8'}
                        fontSize="9.5"
                        fontFamily="var(--font-mono)"
                        fontWeight={tooltipGraphTab === 'goes' ? '700' : '500'}
                        textAnchor="middle"
                      >
                        🛰️ GOES {goes?.mode === 'DIFFERENTIAL' ? 'DIFF' : 'PROTON'}
                      </text>
                    </g>
                  </g>

                  {/* ── TAB 1 CONTENT: CRATER DOSERATE ── */}
                  {tooltipGraphTab === 'crater' && (
                    hasValidDose ? (
                      <g>
                        {/* Metrics Row */}
                        <g fontFamily="var(--font-mono)" fontSize="9">
                          <text x={cardX + 10} y={cardY + 63} fill="#94A3B8">
                            D12: <tspan fill="#4ADE80" fontWeight="700">{formatDose(dose?.d12)}</tspan>
                          </text>
                          <text x={cardX + 100} y={cardY + 63} fill="#94A3B8">
                            D34: <tspan fill="#38BDF8" fontWeight="700">{formatDose(dose?.d34)}</tspan>
                          </text>
                          <text x={cardX + 184} y={cardY + 63} fill="#94A3B8">
                            D56: <tspan fill="#F472B6" fontWeight="700">{formatDose(dose?.d56)}</tspan> <tspan fill="#64748B" fontSize="8">cGy/yr</tspan>
                          </text>
                        </g>

                        {/* Mini 24H Spectrum Sparkline Area */}
                        <g>
                          <rect
                            x={chartX}
                            y={chartY}
                            width={chartW}
                            height={chartH}
                            fill="rgba(0, 0, 0, 0.65)"
                            stroke="rgba(255, 255, 255, 0.12)"
                            strokeWidth="0.8"
                            rx="2"
                          />
                          <line x1={chartX} y1={chartY + chartH / 2} x2={chartX + chartW} y2={chartY + chartH / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                          {d34Path && <path d={d34Path} fill="none" stroke="#38BDF8" strokeWidth="1.6" opacity="0.85" />}
                          {d56Path && <path d={d56Path} fill="none" stroke="#F472B6" strokeWidth="2.0" />}
                          {d12Path && <path d={d12Path} fill="none" stroke="#4ADE80" strokeWidth="2.0" />}

                          <text x={chartX + 4} y={chartY + chartH - 4} fill="#64748B" fontSize="7.5" fontFamily="var(--font-mono)">00:00</text>
                          <text x={chartX + chartW / 2} y={chartY + chartH - 4} fill="#64748B" fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="middle">12:00</text>
                          <text x={chartX + chartW - 4} y={chartY + chartH - 4} fill="#64748B" fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="end">24:00</text>
                        </g>

                        {/* Mini Legend */}
                        <g fontFamily="var(--font-mono)" fontSize="8" transform={`translate(0, ${cardY + 144})`}>
                          <text x={cardX + 10} y="0" fill="#4ADE80">● D12 (Thin)</text>
                          <text x={cardX + 96} y="0" fill="#38BDF8">● D34 (GCR)</text>
                          <text x={cardX + 180} y="0" fill="#F472B6">● D56 (Tissue)</text>
                        </g>
                      </g>
                    ) : (
                      <g fontFamily="var(--font-mono)">
                        <text x={cardX + W_CARD / 2} y={cardY + 80} fill="#EF4444" textAnchor="middle" fontSize="10" fontWeight="700">
                          CRaTER: SAFE MODE / DATA GAP
                        </text>
                        <text x={cardX + W_CARD / 2} y={cardY + 100} fill="#94A3B8" textAnchor="middle" fontSize="9">
                          No continuous lunar detector telemetry
                        </text>
                        <text x={cardX + W_CARD / 2} y={cardY + 124} fill="#38BDF8" textAnchor="middle" fontSize="9">
                          👉 Click "GOES PROTON" tab to view solar flux
                        </text>
                      </g>
                    )
                  )}

                  {/* ── TAB 2 CONTENT: GOES PROTON DIFFERENTIAL / INTEGRAL FLUX ── */}
                  {tooltipGraphTab === 'goes' && (
                    hasValidGoes ? (
                      <g>
                        {/* Metrics Row */}
                        <g fontFamily="var(--font-mono)" fontSize="9">
                          <text x={cardX + 10} y={cardY + 63} fill="#94A3B8">
                            {goes?.channel_low_label}: <tspan fill="#38BDF8" fontWeight="700">{formatProtonVal(goes?.avg_low)}</tspan>
                          </text>
                          <text x={cardX + 100} y={cardY + 63} fill="#94A3B8">
                            {goes?.channel_mid_label}: <tspan fill="#FBBF24" fontWeight="700">{formatProtonVal(goes?.avg_mid)}</tspan>
                          </text>
                          <text x={cardX + 184} y={cardY + 63} fill="#94A3B8">
                            {goes?.channel_high_label}: <tspan fill="#C084FC" fontWeight="700">{formatProtonVal(goes?.avg_high)}</tspan>
                          </text>
                        </g>

                        {/* Mini 24H Spectrum Sparkline Area */}
                        <g>
                          <rect
                            x={chartX}
                            y={chartY}
                            width={chartW}
                            height={chartH}
                            fill="rgba(0, 0, 0, 0.65)"
                            stroke="rgba(255, 255, 255, 0.12)"
                            strokeWidth="0.8"
                            rx="2"
                          />
                          <line x1={chartX} y1={chartY + chartH / 2} x2={chartX + chartW} y2={chartY + chartH / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                          {pHighPath && <path d={pHighPath} fill="none" stroke="#C084FC" strokeWidth="1.6" opacity="0.85" />}
                          {pMidPath && <path d={pMidPath} fill="none" stroke="#FBBF24" strokeWidth="1.8" />}
                          {pLowPath && <path d={pLowPath} fill="none" stroke="#38BDF8" strokeWidth="2.0" />}

                          <text x={chartX + 4} y={chartY + chartH - 4} fill="#64748B" fontSize="7.5" fontFamily="var(--font-mono)">00:00</text>
                          <text x={chartX + chartW / 2} y={chartY + chartH - 4} fill="#64748B" fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="middle">12:00</text>
                          <text x={chartX + chartW - 4} y={chartY + chartH - 4} fill="#64748B" fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="end">24:00</text>
                        </g>

                        {/* Mini Legend */}
                        <g fontFamily="var(--font-mono)" fontSize="8" transform={`translate(0, ${cardY + 144})`}>
                          <text x={cardX + 10} y="0" fill="#38BDF8">● {goes?.channel_low_label}</text>
                          <text x={cardX + 96} y="0" fill="#FBBF24">● {goes?.channel_mid_label}</text>
                          <text x={cardX + 180} y="0" fill="#C084FC">● {goes?.channel_high_label}</text>
                          <text x={cardX + W_CARD - 10} y="0" fill="#64748B" textAnchor="end">
                            {goes?.satellite} {goes?.mode === 'DIFFERENTIAL' ? 'Diff' : 'Int'}
                          </text>
                        </g>
                      </g>
                    ) : (
                      <g fontFamily="var(--font-mono)">
                        <text x={cardX + W_CARD / 2} y={cardY + 80} fill="#EF4444" textAnchor="middle" fontSize="10" fontWeight="700">
                          GOES: DATA GAP / OFFLINE
                        </text>
                        <text x={cardX + W_CARD / 2} y={cardY + 100} fill="#94A3B8" textAnchor="middle" fontSize="9">
                          No particle flux records found for this date
                        </text>
                        <text x={cardX + W_CARD / 2} y={cardY + 124} fill="#F472B6" textAnchor="middle" fontSize="9">
                          👉 Click "CRaTER DOSE" tab to view lunar radiation
                        </text>
                      </g>
                    )
                  )}
                </g>
              </g>
            )
          })()}
        </g>
      </svg>

      {/* ── INTRO 1-ROUND PROGRESS HUD (CENTER BOTTOM) ── */}
      {isIntroActive && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          background: 'rgba(5, 10, 24, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(251, 191, 36, 0.7)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          borderRadius: 6,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: '#FBBF24',
            boxShadow: '0 0 8px #FBBF24',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#FDE68A', letterSpacing: 1.5 }}>
              1-ROUND ORBIT REVOLUTION SCAN
            </span>
            <span ref={hudProgressRef} style={{ fontSize: 13, color: '#94A3B8' }}>
              0° / 360° · 0/{events.length} stations active
            </span>
          </div>
          <button
            onClick={handleSkipIntro}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#E2E8F0',
              padding: '4px 10px',
              borderRadius: 3,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251, 191, 36, 0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            SKIP ⏭
          </button>
        </div>
      )}

      {/* ── FLOATING CAMERA CONTROL (BOTTOM RIGHT) ── */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 36,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Replay 1-Round Orbit Animation Button */}
        <button
          onClick={handleReplayIntro}
          style={{
            background: 'rgba(5, 10, 24, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(251, 191, 36, 0.7)',
            color: '#FDE68A',
            padding: '6px 14px',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          }}
          title="Replay 1-Round Moon Orbit Revolution"
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#FFFFFF'
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.25)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.7)'
            e.currentTarget.style.background = 'rgba(5, 10, 24, 0.85)'
          }}
        >
          <span>↺ REPLAY INTRO</span>
        </button>

        <button
          onClick={() => setAutoZoomEnabled(prev => !prev)}
          style={{
            background: autoZoomEnabled ? 'rgba(251, 191, 36, 0.15)' : 'rgba(5, 10, 24, 0.8)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${autoZoomEnabled ? '#FBBF24' : 'rgba(255, 255, 255, 0.2)'}`,
            color: autoZoomEnabled ? '#FDE68A' : '#94A3B8',
            padding: '6px 14px',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          }}
        >
          <span>🔍 CINEMATIC ZOOM: {autoZoomEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {activeMoonPos && (
          <button
            onClick={() => {
              setStickyFocusedEvent(null)
              onHoverEvent(null)
              onSelectEvent({} as MoonEventPosition)
            }}
            style={{
              background: 'rgba(5, 10, 24, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#CBD5E1',
              padding: '6px 12px',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            }}
            title="Reset to Full Orbit View"
          >
            ↺ RESET VIEW
          </button>
        )}
      </div>
    </div>
  )
})
