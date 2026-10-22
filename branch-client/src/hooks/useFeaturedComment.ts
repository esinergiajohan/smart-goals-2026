import { useCallback, useState } from 'react'
import { fetchComment } from '../services/jira.ts'
import type { FeaturedComment } from '../types/jira.ts'
import { useAutoRefresh } from './useAutoRefresh.ts'

interface FeaturedCommentState {
  loading: boolean
  comment?: FeaturedComment
  error?: string
}

interface LoadedComment {
  id: string
  comment?: FeaturedComment
  error?: string
}

export function useFeaturedComment(key: string, commentId: string | undefined): FeaturedCommentState {
  const [loaded, setLoaded] = useState<LoadedComment>()

  const load = useCallback(
    (signal: AbortSignal) => {
      if (!commentId) return
      fetchComment(key, commentId, signal)
        .then((comment) => setLoaded({ id: commentId, comment }))
        .catch((error: unknown) => {
          if (signal.aborted) return
          setLoaded((current) =>
            current?.id === commentId && current.comment
              ? current
              : {
                  id: commentId,
                  error: error instanceof Error ? error.message : 'No se pudo consultar Jira',
                },
          )
        })
    },
    [key, commentId],
  )

  useAutoRefresh(load)

  if (!commentId) return { loading: false }
  if (loaded?.id !== commentId) return { loading: true }
  return { loading: false, comment: loaded.comment, error: loaded.error }
}
