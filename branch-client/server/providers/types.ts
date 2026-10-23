import type { PullRequestState } from '../../src/types/pullRequest.ts'

export interface RemotePullRequest {
  externalId: number
  title: string
  sourceBranch: string
  destinationBranch: string
  state: PullRequestState
  url: string
  authorId: string
  createdAt: string
  closedAt?: string
  approvedBy: string[]
  changesRequested: number
  pushesAfterOpen: number
  reviewerComments: number
  mergedBy?: string
  closedBy?: string
  reviewerCommits: number
}

export const AUTHOR_PATTERN = new RegExp(process.env.BRANCH_AUTHOR_PATTERN ?? 'johan|riascos', 'i')

export interface PullRequestQuery {
  branches?: string[]
  branchContains?: string
  authorId?: string
  createdFrom?: string
  createdTo?: string
}

export interface GitProvider {
  readonly name: string
  currentUserId(): Promise<string>
  pullRequests(query: PullRequestQuery): Promise<RemotePullRequest[]>
}
