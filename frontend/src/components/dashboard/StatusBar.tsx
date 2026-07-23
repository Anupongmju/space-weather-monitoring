import React from 'react'

export interface SummaryData {
  speed?: number | null
  density?: number | null
  xray?: number | null
  protonFlux?: number | null
  bz?: number | null
  kp?: number | null
  cosmic?: number | null
  loading?: boolean
}

export interface StatusItemResult {
  name: string
  valString: string
  label: string
  color: string
}

export type StatusMetricKey = 
  | 'speed'
  | 'xray'
  | 'protonFlux'
  | 'bz'
  | 'kp'
  | 'cosmic'
  | 'density'
  | 'geomagnetic'

// ── 6 Color Tier Definitions ────────────────────────────────────────────────
// Level 1: Green (Quiet)                -> #10B981
// Level 2: Yellow (Minor / Unsettled)   -> #EAB308
// Level 3: Amber (Moderate Storm)       -> #F59E0B
// Level 4: Orange (Strong Storm)        -> #EA580C
// Level 5: Red (Severe Storm)           -> #EF4444
// Level 6: Dark Red (Extreme Storm)     -> #991B1B

// ── 1. Solar Wind Speed ──
export const getSpeedStatus = (val: number | null | undefined): StatusItemResult => {
  if (val == null) return { name: 'SOLAR WIND SPEED', valString: '—', label: 'NO DATA', color: '#606075' }
  const valStr = `${val.toFixed(0)} km/s`
  if (val < 400) return { name: 'SOLAR WIND SPEED', valString: valStr, label: 'QUIET', color: '#10B981' }
  if (val < 500) return { name: 'SOLAR WIND SPEED', valString: valStr, label: 'UNSETTLED', color: '#EAB308' }
  if (val < 600) return { name: 'SOLAR WIND SPEED', valString: valStr, label: 'MODERATE', color: '#F59E0B' }
  if (val < 750) return { name: 'SOLAR WIND SPEED', valString: valStr, label: 'STRONG', color: '#EA580C' }
  if (val < 1000) return { name: 'SOLAR WIND SPEED', valString: valStr, label: 'SEVERE', color: '#EF4444' }
  return { name: 'SOLAR WIND SPEED', valString: valStr, label: 'EXTREME', color: '#991B1B' }
}

// ── Helper to calculate Flare Class label ──
export const getFlareClass = (flux: number | null | undefined) => {
  if (!flux) return { label: '-', color: '#606075' }
  if (flux >= 5e-4) return { label: `X${(flux / 1e-4).toFixed(1)}`, color: '#991B1B' }
  if (flux >= 2e-4) return { label: `X${(flux / 1e-4).toFixed(1)}`, color: '#EF4444' }
  if (flux >= 1e-4) return { label: `X${(flux / 1e-4).toFixed(1)}`, color: '#EA580C' }
  if (flux >= 5e-5) return { label: `M${(flux / 1e-5).toFixed(1)}`, color: '#F59E0B' }
  if (flux >= 1e-5) return { label: `M${(flux / 1e-5).toFixed(1)}`, color: '#EAB308' }
  if (flux >= 1e-6) return { label: `C${(flux / 1e-6).toFixed(1)}`, color: '#10B981' }
  if (flux >= 1e-7) return { label: `B${(flux / 1e-7).toFixed(1)}`, color: '#10B981' }
  return { label: `A${(flux / 1e-8).toFixed(1)}`, color: '#10B981' }
}

// ── 2. Solar X-Ray Flux ──
export const getXrayStatus = (val: number | null | undefined): StatusItemResult => {
  if (val == null) return { name: 'SOLAR X-RAY FLUX', valString: '—', label: 'NO DATA', color: '#606075' }
  const flare = getFlareClass(val)
  
  if (val < 1e-5) return { name: 'SOLAR X-RAY FLUX', valString: `${val.toExponential(1)}`, label: `CLASS ${flare.label}`, color: '#10B981' }
  if (val < 5e-5) return { name: 'SOLAR X-RAY FLUX', valString: `${val.toExponential(1)}`, label: `CLASS ${flare.label}`, color: '#EAB308' }
  if (val < 1e-4) return { name: 'SOLAR X-RAY FLUX', valString: `${val.toExponential(1)}`, label: `CLASS ${flare.label}`, color: '#F59E0B' }
  if (val < 2e-4) return { name: 'SOLAR X-RAY FLUX', valString: `${val.toExponential(1)}`, label: `CLASS ${flare.label}`, color: '#EA580C' }
  if (val < 5e-4) return { name: 'SOLAR X-RAY FLUX', valString: `${val.toExponential(1)}`, label: `CLASS ${flare.label}`, color: '#EF4444' }
  return { name: 'SOLAR X-RAY FLUX', valString: `${val.toExponential(1)}`, label: `CLASS ${flare.label}`, color: '#991B1B' }
}

