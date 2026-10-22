import type { IncomingMessage, ServerResponse } from 'node:http'
import { desc, eq } from 'drizzle-orm'
import type { JiraTicket, TicketBranches, TrackedTicket } from '../src/types/jira.ts'
import type { Db } from './db/client.ts'
import { tickets } from './db/schema.ts'
import { HttpError, readJson, sendJson } from './http.ts'
import { ISSUE_KEY } from './jira-api.ts'

type TicketRow = typeof tickets.$inferSelect

const MAX_TEXT_LENGTH = 500
const MAX_BRANCH_LENGTH = 250
const MAX_MERGED_BRANCHES = 50
const MAX_IMPORTED_CARDS = 500
const COMMENT_ID = /^\d+$/
const BRANCH_ROLES = ['work', 'dev', 'stg'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const invalid = (field: string): never => {
  throw new HttpError(400, `El campo «${field}» no es válido.`)
}

const parseText = (value: unknown, field: string, maxLength = MAX_TEXT_LENGTH) =>
  typeof value === 'string' && value.length <= maxLength ? value : invalid(field)

const parseDate = (value: unknown, field: string) => {
  const text = parseText(value, field)
  return Number.isNaN(Date.parse(text)) ? invalid(field) : text
}

const parseKey = (value: unknown) => {
  const key = parseText(value, 'key').trim().toUpperCase()
  return ISSUE_KEY.test(key) ? key : invalid('key')
}

const parseOptional = <T>(value: unknown, parse: (value: unknown) => T): T | null | undefined =>
  value === undefined || value === null ? value : parse(value)

const parseBranches = (value: unknown): Partial<TicketBranches> => {
  if (!isRecord(value)) return invalid('branches')

  const branches: Partial<TicketBranches> = {}
  for (const role of BRANCH_ROLES) {
    if (value[role] !== undefined) branches[role] = parseText(value[role], `branches.${role}`, MAX_BRANCH_LENGTH)
  }
  if (value.merged !== undefined) {
    if (!Array.isArray(value.merged) || value.merged.length > MAX_MERGED_BRANCHES) invalid('branches.merged')
    branches.merged = (value.merged as unknown[]).map((branch) =>
      parseText(branch, 'branches.merged', MAX_BRANCH_LENGTH),
    )
  }
  if (value.hasRelease !== undefined) {
    if (typeof value.hasRelease !== 'boolean') invalid('branches.hasRelease')
    branches.hasRelease = value.hasRelease as boolean
  }
  return branches
}

const parseCommentId = (value: unknown) => {
  const id = parseText(value, 'featuredCommentId')
  return COMMENT_ID.test(id) ? id : invalid('featuredCommentId')
}

const parseTicket = (value: unknown): JiraTicket => {
  if (!isRecord(value)) return invalid('ticket')
  return {
    key: parseKey(value.key),
    summary: parseText(value.summary, 'summary'),
    created: parseDate(value.created, 'created'),
    updated: parseDate(value.updated, 'updated'),
  }
}

const parseTrackedTicket = (value: unknown): TrackedTicket => {
  const ticket = parseTicket(value)
  const source = value as Record<string, unknown>
  return {
    ...ticket,
    deployedAt: parseOptional(source.deployedAt, (date) => parseDate(date, 'deployedAt')) ?? undefined,
    featuredCommentId: parseOptional(source.featuredCommentId, parseCommentId) ?? undefined,
    branches: parseOptional(source.branches, parseBranches) ?? undefined,
  }
}

const toCard = ({ key, summary, created, updated, deployedAt, featuredCommentId, branches }: TicketRow): TrackedTicket => ({
  key,
  summary,
  created,
  updated,
  ...(deployedAt && { deployedAt }),
  ...(featuredCommentId && { featuredCommentId }),
  ...(branches && { branches }),
})

const listCards = (db: Db) => db.select().from(tickets).orderBy(desc(tickets.addedAt)).all().map(toCard)

const findRow = (db: Db, key: string) => {
  const row = db.select().from(tickets).where(eq(tickets.key, key)).get()
  if (!row) throw new HttpError(404, `La card ${key} no existe.`)
  return row
}

const addCard = async (db: Db, req: IncomingMessage) => {
  const ticket = parseTicket(await readJson(req))
  const row = db
    .insert(tickets)
    .values({ ...ticket, addedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: tickets.key,
      set: { summary: ticket.summary, created: ticket.created, updated: ticket.updated, addedAt: new Date().toISOString() },
    })
    .returning()
    .get()
  return { card: toCard(row) }
}

const importCards = async (db: Db, req: IncomingMessage) => {
  const body = await readJson(req)
  if (!isRecord(body) || !Array.isArray(body.cards) || body.cards.length > MAX_IMPORTED_CARDS) invalid('cards')

  const cards = (body as { cards: unknown[] }).cards.map(parseTrackedTicket)
  const now = Date.now()
  db.transaction((tx) => {
    cards.forEach((card, index) => {
      tx.insert(tickets)
        .values({ ...card, addedAt: new Date(now - index).toISOString() })
        .onConflictDoNothing()
        .run()
    })
  })
  return { cards: listCards(db) }
}

const updateCard = async (db: Db, key: string, req: IncomingMessage) => {
  const body = await readJson(req)
  if (!isRecord(body)) return invalid('card')

  const current = findRow(db, key)
  const changes: Partial<TicketRow> = {}
  if (body.deployedAt !== undefined) {
    changes.deployedAt = parseOptional(body.deployedAt, (date) => parseDate(date, 'deployedAt'))
  }
  if (body.featuredCommentId !== undefined) {
    changes.featuredCommentId = parseOptional(body.featuredCommentId, parseCommentId)
  }
  if (body.branches !== undefined) {
    changes.branches = { ...current.branches, ...parseBranches(body.branches) }
  }
  if (!Object.keys(changes).length) return { card: toCard(current) }

  const row = db.update(tickets).set(changes).where(eq(tickets.key, key)).returning().get()
  return { card: toCard(row) }
}

const removeCard = (db: Db, key: string) => {
  findRow(db, key)
  db.delete(tickets).where(eq(tickets.key, key)).run()
  return { ok: true }
}

export const CARDS_ROUTE = '/api/cards'

export const createCardsHandler =
  (db: Db) => async (req: IncomingMessage, res: ServerResponse, pathname: string) => {
    const rest = pathname.slice(CARDS_ROUTE.length).replace(/^\//, '')
    const method = req.method ?? 'GET'

    if (!rest) {
      if (method === 'GET') return sendJson(res, 200, { cards: listCards(db) })
      if (method === 'POST') return sendJson(res, 200, await addCard(db, req))
    } else if (rest === 'import') {
      if (method === 'POST') return sendJson(res, 200, await importCards(db, req))
    } else {
      const key = parseKey(decodeURIComponent(rest))
      if (method === 'PATCH') return sendJson(res, 200, await updateCard(db, key, req))
      if (method === 'DELETE') return sendJson(res, 200, removeCard(db, key))
    }

    throw new HttpError(405, 'Método no permitido.')
  }
