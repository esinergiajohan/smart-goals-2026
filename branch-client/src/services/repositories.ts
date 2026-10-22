import type { Repository } from '../types/review.ts'
import { apiRequest } from './api.ts'

export type RepositoryDraft = Omit<Repository, 'id'>

const REPOSITORIES_ROUTE = '/api/repositories'

export async function fetchRepositories(signal?: AbortSignal): Promise<Repository[]> {
  const { repositories } = await apiRequest<{ repositories: Repository[] }>(REPOSITORIES_ROUTE, { signal })
  return repositories
}

export async function createRepository(draft: RepositoryDraft): Promise<Repository> {
  const { repository } = await apiRequest<{ repository: Repository }>(REPOSITORIES_ROUTE, {
    method: 'POST',
    body: JSON.stringify(draft),
  })
  return repository
}
