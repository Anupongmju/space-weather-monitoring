import { useState, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'

export type TimeRange = 360 | 1440 | 4320 | 10080

export const TIME_LABELS: Record<number, string> = {
  360: '6H',
  1440: '1D',
  4320: '3D',
  10080: '7D',
}

const getTodayStr = () => new Date().toISOString().split('T')[0]
const getPastDateStr = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function DateInputDDMMYYYY({
  value,
  onChange,
  accentColor = '#818CF8',
}: {
  value: string
  onChange: (val: string) => void
  accentColor?: string
}) {
  const hiddenRef = useRef<HTMLInputElement>(null)

  // Converts "2026-07-31" -> "31/07/2026"
  const formatDisplay = (iso: string) => {
    if (!iso) return ''
    const parts = iso.split('-')
    if (parts.length === 3) {
      const [y, m, d] = parts
      return `${d}/${m}/${y}`
    }
    return iso
  }

  // Parses typed "31/07/2026" -> "2026-07-31"
  const parseDisplay = (disp: string) => {
    const parts = disp.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      if (d.length <= 2 && m.length <= 2 && y.length === 4) {
        const dd = d.padStart(2, '0')
        const mm = m.padStart(2, '0')
        return `${y}-${mm}-${dd}`
      }
    }
    return null
  }

  const [inputText, setInputText] = useState(formatDisplay(value))

  useEffect(() => {
    setInputText(formatDisplay(value))
  }, [value])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputText(raw)
    const iso = parseDisplay(raw)
    if (iso && !isNaN(new Date(iso).getTime())) {
      onChange(iso)
    }
  }

  const openPicker = () => {
    try {
      hiddenRef.current?.showPicker()
    } catch {
      hiddenRef.current?.focus()
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="DD/MM/YYYY"
        value={inputText}
        onChange={handleTextChange}
        style={{
          width: 115,
          background: 'rgba(2, 6, 23, 0.9)',
          color: '#F8FAFC',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '3px 24px 3px 8px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          outline: 'none',
          textAlign: 'center',
          letterSpacing: '0.5px',
        }}
      />
      <button
        type="button"
        onClick={openPicker}
        style={{
          position: 'absolute',
          right: 4,
          background: 'transparent',
          border: 'none',
          color: accentColor,
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Calendar size={13} />
      </button>
      <input
        ref={hiddenRef}
        type="date"
        value={value}
        onChange={e => {
          if (e.target.value) {
            onChange(e.target.value)
          }
        }}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </div>
  )
}

export interface DateRangeToolbarProps {
  limit: TimeRange
  onLimitChange: (limit: TimeRange) => void
  appliedRange: { startDate: string; endDate: string } | null
  onApplyRange: (range: { startDate: string; endDate: string } | null) => void
  accentColor?: string
  loading?: boolean
}

function toISO(dateStr: string): string {
  if (!dateStr) return dateStr
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return dateStr
}

export default function DateRangeToolbar({
  limit,
  onLimitChange,
  appliedRange,
  onApplyRange,
  accentColor = '#818CF8',
  loading = false,
}: DateRangeToolbarProps) {
  const [isCustom, setIsCustom] = useState(Boolean(appliedRange))
  const [startDate, setStartDate] = useState(appliedRange?.startDate || getPastDateStr(3))
  const [endDate, setEndDate] = useState(appliedRange?.endDate || getTodayStr())

  const handlePresetClick = (v: TimeRange) => {
    setIsCustom(false)
    onApplyRange(null)
    onLimitChange(v)
  }

  const handleCustomToggle = () => {
    if (isCustom) {
      setIsCustom(false)
      onApplyRange(null)
    } else {
      setIsCustom(true)
    }
  }

  const handleApply = () => {
    const s = toISO(startDate)
    const e = toISO(endDate)
    if (s && e && !loading) {
      onApplyRange({ startDate: s, endDate: e })
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {/* Preset & Custom Tabs Pill Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '3px 6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {([360, 1440, 4320, 10080] as TimeRange[]).map(v => (
          <button
            key={v}
            disabled={loading}
            onClick={() => handlePresetClick(v)}
            style={{
              padding: '4px 10px',
              background: !isCustom && limit === v ? `${accentColor}25` : 'transparent',
              border: 'none',
              borderBottom: !isCustom && limit === v ? `2px solid ${accentColor}` : '2px solid transparent',
              color: !isCustom && limit === v ? '#F8FAFC' : '#94A3B8',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: !isCustom && limit === v ? 700 : 500,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {TIME_LABELS[v]}
          </button>
        ))}

        <button
          onClick={handleCustomToggle}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: isCustom ? `${accentColor}25` : 'transparent',
            border: 'none',
            borderBottom: isCustom ? `2px solid ${accentColor}` : '2px solid transparent',
            color: isCustom ? '#F8FAFC' : '#94A3B8',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: isCustom ? 700 : 500,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Calendar size={13} />
          CUSTOM
        </button>
      </div>

      {/* Inline Custom Date Inputs (Formatted as DD/MM/YYYY) */}
      {isCustom && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '4px 12px',
            border: `1px solid ${accentColor}60`,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              FROM:
            </span>
            <DateInputDDMMYYYY value={startDate} onChange={setStartDate} accentColor={accentColor} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              TO:
            </span>
            <DateInputDDMMYYYY value={endDate} onChange={setEndDate} accentColor={accentColor} />
          </div>

          <button
            onClick={handleApply}
            disabled={loading}
            style={{
              padding: '3px 12px',
              background: loading ? `${accentColor}40` : accentColor,
              color: loading ? accentColor : '#0F172A',
              border: loading ? `1px solid ${accentColor}` : 'none',
              fontWeight: 700,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    border: `2px solid ${accentColor}`,
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                LOADING...
              </>
            ) : (
              'APPLY'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