// ── 3. IMF B_z ──
export const getBzStatus = (val: number | null | undefined): StatusItemResult => {
  if (val == null) return { name: 'IMF B_Z', valString: '—', label: 'NO DATA', color: '#606075' }
  const sign = val > 0 ? '+' : ''
  const valStr = `${sign}${val.toFixed(1)} nT`

  if (val >= -2.5) return { name: 'IMF B_Z', valString: valStr, label: 'QUIET', color: '#10B981' }
  if (val >= -5.0) return { name: 'IMF B_Z', valString: valStr, label: 'UNSETTLED', color: '#EAB308' }
  if (val >= -9.2) return { name: 'IMF B_Z', valString: valStr, label: 'MODERATE', color: '#F59E0B' }
  if (val >= -18.0) return { name: 'IMF B_Z', valString: valStr, label: 'STRONG', color: '#EA580C' }
  if (val >= -30.0) return { name: 'IMF B_Z', valString: valStr, label: 'SEVERE', color: '#EF4444' }
  return { name: 'IMF B_Z', valString: valStr, label: 'EXTREME', color: '#991B1B' }
}

// ── 4. Kp Index ──
export const getKpStatus = (val: number | null | undefined): StatusItemResult => {
  if (val == null) return { name: 'KP INDEX', valString: '—', label: 'NO DATA', color: '#606075' }
  const valStr = val.toFixed(1)

  if (val < 4.0) return { name: 'KP INDEX', valString: valStr, label: 'QUIET', color: '#10B981' }
  if (val < 5.5) return { name: 'KP INDEX', valString: valStr, label: 'G1 MINOR', color: '#EAB308' }
  if (val < 6.5) return { name: 'KP INDEX', valString: valStr, label: 'G2 MODERATE', color: '#F59E0B' }
  if (val < 7.5) return { name: 'KP INDEX', valString: valStr, label: 'G3 STRONG', color: '#EA580C' }
  if (val < 8.5) return { name: 'KP INDEX', valString: valStr, label: 'G4 SEVERE', color: '#EF4444' }
  return { name: 'KP INDEX', valString: valStr, label: 'G5 EXTREME', color: '#991B1B' }
}

// ── 5. Proton Flux ──
export const getProtonFluxStatus = (val: number | null | undefined): StatusItemResult => {
  if (val == null) return { name: 'PROTON FLUX', valString: '—', label: 'NO DATA', color: '#606075' }
  const valStr = val < 10 ? `${val.toFixed(1)} pfu` : `${val.toFixed(0)} pfu`

  if (val < 10) return { name: 'PROTON FLUX', valString: valStr, label: 'QUIET', color: '#10B981' }
  if (val < 100) return { name: 'PROTON FLUX', valString: valStr, label: 'S1 MINOR', color: '#EAB308' }
  if (val < 1000) return { name: 'PROTON FLUX', valString: valStr, label: 'S2 MODERATE', color: '#F59E0B' }
  if (val < 10000) return { name: 'PROTON FLUX', valString: valStr, label: 'S3 STRONG', color: '#EA580C' }
  if (val < 100000) return { name: 'PROTON FLUX', valString: valStr, label: 'S4 SEVERE', color: '#EF4444' }
  return { name: 'PROTON FLUX', valString: valStr, label: 'S5 EXTREME', color: '#991B1B' }
}

// ── 6. Cosmic Ray ──
export const getCosmicRayStatus = (val: number | null | undefined): StatusItemResult => {
  if (val == null) return { name: 'COSMIC RAY', valString: '—', label: 'NO DATA', color: '#606075' }
  
  // If val is percentage baseline (e.g. 99.2%) or variation
  if (val <= 100 && val >= 50) {
    const valStr = `${val.toFixed(1)}%`
    if (val >= 99.5) return { name: 'COSMIC RAY', valString: valStr, label: 'QUIET', color: '#10B981' }
    if (val >= 98.0) return { name: 'COSMIC RAY', valString: valStr, label: 'UNSETTLED', color: '#EAB308' }
    if (val >= 96.0) return { name: 'COSMIC RAY', valString: valStr, label: 'MODERATE', color: '#F59E0B' }
    if (val >= 93.0) return { name: 'COSMIC RAY', valString: valStr, label: 'STRONG', color: '#EA580C' }
    if (val >= 88.0) return { name: 'COSMIC RAY', valString: valStr, label: 'SEVERE', color: '#EF4444' }
    return { name: 'COSMIC RAY', valString: valStr, label: 'EXTREME', color: '#991B1B' }
  }

  // Count rate (cpm)
  return { name: 'COSMIC RAY', valString: `${val.toFixed(0)} cpm`, label: 'NORMAL', color: '#10B981' }
}

