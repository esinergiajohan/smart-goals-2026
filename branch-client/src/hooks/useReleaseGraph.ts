import { useCallback, useEffect, useState } from 'react'
import { fetchReleaseGraph } from '../services/releases.ts'
import type { ReleaseGraph, ReleaseGroup } from '../types/release.ts'

export function useReleaseGraph(group: ReleaseGroup) {
  const [graph, setGraph] = useState<ReleaseGraph>()
  const [error, setError] = useState<string>()
  const [settled, setSettled] = useState<string>()
  const [version, setVersion] = useState(0)
  const { repositoryId, branch } = group
  const keys = group.ticketKeys.join(',')
  const request = `${repositoryId}|${branch}|${keys}|${version}`

  useEffect(() => {
    const controller = new AbortController()
    fetchReleaseGraph({ repositoryId, branch, ticketKeys: keys.split(',') }, controller.signal)
      .then((loaded) => {
        setGraph(loaded)
        setError(undefined)
        setSettled(request)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'No se pudo analizar la release')
        setSettled(request)
      })
    return () => controller.abort()
  }, [repositoryId, branch, keys, request])

  const refresh = useCallback(() => setVersion((current) => current + 1), [])

  return { graph, error, loading: settled !== request, refresh }
}
