import React, { useEffect, useRef } from 'react'

interface MarsOrbitBackgroundProps {
  position?: 'center-left' | 'top-left' | 'hero' | 'center'
  initialPosition?: 'dashboard' | 'center-left' | 'top-left' | 'hero' | 'center'
}

export default React.memo(function MarsOrbitBackground({
  position = 'center-left',
  initialPosition = 'dashboard'
}: MarsOrbitBackgroundProps) {
  const curiosityLandingRef = useRef<SVGGElement | null>(null)
  const rotatingMarsRef = useRef<SVGGElement | null>(null)
  const marsGroupRef = useRef<SVGGElement | null>(null)
  const glowRef = useRef<SVGCircleElement | null>(null)

  const W = 1920
  const H = 1080

  // Coordinate lookup helper
  const getCoords = (pos: 'dashboard' | 'center-left' | 'top-left' | 'hero' | 'center') => {
    switch (pos) {
      case 'dashboard':
        // Exact 1:1 match with OrbitBackground.tsx MARS_X = 1680, MARS_Y = 270, MARS_R = 48 (48/95 ≈ 0.505)
        return { x: 1680, y: 270, scale: 0.505 }
      case 'top-left':
        return { x: 260, y: 220, scale: 0.85 }
      case 'hero':
      case 'center':
        return { x: 1350, y: 540, scale: 1.6 }
      case 'center-left':
      default:
        return { x: 520, y: 660, scale: 1.95 }
    }
  }

  // Target coordinates based on current requested position
  const targetCoords = getCoords(position)
  const targetX = targetCoords.x
  const targetY = targetCoords.y
  const targetScale = targetCoords.scale

  // Initial coordinates on mount (smoothly zooms in from dashboard orbit position)
  const startCoords = getCoords(initialPosition)
  const currentPos = useRef({ x: startCoords.x, y: startCoords.y, scale: startCoords.scale })

  useEffect(() => {
    let animationFrameId: number
    let lastTime = performance.now()

    const animate = () => {
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      const t = now / 1000

      // Silky-smooth framerate-independent exponential decay lerp
      const lerpFactor = 1 - Math.exp(-3.2 * dt)
      currentPos.current.x += (targetX - currentPos.current.x) * lerpFactor
      currentPos.current.y += (targetY - currentPos.current.y) * lerpFactor
      currentPos.current.scale += (targetScale - currentPos.current.scale) * lerpFactor

      // Gentle cosmic floating movement
      const floatY = Math.sin(t * 0.5) * 8
      const floatX = Math.cos(t * 0.35) * 6

      const curX = currentPos.current.x + floatX
      const curY = currentPos.current.y + floatY

      if (marsGroupRef.current) {
        marsGroupRef.current.setAttribute(
          'transform',
          `translate(${curX}, ${curY}) scale(${currentPos.current.scale})`
        )
      }

      if (glowRef.current) {
        glowRef.current.setAttribute('cx', curX.toString())
        glowRef.current.setAttribute('cy', curY.toString())
      }

      // Mars Slow Rotation (Calm, realistic planetary rotation)
      const marsRot = (t * 0.20) % 360
      if (rotatingMarsRef.current) {
        rotatingMarsRef.current.setAttribute('transform', `rotate(${marsRot}, 0, 0)`)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animationFrameId)
  }, [targetX, targetY, targetScale])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 0,
    }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          {/* Deep Space Background Glow */}
          <radialGradient id="marsDeepSpaceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#450a0a" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#1c0707" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#03060c" stopOpacity="0" />
          </radialGradient>

          {/* Mars True-Color Photographic Texture (NASA Viking Global Mosaic) */}
          <pattern id="realMarsTexturePattern" width="1" height="1" patternContentUnits="objectBoundingBox">
            <image
              href="/assets/mars.jpg"
              x="0"
              y="0"
              width="1"
              height="1"
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>

          {/* Shadow mask */}
          <linearGradient id="marsShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
          </linearGradient>

          {/* Solar Wind Stream Lines */}
          <linearGradient id="solarWindGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.0" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Dynamic Ambient Space Glow that moves with Mars */}
        <circle ref={glowRef} cx={currentPos.current.x} cy={currentPos.current.y} r="750" fill="url(#marsDeepSpaceGlow)" />

        {/* Solar Wind Stream Waves */}
        <g stroke="url(#solarWindGrad)" strokeWidth="1" strokeDasharray="6 12" opacity="0.4">
          <path d="M 0,150 Q 500,160 1000,120 T 1920,90" fill="none" />
          <path d="M 0,260 Q 500,280 1000,240 T 1920,200" fill="none" />
          <path d="M 0,380 Q 500,410 1000,360 T 1920,310" fill="none" />
          <path d="M 0,520 Q 500,560 1000,500 T 1920,440" fill="none" />
        </g>

        {/* ── SMOOTHLY POSITIONED MARS SYSTEM GROUP ── */}
        <g ref={marsGroupRef} transform={`translate(${currentPos.current.x}, ${currentPos.current.y}) scale(${currentPos.current.scale})`}>

          {/* Bow Shock */}
          <path
            d="M -160,-220 Q -240,0 -160,220"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.35"
          />

          {/* Mars Rotating Globe */}
          <g ref={rotatingMarsRef}>
            <circle cx="0" cy="0" r="95" fill="url(#realMarsTexturePattern)" />
          </g>

          {/* Curiosity Rover Landing Site (Gale Crater - 4.5°S, 137.4°E) */}
          <g ref={curiosityLandingRef} transform="translate(-18, 12)">
            <circle cx="0" cy="0" r="4" fill="none" stroke="#ef4444" strokeWidth="1.5">
              <animate attributeName="r" values="3;9;3" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0;1" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="2" fill="#ef4444" />
            <text x="8" y="3" fill="#fca5a5" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="1" opacity="0.85">
              GALE CRATER (RAD)
            </text>
          </g>
        </g>
      </svg>
    </div>
  )
})

