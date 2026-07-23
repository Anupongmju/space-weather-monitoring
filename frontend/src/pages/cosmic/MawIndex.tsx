import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { fetchMawToday, fetchMawRange, loadMawDates } from '../../services/mawService'
import StatusBadge from '../../components/ui/StatusBadge'

const cards = [
  {
    path: '/cosmic/maw/counts',
    label: 'TOTAL COUNTS',
    tag: '01',
    color: '#3498DB',
    desc: 'NM Corrected, Uncorrected, Bare Corrected, Bare Uncorrected — 4 เส้นในกราฟเดียว ดู Forbush decrease',
  },
  {
    path: '/cosmic/maw/pressure',
    label: 'ATMOSPHERIC PRESSURE',
    tag: '02',
    color: '#F59E0B',
    desc: 'ความกดอากาศที่สถานี Mawson ส่งผลโดยตรงต่อปริมาณรังสีคอสมิกที่วัดได้',
  },
  {
    path: '/cosmic/maw/tubes',
    label: 'INDIVIDUAL TUBES',
    tag: '03',
    color: '#3B82F6',
    desc: 'หลอดมาตรฐาน 18 หลอด + หลอดเปลือย 6 หลอด ใช้ตรวจสอบ hardware QC',
  },
  {
    path: '/cosmic/maw/scatter',
    label: 'SCATTER PLOT',
    tag: '04',
    color: '#A855F7',
    desc: 'Pressure vs Uncorrected counts แสดง inverse correlation ระหว่างความกดอากาศกับรังสีคอสมิก',
  },
]

export default function MawIndex() {
  const navigate = useNavigate()
  const [hovered, setHovered]   = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fetchDays, setFetchDays] = useState(1)
  const [status, setStatus]     = useState(null)
  const [dates, setDates]       = useState([])

  useEffect(() => {
    loadMawDates().then(setDates).catch(() => {})
  }, [])

  const handleFetch = async () => {
    setFetching(true); setStatus(null)
    try {
      const r = fetchDays === 1
        ? await fetchMawToday()
        : await fetchMawRange(fetchDays)
      setStatus({ ok: true, msg: `Fetched successfully` })
      loadMawDates().then(setDates)
    } catch (e) {
      setStatus({ ok: false, msg: e.message })
    } finally { setFetching(false) }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        marginBottom: 28, padding: '28px',
        background: 'rgba(168,85,247,0.05)',
        border: '1px solid rgba(168,85,247,0.2)', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#A855F7', letterSpacing: 3, fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
            GND-M · BOM/SWS · ANTARCTICA
          </div>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            MAWSON <span style={{ color: '#A855F7' }}>STATION</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '6px 0 0', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            67.6°S · 62.9°E · Australian Antarctic Division
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <StatusBadge status={dates.length ? 'normal' : 'offline'} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={fetchDays}
              onChange={e => setFetchDays(Number(e.target.value))}
              style={{
                background: 'var(--bg-card)', border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: 4, color: 'var(--text)', padding: '6px 10px',
                fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer',
              }}
            >
              <option value={1}>Today</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
            <button
              onClick={handleFetch} disabled={fetching}
              style={{
                padding: '6px 16px',
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.4)',
                borderRadius: 4, color: '#A855F7',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: 2, cursor: fetching ? 'not-allowed' : 'pointer',
                opacity: fetching ? 0.6 : 1,
              }}
            >
              {fetching ? 'FETCHING...' : '⬇ FETCH'}
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={{
          marginBottom: 16, padding: '10px 16px',
          background: status.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${status.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 4, color: status.ok ? '#22C55E' : '#EF4444',
          fontFamily: 'var(--font-mono)', fontSize: 11,
        }}>
          {status.ok ? '✓' : '✗'} {status.msg}
        </div>
      )}

      {/* Available dates */}
      {dates.length > 0 && (
        <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: '#A855F7', letterSpacing: 2, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
            DATA IN DATABASE — {dates.length} DAYS
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dates.map(d => (
              <span key={d.date} style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)', padding: '3px 8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)', borderRadius: 3,
              }}>
                {d.date} <span style={{ color: '#A855F7' }}>({d.records})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {cards.map(card => {
          const isHov = hovered === card.path
          return (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              onMouseEnter={() => setHovered(card.path)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? '#111113' : 'var(--bg-card)',
                border: `1px solid ${isHov ? card.color + '44' : 'var(--border)'}`,
                borderRadius: 4, padding: '20px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontSize: 9, color: card.color, fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>
                  {card.tag} / 04
                </span>
                <ArrowRight size={14} color={isHov ? card.color : '#444'} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: isHov ? card.color : 'var(--text)', marginBottom: 8, letterSpacing: 1 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                {card.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
