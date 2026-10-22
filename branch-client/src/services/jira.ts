import type { ActiveTicket, FeaturedComment, JiraTicket, TicketStatus } from '../types/jira.ts'

export async function searchTickets(query: string, signal?: AbortSignal): Promise<JiraTicket[]> {
  const response = await fetch(`/api/jira/search?${new URLSearchParams({ q: query })}`, { signal })
  const data: { issues?: JiraTicket[]; error?: string } = await response.json()

  if (!response.ok || !data.issues) {
    throw new Error(data.error ?? `Jira respondió ${response.status}`)
  }

  return data.issues
}

export async function fetchActiveTickets(signal?: AbortSignal): Promise<ActiveTicket[]> {
  const response = await fetch('/api/jira/active', { signal })
  const data: { issues?: ActiveTicket[]; error?: string } = await response.json()

  if (!response.ok || !data.issues) {
    throw new Error(data.error ?? `Jira respondió ${response.status}`)
  }

  return data.issues
}

export async function fetchTicketStatuses(
  keys: string[],
  signal?: AbortSignal,
): Promise<Record<string, TicketStatus>> {
  const response = await fetch(`/api/jira/statuses?${new URLSearchParams({ keys: keys.join(',') })}`, { signal })
  const data: { issues?: Array<TicketStatus & { key: string }>; error?: string } = await response.json()

  if (!response.ok || !data.issues) {
    throw new Error(data.error ?? `Jira respondió ${response.status}`)
  }

  return Object.fromEntries(data.issues.map(({ key, ...status }) => [key, status]))
}

export async function fetchComment(key: string, id: string, signal?: AbortSignal): Promise<FeaturedComment> {
  const response = await fetch(`/api/jira/comment?${new URLSearchParams({ key, id })}`, { signal })
  const data: { comment?: FeaturedComment; error?: string } = await response.json()

  if (!response.ok || !data.comment) {
    throw new Error(data.error ?? `Jira respondió ${response.status}`)
  }

  return data.comment
}
