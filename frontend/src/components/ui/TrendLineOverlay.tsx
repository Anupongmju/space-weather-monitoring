/**
 * TrendLineOverlay
 * ─────────────────────────────────────────────────────────────
 * A self-contained overlay that adds TradingView-style trend
 * line drawing to any ReactECharts multi-grid chart.
 *
 * Usage:
 *   <div ref={wrapperRef} style={{ position:'relative', height: X }}>
 *     <ReactECharts ref={chartRef} option={option} />
 *     <TrendLineOverlay
 *       chartRef={chartRef}
 *       wrapperRef={wrapperRef}
 *       gridCount={6}
 *       gridUnits={['cts/min','ratio','nT','nT','km/s','pfu']}
 *       lines={lines}
 *       drawingMode={drawingMode}
 *       pendingP1={pendingP1}
 *       onChartClick={handleClick}
 *       onRemoveLine={removeLine}
 *     />
 *   </div>
 *
 * External markLines (for ECharts to render the committed lines) are
 * built by buildMarkLines() — call it inside your option.series.
 */
import { useCallback, useState, useEffect } from 'react'
import type { RefObject } from 'react'
import type { DrawnLine } from '../../hooks/useLineDrawing'

// ── helpers ────────────────────────────────────────────────────────────────

function fmtDuration(ms: number) {
  const totalMin = Math.round(Math.abs(ms) / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtValue(v: number, unit: string) {
  if (unit === 'pfu') return v.toExponential(2)
  if (unit === 'K')   return Math.round(v).toLocaleString()
  return v.toFixed(2)
}

// ── types ──────────────────────────────────────────────────────────────────

interface Pending {
  time: number
  value: number
  gridIndex: number
}

interface Props {
  chartRef:    RefObject<any>
  wrapperRef:  RefObject<HTMLDivElement>
  gridCount:   number
  gridUnits:   string[]          // one unit label per grid
  lines:       DrawnLine[]
  drawingMode: boolean
  pendingP1:   Pending | null
  onChartClick: (time: number, value: number, gridIndex: number) => void
  onRemoveLine: (id: string) => void
}

// ── main component ─────────────────────────────────────────────────────────

export default function TrendLineOverlay({
  chartRef,
  wrapperRef,
  gridCount,
  gridUnits,
  lines,
  drawingMode,
  pendingP1,
  onChartClick,
  onRemoveLine,
}: Props) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  // Force re-render when chart zooms/pans so pixel positions update
  const [tick, setTick] = useState(0)

  // Nudge pixel positions every 200ms while lines exist (handles zoom/pan)
  useEffect(() => {
    if (lines.length === 0) return
    const id = setInterval(() => setTick(t => t + 1), 200)
    return () => clearInterval(id)
  }, [lines.length])

  // ── coordinate conversion ────────────────────────────────────────────────

  const getInstance = useCallback(() =>
    (chartRef.current as any)?.getEchartsInstance?.() ?? null,
  [chartRef])

  const detectGrid = useCallback((clientX: number, clientY: number): number | null => {
    const inst = getInstance()
    if (!inst) return null
    const dom = inst.getDom()
    if (!dom) return null
    const rect = dom.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    for (let i = 0; i < gridCount; i++) {
      try { if (inst.containPixel({ gridIndex: i }, [px, py])) return i } catch {}
    }
    return null
  }, [getInstance, gridCount])

  const pixelToCoord = useCallback((clientX: number, clientY: number, gIdx: number) => {
    const inst = getInstance()
    if (!inst) return null
    const dom = inst.getDom()
    if (!dom) return null
    const rect = dom.getBoundingClientRect()
    const res = inst.convertFromPixel({ gridIndex: gIdx }, [clientX - rect.left, clientY - rect.top])
    if (!Array.isArray(res)) return null
    return { time: res[0] as number, value: res[1] as number }
  }, [getInstance])

  const coordToPixel = useCallback((time: number, value: number, gIdx: number) => {
    const inst = getInstance()
    if (!inst) return null
    const dom = inst.getDom()
    if (!dom) return null
    const domRect = dom.getBoundingClientRect()
    const wrapperRect = wrapperRef.current?.getBoundingClientRect()
    if (!wrapperRect) return null
    const res = inst.convertToPixel({ gridIndex: gIdx }, [time, value])
    if (!Array.isArray(res)) return null
    const x = res[0] + (domRect.left - wrapperRect.left)
    const y = res[1] + (domRect.top - wrapperRect.top)
    return { x, y }
  }, [getInstance, wrapperRef])

  // p1 anchor pixel
  const p1Pixel = pendingP1
    ? coordToPixel(pendingP1.time, pendingP1.value, pendingP1.gridIndex)
    : null

  // ── event handlers ───────────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!drawingMode) return
    const gIdx = detectGrid(e.clientX, e.clientY)
    if (gIdx == null) return
    const coord = pixelToCoord(e.clientX, e.clientY, gIdx)
    if (!coord) return
    onChartClick(coord.time, coord.value, gIdx)
  }, [drawingMode, detectGrid, pixelToCoord, onChartClick])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawingMode || !pendingP1) { setMousePos(null); return }
    const wrapperRect = wrapperRef.current?.getBoundingClientRect()
    if (!wrapperRect) return
    setMousePos({ x: e.clientX - wrapperRect.left, y: e.clientY - wrapperRect.top })
  }, [drawingMode, pendingP1, wrapperRef])

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        cursor: drawingMode ? 'crosshair' : 'default',
        pointerEvents: drawingMode ? 'all' : 'none',
        zIndex: 5,
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
    >
      {/* ── SVG: ghost preview line + P1 dot ── */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        {drawingMode && p1Pixel && mousePos && (
          <line
            x1={p1Pixel.x} y1={p1Pixel.y}
            x2={mousePos.x} y2={mousePos.y}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        )}
        {drawingMode && p1Pixel && (
          <circle cx={p1Pixel.x} cy={p1Pixel.y} r={5}
            fill="#A78BFA" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5}
          />
        )}
      </svg>

      {/* ── Committed lines: endpoint dots + stats badge ── */}
      {lines.map(l => {
        const px1 = coordToPixel(l.p1.time, l.p1.value, l.gridIndex)
        const px2 = coordToPixel(l.p2.time, l.p2.value, l.gridIndex)
        if (!px1 || !px2) return null

        const unit   = gridUnits[l.gridIndex] ?? ''
        const pct    = l.p1.value !== 0 ? ((l.p2.value - l.p1.value) / Math.abs(l.p1.value)) * 100 : 0
        const delta  = l.p2.value - l.p1.value
        const dur    = fmtDuration(l.p2.time - l.p1.time)
        const pctCol = pct >= 0 ? '#34D399' : '#F87171'
        const midX   = (px1.x + px2.x) / 2
        const midY   = (px1.y + px2.y) / 2

        return (
          <div key={l.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* Endpoint dots */}
            {([px1, px2] as const).map((pt, i) => (
              <div
                key={i}
                title="ดับเบิลคลิกเพื่อลบเส้น"
                onDoubleClick={(e) => { e.stopPropagation(); onRemoveLine(l.id) }}
                style={{
                  position: 'absolute',
                  left: pt.x - 5, top: pt.y - 5,
                  width: 10, height: 10, borderRadius: '50%',
                  background: l.color,
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  boxShadow: `0 0 6px ${l.color}`,
                  cursor: 'pointer',
                  pointerEvents: 'all',
                }}
              />
            ))}

            {/* Stats badge */}
            <div style={{
              position: 'absolute',
              left: midX + 10,
              top: midY - 38,
              background: 'rgba(5,10,20,0.92)',
              border: `1px solid ${l.color}66`,
              borderRadius: 4,
              padding: '5px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: `0 2px 12px rgba(0,0,0,0.6), 0 0 8px ${l.color}22`,
              zIndex: 20,
            }}>
              <div style={{ color: l.color, fontWeight: 700, marginBottom: 2, letterSpacing: 0.3 }}>
                ▲ {fmtValue(l.p1.value, unit)} → {fmtValue(l.p2.value, unit)} {unit}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: pctCol, fontWeight: 700 }}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
                <span style={{ color: '#94A3B8' }}>{delta >= 0 ? '+' : ''}{fmtValue(delta, unit)}</span>
                <span style={{ color: '#64748B' }}>{dur}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── buildMarkLines ─────────────────────────────────────────────────────────
/**
 * Returns a markLine config for a specific gridIndex.
 * Drop this into any series that belongs to that grid.
 *
 * Example:
 *   { name: 'Bt', type: 'line', xAxisIndex: 2, yAxisIndex: 2,
 *     ...
 *     markLine: buildMarkLines(lines, 2)  }
 */
export function buildMarkLines(lines: DrawnLine[], gridIndex: number) {
  const filtered = lines.filter(l => l.gridIndex === gridIndex)
  if (filtered.length === 0) return undefined
  return {
    silent: true,
    symbol: ['circle', 'circle'],
    symbolSize: 5,
    data: filtered.map(l => ([
      { coord: [l.p1.time, l.p1.value], itemStyle: { color: l.color } },
      { coord: [l.p2.time, l.p2.value], itemStyle: { color: l.color },
        lineStyle: { color: l.color, width: 1.5, opacity: 0.9 },
        label: { show: false } },
    ])),
  }
}
