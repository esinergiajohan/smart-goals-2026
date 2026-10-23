import type { Review, ReviewRole } from '../types/review.ts'

export const REVIEW_ROLE_LABELS: Record<ReviewRole, string> = { test: 'TEST', dev: 'DEV', stg: 'STG' }

export const testBranchFor = (workBranch: string) => `${workBranch}-test`

export const reviewTarget = (branches: { work: string; test?: string; testBase?: string }, productionBranch: string) => ({
  branch: branches.test?.trim() || testBranchFor(branches.work),
  base: branches.testBase?.trim() || productionBranch,
})

export type ReviewTone = 'approved' | 'rejected' | 'inconclusive' | 'pending' | 'failed'

export const reviewTone = (review: Review): ReviewTone => {
  if (review.status === 'failed') return 'failed'
  if (review.status !== 'done') return 'pending'
  if (review.decision?.startsWith('APROBADO')) return 'approved'
  if (review.decision?.startsWith('RECHAZADO')) return 'rejected'
  return 'inconclusive'
}
