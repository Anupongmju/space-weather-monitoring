import React, { useState, useRef, useEffect } from 'react'
import { Download, Image as ImageIcon, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import {
  ExportColumn,
  ExportMetadata,
  exportToCsv,
  exportToTxt,
  exportChartWithHeader
} from '../../utils/exportHelpers'

export interface ExportChartMenuProps {
  chartRef: React.RefObject<any>
  data: any[]
  columns: ExportColumn[]
  metadata: ExportMetadata
  filenameBase: string
  fetchFullData?: () => Promise<any[]>
  accentColor?: string
}

export default function ExportChartMenu({
  chartRef,
  data,
  columns,
  metadata,
  filenameBase,
  fetchFullData,
  accentColor = '#0284C7'
}: ExportChartMenuProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Get data to export (either fetched full 1-min data or current data)
  const getDataToExport = async (): Promise<any[]> => {
    if (fetchFullData) {
      setLoadingMsg('FETCHING 1-MIN DATA...')
      const full = await fetchFullData()
      if (Array.isArray(full) && full.length > 0) return full
    }
    return data
  }

  const handleExportPng = async () => {
    setIsOpen(false)
    setLoading(true)
    setLoadingMsg('GENERATING HI-RES PNG...')
    try {
      const echartsInstance = chartRef.current?.getEchartsInstance?.()
      if (!echartsInstance) {
        throw new Error('ECharts instance not found')
      }
      await exportChartWithHeader(echartsInstance, metadata, isLight, `${filenameBase}.png`)
    } catch (err) {
      console.error('Failed to export chart image:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportTxt = async () => {
    setIsOpen(false)
    setLoading(true)
    try {
      const records = await getDataToExport()
      setLoadingMsg('FORMATTING TXT...')
      exportToTxt(records, columns, metadata, `${filenameBase}.txt`)
    } catch (err) {
      console.error('Failed to export TXT data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = async () => {
    setIsOpen(false)
    setLoading(true)
    try {
      const records = await getDataToExport()
      setLoadingMsg('FORMATTING CSV...')
      exportToCsv(records, columns, `${filenameBase}.csv`)
    } catch (err) {
      console.error('Failed to export CSV data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={loading}
        onClick={() => setIsOpen(!isOpen)}
        title="Export Data & Chart Image"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.75)',
          border: isLight ? '1px solid rgba(2, 132, 199, 0.3)' : `1px solid ${accentColor}55`,
          color: isLight ? '#0369A1' : '#38BDF8',
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: "'Share Tech Mono', monospace, sans-serif",
          cursor: loading ? 'wait' : 'pointer',
          fontWeight: 700,
          letterSpacing: 0.5,
          transition: 'all 0.15s ease',
          boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.05)' : `0 0 10px ${accentColor}20`
        }}
        onMouseEnter={e => {
          if (!loading) {
            e.currentTarget.style.borderColor = isLight ? '#0284C7' : '#38BDF8'
            e.currentTarget.style.boxShadow = `0 0 12px ${accentColor}44`
          }
        }}
        onMouseLeave={e => {
          if (!loading) {
            e.currentTarget.style.borderColor = isLight ? 'rgba(2, 132, 199, 0.3)' : `${accentColor}55`
            e.currentTarget.style.boxShadow = isLight ? '0 1px 4px rgba(0,0,0,0.05)' : `0 0 10px ${accentColor}20`
          }
        }}
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span style={{ fontSize: 11 }}>{loadingMsg || 'PROCESSING...'}</span>
          </>
        ) : (
          <>
            <Download size={13} />
            <span>EXPORT</span>
            <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 99999,
            minWidth: 230,
            background: isLight ? '#FFFFFF' : '#0B132B',
            border: isLight ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 6,
            padding: '6px',
            boxShadow: isLight
              ? '0 10px 25px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)'
              : '0 12px 30px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          {/* Header Label inside Menu */}
          <div style={{
            padding: '6px 8px 4px',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            color: isLight ? '#64748B' : '#94A3B8',
            letterSpacing: 1,
            textTransform: 'uppercase',
            borderBottom: isLight ? '1px solid #F1F5F9' : '1px solid rgba(255,255,255,0.07)',
            marginBottom: 4
          }}>
            EXPORT OPTIONS
          </div>

          {/* Option 1: Hi-Res PNG with Header */}
          <button
            type="button"
            onClick={handleExportPng}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              color: isLight ? '#0F172A' : '#F8FAFC',
              fontFamily: "'Share Tech Mono', monospace, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isLight ? '#F0F9FF' : 'rgba(56, 189, 248, 0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 4,
              background: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isLight ? '#0284C7' : '#38BDF8', flexShrink: 0
            }}>
              <ImageIcon size={14} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>Save Chart Image (.png)</span>
              <span style={{ fontSize: 10, color: isLight ? '#64748B' : '#94A3B8' }}>Hi-Res 2x with Metadata Header</span>
            </div>
          </button>

          {/* Option 2: TXT Table */}
          <button
            type="button"
            onClick={handleExportTxt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              color: isLight ? '#0F172A' : '#F8FAFC',
              fontFamily: "'Share Tech Mono', monospace, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isLight ? '#F0FDF4' : 'rgba(34, 197, 94, 0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 4,
              background: isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(34, 197, 94, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isLight ? '#059669' : '#34D399', flexShrink: 0
            }}>
              <FileText size={14} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>Export Data Table (.txt)</span>
              <span style={{ fontSize: 10, color: isLight ? '#64748B' : '#94A3B8' }}>Fixed-width Space Weather format</span>
            </div>
          </button>

          {/* Option 3: CSV Spreadsheet */}
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              color: isLight ? '#0F172A' : '#F8FAFC',
              fontFamily: "'Share Tech Mono', monospace, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isLight ? '#FAF5FF' : 'rgba(168, 85, 247, 0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 4,
              background: isLight ? 'rgba(124, 58, 237, 0.1)' : 'rgba(168, 85, 247, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isLight ? '#7C3AED' : '#C084FC', flexShrink: 0
            }}>
              <FileSpreadsheet size={14} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>Export Spreadsheet (.csv)</span>
              <span style={{ fontSize: 10, color: isLight ? '#64748B' : '#94A3B8' }}>Excel & Pandas compatible</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
