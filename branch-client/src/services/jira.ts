import type { JiraTicket } from '../types/jira.ts'

export async function searchTickets(query: string, signal?: AbortSignal): Promise<JiraTicket[]> {
  const response = await fetch(`/api/jira/search?${new URLSearchParams({ q: query })}`, { signal })
  const data: { issues?: JiraTicket[]; error?: string } = await response.json()

  if (!response.ok || !data.issues) {
    throw new Error(data.error ?? `Jira respondió ${response.status}`)
  }

  return data.issues
}
