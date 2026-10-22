import { useCallback, useState } from 'react'
import { fetchTicketStatuses } from '../services/jira.ts'
import type { TicketStatus } from '../types/jira.ts'
import { useAutoRefresh } from './useAutoRefresh.ts'

export function useTicketStatuses(keys: string[]): Record<string, TicketStatus> {
  const [statuses, setStatuses] = useState<Record<string, TicketStatus>>({})
  const keysParam = [...keys].sort().join(',')

  const load = useCallback(
    (signal: AbortSignal) => {
      if (!keysParam) return
      fetchTicketStatuses(keysParam.split(','), signal)
        .then((fetched) => setStatuses((current) => ({ ...current, ...fetched })))
        .catch(() => undefined)
    },
    [keysParam],
  )

  useAutoRefresh(load)

  return statuses
}
