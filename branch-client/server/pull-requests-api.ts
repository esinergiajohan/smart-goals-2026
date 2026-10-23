import type { IncomingMessage, ServerResponse } from 'node:http'
import { and, eq, inArray, or } from 'drizzle-orm'
import type { PullRequest } from '../src/types/pullRequest.ts'
import { ticketKeyFromBranch, toDeliveries, toMetrics } from '../src/utils/deliveries.ts'
import type { Db } from './db/client.ts'
import { pullRequests, repositories, tickets } from './db/schema.ts'
import { HttpError, readJson, sendJson } from './http.ts'
import { ISSUE_KEY } from './jira-api.ts'
import { providerFor, type ProviderSettings } from './providers/index.ts'
import type { GitProvider, RemotePullRequest } from './providers/types.ts'

type PullRequestRow = typeof pullRequests.$inferSelect
type RepositoryRow = typeof repositories.$inferSelect

const DATE = /^\d{4}-\d{2}-\d{2}$/
const ZONE_OFFSET = '-05:00'

const toPullRequest = (row: PullRequestRow): PullRequest => ({
  id: row.id,
  repositoryId: row.repositoryId,
  externalId: row.externalId,
  title: row.title,
  sourceBranch: row.sourceBranch,
  destinationBranch: row.destinationBranch,
  state: row.state,
  url: row.url,
  authorId: row.authorId,
  createdAt: row.createdAt,
  approvedBy: row.approvedBy,
  changesRequested: row.changesRequested,
  pushesAfterOpen: row.pushesAfterOpen,
  reviewerComments: row.reviewerComments,
  selfClosed: row.selfClosed,
  reviewerCommits: row.reviewerCommits,
  ...(row.mergedBy && { mergedBy: row.mergedBy }),
  ...(row.ticketKey && { ticketKey: row.ticketKey }),
  ...(row.closedAt && { closedAt: row.closedAt }),
})

const parseKey = (value: unknown) => {
  const key = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!ISSUE_KEY.test(key)) throw new HttpError(400, 'La clave del ticket no es válida.')
  return key
}

const parseDate = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !DATE.test(value)) throw new HttpError(400, `«${field}» debe tener formato AAAA-MM-DD.`)
  return new Date(`${value}T00:00:00${ZONE_OFFSET}`).toISOString()
}

const cardBranches = (branches: Record<string, unknown> | null) =>
  [branches?.work, branches?.dev, branches?.stg, ...(Array.isArray(branches?.merged) ? branches.merged : [])]
    .filter((branch): branch is string => typeof branch === 'string' && branch.trim() !== '')
    .map((branch) => branch.trim())

export const PULL_REQUESTS_ROUTE = '/api/pull-requests'
export const PULL_REQUESTS_SYNC_ROUTE = '/api/pull-requests/sync'
export const METRICS_ROUTE = '/api/metrics'

