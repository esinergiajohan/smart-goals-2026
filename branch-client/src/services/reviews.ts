import type { Review } from '../types/review.ts'
import { apiRequest } from './api.ts'

const REVIEWS_ROUTE = '/api/reviews'

export async function fetchReviews(ticketKey: string, signal?: AbortSignal): Promise<Review[]> {
  const { reviews } = await apiRequest<{ reviews: Review[] }>(
    `${REVIEWS_ROUTE}?${new URLSearchParams({ ticket: ticketKey })}`,
    { signal },
  )
  return reviews
}

export async function startReview(ticketKey: string): Promise<Review> {
  const { review } = await apiRequest<{ review: Review }>(REVIEWS_ROUTE, {
    method: 'POST',
    body: JSON.stringify({ ticketKey }),
  })
  return review
}
