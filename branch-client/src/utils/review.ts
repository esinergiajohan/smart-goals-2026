import type { Review } from '../types/review.ts'

export type ReviewTone = 'approved' | 'rejected' | 'inconclusive' | 'pending' | 'failed'

export const reviewTone = (review: Review): ReviewTone => {
  if (review.status === 'failed') return 'failed'
  if (review.status !== 'done') return 'pending'
  if (review.decision?.startsWith('APROBADO')) return 'approved'
  if (review.decision?.startsWith('RECHAZADO')) return 'rejected'
  return 'inconclusive'
}
