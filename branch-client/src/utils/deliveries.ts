import type { Delivery, DeliveryMetrics, PullRequest } from '../types/pullRequest.ts'

const TICKET_KEY = /[A-Z][A-Z0-9]+-\d+/

export const ticketKeyFromBranch = (branch: string) => branch.toUpperCase().match(TICKET_KEY)?.[0]

const isClean = (pullRequest: PullRequest) =>
  pullRequest.changesRequested === 0 && pullRequest.pushesAfterOpen === 0

export const toDeliveries = (pullRequests: PullRequest[]): Delivery[] => {
  const groups = new Map<string, PullRequest[]>()
  for (const pullRequest of pullRequests.filter((item) => !item.selfClosed)) {
    const ticketKey = pullRequest.ticketKey ?? pullRequest.sourceBranch
    const id = `${ticketKey}\u0000${pullRequest.destinationBranch}`
    groups.set(id, [...(groups.get(id) ?? []), pullRequest])
  }

  return [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const [first] = ordered
    const merged = ordered.find((pullRequest) => pullRequest.state === 'MERGED')
    const discarded = ordered.filter((item) => item.state === 'DECLINED' || item.state === 'SUPERSEDED').length
    const extraMerges = Math.max(ordered.filter((item) => item.state === 'MERGED').length - 1, 0)
    const reworks =
      discarded +
      extraMerges +
      ordered.reduce((total, pullRequest) => total + pullRequest.changesRequested + pullRequest.pushesAfterOpen, 0)

    return {
      ticketKey: first.ticketKey ?? first.sourceBranch,
      destinationBranch: first.destinationBranch,
      pullRequests: ordered,
      firstAttempt:
        ordered.length === 1 && first.state === 'OPEN' && isClean(first)
          ? null
          : ordered.length === 1 && merged === first && isClean(first),
      reworks,
      reviewerComments: ordered.reduce((total, pullRequest) => total + pullRequest.reviewerComments, 0),
      reviewers: [
        ...new Set(
          ordered.flatMap((pullRequest) => [...pullRequest.approvedBy, ...(pullRequest.mergedBy ? [pullRequest.mergedBy] : [])]),
        ),
      ],
      openedAt: first.createdAt,
    }
  })
}

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
