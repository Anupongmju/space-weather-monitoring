import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight, RefreshCw, Compass, Radio, Activity, BarChart2 } from 'lucide-react'
import { fetchMawToday, fetchMawRange, loadMawDates } from '../../services/mawService'
import StatusBadge from '../../components/ui/StatusBadge'
import { useTheme } from '../../context/ThemeContext'

const cards = [
  {
    path: '/cosmic/maw/counts',
    label: 'TOTAL COUNTS',
    tag: '01',
    icon: Activity,
    color: '#0284C7',
    darkColor: '#38BDF8',
    desc: 'NM Corrected, Uncorrected, Bare Corrected, Bare Uncorrected — 4 discrete channels in one plot for Forbush decrease detection.',
  },
  {
    path: '/cosmic/maw/pressure',
    label: 'ATMOSPHERIC PRESSURE',
    tag: '02',
    icon: BarChart2,
    color: '#D97706',
    darkColor: '#F59E0B',
    desc: 'Barometric pressure logs at Mawson Station directly used for barometric absorption corrections.',
  },
  {
    path: '/cosmic/maw/tubes',
    label: 'INDIVIDUAL TUBES',
    tag: '03',
    icon: Radio,
    color: '#2563EB',
    darkColor: '#60A5FA',
    desc: '18 Standard NM64 tubes + 6 Bare detector tubes for hardware health and dropout diagnostics.',
  },
  {
    path: '/cosmic/maw/scatter',
    label: 'SCATTER CORRELATION',
    tag: '04',
    icon: Compass,
    color: '#7C3AED',
    darkColor: '#C084FC',
    desc: 'Pressure vs. Uncorrected Counts scatter with linear regression fit line for atmospheric absorption modeling.',
  },
]

