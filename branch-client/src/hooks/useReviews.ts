import { useCallback, useEffect, useState } from 'react'
import { fetchReviews, startReview } from '../services/reviews.ts'
import type { Review } from '../types/review.ts'

const POLL_MS = 5_000

const isActive = (review: Review) => review.status === 'queued' || review.status === 'running'

export function useReviews(ticketKey: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [error, setError] = useState<string>()
  const [refreshKey, setRefreshKey] = useState(0)
  const active = reviews.some(isActive)

  useEffect(() => {
    const controller = new AbortController()
    const load = () =>
      fetchReviews(ticketKey, controller.signal)
        .then((loaded) => {
          setReviews(loaded)
          setError(undefined)
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las revisiones')
          }
        })

    load()
    const timer = active ? setInterval(load, POLL_MS) : undefined
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [ticketKey, active, refreshKey])

  const start = useCallback(
    async () => {
      try {
        const review = await startReview(ticketKey)
        setReviews((current) => [...current, review])
        setError(undefined)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la revisión')
        setRefreshKey((key) => key + 1)
      }
    },
    [ticketKey],
  )

  return { reviews, active, error, start }
}
