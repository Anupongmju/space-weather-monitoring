import { useState, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import DualMonthDatePicker from './DualMonthDatePicker'

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

export interface DateRangeToolbarProps {
  limit: TimeRange
  onLimitChange: (limit: TimeRange) => void
  appliedRange: { startDate: string; endDate: string } | null
  onApplyRange: (range: { startDate: string; endDate: string } | null) => void
  accentColor?: string
  loading?: boolean
}

export default function DateRangeToolbar({
  limit,
  onLimitChange,
  appliedRange,
  onApplyRange,
  accentColor = '#818CF8',
  loading = false,
}: DateRangeToolbarProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

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


  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {/* Preset & Custom Tabs Pill Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.65)',
          padding: '3px 6px',
          border: isLight ? '1px solid rgba(26, 109, 181, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 6,
          boxShadow: isLight ? '0 1px 6px rgba(0, 0, 0, 0.04)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {([360, 1440, 4320, 10080] as TimeRange[]).map(v => (
          <button
            key={v}
            disabled={loading}
            onClick={() => handlePresetClick(v)}
            style={{
              padding: '4px 10px',
              background: !isCustom && limit === v ? (isLight ? `${accentColor}18` : `${accentColor}25`) : 'transparent',
              border: 'none',
              borderBottom: !isCustom && limit === v ? `2px solid ${accentColor}` : '2px solid transparent',
              color: !isCustom && limit === v ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
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
            background: isCustom ? (isLight ? `${accentColor}18` : `${accentColor}25`) : 'transparent',
            border: 'none',
            borderBottom: isCustom ? `2px solid ${accentColor}` : '2px solid transparent',
            color: isCustom ? (isLight ? '#0C1E35' : '#F8FAFC') : (isLight ? '#64748B' : '#94A3B8'),
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            fontWeight: isCustom ? 700 : 500,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Calendar size={14} />
          CUSTOM
        </button>
      </div>

      {/* Dual Month Calendar Range Picker matching user's exact specification */}
      {isCustom && (
        <DualMonthDatePicker
          startDate={appliedRange?.startDate || startDate}
          endDate={appliedRange?.endDate || endDate}
          onApply={(s, e) => {
            setStartDate(s)
            setEndDate(e)
            onApplyRange({ startDate: s, endDate: e })
          }}
          loading={loading}
          accentColor={accentColor}
          autoOpen={true}
        />
      )}
    </div>
  )
}