export const createPullRequestsHandlers = (db: Db, settings: ProviderSettings) => {
  const userIds = new Map<number, string>()

  const currentUser = async (repository: RepositoryRow, gitProvider: GitProvider) => {
    if (!userIds.has(repository.id)) userIds.set(repository.id, await gitProvider.currentUserId())
    return userIds.get(repository.id) as string
  }

  const store = (repositoryId: number, remote: RemotePullRequest[]) => {
    const syncedAt = new Date().toISOString()
    db.transaction((tx) => {
      for (const pullRequest of remote) {
        const values = {
          ...pullRequest,
          repositoryId,
          ticketKey: ticketKeyFromBranch(pullRequest.sourceBranch) ?? null,
          closedAt: pullRequest.closedAt ?? null,
          mergedBy: pullRequest.mergedBy ?? null,
          selfClosed:
            (pullRequest.state === 'DECLINED' || pullRequest.state === 'SUPERSEDED') &&
            pullRequest.closedBy === pullRequest.authorId &&
            pullRequest.approvedBy.length === 0 &&
            pullRequest.changesRequested === 0 &&
            pullRequest.reviewerComments === 0,
          syncedAt,
        }
        tx.insert(pullRequests)
          .values(values)
          .onConflictDoUpdate({ target: [pullRequests.repositoryId, pullRequests.externalId], set: values })
          .run()
      }
    })
    return remote.length
  }

  const cardContext = (key: string) => {
    const ticket = db.select().from(tickets).where(eq(tickets.key, key)).get()
    if (!ticket) throw new HttpError(404, `La card ${key} no existe.`)
    if (!ticket.repositoryId) throw new HttpError(400, 'Asigna un repositorio a la card.')
    const repository = db.select().from(repositories).where(eq(repositories.id, ticket.repositoryId)).get()
    if (!repository) throw new HttpError(400, 'El repositorio asignado ya no existe.')
    return { repository, branches: cardBranches(ticket.branches as Record<string, unknown> | null) }
  }

  const listForCard = (key: string) => {
    const { repository, branches } = cardContext(key)
    const rows = db
      .select()
      .from(pullRequests)
      .where(
        and(
          eq(pullRequests.repositoryId, repository.id),
          branches.length
            ? or(eq(pullRequests.ticketKey, key), inArray(pullRequests.sourceBranch, branches))
            : eq(pullRequests.ticketKey, key),
        ),
      )
      .all()
    const keys = [...new Set(rows.map((row) => row.ticketKey).filter((ticketKey): ticketKey is string => Boolean(ticketKey)))]
    const related = keys.length
      ? db
          .select()
          .from(pullRequests)
          .where(and(eq(pullRequests.repositoryId, repository.id), inArray(pullRequests.ticketKey, keys)))
          .all()
      : []
    const all = [...new Map([...rows, ...related].map((row) => [row.id, toPullRequest(row)])).values()]
    return { pullRequests: all, deliveries: toDeliveries(all) }
  }

  const sync = async (req: IncomingMessage, res: ServerResponse) => {
    const body = (await readJson(req)) as Record<string, unknown> | null

    if (body?.ticketKey !== undefined) {
      const key = parseKey(body.ticketKey)
      const { repository, branches } = cardContext(key)
      const gitProvider = await providerFor(repository.path, settings).catch(() => null)
      if (!gitProvider) return sendJson(res, 200, { synced: 0, provider: null, ...listForCard(key) })
      const synced = store(repository.id, await gitProvider.pullRequests({ branches, branchContains: key }))
      return sendJson(res, 200, { synced, provider: gitProvider.name, ...listForCard(key) })
    }

    const from = parseDate(body?.from, 'from')
    const to = parseDate(body?.to, 'to')
    const rows = db.select().from(repositories).all()
    let synced = 0
    for (const repository of rows) {
      const gitProvider = await providerFor(repository.path, settings).catch(() => null)
      if (!gitProvider) continue
      const authorId = await currentUser(repository, gitProvider)
      synced += store(repository.id, await gitProvider.pullRequests({ authorId, createdFrom: from, createdTo: to }))
    }
    return sendJson(res, 200, { synced })
  }

  const metrics = async (req: IncomingMessage, res: ServerResponse) => {
    const params = new URL(req.url ?? '', 'http://localhost').searchParams
    const from = parseDate(params.get('from'), 'from')
    const to = parseDate(params.get('to'), 'to')
    const rows: PullRequest[] = []
    for (const repository of db.select().from(repositories).all()) {
      const gitProvider = await providerFor(repository.path, settings).catch(() => null)
      if (!gitProvider) continue
      const authorId = await currentUser(repository, gitProvider)
      rows.push(
        ...db
          .select()
          .from(pullRequests)
          .where(
            and(
              eq(pullRequests.repositoryId, repository.id),
              eq(pullRequests.authorId, authorId),
              inArray(pullRequests.destinationBranch, [repository.baseBranch, repository.developmentBranch]),
            ),
          )
          .all()
          .map(toPullRequest),
      )
    }
    const deliveries = toDeliveries(rows)
    if (params.get('detail') !== '1') return sendJson(res, 200, { metrics: toMetrics(deliveries, from, to) })

    const names = new Map(db.select().from(repositories).all().map((repository) => [repository.id, repository.name]))
    const detail = deliveries
      .filter((delivery) => delivery.openedAt >= from && delivery.openedAt < to)
      .sort((a, b) => a.openedAt.localeCompare(b.openedAt))
      .map((delivery) => ({
        repository: names.get(delivery.pullRequests[0].repositoryId),
        ticketKey: delivery.ticketKey,
        destinationBranch: delivery.destinationBranch,
        openedAt: delivery.openedAt,
        firstAttempt: delivery.firstAttempt,
        reworks: delivery.reworks,
        reviewerComments: delivery.reviewerComments,
        reviewers: delivery.reviewers,
        pullRequests: delivery.pullRequests.map((pullRequest) => `#${pullRequest.externalId} ${pullRequest.state}`),
      }))
    return sendJson(res, 200, { metrics: toMetrics(deliveries, from, to), deliveries: detail })
  }

  return {
    async pullRequests(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.')
      const key = parseKey(new URL(req.url ?? '', 'http://localhost').searchParams.get('ticket'))
      return sendJson(res, 200, listForCard(key))
    },
    async sync(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.')
      return sync(req, res)
    },
    async metrics(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.')
      return metrics(req, res)
    },
  }
}
