import { useEffect, useState } from 'react'
import { fetchPullRequests, syncPullRequests } from '../services/pullRequests.ts'
import type { Delivery } from '../types/pullRequest.ts'

export function usePullRequests(ticketKey: string, enabled: boolean) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    fetchPullRequests(ticketKey, controller.signal)
      .then((data) => setDeliveries(data.deliveries))
      .catch(() => undefined)
      .finally(() => {
        if (controller.signal.aborted) return
        syncPullRequests(ticketKey)
          .then((data) => {
            if (controller.signal.aborted) return
            setDeliveries(data.deliveries)
            setError(undefined)
          })
          .catch((cause: unknown) => {
            if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudieron leer los PR')
          })
      })
    return () => controller.abort()
  }, [ticketKey, enabled])

  return { deliveries, error }
}
