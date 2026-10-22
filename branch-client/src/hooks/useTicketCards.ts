import { useCallback, useEffect, useState } from 'react'
import type { JiraTicket, TrackedTicket } from '../types/jira.ts'

const STORAGE_KEY = 'jira-smart-project:cards'

const readStoredCards = (): TrackedTicket[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export function useTicketCards() {
  const [cards, setCards] = useState<TrackedTicket[]>(readStoredCards)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
    } catch {
      return
    }
  }, [cards])

  const addCard = useCallback((ticket: JiraTicket) => {
    setCards((current) => {
      const existing = current.find((card) => card.key === ticket.key)
      return [{ ...existing, ...ticket }, ...current.filter((card) => card.key !== ticket.key)]
    })
  }, [])

  const removeCard = useCallback((key: string) => {
    setCards((current) => current.filter((card) => card.key !== key))
  }, [])

  const setDeployed = useCallback((key: string, deployed: boolean) => {
    setCards((current) =>
      current.map((card) =>
        card.key === key ? { ...card, deployedAt: deployed ? new Date().toISOString() : undefined } : card,
      ),
    )
  }, [])

  const pendingCards = cards.filter((card) => !card.deployedAt)
  const deployedCards = cards
    .filter((card) => card.deployedAt)
    .sort((a, b) => (b.deployedAt ?? '').localeCompare(a.deployedAt ?? ''))

  return { pendingCards, deployedCards, addCard, removeCard, setDeployed }
}
