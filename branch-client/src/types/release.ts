export type BranchOrigin = 'main' | 'release' | 'staging' | 'develop'

export type JoinMethod = 'merge' | 'cherry-pick' | 'sync'

export interface JoinedBranch {
  name: string
  ticketKey?: string
  method: JoinMethod
  origin: BranchOrigin
  commits: number
  joined: number
  sha: string
  joinedAt?: string
  pullRequest?: number
}

export interface ReleaseTicket {
  key: string
  commits: number
  lastCommitAt: string
}

export interface ReleaseGraph {
  branch: string
  ref: string
  production: string
  base: { sha: string; subject: string; date: string }
  commits: number
  lineage: { staging: number; develop: number }
  branches: JoinedBranch[]
  tickets: ReleaseTicket[]
  analyzedAt: string
}

export interface ReleaseGroup {
  branch: string
  repositoryId: number
  ticketKeys: string[]
}
