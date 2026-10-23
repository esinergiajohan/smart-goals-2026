import type { ReleaseGraph, ReleaseGroup } from '../types/release.ts'
import { apiRequest } from './api.ts'

export async function fetchReleaseGraph(group: ReleaseGroup, signal?: AbortSignal): Promise<ReleaseGraph> {
  const params = new URLSearchParams({ repositoryId: String(group.repositoryId), branch: group.branch })
  const { graph } = await apiRequest<{ graph: ReleaseGraph }>(`/api/releases/graph?${params}`, { signal })
  return graph
}
