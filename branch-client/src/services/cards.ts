import type { JiraTicket, TicketBranches, TrackedTicket } from '../types/jira.ts'

export interface CardChanges {
  deployedAt?: string | null
  featuredCommentId?: string | null
  branches?: Partial<TicketBranches>
}

const CARDS_ROUTE = '/api/cards'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const data: T & { error?: string } = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `El servidor respondió ${response.status}`)
  }

  return data
}

const cardPath = (key: string) => `${CARDS_ROUTE}/${encodeURIComponent(key)}`

export async function fetchCards(signal?: AbortSignal): Promise<TrackedTicket[]> {
  const { cards } = await request<{ cards: TrackedTicket[] }>(CARDS_ROUTE, { signal })
  return cards
}

export async function importCards(cards: TrackedTicket[], signal?: AbortSignal): Promise<TrackedTicket[]> {
  const data = await request<{ cards: TrackedTicket[] }>(`${CARDS_ROUTE}/import`, {
    method: 'POST',
    body: JSON.stringify({ cards }),
    signal,
  })
  return data.cards
}

export async function createCard(ticket: JiraTicket): Promise<TrackedTicket> {
  const { card } = await request<{ card: TrackedTicket }>(CARDS_ROUTE, {
    method: 'POST',
    body: JSON.stringify(ticket),
  })
  return card
}

export async function updateCard(key: string, changes: CardChanges): Promise<TrackedTicket> {
  const { card } = await request<{ card: TrackedTicket }>(cardPath(key), {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
  return card
}

export async function deleteCard(key: string): Promise<void> {
  await request(cardPath(key), { method: 'DELETE' })
}
