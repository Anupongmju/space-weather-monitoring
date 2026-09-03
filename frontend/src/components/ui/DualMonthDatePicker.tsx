import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

interface DualMonthDatePickerProps {
  startDate: string // ISO YYYY-MM-DD
  endDate: string // ISO YYYY-MM-DD
  onApply: (start: string, end: string) => void
  loading?: boolean
  label?: string
  accentColor?: string
  autoOpen?: boolean
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const pad = (n: number) => String(n).padStart(2, '0')

const toDisplayDate = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const parseISODate = (s: string) => {
  if (!s) return new Date()
  const parts = s.split('-').map(Number)
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  return new Date(s)
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const firstDayIndex = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days: { date: Date; isCurrentMonth: boolean; dayNum: number }[] = []

  // Prev month filler
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i)
    days.push({ date: d, isCurrentMonth: false, dayNum: daysInPrevMonth - i })
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push({ date: d, isCurrentMonth: true, dayNum: i })
  }

  // Next month filler
  const totalCells = Math.ceil(days.length / 7) * 7
  const remaining = totalCells - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push({ date: d, isCurrentMonth: false, dayNum: i })
  }

  return days
}

export default function DualMonthDatePicker({
  startDate,
  endDate,
  onApply,
  loading = false,
  label = '',
  accentColor = '#22C55E',
  autoOpen = false,
}: DualMonthDatePickerProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [isOpen, setIsOpen] = useState(autoOpen)
  const popupRef = useRef<HTMLDivElement>(null)

  // Left calendar month state
  const initialLeftDate = parseISODate(startDate || new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialLeftDate.getFullYear(), initialLeftDate.getMonth(), 1)
  )

  // Selection state
  const [selectedStart, setSelectedStart] = useState<Date>(parseISODate(startDate))
  const [selectedEnd, setSelectedEnd] = useState<Date>(parseISODate(endDate))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [isSelectingRange, setIsSelectingRange] = useState(false)

  // Text input display state
  const [inputVal, setInputVal] = useState(
    `${toDisplayDate(parseISODate(startDate))} - ${toDisplayDate(parseISODate(endDate))}`
  )

  useEffect(() => {
    const s = parseISODate(startDate)
    const e = parseISODate(endDate)
    setSelectedStart(s)
    setSelectedEnd(e)
    setInputVal(`${toDisplayDate(s)} - ${toDisplayDate(e)}`)
  }, [startDate, endDate])

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsSelectingRange(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Right calendar month is next month
  const rightMonthYear =
    currentMonth.getMonth() === 11 ? currentMonth.getFullYear() + 1 : currentMonth.getFullYear()
  const rightMonthIndex = (currentMonth.getMonth() + 1) % 12
  const rightMonth = new Date(rightMonthYear, rightMonthIndex, 1)

  const leftDays = getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth())
  const rightDays = getMonthDays(rightMonth.getFullYear(), rightMonth.getMonth())

  const handleDateClick = (d: Date) => {
    if (!isSelectingRange) {
      // First click: start new range
      setSelectedStart(d)
      setSelectedEnd(d)
      setIsSelectingRange(true)
    } else {
      // Second click: finish range
      if (d < selectedStart) {
        setSelectedEnd(selectedStart)
        setSelectedStart(d)
      } else {
        setSelectedEnd(d)
      }
      setIsSelectingRange(false)
    }
  }

  const handleApplyClick = () => {
    const s = toISODate(selectedStart)
    const e = toISODate(selectedEnd)
    setInputVal(`${toDisplayDate(selectedStart)} - ${toDisplayDate(selectedEnd)}`)
    onApply(s, e)
    setIsOpen(false)
    setIsSelectingRange(false)
  }

  const handleCancelClick = () => {
    setSelectedStart(parseISODate(startDate))
    setSelectedEnd(parseISODate(endDate))
    setIsOpen(false)
    setIsSelectingRange(false)
  }

  const isDateInRange = (d: Date) => {
    const targetTime = d.getTime()
    const startTime = selectedStart.getTime()
    const endTime = isSelectingRange && hoverDate ? hoverDate.getTime() : selectedEnd.getTime()
    const min = Math.min(startTime, endTime)
    const max = Math.max(startTime, endTime)
    return targetTime >= min && targetTime <= max
  }

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  const isSelectedStart = (d: Date) => isSameDay(d, selectedStart)
  const isSelectedEnd = (d: Date) => {
    if (isSelectingRange && hoverDate) {
      return isSameDay(d, hoverDate)
    }
    return isSameDay(d, selectedEnd)
  }

  const renderMonthCalendar = (days: ReturnType<typeof getMonthDays>, mName: string, yr: number, isLeft: boolean) => (
    <div style={{ width: 235 }}>
      {/* Month Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px 10px',
          fontWeight: 700,
          fontSize: 14,
          fontFamily: 'var(--font-mono)',
          color: isLight ? '#1E293B' : '#F8FAFC',
        }}
      >
        {isLeft ? (
          <button
            type="button"
            onClick={prevMonth}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isLight ? '#475569' : '#94A3B8',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={16} />
          </button>
        ) : (
          <div style={{ width: 24 }} />
        )}

        <span>
          {mName} {yr}
        </span>

        {!isLeft ? (
          <button
            type="button"
            onClick={nextMonth}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isLight ? '#475569' : '#94A3B8',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <div style={{ width: 24 }} />
        )}
      </div>

      {/* Weekday Labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: isLight ? '#64748B' : '#94A3B8',
          marginBottom: 6,
        }}
      >
        {WEEK_DAYS.map(w => (
          <div key={w} style={{ padding: '2px 0' }}>
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          rowGap: 2,
          columnGap: 0,
        }}
      >
        {days.map((item, idx) => {
          const inRange = isDateInRange(item.date)
          const isStart = isSelectedStart(item.date)
          const isEnd = isSelectedEnd(item.date)

          let bg = 'transparent'
          let textColor = isLight ? '#1E293B' : '#E2E8F0'

          if (!item.isCurrentMonth) {
            textColor = isLight ? '#CBD5E1' : '#475569'
          }

          if (isStart || isEnd) {
            bg = '#2563EB' // Active start/end blue badge
            textColor = '#FFFFFF'
          } else if (inRange) {
            bg = isLight ? '#DBEAFE' : 'rgba(37, 99, 235, 0.25)'
            textColor = isLight ? '#1D4ED8' : '#93C5FD'
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(item.date)}
              onMouseEnter={() => {
                if (isSelectingRange) setHoverDate(item.date)
              }}
              style={{
                height: 28,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: bg,
                color: textColor,
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                fontWeight: isStart || isEnd ? 700 : 500,
                cursor: 'pointer',
                borderRadius: isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : 0,
                padding: 0,
                transition: 'background 0.1s ease',
              }}
            >
              {item.dayNum}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div ref={popupRef} style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column' }}>
      {/* Optional Top Label: "ช่วงเวลา" */}
      {label && (
        <div
          style={{
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: isLight ? '#475569' : '#94A3B8',
            marginBottom: 4,
          }}
        >
          {label}
        </div>
      )}

      {/* Input Group: [ DD/MM/YYYY - DD/MM/YYYY 📅 ] [ GO ] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: isLight ? '#FFFFFF' : '#0B1426',
            border: isOpen
              ? '1.5px solid #3B82F6'
              : isLight
              ? '1px solid rgba(26, 109, 181, 0.28)'
              : '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 6,
            boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="text"
            value={inputVal}
            readOnly
            onClick={() => setIsOpen(!isOpen)}
            placeholder="DD/MM/YYYY - DD/MM/YYYY"
            style={{
              width: 236,
              padding: '6px 36px 6px 12px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: isLight ? '#0F172A' : '#F8FAFC',
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            style={{
              position: 'absolute',
              right: 4,
              top: 4,
              bottom: 4,
              background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
              border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
              cursor: 'pointer',
              color: isLight ? '#475569' : '#94A3B8',
              padding: '0 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={15} />
          </button>
        </div>

        {/* Action GO Button */}
        <button
          type="button"
          onClick={handleApplyClick}
          disabled={loading}
          style={{
            padding: '6px 16px',
            background: isLight ? '#FFFFFF' : 'transparent',
            border: `1.5px solid ${accentColor}`,
            borderRadius: 6,
            color: accentColor,
            fontFamily: 'var(--font-mono)',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = accentColor
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isLight ? '#FFFFFF' : 'transparent'
            e.currentTarget.style.color = accentColor
          }}
        >
          {loading ? '...' : 'GO'}
        </button>
      </div>

      {/* Floating Dual-Month Calendar Modal Popup */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 9999,
            background: isLight ? '#FFFFFF' : '#0B1426',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            boxShadow: isLight
              ? '0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)'
              : '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            padding: '16px 18px 12px',
            minWidth: 500,
          }}
        >
          {/* Top Notch Pointer Arrow */}
          <div
            style={{
              position: 'absolute',
              top: -6,
              right: 75,
              width: 10,
              height: 10,
              background: isLight ? '#FFFFFF' : '#0B1426',
              borderLeft: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)',
              borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)',
              transform: 'rotate(45deg)',
            }}
          />

          {/* Two Month Calendars Side-by-Side */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            {renderMonthCalendar(
              leftDays,
              MONTH_NAMES[currentMonth.getMonth()],
              currentMonth.getFullYear(),
              true
            )}
            {renderMonthCalendar(
              rightDays,
              MONTH_NAMES[rightMonth.getMonth()],
              rightMonth.getFullYear(),
              false
            )}
          </div>

          {/* Bottom Action Footer Bar */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            {/* Selected Range Text on Left of Buttons */}
            <div
              style={{
                fontSize: 13.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: isLight ? '#334155' : '#CBD5E1',
                marginRight: 'auto',
              }}
            >
              {toDisplayDate(selectedStart)} - {toDisplayDate(selectedEnd)}
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancelClick}
              style={{
                padding: '5px 14px',
                background: 'transparent',
                border: '1.5px solid #22C55E',
                color: '#16A34A',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isLight ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              CANCEL
            </button>

            {/* Apply Button */}
            <button
              type="button"
              onClick={handleApplyClick}
              disabled={loading}
              style={{
                padding: '5px 16px',
                background: '#22C55E',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#16A34A'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#22C55E'
              }}
            >
              APPLY
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
