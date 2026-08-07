import { useCallback, useState } from 'react'

export interface DrawnLine {
  id: string
  gridIndex: number
  p1: { time: number; value: number }
  p2: { time: number; value: number }
  color: string
}

const LINE_COLORS = [
  '#F472B6', // pink
  '#A78BFA', // violet
  '#34D399', // emerald
  '#FB923C', // orange
  '#60A5FA', // blue
  '#FBBF24', // amber
  '#F87171', // red
  '#2DD4BF', // teal
]
let colorIdx = 0
function nextColor() { return LINE_COLORS[(colorIdx++) % LINE_COLORS.length] }

export function useLineDrawing() {
  const [lines, setLines] = useState<DrawnLine[]>([])
  const [drawingMode, setDrawingMode] = useState(false)
  const [pendingP1, setPendingP1] = useState<{ time: number; value: number; gridIndex: number } | null>(null)

  const toggleDrawingMode = useCallback(() => {
    setDrawingMode(prev => !prev)
    setPendingP1(null)
  }, [])

  /** Called when user clicks the chart. Returns true if line was completed. */
  const handleClick = useCallback((time: number, value: number, gridIndex: number): 'pending' | 'done' => {
    if (pendingP1 === null || pendingP1.gridIndex !== gridIndex) {
      // First click (or clicked a different grid - reset)
      setPendingP1({ time, value, gridIndex })
      return 'pending'
    } else {
      // Second click — commit line
      const p1 = pendingP1
      const p2 = { time, value }
      setLines(prev => [...prev, {
        id: `line_${Date.now()}`,
        gridIndex,
        p1,
        p2,
        color: nextColor(),
      }])
      setPendingP1(null)
      return 'done'
    }
  }, [pendingP1])

  const removeLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }, [])

  const clearLines = useCallback(() => {
    setLines([])
    setPendingP1(null)
  }, [])

  return {
    lines,
    drawingMode,
    pendingP1,
    toggleDrawingMode,
    handleClick,
    removeLine,
    clearLines,
  }
}
