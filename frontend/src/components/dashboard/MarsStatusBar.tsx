import React from 'react'
import { MarsSummary } from '../../services/marsService'

export interface MarsStatusBarProps {
  summary: MarsSummary | null
  loading?: boolean
}

export default function MarsStatusBar({ summary, loading = false }: MarsStatusBarProps) {
  const items = [
    {
      name: 'SURFACE DOSE (SI)',
      valString: summary?.dose_rate_silicon ? `${summary.dose_rate_silicon.toFixed(2)} µGy/h` : '8.85 µGy/h',
      label: 'NOMINAL',
      color: '#FBBF24',
    },
    {
      name: 'TISSUE DOSE (PLASTIC)',
      valString: summary?.dose_rate_plastic ? `${summary.dose_rate_plastic.toFixed(2)} µSv/h` : '9.72 µSv/h',
      label: 'NOMINAL',
      color: '#EF4444',
    },
    {
      name: 'CHARGED GCR FLUX',
      valString: summary?.flux_charged ? `${summary.flux_charged.toFixed(2)} p/cm²` : '1.42 p/cm²',
      label: 'GCR QUIET',
      color: '#F97316',
    },
    {
      name: 'NEUTRAL RAD FLUX',
      valString: summary?.flux_neutral ? `${summary.flux_neutral.toFixed(2)} cts/s` : '0.58 cts/s',
      label: 'NORMAL',
      color: '#06B6D4',
    },
    {
      name: 'MARTIAN SOL',
      valString: summary?.current_sol ? `SOL ${summary.current_sol}` : 'SOL 4980+',
      label: 'GALE CRATER',
      color: '#38BDF8',
    },
    {
      name: 'ASTRONAUT RISK',
      valString: 'SAFE / NOMINAL',
      label: 'NO ACTIVE SEP',
      color: '#22C55E',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: 0,
        position: 'relative',
        maxWidth: 540,
        margin: '0 auto 20px',
        backdropFilter: 'blur(8px)',
        background: 'rgba(30, 10, 10, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            background: 'rgba(10, 5, 8, 0.65)',
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
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: 1.2,
              marginBottom: 4,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: '14px',
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
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: `rgba(255,255,255,0.06)`,
              border: `1px solid ${item.color}55`,
              color: item.color,
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.5px',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: item.color,
                boxShadow: `0 0 5px ${item.color}`,
              }}
            />
            {loading ? 'LOADING' : item.label}
          </div>
        </div>
      ))}
    </div>
  )
}
