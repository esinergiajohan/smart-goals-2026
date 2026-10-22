import type { IncomingMessage, ServerResponse } from 'node:http'
import { asc, eq } from 'drizzle-orm'
import type { TicketBranches } from '../src/types/jira.ts'
import type { Review, ReviewRole } from '../src/types/review.ts'
import type { Db } from './db/client.ts'
import { repositories, reviews, tickets } from './db/schema.ts'
import { findMergedBase, resolveRef } from './git-refs.ts'
import { HttpError, readJson, sendJson } from './http.ts'
import { ISSUE_KEY } from './jira-api.ts'
import { parseBranchName } from './repositories-api.ts'
import type { ReviewRunner } from './review-runner.ts'

type ReviewRow = typeof reviews.$inferSelect

const ROLES: ReviewRole[] = ['dev', 'stg']
const DEFAULT_BRANCH_SUFFIX: Record<ReviewRole, string> = { dev: '-dev', stg: '-stg' }

const toReview = (row: ReviewRow): Review =>
  Object.fromEntries(
    Object.entries(row).filter(
      ([field, value]) => value !== null && !['previousReviewId', 'costUsd'].includes(field),
    ),
  ) as unknown as Review

const parseKey = (value: unknown) => {
  const key = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!ISSUE_KEY.test(key)) throw new HttpError(400, 'La clave del ticket no es válida.')
  return key
}

const branchFor = (key: string, role: ReviewRole, branches: Partial<TicketBranches> | null) =>
  branches?.[role]?.trim() || `feature/${key}${DEFAULT_BRANCH_SUFFIX[role]}`

export const REVIEWS_ROUTE = '/api/reviews'

export const createReviewsHandler =
  (db: Db, runner: ReviewRunner) => async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') {
      const key = parseKey(new URL(req.url ?? '', 'http://localhost').searchParams.get('ticket'))
      const rows = db.select().from(reviews).where(eq(reviews.ticketKey, key)).orderBy(asc(reviews.id)).all()
      return sendJson(res, 200, { reviews: rows.map(toReview) })
    }

    if (req.method === 'POST') {
      const body = (await readJson(req)) as Record<string, unknown> | null
      const key = parseKey(body?.ticketKey)
      const role = body?.role as ReviewRole
      if (!ROLES.includes(role)) throw new HttpError(400, 'La revisión solo aplica a las ramas DEV o STG.')

      const ticket = db.select().from(tickets).where(eq(tickets.key, key)).get()
      if (!ticket) throw new HttpError(404, `La card ${key} no existe.`)
      if (!ticket.repositoryId) throw new HttpError(400, 'Asigna un repositorio a la card antes de revisar.')
      const repository = db.select().from(repositories).where(eq(repositories.id, ticket.repositoryId)).get()
      if (!repository) throw new HttpError(400, 'El repositorio asignado ya no existe.')

      const running = db
        .select()
        .from(reviews)
        .where(eq(reviews.ticketKey, key))
        .all()
        .some((review) => review.status === 'queued' || review.status === 'running')
      if (running) throw new HttpError(409, `Ya hay una revisión en curso para ${key}.`)

      const branch = await parseBranchName(repository.path, branchFor(key, role, ticket.branches), role)
      const base = role === 'stg' ? repository.baseBranch : repository.developmentBranch
      const mergedInto = await findMergedBase(repository.path, await resolveRef(repository.path, branch), base)
      if (mergedInto) {
        throw new HttpError(409, `La rama «${branch}» ya está mergeada en ${mergedInto}: no hay nada que revisar.`)
      }
      const row = db
        .insert(reviews)
        .values({
          ticketKey: key,
          repositoryId: repository.id,
          role,
          branch,
          base,
          status: 'queued',
          createdAt: new Date().toISOString(),
        })
        .returning()
        .get()
      runner.enqueue(row.id)
      return sendJson(res, 200, { review: toReview(row) })
    }

    throw new HttpError(405, 'Método no permitido.')
  }
