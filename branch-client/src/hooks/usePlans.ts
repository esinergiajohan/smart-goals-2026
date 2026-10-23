import { useCallback, useEffect, useState } from 'react'
import { fetchPlans, publishPlan, startPlan } from '../services/plans.ts'
import type { Plan } from '../types/plan.ts'

const POLL_MS = 5_000

const isActive = (plan: Plan) => plan.status === 'queued' || plan.status === 'running'

export function usePlans(ticketKey: string) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [error, setError] = useState<string>()
  const [refreshKey, setRefreshKey] = useState(0)
  const active = plans.some(isActive)

  useEffect(() => {
    const controller = new AbortController()
    const load = () =>
      fetchPlans(ticketKey, controller.signal)
        .then((loaded) => setPlans(loaded))
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el plan')
        })
    load()
    const timer = active ? setInterval(load, POLL_MS) : undefined
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [ticketKey, active, refreshKey])

  const run = useCallback(
    async (task: () => Promise<Plan>, fallback: string) => {
      try {
        const plan = await task()
        setPlans((current) => [...current.filter((item) => item.id !== plan.id), plan].sort((a, b) => a.id - b.id))
        setError(undefined)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : fallback)
        setRefreshKey((key) => key + 1)
      }
    },
    [],
  )

  const start = useCallback(() => run(() => startPlan(ticketKey), 'No se pudo iniciar el plan'), [run, ticketKey])
  const publish = useCallback((id: number) => run(() => publishPlan(id), 'No se pudo publicar en Jira'), [run])

  return { plans, latest: plans[plans.length - 1], active, error, start, publish }
}
