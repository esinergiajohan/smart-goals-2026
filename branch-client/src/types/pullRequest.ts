export type PullRequestState = 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED'

export interface PullRequest {
  id: number
  repositoryId: number
  externalId: number
  ticketKey?: string
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
  selfClosed: boolean
  reviewerCommits: number
}

export interface Delivery {
  ticketKey: string
  destinationBranch: string
  pullRequests: PullRequest[]
  firstAttempt: boolean | null
  reworks: number
  reviewerComments: number
  reviewers: string[]
  openedAt: string
}

export interface DeliveryMetrics {
  from: string
  to: string
  deliveries: number
  closed: number
  firstAttempt: number
  rate: number | null
  reviewerComments: number
  reviewerCommentsPerDelivery: number | null
}
