import { useEffect, useRef, DependencyList } from 'react'

export function useAutoFetch(
  fetchFn: () => void | Promise<void>,
  intervalMs = 60000,
  deps: DependencyList = []
) {
  const ref = useRef(fetchFn)
  ref.current = fetchFn

  useEffect(() => {
    ref.current()

    const id = setInterval(() => {
      ref.current()
    }, intervalMs)

    const onRefresh = () => ref.current()
    window.addEventListener('refresh-data', onRefresh)

    return () => {
      clearInterval(id)
      window.removeEventListener('refresh-data', onRefresh)
    }
  }, [intervalMs, ...deps])
}
