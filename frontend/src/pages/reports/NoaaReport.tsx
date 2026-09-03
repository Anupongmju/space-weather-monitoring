import React, { useState, useEffect } from 'react'
import { AlertTriangle, Bell, RefreshCw, Info, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StatusBadge from '../../components/ui/StatusBadge'

export default function NoaaReport() {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  const fetchAlerts = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setFetching(true)
    try {
      const response = await fetch('https://services.swpc.noaa.gov/products/alerts.json')
      if (!response.ok) throw new Error('Failed to fetch NOAA alerts feed')
      const data = await response.json()
      setAlerts(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(() => fetchAlerts(false), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getAlertBadge = (message: string) => {
    if (message.includes('WARNING')) {
      return {
        label: 'WARNING',
        color: isLight ? '#DC2626' : '#EF4444',
        bg: isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.15)',
        border: isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.4)'
      }
    }
    if (message.includes('WATCH')) {
      return {
        label: 'WATCH',
        color: isLight ? '#D97706' : '#F59E0B',
        bg: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)',
        border: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.4)'
      }
    }
    if (message.includes('ALERT')) {
      return {
        label: 'ALERT',
        color: isLight ? '#2563EB' : '#38BDF8',
        bg: isLight ? '#DBEAFE' : 'rgba(56, 189, 248, 0.15)',
        border: isLight ? '#BFDBFE' : 'rgba(56, 189, 248, 0.4)'
      }
    }
    if (message.includes('SUMMARY')) {
      return {
        label: 'SUMMARY',
        color: isLight ? '#7C3AED' : '#C084FC',
        bg: isLight ? '#F3E8FF' : 'rgba(192, 132, 252, 0.15)',
        border: isLight ? '#E9D5FF' : 'rgba(192, 132, 252, 0.4)'
      }
    }
    return {
      label: 'INFO',
      color: isLight ? '#059669' : '#34D399',
      bg: isLight ? '#D1FAE5' : 'rgba(52, 211, 153, 0.15)',
      border: isLight ? '#A7F3D0' : 'rgba(52, 211, 153, 0.4)'
    }
  }

  const parseMessage = (msg: string) => {
    const lines = msg.split('\n')
    return lines.map((line, idx) => {
      if (line.includes(':')) {
        const [key, ...rest] = line.split(':')
        return (
          <div key={idx} style={{ marginBottom: '4px' }}>
            <strong style={{ color: isLight ? '#0F172A' : '#F8FAFC' }}>{key}:</strong>
            <span style={{ color: isLight ? '#334155' : '#CBD5E1' }}> {rest.join(':')}</span>
          </div>
        )
      }
      return (
        <div key={idx} style={{ marginBottom: '4px', color: isLight ? '#475569' : '#94A3B8' }}>
          {line}
        </div>
      )
    })
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
        paddingBottom: 16,
        borderBottom: isLight ? '1px solid rgba(37, 99, 235, 0.15)' : '1px solid rgba(255,255,255,0.08)'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 26,
            fontWeight: 700,
            color: isLight ? '#1D4ED8' : '#38BDF8',
            margin: 0,
            letterSpacing: -0.5
          }}>
            NOAA / SWPC ALERTS & BULLETINS
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            Real-time Space Weather Prediction Center Live Broadcast Feed · Solar Flare, Geomagnetic Storm & Radiation Warnings
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StatusBadge status={error ? 'offline' : 'normal'} label={error ? 'FEED OFFLINE' : 'SWPC LIVE'} />
          <button
            onClick={() => fetchAlerts(false)}
            disabled={fetching}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: 'transparent', border: 'none',
              color: isLight ? '#2563EB' : '#38BDF8', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
            <span>{fetching ? 'FETCHING...' : 'REFRESH'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.3)'}`,
          color: '#DC2626',
          padding: '12px 18px',
          borderRadius: 6,
          marginBottom: 20,
          fontFamily: 'var(--font-mono)',
          fontSize: 13
        }}>
          Error fetching NOAA data: {error}
        </div>
      )}

      {/* Summary Filter Strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px', marginBottom: 20,
        background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
        border: `1px solid ${isLight ? 'rgba(37, 99, 235, 0.12)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 6,
        boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.03)' : undefined,
        flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          <Bell size={16} color={isLight ? '#2563EB' : '#38BDF8'} />
          <span style={{ fontWeight: 700, color: isLight ? '#0F172A' : '#F8FAFC' }}>
            ACTIVE BULLETINS:
          </span>
          <span style={{ color: isLight ? '#2563EB' : '#38BDF8', fontWeight: 800 }}>
            {alerts.length} MESSAGES
          </span>
        </div>
        <div style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>
          Auto-polling cadence: 5 minutes · Direct SWPC JSON Feed
        </div>
      </div>

      {/* Alerts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alerts.map((alert, idx) => {
          const badge = getAlertBadge(alert.message)
          return (
            <div
              key={idx}
              style={{
                background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                border: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderLeft: `4px solid ${badge.color}`,
                borderRadius: 8,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.03)' : undefined,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                if (isLight) e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                if (isLight) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: '3px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    border: `1px solid ${badge.border}`
                  }}>
                    {badge.label}
                  </span>
                  <span style={{ color: isLight ? '#64748B' : '#94A3B8', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                    PRODUCT ID: {alert.product_id}
                  </span>
                </div>
                <div style={{ color: isLight ? '#64748B' : '#94A3B8', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  🕒 {new Date(alert.issue_datetime).toISOString().replace('T', ' ').slice(0, 16)} UTC
                </div>
              </div>

              <div style={{
                color: isLight ? '#334155' : '#CBD5E1',
                fontSize: 13,
                lineHeight: '1.7',
                fontFamily: 'var(--font-mono)',
                background: isLight ? '#F8FAFC' : 'rgba(0, 0, 0, 0.25)',
                padding: '14px 18px',
                borderRadius: 6,
                border: `1px solid ${isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.05)'}`
              }}>
                {parseMessage(alert.message)}
              </div>
            </div>
          )
        })}

        {!loading && alerts.length === 0 && !error && (
          <div style={{
            textAlign: 'center',
            color: isLight ? '#64748B' : '#94A3B8',
            padding: '60px 20px',
            fontFamily: 'var(--font-mono)',
            fontSize: 14
          }}>
            No active alerts or warnings recorded in current NOAA SWPC bulletin window.
          </div>
        )}
      </div>
    </div>
  )
}
