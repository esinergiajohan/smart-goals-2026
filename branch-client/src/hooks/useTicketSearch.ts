import { useEffect, useState } from 'react'
import { searchTickets } from '../services/jira.ts'
import type { JiraTicket } from '../types/jira.ts'

export type TicketSearchStatus = 'idle' | 'loading' | 'success' | 'error'

interface TicketSearchState {
  term: string
  status: TicketSearchStatus
  results: JiraTicket[]
  error?: string
}

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300
const IDLE: TicketSearchState = { term: '', status: 'idle', results: [] }

export function useTicketSearch(query: string): TicketSearchState {
  const term = query.trim()
  const enabled = term.length >= MIN_QUERY_LENGTH
  const [state, setState] = useState<TicketSearchState>(IDLE)

  if (!enabled && state !== IDLE) {
    setState(IDLE)
  }

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchTickets(term, controller.signal)
        .then((results) => setState({ term, status: 'success', results }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setState({
            term,
            status: 'error',
            results: [],
            error: error instanceof Error ? error.message : 'No se pudo consultar Jira',
          })
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term, enabled])

  if (!enabled) return IDLE
  if (state.term !== term) return { ...state, term, status: 'loading' }
  return state
}
