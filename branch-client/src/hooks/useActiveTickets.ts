import { useCallback, useState } from 'react'
import { fetchActiveTickets } from '../services/jira.ts'
import type { ActiveTicket } from '../types/jira.ts'
import { useAutoRefresh } from './useAutoRefresh.ts'

interface ActiveTicketsState {
  loading: boolean
  tickets: ActiveTicket[]
  error?: string
}

export function useActiveTickets(): ActiveTicketsState {
  const [state, setState] = useState<ActiveTicketsState>({ loading: true, tickets: [] })

  const load = useCallback((signal: AbortSignal) => {
    fetchActiveTickets(signal)
      .then((tickets) => setState({ loading: false, tickets }))
      .catch((error: unknown) => {
        if (signal.aborted) return
        setState((current) =>
          current.loading
            ? {
                loading: false,
                tickets: [],
                error: error instanceof Error ? error.message : 'No se pudo consultar Jira',
              }
            : current,
        )
      })
  }, [])

  useAutoRefresh(load)

  return state
}
