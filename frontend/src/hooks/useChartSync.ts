/**
 * useChartSync — Synchronize crosshair & zoom across multiple ECharts instances.
 *
 * Usage:
 *   const { getRef } = useChartSync('my-page-group')
 *   <ReactECharts ref={getRef(0)} ... />
 *   <ReactECharts ref={getRef(1)} ... />
 *
 * ECharts built-in `connect(groupId)` links:
 *  - axisPointer (crosshair line shown on all charts simultaneously)
 *  - dataZoom events (zooming one chart zooms all others)
 *  - tooltip (tooltips fire together)
 */
import { useEffect, useRef, useCallback } from 'react'
import * as echarts from 'echarts'

export function useChartSync(groupId: string) {
  // Store refs to each ReactECharts wrapper element
  const refsMap = useRef<Record<number, any>>({})

  // Call echarts.connect() after mount / data change
  const connect = useCallback(() => {
    const instances: echarts.ECharts[] = []
    Object.values(refsMap.current).forEach(r => {
      const inst = r?.getEchartsInstance?.()
      if (inst) {
        inst.group = groupId
        instances.push(inst)
      }
    })
    if (instances.length > 1) {
      echarts.connect(groupId)
    }
  }, [groupId])

  useEffect(() => {
    // Small delay to let ReactECharts finish rendering
    const id = setTimeout(connect, 100)
    return () => clearTimeout(id)
  })

  /** Returns a callback-ref setter for chart index `idx` */
  const getRef = useCallback((idx: number) => (el: any) => {
    if (el) {
      refsMap.current[idx] = el
    } else {
      delete refsMap.current[idx]
    }
  }, [])

  return { getRef, connect }
}
