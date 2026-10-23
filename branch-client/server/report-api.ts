import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Db } from './db/client.ts'
import { plans, repositories, reviews, tickets } from './db/schema.ts'
import { HttpError, sendJson } from './http.ts'

export const REPORT_ROUTE = '/api/report'

export const createReportHandler = (db: Db) => async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.')

  const reviewRows = db.select().from(reviews).all().filter((review) => review.status === 'done')
  const planRows = db.select().from(plans).all().filter((plan) => plan.status === 'done')

  return sendJson(res, 200, {
    repositories: db.select().from(repositories).all().map((repository) => repository.name),
    cards: db.select().from(tickets).all().length,
    reviews: {
      done: reviewRows.length,
      certified: reviewRows.filter((review) => review.certified).length,
      approved: reviewRows.filter((review) => review.decision?.startsWith('APROBADO')).length,
      tickets: [...new Set(reviewRows.map((review) => review.ticketKey))],
    },
    plans: {
      done: planRows.length,
      published: planRows.filter((plan) => plan.jiraCommentId).length,
    },
  })
}
