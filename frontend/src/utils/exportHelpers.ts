/**
 * Utilities for exporting space weather charts and datasets.
 * Includes Clean White Publication Export (NOAA / SWPC scientific style).
 */

import * as echarts from 'echarts'
import { formatPowerOf10 } from './formatters'

export interface ExportColumn {
  key: string
  label: string
  width?: number
  formatter?: (val: any, row?: any) => string
  format?: (val: any, row?: any) => string
}

export interface ExportMetadata {
  station: string
  viewTitle: string
  description?: string
  timeRangeText?: string
  totalRecords?: number
}

/**
 * Trigger browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Export data array to CSV format.
 */
export function exportToCsv(data: any[], columns: ExportColumn[], filename: string) {
  if (!data || !data.length) return

  const header = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',')
  const rows = data.map(row => {
    return columns.map(c => {
      let val = row[c.key]
      const fmt = c.formatter || c.format
      if (fmt) {
        val = fmt(val, row)
      } else if (val === null || val === undefined || Number.isNaN(val)) {
        val = ''
      }
      return typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(',')
  })

  const csvContent = '\uFEFF' + [header, ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

/**
 * Export data array to Fixed-Width TXT format with Metadata Header.
 */
export function exportToTxt(data: any[], columns: ExportColumn[], metadata: ExportMetadata = {} as any, filename: string) {
  if (!data || !data.length) return

  const meta = metadata || ({} as ExportMetadata)
  const nowUTC = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
  const timeRange = meta.timeRangeText || (
    data.length > 0 && data[0].time_tag
      ? `${data[0].time_tag} to ${data[data.length - 1].time_tag} UTC`
      : 'N/A'
  )

  const colWidths = columns.map(c => Math.max(c.width || 12, c.label.length + 2))
  const totalWidth = Math.max(80, colWidths.reduce((a, b) => a + b, 0))

  const lines: string[] = []
  lines.push('='.repeat(totalWidth))
  lines.push(`SPACE WEATHER MONITORING SYSTEM - DATA EXPORT`)
  lines.push(`Station / Source : ${(meta.station || 'SPACE WEATHER').toUpperCase()}`)
  lines.push(`View / Channel   : ${meta.viewTitle || 'DATA EXPORT'}`)
  if (meta.description) {
    lines.push(`Description      : ${meta.description}`)
  }
  lines.push(`Time Range (UTC) : ${timeRange}`)
  lines.push(`Exported At (UTC): ${nowUTC}`)
  lines.push(`Total Records    : ${data.length.toLocaleString()}`)
  lines.push('='.repeat(totalWidth))

  const headerStr = columns.map((c, i) => c.label.padEnd(colWidths[i])).join('')
  lines.push(headerStr)
  lines.push('-'.repeat(totalWidth))

  for (const row of data) {
    const rowStr = columns.map((c, i) => {
      let val = row[c.key]
      const fmt = c.formatter || c.format
      if (fmt) {
        val = fmt(val, row)
      } else if (val === null || val === undefined || Number.isNaN(val)) {
        val = 'NaN'
      } else if (typeof val === 'number') {
        val = val.toFixed(1)
      } else {
        val = String(val)
      }
      return String(val).padEnd(colWidths[i])
    }).join('')
    lines.push(rowStr)
  }

  const txtContent = lines.join('\r\n')
  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' })
  downloadBlob(blob, filename.endsWith('.txt') ? filename : `${filename}.txt`)
}

/**
 * Adapt light colors (originally meant for dark backgrounds) into vibrant, high-contrast colors for clean white print.
 */
function adaptColorForWhiteBg(color: string): string {
  if (!color || typeof color !== 'string') return color
  const lower = color.toLowerCase().trim()
  if (lower === '#38bdf8' || lower === '#60a5fa' || lower === '#7dd3fc' || lower === '#22d3ee') return '#0284C7'
  if (lower === '#34d399' || lower === '#2dd4bf' || lower === '#4ade80' || lower === '#86efac') return '#059669'
  if (lower === '#c084fc' || lower === '#a855f7' || lower === '#d8b4fe' || lower === '#e9d5ff') return '#7C3AED'
  if (lower === '#fbbf24' || lower === '#facc15' || lower === '#fed7aa' || lower === '#fde047') return '#D97706'
  if (lower === '#f87171' || lower === '#f472b6' || lower === '#fb7185' || lower === '#fca5a5') return '#DC2626'
  return color
}

/**
 * Transforms an active chart's ECharts options into a clean, publication-ready white theme
 * styled after NOAA / SWPC scientific observation graphs.
 * The title is removed from ECharts so it can be rendered OUTSIDE the chart on the canvas header.
 */
function buildCleanWhiteOption(rawOption: any): { option: any; renderWidth: number; renderHeight: number } {
  const opt = JSON.parse(JSON.stringify(rawOption))
  opt.backgroundColor = '#FFFFFF'
  opt.animation = false

  // Helper to extract a concise, descriptive title for each grid tier in multi-grid layouts
  const getGridTitle = (idx: number): { title: string; color?: string } => {
    // 1. From rawOption.title if it was an array of titles (like RadiationMonitoring)
    if (Array.isArray(rawOption.title) && rawOption.title[idx]?.text) {
      const rawText = rawOption.title[idx].text.replace(/^[●○■▪\s]+/, '').trim()
      const color = rawOption.title[idx].textStyle?.color
      return { title: rawText, color }
    }
    // 2. From rawOption.yAxis name if present
    const y = Array.isArray(rawOption.yAxis) ? rawOption.yAxis[idx] : rawOption.yAxis
    if (y?.name && typeof y.name === 'string' && y.name.trim()) {
      const color = y.nameTextStyle?.color
      return { title: y.name.trim(), color }
    }
    // 3. From series belonging to this grid
    const allSeries = Array.isArray(rawOption.series) ? rawOption.series : []
    const matchedSeries = allSeries.filter(
      (s: any) => s.gridIndex === idx || s.yAxisIndex === idx || s.xAxisIndex === idx
    )
    if (matchedSeries.length > 0) {
      const sNames = matchedSeries.map((s: any) => s.name).filter(Boolean)
      if (sNames.length === 1) return { title: sNames[0], color: matchedSeries[0].itemStyle?.color || matchedSeries[0].color }
      const firstWord = sNames[0].split(/[\s(:–-]/)[0]
      if (sNames.length > 1 && sNames.every((n: string) => n.startsWith(firstWord))) {
        return { title: sNames[0].split(/[(:–-]/)[0].trim(), color: matchedSeries[0].itemStyle?.color }
      }
      return { title: sNames.slice(0, 2).join(' / '), color: matchedSeries[0].itemStyle?.color }
    }
    return { title: `Tier ${idx + 1}` }
  }

  const renderWidth = 1440
  const isMultiGrid = Array.isArray(opt.grid) && opt.grid.length > 1
  const nGrids = isMultiGrid ? opt.grid.length : 1

  // Count active series/legend items to calculate required legend height
  const seriesNames = Array.isArray(opt.series)
    ? opt.series.map((s: any) => s.name).filter(Boolean)
    : []
  const uniqueSeries = Array.from(new Set(seriesNames))
  const seriesCount = uniqueSeries.length

  // In 1440px width with left=100 and right=45 (usable ~1295px):
  // Each legend item with icon and text takes ~180px -> fits ~7 items per row
  const itemsPerRow = 7
  const legendRows = seriesCount > 0 ? Math.ceil(seriesCount / itemsPerRow) : 0
  const legendHeight = legendRows > 0 ? (legendRows * 24 + 8) : 0
  // Generous buffer between lowest legend item and top grid
  const topMargin = Math.max(52, legendHeight + 26)

  const leftMargin = 100
  const rightMargin = 55
  const bottomMargin = 60

  let gridH = 460
  let gap = 32

  if (isMultiGrid) {
    if (nGrids >= 6) {
      gridH = 150
      gap = 34
    } else if (nGrids >= 4) {
      gridH = 165
      gap = 36
    } else if (nGrids === 3) {
      gridH = 190
      gap = 38
    } else {
      // 2 grids
      gridH = 220
      gap = 40
    }
  }

  const renderHeight = isMultiGrid
    ? topMargin + nGrids * gridH + (nGrids - 1) * gap + bottomMargin
    : Math.max(560, topMargin + gridH + bottomMargin)

  // 1. Grid Configuration
  if (isMultiGrid) {
    opt.grid.forEach((g: any, idx: number) => {
      g.show = true
      g.borderColor = '#94A3B8'
      g.borderWidth = 1.2
      g.left = leftMargin
      g.right = rightMargin
      g.top = topMargin + idx * (gridH + gap)
      g.height = gridH
    })

    // Display clear, bold tier headers above each grid box
    opt.title = opt.grid.map((g: any, idx: number) => {
      const { title, color } = getGridTitle(idx)
      const textColor = color ? adaptColorForWhiteBg(color) : '#0F172A'
      return {
        show: true,
        text: `● ${title}`,
        left: leftMargin,
        top: g.top - 20,
        textStyle: {
          color: textColor,
          fontSize: 12,
          fontWeight: 800,
          fontFamily: "'Share Tech Mono', 'Inter', -apple-system, sans-serif",
          letterSpacing: 0.5
        }
      }
    })
  } else {
    // Single grid chart has its main title rendered on the outside canvas header
    delete opt.title
    opt.title = { show: false }

    opt.grid = {
      ...(opt.grid || {}),
      show: true,
      borderColor: '#94A3B8',
      borderWidth: 1.2,
      top: topMargin,
      bottom: bottomMargin,
      left: leftMargin,
      right: rightMargin,
      height: undefined
    }
  }

  // 2. Legend: Always placed cleanly at the top of the chart canvas (above top grid with topMargin breathing room)
  if (opt.legend) {
    opt.legend = {
      ...opt.legend,
      show: true,
      top: 10,
      left: 'center',
      right: 'auto',
      bottom: 'auto',
      itemGap: 16,
      itemWidth: 18,
      itemHeight: 10,
      textStyle: {
        color: '#1E293B',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'Inter', -apple-system, sans-serif"
      }
    }
  }

  // 3. X-Axes Styling
  const styleXAxis = (x: any) => {
    x.axisLine = { show: true, lineStyle: { color: '#64748B', width: 1.2 } }
    x.axisTick = { show: true, lineStyle: { color: '#64748B' } }
    x.splitLine = {
      show: false // No vertical day/grid lines in saved image
    }
  }

  if (Array.isArray(opt.xAxis)) {
    opt.xAxis.forEach((x: any, idx: number) => {
      styleXAxis(x)
      if (idx === opt.xAxis.length - 1) {
        // Bottom-most X-axis gets Universal Time label and date ticks
        x.name = 'Universal Time'
        x.nameLocation = 'middle'
        x.nameGap = 28
        x.nameTextStyle = { color: '#475569', fontSize: 11, fontWeight: 700 }
        x.axisLabel = {
          ...(x.axisLabel || {}),
          show: true,
          color: '#1E293B',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "'Share Tech Mono', monospace, sans-serif"
        }
      } else {
        // Upper X-axes in a multi-grid stack do NOT show X-axis name or tick labels (keeps it clean)
        delete x.name
        x.axisLabel = { show: false }
        x.axisTick = { show: false }
      }
    })
  } else if (opt.xAxis) {
    styleXAxis(opt.xAxis)
    opt.xAxis.name = 'Universal Time'
    opt.xAxis.nameLocation = 'middle'
    opt.xAxis.nameGap = 28
    opt.xAxis.nameTextStyle = { color: '#475569', fontSize: 11, fontWeight: 700 }
    opt.xAxis.axisLabel = {
      ...(opt.xAxis.axisLabel || {}),
      show: true,
      color: '#1E293B',
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "'Share Tech Mono', monospace, sans-serif"
    }
  }

  // 4. Y-Axes Styling
  const styleYAxis = (y: any, origY?: any, idx?: number) => {
    const isRightAxis = y.position === 'right' || origY?.position === 'right'
    y.axisLine = { show: true, lineStyle: { color: '#64748B', width: 1.2 } }
    y.axisTick = { show: true, lineStyle: { color: '#64748B' } }
    const isLog = y.type === 'log' || origY?.type === 'log'
    const origFormatter = origY?.axisLabel?.formatter

    if (isRightAxis) {
      delete y.name
      y.splitLine = { show: false }

      // Adapt rich text for clean white background print
      const origRich = origY?.axisLabel?.rich || y.axisLabel?.rich
      let adaptedRich = origRich
      if (origRich) {
        adaptedRich = {}
        for (const k of Object.keys(origRich)) {
          adaptedRich[k] = {
            ...origRich[k],
            color: origRich[k].color ? adaptColorForWhiteBg(origRich[k].color) : '#0F172A',
            fontSize: origRich[k].fontSize || 11,
            fontFamily: "'Share Tech Mono', 'Inter', monospace, sans-serif"
          }
        }
      }

      y.axisLabel = {
        ...(y.axisLabel || {}),
        show: true,
        margin: 8,
        color: '#1E293B',
        fontSize: 11,
        fontWeight: 800,
        fontFamily: "'Share Tech Mono', 'Inter', monospace, sans-serif",
        rich: adaptedRich,
        formatter: (val: number) => {
          if (typeof origFormatter === 'function') {
            return origFormatter(val)
          }
          const exp = Math.round(Math.log10(val))
          if (exp === -8) return 'A'
          if (exp === -7) return 'B'
          if (exp === -6) return 'C'
          if (exp === -5) return 'M'
          if (exp === -4) return 'X'
          if (exp === -3) return 'X10'
          return ''
        }
      }
      return
    }

    y.axisLabel = {
      ...(y.axisLabel || {}),
      show: true,
      color: '#1E293B',
      fontSize: 10,
      fontWeight: 600,
      fontFamily: "'Share Tech Mono', 'Inter', monospace, sans-serif",
      formatter: isLog
        ? (val: number) => {
            if (typeof origFormatter === 'function') {
              const res = origFormatter(val)
              // If the original formatter returned a flare class letter like 'A', 'B', 'M', 'X', keep it
              if (typeof res === 'string' && res !== '' && !res.includes('10')) return res
            }
            return formatPowerOf10(val)
          }
        : (typeof origFormatter === 'function' ? origFormatter : undefined)
    }

    // Ensure Y-axis has a descriptive name in multi-tier layouts
    if (!y.name && typeof idx === 'number') {
      const gridInfo = getGridTitle(idx)
      if (gridInfo?.title) y.name = gridInfo.title
    }

    y.nameTextStyle = {
      color: '#0F172A',
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "sans-serif"
    }
    y.nameGap = y.nameGap ? Math.min(y.nameGap, 55) : 48
    y.splitLine = {
      show: true,
      lineStyle: { color: '#E2E8F0', type: 'solid', width: 1 }
    }
  }

  if (Array.isArray(opt.yAxis)) {
    opt.yAxis.forEach((y: any, idx: number) => {
      const origY = Array.isArray(rawOption.yAxis) ? rawOption.yAxis[idx] : rawOption.yAxis
      styleYAxis(y, origY, idx)
    })
  } else if (opt.yAxis) {
    styleYAxis(opt.yAxis, rawOption.yAxis, 0)
  }

  // 5. Series: Adapt colors for white paper contrast and ensure clipping within grid
  if (Array.isArray(opt.series)) {
    opt.series.forEach((s: any) => {
      s.clip = true
      if (s.lineStyle?.color) s.lineStyle.color = adaptColorForWhiteBg(s.lineStyle.color)
      if (s.itemStyle?.color) s.itemStyle.color = adaptColorForWhiteBg(s.itemStyle.color)
      if (s.color) s.color = adaptColorForWhiteBg(s.color)
      if (s.markLine) {
        if (Array.isArray(s.markLine.data)) {
          // Remove vertical day divider lines (m.xAxis) from the exported image
          s.markLine.data = s.markLine.data.filter((m: any) => m && m.xAxis === undefined)
        }
        if (!s.markLine.data || s.markLine.data.length === 0) {
          delete s.markLine
        } else {
          s.markLine.lineStyle = { color: '#94A3B8', type: 'solid', width: 1.2 }
          s.markLine.data.forEach((m: any) => {
            if (m.lineStyle?.color) m.lineStyle.color = '#94A3B8'
          })
        }
      }
    })
  }

  // Remove interactive overlays
  delete opt.tooltip
  delete opt.dataZoom

  return { option: opt, renderWidth, renderHeight }
}

/**
 * Export ECharts instance as High-Resolution PNG with Clean White NOAA / SWPC scientific style.
 * Renders title completely outside the chart on a clean top canvas banner.
 */
export async function exportChartWithHeader(
  echartsInstance: any,
  metadata: ExportMetadata,
  isLight: boolean,
  filename: string
): Promise<void> {
  if (!echartsInstance) return

  // 1. Convert active options to clean white theme with synchronized dimensions
  const rawOption = echartsInstance.getOption()
  const { option: cleanWhiteOption, renderWidth, renderHeight } = buildCleanWhiteOption(rawOption)

  // 2. Render chart on an offscreen DOM container
  const offscreenDiv = document.createElement('div')
  offscreenDiv.style.width = `${renderWidth}px`
  offscreenDiv.style.height = `${renderHeight}px`
  offscreenDiv.style.position = 'fixed'
  offscreenDiv.style.left = '-99999px'
  offscreenDiv.style.top = '-99999px'
  offscreenDiv.style.zIndex = '-99999'
  document.body.appendChild(offscreenDiv)

  const tempChart = echarts.init(offscreenDiv, null, {
    renderer: 'canvas',
    devicePixelRatio: 2
  })

  tempChart.setOption(cleanWhiteOption, true)

  const chartDataUrl = tempChart.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#FFFFFF'
  })

  // Dispose offscreen chart
  tempChart.dispose()
  document.body.removeChild(offscreenDiv)

  // 3. Compose final image with Clean Top Header Banner (OUTSIDE CHART) and Bottom Footer
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const headerHeight = 90  // Dedicated space for Title & Subtitle completely outside the chart
        const footerHeight = 45  // Dedicated space for Timestamp, Period & Branding
        const totalLogicalHeight = renderHeight + headerHeight + footerHeight

        const canvas = document.createElement('canvas')
        const scale = 2 // 2x Retina DPI
        canvas.width = renderWidth * scale
        canvas.height = totalLogicalHeight * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'))
          return
        }

        // Scale by 2 for Retina clarity
        ctx.scale(scale, scale)

        // Fill background pure white
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, renderWidth, totalLogicalHeight)

        // ==========================================
        // A. TOP HEADER BANNER (OUTSIDE CHART)
        // ==========================================
        ctx.textBaseline = 'top'
        ctx.textAlign = 'center'

        // 1. Station & View Title Clean Deduplication
        const meta = metadata || ({} as ExportMetadata)
        let mainTitle = meta.viewTitle || meta.station || 'SPACE WEATHER CHART'
        if (meta.station && meta.viewTitle) {
          const sNorm = meta.station.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          const vNorm = meta.viewTitle.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          if (vNorm.includes(sNorm) || sNorm.includes(vNorm)) {
            mainTitle = meta.viewTitle.length >= meta.station.length ? meta.viewTitle : meta.station
          } else {
            mainTitle = `${meta.station} — ${meta.viewTitle}`
          }
        }

        ctx.fillStyle = '#0F172A'
        ctx.font = 'bold 18px "Orbitron", -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillText(mainTitle.toUpperCase(), renderWidth / 2, 22)

        // 2. Subtitle / Description
        ctx.fillStyle = '#475569'
        ctx.font = '13px "Inter", -apple-system, sans-serif'
        const subtitle = meta.description || 'Space Weather Observation Telemetry Data'
        ctx.fillText(subtitle, renderWidth / 2, 54)

        // 3. Top Divider Line separating Title from Chart
        ctx.fillStyle = '#CBD5E1'
        ctx.fillRect(40, headerHeight - 2, renderWidth - 80, 1.5)

        // ==========================================
        // B. DRAW MAIN CHART (BELOW HEADER)
        // ==========================================
        ctx.drawImage(img, 0, headerHeight, renderWidth, renderHeight)

        // ==========================================
        // C. BOTTOM FOOTER (NOAA SWPC STYLE)
        // ==========================================
        const footerY = headerHeight + renderHeight
        // Bottom Divider Line
        ctx.fillStyle = '#CBD5E1'
        ctx.fillRect(40, footerY, renderWidth - 80, 1.5)

        ctx.textBaseline = 'middle'
        const textCenterY = footerY + footerHeight / 2
        const nowUTC = new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC'

        // Left: Updated timestamp
        ctx.fillStyle = '#0F172A'
        ctx.font = 'bold 13px "Share Tech Mono", monospace, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`Updated ${nowUTC}`, 40, textCenterY)

        // Center: Time Domain
        if (meta.timeRangeText) {
          ctx.fillStyle = '#64748B'
          ctx.font = '12px "Inter", -apple-system, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(`Observation Period: ${meta.timeRangeText}`, renderWidth / 2, textCenterY)
        }

        // Right: Organization / Station Branding
        ctx.fillStyle = '#0284C7'
        ctx.font = 'bold 13px "Orbitron", -apple-system, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('SPACE WEATHER OBSERVATORY', renderWidth - 40, textCenterY)

        // Convert canvas to Blob and download
        canvas.toBlob(blob => {
          if (blob) {
            downloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`)
            resolve()
          } else {
            reject(new Error('Failed to create image blob'))
          }
        }, 'image/png')
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = e => reject(e)
    img.src = chartDataUrl
  })
}
