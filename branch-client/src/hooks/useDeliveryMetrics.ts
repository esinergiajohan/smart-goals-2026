import { useCallback, useEffect, useState } from 'react'
import { fetchMetrics, syncPullRequestRange } from '../services/pullRequests.ts'
import type { DeliveryMetrics } from '../types/pullRequest.ts'
import type { GoalPeriod } from '../utils/goals.ts'

export function useDeliveryMetrics(periods: GoalPeriod[]) {
  const [metrics, setMetrics] = useState<DeliveryMetrics[]>([])
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string>()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(periods.map((period) => fetchMetrics(period.from, period.to, controller.signal)))
      .then((loaded) => {
        setMetrics(loaded)
        setError(undefined)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo calcular la métrica')
      })
    return () => controller.abort()
  }, [periods, refreshKey])

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      for (const period of periods) await syncPullRequestRange(period.from, period.to)
      setRefreshKey((key) => key + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron sincronizar los PR')
    } finally {
      setSyncing(false)
    }
  }, [periods])

  return { metrics, syncing, error, sync }
}
