import { useCallback, useEffect, useState } from 'react'
import { createCard, deleteCard, fetchCards, importCards, updateCard } from '../services/cards.ts'
import type { JiraTicket, TicketBranches, TrackedTicket } from '../types/jira.ts'

const LEGACY_STORAGE_KEY = 'jira-smart-project:cards'
const MIGRATED_KEY = 'jira-smart-project:cards-migrated'

const toMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

const readLegacyCards = (): TrackedTicket[] => {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return []
    const stored = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

const markMigrated = () => {
  try {
    localStorage.setItem(MIGRATED_KEY, new Date().toISOString())
  } catch {
    return
  }
}

const loadCards = async (signal: AbortSignal) => {
  const legacy = readLegacyCards()
  if (!legacy.length) return fetchCards(signal)

  const cards = await importCards(legacy, signal)
  markMigrated()
  return cards
}

export function useTicketCards() {
  const [cards, setCards] = useState<TrackedTicket[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()
    loadCards(controller.signal)
      .then((loaded) => {
        setCards(loaded)
        setError(undefined)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(toMessage(cause, 'No se pudieron cargar las cards'))
      })
    return () => controller.abort()
  }, [])

  const persist = useCallback((saving: Promise<unknown>) => {
    saving
      .then(() => setError(undefined))
      .catch((cause: unknown) => {
        setError(toMessage(cause, 'No se pudo guardar el cambio'))
        fetchCards().then(setCards, () => undefined)
      })
  }, [])

  const addCard = useCallback(
    (ticket: JiraTicket) => {
      setCards((current) => {
        const existing = current.find((card) => card.key === ticket.key)
        return [{ ...existing, ...ticket }, ...current.filter((card) => card.key !== ticket.key)]
      })
      persist(createCard(ticket))
    },
    [persist],
  )

  const removeCard = useCallback(
    (key: string) => {
      setCards((current) => current.filter((card) => card.key !== key))
      persist(deleteCard(key))
    },
    [persist],
  )

  const setDeployed = useCallback(
    (key: string, deployed: boolean) => {
      const deployedAt = deployed ? new Date().toISOString() : undefined
      setCards((current) => current.map((card) => (card.key === key ? { ...card, deployedAt } : card)))
      persist(updateCard(key, { deployedAt: deployedAt ?? null }))
    },
    [persist],
  )

  const setFeaturedComment = useCallback(
    (key: string, featuredCommentId: string | undefined) => {
      setCards((current) => current.map((card) => (card.key === key ? { ...card, featuredCommentId } : card)))
      persist(updateCard(key, { featuredCommentId: featuredCommentId ?? null }))
    },
    [persist],
  )

  const setBranches = useCallback(
    (key: string, branches: Partial<TicketBranches>) => {
      setCards((current) =>
        current.map((card) => (card.key === key ? { ...card, branches: { ...card.branches, ...branches } } : card)),
      )
      persist(updateCard(key, { branches }))
    },
    [persist],
  )

  const pendingCards = cards.filter((card) => !card.deployedAt)
  const deployedCards = cards
    .filter((card) => card.deployedAt)
    .sort((a, b) => (b.deployedAt ?? '').localeCompare(a.deployedAt ?? ''))

  return { pendingCards, deployedCards, error, addCard, removeCard, setDeployed, setBranches, setFeaturedComment }
}
