import type { IncomingMessage, ServerResponse } from 'node:http'
import { asc, eq } from 'drizzle-orm'
import type { TicketBranches } from '../src/types/jira.ts'
import type { Review } from '../src/types/review.ts'
import { testBranchFor } from '../src/utils/review.ts'
import type { Db } from './db/client.ts'
import { repositories, reviews, tickets } from './db/schema.ts'
import { existingRefs, findMergedBase, resolveRef } from './git-refs.ts'
import { HttpError, readJson, sendJson } from './http.ts'
import { ISSUE_KEY } from './jira-api.ts'
import { parseBranchName } from './repositories-api.ts'
import type { ReviewRunner } from './review-runner.ts'

type ReviewRow = typeof reviews.$inferSelect


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

const testBranch = (key: string, branches: Partial<TicketBranches> | null) =>
  testBranchFor(branches?.work?.trim() || `feature/${key}`)

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
      if (body?.role !== undefined && body.role !== 'test') {
        throw new HttpError(400, 'pr-review solo se corre sobre la rama -test, no sobre -dev ni -stg.')
      }

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

      const branch = await parseBranchName(repository.path, testBranch(key, ticket.branches), 'test')
      const base = repository.productionBranch
      if (!(await existingRefs(repository.path, branch)).length) {
        throw new HttpError(
          400,
          `No existe la rama «${branch}». Créala con el flujo validar-despliegue (cherry-pick de los commits de la rama de trabajo sobre origin/${base}) y vuelve a revisar.`,
        )
      }
      const mergedInto = await findMergedBase(repository.path, await resolveRef(repository.path, branch), base)
      if (mergedInto) {
        throw new HttpError(409, `La rama «${branch}» ya está mergeada en ${mergedInto}: no hay nada que revisar.`)
      }
      const row = db
        .insert(reviews)
        .values({
          ticketKey: key,
          repositoryId: repository.id,
          role: 'test',
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
