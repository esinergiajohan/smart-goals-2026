import type { TrackedTicket } from '../types/jira.ts'
import type { BranchOrigin, JoinedBranch, JoinMethod, ReleaseGraph, ReleaseGroup } from '../types/release.ts'

export const MIN_RELEASE_CARDS = 2

export const BRANCH_ORIGIN_LABELS: Record<BranchOrigin, string> = {
  main: 'desde main',
  release: 'desde la release',
  staging: 'trae staging',
  develop: 'trae develop',
}

export const JOIN_METHOD_LABELS: Record<JoinMethod, string> = {
  merge: 'merge',
  'cherry-pick': 'cherry-pick',
  sync: 'sincronización',
}

export type BranchFamily = 'main' | 'staging' | 'develop'

const MERGED_PULL_REQUEST = /^Merged in (\S+?) \(pull request #(\d+)\)$/i

export const familyOf = (origin: BranchOrigin): BranchFamily => (origin === 'release' ? 'main' : origin)

export const releaseFamily = (graph: ReleaseGraph): BranchFamily => {
  const { staging, develop } = graph.lineage
  if (!staging && !develop) return 'main'
  return develop >= staging ? 'develop' : 'staging'
}

export const joinedBranches = (graph: ReleaseGraph) =>
  graph.branches.filter((branch) => branch.method !== 'sync' && branch.joined > 0)

export const mixedBranches = (graph: ReleaseGraph): JoinedBranch[] => {
  const family = releaseFamily(graph)
  return joinedBranches(graph).filter((branch) => familyOf(branch.origin) !== family)
}

export const describeBase = (subject: string) => {
  const match = subject.match(MERGED_PULL_REQUEST)
  return match ? { source: match[1], pullRequest: Number(match[2]) } : { source: subject }
}

export const releaseId = (group: Pick<ReleaseGroup, 'repositoryId' | 'branch'>) => `${group.repositoryId}:${group.branch}`

export const groupReleases = (cards: Array<Pick<TrackedTicket, 'key' | 'branches' | 'repositoryId'>>): ReleaseGroup[] => {
  const groups = new Map<string, ReleaseGroup>()
  for (const card of cards) {
    const branch = card.branches?.work?.trim()
    if (!card.branches?.hasRelease || !branch || !card.repositoryId) continue
    const id = releaseId({ repositoryId: card.repositoryId, branch })
    const group = groups.get(id) ?? { branch, repositoryId: card.repositoryId, ticketKeys: [] }
    group.ticketKeys.push(card.key)
    groups.set(id, group)
  }
  return [...groups.values()].filter((group) => group.ticketKeys.length >= MIN_RELEASE_CARDS)
}