export default function MawIndex() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [hovered, setHovered] = useState<number | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchDays, setFetchDays] = useState(1)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [dates, setDates] = useState<any[]>([])

  useEffect(() => {
    loadMawDates().then(d => setDates(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const handleFetch = async () => {
    setFetching(true)
    setStatus(null)
    try {
      if (fetchDays === 1) {
        await fetchMawToday()
      } else {
        await fetchMawRange(fetchDays)
      }
      setStatus({ ok: true, msg: `Telemetry fetched successfully (${fetchDays} days)` })
      const d = await loadMawDates()
      setDates(Array.isArray(d) ? d : [])
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message || 'Fetch failed' })
    } finally {
      setFetching(false)
    }
  }

  return (
    <div style={{ maxWidth: 'min(96%, 1640px)', margin: '0 auto', padding: '24px 20px 60px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{
        marginBottom: 28, padding: '24px 28px',
        background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
        border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.04)' : undefined
      }}>
        <div>
          <div style={{
            fontSize: 12,
            color: isLight ? '#7C3AED' : '#C084FC',
            letterSpacing: 2,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            marginBottom: 6
          }}>
            GND-M · BOM / SWS · ANTARCTICA
          </div>
          <h1 style={{
            fontFamily: "'Orbitron', var(--font-sans), monospace",
            fontSize: 24,
            fontWeight: 700,
            color: isLight ? '#0F172A' : '#F8FAFC',
            margin: 0
          }}>
            MAWSON <span style={{ color: isLight ? '#7C3AED' : '#C084FC' }}>OBSERVATORY</span>
          </h1>
          <p style={{
            color: isLight ? '#475569' : '#CBD5E1',
            fontSize: 13,
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)'
          }}>
            67.6°S · 62.9°E · Mac. Robertson Land · Australian Antarctic Division (AAD)
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge status={dates.length ? 'normal' : 'offline'} />
            <div style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: isLight ? '#64748B' : '#94A3B8'
            }}>
              {dates.length} Days Archived
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={fetchDays}
              onChange={e => setFetchDays(Number(e.target.value))}
              style={{
                background: isLight ? '#F8FAFC' : '#0F172A',
                border: `1px solid ${isLight ? '#CBD5E1' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 6,
                color: isLight ? '#0F172A' : '#F8FAFC',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <option value={1}>Today</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
            <button
              onClick={handleFetch}
              disabled={fetching}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 16px',
                background: isLight ? '#7C3AED' : '#C084FC',
                border: 'none',
                borderRadius: 6,
                color: '#FFFFFF',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                cursor: fetching ? 'not-allowed' : 'pointer',
                opacity: fetching ? 0.6 : 1,
                boxShadow: isLight ? '0 2px 6px rgba(124, 58, 237, 0.25)' : undefined
              }}
            >
              <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
              <span>{fetching ? 'FETCHING...' : 'FETCH REMOTE'}</span>
            </button>
          </div>
          {status && (
            <div style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: status.ok ? (isLight ? '#059669' : '#34D399') : '#EF4444'
            }}>
              {status.msg}
            </div>
          )}
        </div>
      </div>

      {/* Station Fact Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        <div style={{
          padding: '16px 20px',
          background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255, 255, 255, 0.08)'}`,
          borderLeft: `4px solid ${isLight ? '#0284C7' : '#38BDF8'}`,
          borderRadius: 6,
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.03)' : undefined
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>GEOMAGNETIC LATITUDE</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 4 }}>
            73.3° S
          </div>
          <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#64748B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>High polar coverage zone</div>
        </div>

        <div style={{
          padding: '16px 20px',
          background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255, 255, 255, 0.08)'}`,
          borderLeft: `4px solid ${isLight ? '#059669' : '#34D399'}`,
          borderRadius: 6,
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.03)' : undefined
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>CUTOFF RIGIDITY (Rc)</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 4 }}>
            0.22 GV
          </div>
          <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#64748B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>Sensitive to low energy CR</div>
        </div>

        <div style={{
          padding: '16px 20px',
          background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255, 255, 255, 0.08)'}`,
          borderLeft: `4px solid ${isLight ? '#D97706' : '#F59E0B'}`,
          borderRadius: 6,
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.03)' : undefined
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>DETECTOR ARRAY</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 4 }}>
            18-NM64 + 6 Bare
          </div>
          <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#64748B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>24 independent counters</div>
        </div>

        <div style={{
          padding: '16px 20px',
          background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${isLight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255, 255, 255, 0.08)'}`,
          borderLeft: `4px solid ${isLight ? '#7C3AED' : '#C084FC'}`,
          borderRadius: 6,
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.03)' : undefined
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isLight ? '#64748B' : '#94A3B8', fontFamily: 'var(--font-mono)' }}>DATA CADENCE</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Orbitron', var(--font-sans), monospace", color: isLight ? '#0F172A' : '#F8FAFC', marginTop: 4 }}>
            1-Min Real-time
          </div>
          <div style={{ fontSize: 11, color: isLight ? '#64748B' : '#64748B', fontFamily: 'var(--font-mono)', marginTop: 2 }}>Australian Space Weather (SWS)</div>
        </div>
      </div>

      {/* 4 Feature Pages Navigation Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20
      }}>
        {cards.map((c, i) => {
          const isHov = hovered === i
          const Icon = c.icon
          const color = isLight ? c.color : c.darkColor
          return (
            <div
              key={c.path}
              onClick={() => navigate(c.path)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                cursor: 'pointer',
                padding: '24px',
                background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
                border: `1px solid ${isHov ? color : (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')}`,
                borderRadius: 8,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                transform: isHov ? 'translateY(-3px)' : 'none',
                boxShadow: isHov
                  ? `0 12px 30px ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.4)'}`
                  : (isLight ? '0 2px 8px rgba(0,0,0,0.04)' : undefined),
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
                background: color, opacity: isHov ? 1 : 0.6,
                transition: 'opacity 0.2s ease'
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: `${color}18`,
                    border: `1px solid ${color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color
                  }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: isLight ? '#64748B' : '#94A3B8',
                      letterSpacing: 1
                    }}>
                      CHANNEL {c.tag}
                    </span>
                    <h2 style={{
                      fontFamily: "'Orbitron', var(--font-sans), monospace",
                      fontSize: 16,
                      fontWeight: 700,
                      color: isHov ? color : (isLight ? '#0F172A' : '#F8FAFC'),
                      margin: '2px 0 0',
                      transition: 'color 0.2s ease'
                    }}>
                      {c.label}
                    </h2>
                  </div>
                </div>

                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: isHov ? color : (isLight ? '#F1F5F9' : 'rgba(255,255,255,0.05)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isHov ? '#FFFFFF' : (isLight ? '#64748B' : '#94A3B8'),
                  transition: 'all 0.2s ease'
                }}>
                  <ArrowRight size={15} />
                </div>
              </div>

              <p style={{
                color: isLight ? '#475569' : '#CBD5E1',
                fontSize: 13,
                margin: 0,
                lineHeight: '1.6',
                fontFamily: 'var(--font-mono)'
              }}>
                {c.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
