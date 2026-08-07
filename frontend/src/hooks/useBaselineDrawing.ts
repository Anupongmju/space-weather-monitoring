import { useCallback, useRef, useState } from 'react'

export interface Baseline {
  id: string
  yValue: number
  color: string
  gridIndex: number   // which ECharts grid (0=Density, 1=Speed, 2=Temperature)
  label?: string
}

const BASELINE_COLORS = [
  '#F472B6', // pink
  '#A78BFA', // violet
  '#34D399', // emerald
  '#FB923C', // orange
  '#60A5FA', // blue
  '#FBBF24', // amber
  '#F87171', // red
  '#2DD4BF', // teal
]

let colorIndex = 0
function nextColor() {
  const c = BASELINE_COLORS[colorIndex % BASELINE_COLORS.length]
  colorIndex++
  return c
}

export function useBaselineDrawing() {
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [drawingMode, setDrawingMode] = useState(false)
  const draggingRef = useRef<{ id: string } | null>(null)

  const toggleDrawingMode = useCallback(() => {
    setDrawingMode(prev => !prev)
  }, [])

  /** Add a new baseline at a given Y value on a specific grid */
  const addBaseline = useCallback((yValue: number, gridIndex = 0) => {
    setBaselines(prev => [
      ...prev,
      {
        id: `baseline_${Date.now()}_g${gridIndex}`,
        yValue,
        color: nextColor(),
        gridIndex,
      },
    ])
  }, [])

  const removeBaseline = useCallback((id: string) => {
    setBaselines(prev => prev.filter(b => b.id !== id))
  }, [])

  const clearBaselines = useCallback(() => {
    setBaselines([])
  }, [])

  const updateBaselineY = useCallback((id: string, yValue: number) => {
    setBaselines(prev =>
      prev.map(b => (b.id === id ? { ...b, yValue } : b))
    )
  }, [])

  /**
   * Calculate % difference between a current value and baselines of a given grid.
   * Returns: ((currentVal - baseline) / |baseline|) * 100
   */
  const calcPctDiff = useCallback((currentVal: number | null | undefined, gridIndex: number) => {
    if (currentVal == null || !isFinite(currentVal)) return []
    return baselines
      .filter(b => b.gridIndex === gridIndex)
      .map(b => ({
        id: b.id,
        color: b.color,
        yValue: b.yValue,
        pctDiff: b.yValue !== 0
          ? ((currentVal - b.yValue) / Math.abs(b.yValue)) * 100
          : 0,
      }))
  }, [baselines])

  return {
    baselines,
    drawingMode,
    draggingRef,
    toggleDrawingMode,
    addBaseline,
    removeBaseline,
    clearBaselines,
    updateBaselineY,
    calcPctDiff,
  }
}
