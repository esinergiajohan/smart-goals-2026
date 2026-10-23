import type { DeliveryMetrics } from './pullRequest.ts'

export interface ReportDelivery {
  repository: string
  ticketKey: string
  destinationBranch: string
  openedAt: string
  firstAttempt: boolean | null
  reworks: number
  reviewerComments: number
  reviewers: string[]
  pullRequests: string[]
  url?: string
}

export interface ReportPeriod {
  metrics: DeliveryMetrics
  deliveries: ReportDelivery[]
}

export interface ReportUsage {
  repositories: string[]
  cards: number
  reviews: { done: number; certified: number; approved: number; tickets: string[] }
  plans: { done: number; published: number }
}
