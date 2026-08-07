import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseChartPanOptions {
  data: any[]
  setData: (d: any[]) => void
  loadHistorical: (startDate: string, endDate: string) => Promise<any[]>
  timeKey?: string
  windowMinutes?: number
  /** Initial visible time window in minutes. Default: 360 (6 hours) */
  initialWindowMinutes?: number
  /** Right padding ratio for empty space on right side. Default: 0.25 (25%) */
  rightPaddingRatio?: number
}

export function useChartPan({
  data,
  setData,
  loadHistorical,
  timeKey = 'time_tag',
  windowMinutes = 1440,
  initialWindowMinutes = 360,
  rightPaddingRatio = 0.25,
}: UseChartPanOptions) {
  const [panLoading, setPanLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [hasMoreForward, setHasMoreForward] = useState(true)
  const [zoomRange, setZoomRange] = useState<{ startValue: number; endValue: number } | null>(null)

  const fetchingRef = useRef(false)
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore
  const hasMoreForwardRef = useRef(hasMoreForward)
  hasMoreForwardRef.current = hasMoreForward

  const lastBoundaryRef = useRef<number | null>(null)
  const lastRightBoundaryRef = useRef<number | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  const debounceTimerRef = useRef<any>(null)
  const chartInstanceRef = useRef<any>(null)
  const initialZoomDispatchedRef = useRef(false)

  const dispatchInitialZoom = useCallback((instance: any) => {
    if (!instance || (typeof instance.isDisposed === 'function' && instance.isDisposed())) return
    const currentData = dataRef.current
    if (!currentData || currentData.length === 0) return
    try {
      if (initialWindowMinutes === 0) {
        instance.dispatchAction({ type: 'dataZoom', start: 0, end: 100 })
      } else if (initialWindowMinutes && initialWindowMinutes > 0) {
        const lastDataTs = new Date(currentData[currentData.length - 1][timeKey]).getTime()
        const startTs = lastDataTs - initialWindowMinutes * 60 * 1000
        const duration = lastDataTs - startTs
        const paddedEndTs = startTs + (duration > 0 ? duration / (1 - rightPaddingRatio) : lastDataTs + 3600000)
        instance.dispatchAction({ type: 'dataZoom', startValue: startTs, endValue: paddedEndTs })
      }
      initialZoomDispatchedRef.current = true
    } catch {
      // instance may not be ready yet
    }
  }, [timeKey, initialWindowMinutes, rightPaddingRatio])

  const onChartReady = useCallback((instance: any) => {
    if (!instance || (typeof instance.isDisposed === 'function' && instance.isDisposed())) return
    chartInstanceRef.current = instance
    if (!initialZoomDispatchedRef.current && dataRef.current && dataRef.current.length > 0) {
      dispatchInitialZoom(instance)
    }
  }, [dispatchInitialZoom])

  useEffect(() => {
    if (initialZoomDispatchedRef.current) return
    if (!chartInstanceRef.current || (typeof chartInstanceRef.current.isDisposed === 'function' && chartInstanceRef.current.isDisposed())) return
    if (!data || data.length === 0) return
    dispatchInitialZoom(chartInstanceRef.current)
  }, [data, dispatchInitialZoom])

  // Fetch older data when panning left
  const triggerFetchHistorical = useCallback(
    async (currentStartVal: number, currentEndVal: number) => {
      const currentData = dataRef.current
      if (!hasMoreRef.current || fetchingRef.current || !currentData || currentData.length === 0) return

      const dataStart = new Date(currentData[0][timeKey]).getTime()
      if (lastBoundaryRef.current !== null && Math.abs(dataStart - lastBoundaryRef.current) < 1000) return

      fetchingRef.current = true
      setPanLoading(true)
      lastBoundaryRef.current = dataStart

      try {
        const endDate = new Date(dataStart)
        const startDate = new Date(dataStart - windowMinutes * 60 * 1000)
        const older = await loadHistorical(startDate.toISOString(), endDate.toISOString())

        if (!older || older.length === 0) { setHasMore(false); hasMoreRef.current = false; return }

        const existingKeys = new Set(currentData.map((d: any) => d[timeKey]))
        const fresh = older.filter((d: any) => !existingKeys.has(d[timeKey]))
        if (fresh.length === 0) { setHasMore(false); hasMoreRef.current = false; return }

        const merged = [...fresh, ...currentData].sort(
          (a, b) => new Date(a[timeKey]).getTime() - new Date(b[timeKey]).getTime()
        )
        setZoomRange({ startValue: currentStartVal, endValue: currentEndVal })
        setData(merged)
      } catch (e) {
        console.error('[useChartPan] Failed to fetch historical data:', e)
        lastBoundaryRef.current = null
      } finally {
        fetchingRef.current = false
        setPanLoading(false)
      }
    },
    [loadHistorical, setData, timeKey, windowMinutes]
  )

  // Fetch newer data when panning right
  const triggerFetchForward = useCallback(
    async (currentStartVal: number, currentEndVal: number) => {
      const currentData = dataRef.current
      if (!hasMoreForwardRef.current || fetchingRef.current || !currentData || currentData.length === 0) return

      const dataEnd = new Date(currentData[currentData.length - 1][timeKey]).getTime()
      const now = Date.now()

      if (dataEnd >= now - 60 * 1000) {
        setHasMoreForward(false)
        hasMoreForwardRef.current = false
        return
      }

      if (lastRightBoundaryRef.current !== null && Math.abs(dataEnd - lastRightBoundaryRef.current) < 1000) return

      fetchingRef.current = true
      setPanLoading(true)
      lastRightBoundaryRef.current = dataEnd

      try {
        const startDate = new Date(dataEnd)
        const endDate = new Date(Math.min(dataEnd + windowMinutes * 60 * 1000, now))
        const newer = await loadHistorical(startDate.toISOString(), endDate.toISOString())

        if (!newer || newer.length === 0) { setHasMoreForward(false); hasMoreForwardRef.current = false; return }

        const existingKeys = new Set(currentData.map((d: any) => d[timeKey]))
        const fresh = newer.filter((d: any) => !existingKeys.has(d[timeKey]))
        if (fresh.length === 0) { setHasMoreForward(false); hasMoreForwardRef.current = false; return }

        const merged = [...currentData, ...fresh].sort(
          (a, b) => new Date(a[timeKey]).getTime() - new Date(b[timeKey]).getTime()
        )
        setZoomRange({ startValue: currentStartVal, endValue: currentEndVal })
        setData(merged)
      } catch (e) {
        console.error('[useChartPan] Failed to fetch forward historical data:', e)
        lastRightBoundaryRef.current = null
      } finally {
        fetchingRef.current = false
        setPanLoading(false)
      }
    },
    [loadHistorical, setData, timeKey, windowMinutes]
  )

  const onDataZoom = useCallback(
    (evt: any) => {
      const currentData = dataRef.current
      if (!currentData || currentData.length === 0) return

      const item = evt?.batch && evt.batch.length > 0 ? evt.batch[0] : evt
      if (!item) return

      let startPct: number | null = typeof item.start === 'number' ? item.start : null
      let endPct: number | null = typeof item.end === 'number' ? item.end : null
      let startVal: number | null = item.startValue != null ? Number(item.startValue) : null
      let endVal: number | null = item.endValue != null ? Number(item.endValue) : null

      const dataStart = new Date(currentData[0][timeKey]).getTime()
      const dataEnd = new Date(currentData[currentData.length - 1][timeKey]).getTime()
      const totalSpan = dataEnd - dataStart

      if (startVal === null && startPct !== null && totalSpan > 0)
        startVal = dataStart + (startPct / 100) * totalSpan
      if (endVal === null && endPct !== null && totalSpan > 0)
        endVal = dataStart + (endPct / 100) * totalSpan

      if (startVal !== null && endVal !== null && startVal < endVal) {
        setZoomRange({ startValue: startVal, endValue: endVal })

        const isNearLeft =
          (startPct !== null && startPct <= 10) ||
          (totalSpan > 0 && startVal <= dataStart + totalSpan * 0.1) ||
          startVal <= dataStart

        const isNearRight =
          (endPct !== null && endPct >= 90) ||
          (totalSpan > 0 && endVal >= dataEnd - totalSpan * 0.1) ||
          endVal >= dataEnd

        if (isNearLeft && !fetchingRef.current && hasMoreRef.current) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
          const sVal = startVal, eVal = endVal
          debounceTimerRef.current = setTimeout(() => triggerFetchHistorical(sVal, eVal), 250)
        } else if (isNearRight && !fetchingRef.current && hasMoreForwardRef.current) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
          const sVal = startVal, eVal = endVal
          debounceTimerRef.current = setTimeout(() => triggerFetchForward(sVal, eVal), 250)
        }
      }
    },
    [timeKey, triggerFetchHistorical, triggerFetchForward]
  )

  const resetPan = useCallback(() => {
    setHasMore(true)
    hasMoreRef.current = true
    setHasMoreForward(true)
    hasMoreForwardRef.current = true
    setZoomRange(null)
    fetchingRef.current = false
    lastBoundaryRef.current = null
    lastRightBoundaryRef.current = null
    initialZoomDispatchedRef.current = false
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
  }, [])

  return {
    onDataZoom,
    panLoading,
    hasMore,
    resetPan,
    zoomRange,
    onChartReady,
  }
}