export const getDensityStatus = (val: number | null | undefined): StatusItemResult => {
  if (val == null) return { name: 'SOLAR WIND DENSITY', valString: '—', label: 'NO DATA', color: '#606075' }
  const valStr = `${val.toFixed(1)} p/cc`
  if (val < 15) return { name: 'SOLAR WIND DENSITY', valString: valStr, label: 'QUIET', color: '#10B981' }
  if (val < 30) return { name: 'SOLAR WIND DENSITY', valString: valStr, label: 'UNSETTLED', color: '#EAB308' }
  if (val < 50) return { name: 'SOLAR WIND DENSITY', valString: valStr, label: 'MODERATE', color: '#F59E0B' }
  return { name: 'SOLAR WIND DENSITY', valString: valStr, label: 'HIGH', color: '#EF4444' }
}

export const getGeoStatus = (kp: number | null | undefined): StatusItemResult => {
  if (kp == null) return { name: 'GEOMAGNETIC STATUS', valString: 'UNKNOWN', label: 'NO DATA', color: '#606075' }
  if (kp < 4) return { name: 'GEOMAGNETIC STATUS', valString: 'QUIET', label: 'NORMAL', color: '#10B981' }
  if (kp < 5) return { name: 'GEOMAGNETIC STATUS', valString: 'ACTIVE', label: 'G1 MINOR', color: '#EAB308' }
  if (kp < 6) return { name: 'GEOMAGNETIC STATUS', valString: 'G1 MINOR', label: 'G2 MODERATE', color: '#F59E0B' }
  if (kp < 7) return { name: 'GEOMAGNETIC STATUS', valString: 'G2 MOD', label: 'G3 STRONG', color: '#EA580C' }
  if (kp < 8) return { name: 'GEOMAGNETIC STATUS', valString: 'G3 STRG', label: 'G4 SEVERE', color: '#EF4444' }
  return { name: 'GEOMAGNETIC STATUS', valString: 'G5 EXT', label: 'G5 EXTREME', color: '#991B1B' }
}

// Map key to evaluator
export const EVALUATORS: Record<StatusMetricKey, (data: SummaryData) => StatusItemResult> = {
  speed: (data) => getSpeedStatus(data.speed),
  xray: (data) => getXrayStatus(data.xray),
  protonFlux: (data) => getProtonFluxStatus(data.protonFlux),
  bz: (data) => getBzStatus(data.bz),
  kp: (data) => getKpStatus(data.kp),
  cosmic: (data) => getCosmicRayStatus(data.cosmic),
  density: (data) => getDensityStatus(data.density),
  geomagnetic: (data) => getGeoStatus(data.kp),
}

export interface StatusBarProps {
  summary: SummaryData
  items?: (StatusMetricKey | StatusItemResult)[]
  columns?: number
  maxWidth?: number | string
}

export const DEFAULT_STATUS_ITEMS: StatusMetricKey[] = [
  'speed',
  'xray',
  'protonFlux',
  'bz',
  'kp',
  'cosmic',
]

// Convert hex color string to RGB values for dynamic RGBA borders and glowing dots
const hexToRgb = (hex: string): string => {
  const cleanHex = hex.replace('#', '')
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    return `${r}, ${g}, ${b}`
  }
  return '96, 96, 117'
}

export default function StatusBar({
  summary,
  items = DEFAULT_STATUS_ITEMS,
  columns = 3,
  maxWidth = 520,
}: StatusBarProps) {
  const loading = summary?.loading ?? false

  const computedItems: StatusItemResult[] = items.map((item) => {
    if (typeof item === 'string') {
      const evaluator = EVALUATORS[item]
      return evaluator
        ? evaluator(summary)
        : { name: item.toUpperCase(), valString: '—', label: 'NO DATA', color: '#606075' }
    }
    return item
  })

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1px',
        border: '1px solid rgba(52, 152, 219, 0.25)',
        borderRadius: 0,
        position: 'relative',
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        margin: '0 auto 20px',
        backdropFilter: 'blur(8px)',
        background: 'rgba(12, 32, 46, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} /> */}
      {computedItems.map((item, idx) => {
        const rgb = hexToRgb(item.color)

        return (
          <div
            key={idx}
            style={{
              background: 'rgba(5, 10, 20, 0.5)',
              backdropFilter: 'blur(10px)',
              padding: '10px 8px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '70px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: 1.2,
                marginBottom: 4,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'white',
                fontFamily: "'Orbitron', monospace",
                marginBottom: 4,
              }}
            >
              {loading ? '...' : item.valString}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: loading
                  ? 'rgba(255,255,255,0.04)'
                  : `rgba(${rgb}, 0.12)`,
                border: loading
                  ? '1px solid rgba(255,255,255,0.08)'
                  : `1px solid rgba(${rgb}, 0.3)`,
                color: loading ? '#606075' : item.color,
                fontSize: '9px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.5px',
              }}
            >
              {!loading && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: item.color,
                    boxShadow: `0 0 5px ${item.color}`,
                  }}
                />
              )}
              {loading ? 'LOADING' : item.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
