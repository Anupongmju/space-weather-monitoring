import { useEffect, useRef } from 'react'

export function useAutoFetch(
  fetchFn: () => void | Promise<void>,
  intervalMs = 60000,
  enabled = true
) {
  const ref = useRef(fetchFn)
  ref.current = fetchFn

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      ref.current()
    }, intervalMs)

    const onRefresh = () => ref.current()
    window.addEventListener('refresh-data', onRefresh)

    return () => {
      clearInterval(id)
      window.removeEventListener('refresh-data', onRefresh)
    }
  }, [intervalMs, enabled])
}
