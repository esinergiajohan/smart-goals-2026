import { useCallback, useEffect, useState } from 'react'
import { createRepository, fetchRepositories, type RepositoryDraft } from '../services/repositories.ts'
import type { Repository } from '../types/review.ts'

export function useRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([])

  useEffect(() => {
    const controller = new AbortController()
    fetchRepositories(controller.signal).then(setRepositories, () => undefined)
    return () => controller.abort()
  }, [])

  const addRepository = useCallback(async (draft: RepositoryDraft) => {
    const repository = await createRepository(draft)
    setRepositories((current) => [...current, repository].sort((a, b) => a.name.localeCompare(b.name)))
    return repository
  }, [])

  return { repositories, addRepository }
}
