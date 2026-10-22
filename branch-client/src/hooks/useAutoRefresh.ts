import { useEffect } from 'react'

const REFRESH_MS = 60_000

export function useAutoRefresh(load: (signal: AbortSignal) => void) {
  useEffect(() => {
    const controller = new AbortController()
    const run = () => load(controller.signal)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') run()
    }

    run()
    const timer = setInterval(refreshWhenVisible, REFRESH_MS)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [load])
}
