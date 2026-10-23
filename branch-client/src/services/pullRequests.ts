import type { Delivery, DeliveryMetrics, PullRequest } from '../types/pullRequest.ts'
import { apiRequest } from './api.ts'

interface CardPullRequests {
  pullRequests: PullRequest[]
  deliveries: Delivery[]
}

export async function fetchPullRequests(ticketKey: string, signal?: AbortSignal): Promise<CardPullRequests> {
  return apiRequest<CardPullRequests>(`/api/pull-requests?${new URLSearchParams({ ticket: ticketKey })}`, { signal })
}

export async function syncPullRequests(ticketKey: string): Promise<CardPullRequests> {
  return apiRequest<CardPullRequests>('/api/pull-requests/sync', {
    method: 'POST',
    body: JSON.stringify({ ticketKey }),
  })
}

export async function syncPullRequestRange(from: string, to: string): Promise<number> {
  const { synced } = await apiRequest<{ synced: number }>('/api/pull-requests/sync', {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  })
  return synced
}

export async function fetchMetrics(from: string, to: string, signal?: AbortSignal): Promise<DeliveryMetrics> {
  const { metrics } = await apiRequest<{ metrics: DeliveryMetrics }>(
    `/api/metrics?${new URLSearchParams({ from, to })}`,
    { signal },
  )
  return metrics
}
