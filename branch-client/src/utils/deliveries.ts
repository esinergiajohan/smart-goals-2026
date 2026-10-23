import type { Delivery, DeliveryMetrics, PullRequest } from '../types/pullRequest.ts'

const TICKET_KEY = /[A-Z][A-Z0-9]+-\d+/

export const ticketKeyFromBranch = (branch: string) => branch.toUpperCase().match(TICKET_KEY)?.[0]

export const returnsOf = (pullRequest: PullRequest) =>
  pullRequest.changesRequested +
  pullRequest.reviewerComments +
  pullRequest.reviewerCommits +
  (pullRequest.state === 'DECLINED' || pullRequest.state === 'SUPERSEDED' ? 1 : 0)

export const toDeliveries = (pullRequests: PullRequest[]): Delivery[] =>
  pullRequests
    .filter((pullRequest) => !pullRequest.selfClosed)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((pullRequest) => {
      const returns = returnsOf(pullRequest)
      return {
        ticketKey: pullRequest.ticketKey ?? pullRequest.sourceBranch,
        destinationBranch: pullRequest.destinationBranch,
        pullRequests: [pullRequest],
        firstAttempt: pullRequest.state === 'OPEN' ? (returns ? false : null) : returns === 0,
        reworks: returns,
        reviewerComments: pullRequest.reviewerComments,
        reviewers: [
          ...new Set([...pullRequest.approvedBy, ...(pullRequest.mergedBy ? [pullRequest.mergedBy] : [])]),
        ],
        openedAt: pullRequest.createdAt,
      }
    })

export const toMetrics = (deliveries: Delivery[], from: string, to: string): DeliveryMetrics => {
  const inRange = deliveries.filter((delivery) => delivery.openedAt >= from && delivery.openedAt < to)
  const closed = inRange.filter((delivery) => delivery.firstAttempt !== null)
  const firstAttempt = closed.filter((delivery) => delivery.firstAttempt).length
  const reviewerComments = closed.reduce((total, delivery) => total + delivery.reviewerComments, 0)

  return {
    from,
    to,
    deliveries: inRange.length,
    closed: closed.length,
    firstAttempt,
    rate: closed.length ? firstAttempt / closed.length : null,
    reviewerComments,
    reviewerCommentsPerDelivery: closed.length ? reviewerComments / closed.length : null,
  }
}
