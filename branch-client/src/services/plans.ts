import type { Plan } from '../types/plan.ts'
import { apiRequest } from './api.ts'

const PLANS_ROUTE = '/api/plans'

export async function fetchPlans(ticketKey: string, signal?: AbortSignal): Promise<Plan[]> {
  const { plans } = await apiRequest<{ plans: Plan[] }>(`${PLANS_ROUTE}?${new URLSearchParams({ ticket: ticketKey })}`, {
    signal,
  })
  return plans
}

export async function startPlan(ticketKey: string): Promise<Plan> {
  const { plan } = await apiRequest<{ plan: Plan }>(PLANS_ROUTE, { method: 'POST', body: JSON.stringify({ ticketKey }) })
  return plan
}

export async function publishPlan(id: number): Promise<Plan> {
  const { plan } = await apiRequest<{ plan: Plan }>(`${PLANS_ROUTE}/${id}/publish`, { method: 'POST', body: '{}' })
  return plan
}
