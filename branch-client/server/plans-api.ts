import type { IncomingMessage, ServerResponse } from 'node:http'
import { asc, eq } from 'drizzle-orm'
import type { Plan, PlanContent } from '../src/types/plan.ts'
import type { Db } from './db/client.ts'
import { plans, tickets } from './db/schema.ts'
import { HttpError, readJson, sendJson } from './http.ts'
import { ISSUE_KEY, type JiraEnv, saveInternalComment } from './jira-api.ts'
import type { PlanRunner } from './plan-runner.ts'

type PlanRow = typeof plans.$inferSelect

const SOURCE_LABELS: Record<PlanContent['acceptance_criteria'][number]['source'], string> = {
  ticket: 'ticket',
  historia: 'historia',
  comentario: 'comentario',
  inferido: 'inferido, por confirmar',
}

const toPlan = (row: PlanRow): Plan => ({
  id: row.id,
  ticketKey: row.ticketKey,
  status: row.status,
  createdAt: row.createdAt,
  ...(row.repositoryId && { repositoryId: row.repositoryId }),
  ...(row.content && { content: row.content }),
  ...(row.error && { error: row.error }),
  ...(row.jiraCommentId && { jiraCommentId: row.jiraCommentId }),
  ...(row.jiraCommentUrl && { jiraCommentUrl: row.jiraCommentUrl }),
  ...(row.finishedAt && { finishedAt: row.finishedAt }),
})

const wiki = (value: string) => value.replace(/([[\]{}~])/g, '\\$1').replace(/\r?\n/g, ' ')

const bullets = (items: string[], marker = '*') => items.map((item) => `${marker} ${item}`).join('\n')

export const toJiraComment = (ticketKey: string, content: PlanContent) =>
  [
    `h3. Plan de abordaje — ${ticketKey}`,
    `*Tipo:* ${content.ticket_type}`,
    `*Qué se pide:* ${wiki(content.summary)}`,
    '*Criterios de aceptación:*',
    bullets(content.acceptance_criteria.map((item) => `${wiki(item.criterion)} _(${SOURCE_LABELS[item.source]})_`)),
    ...(content.questions.length
      ? [
          '*Preguntas para confirmar antes de implementar:*',
          bullets(content.questions.map((item) => `${wiki(item.question)} → *${wiki(item.to)}* (${wiki(item.reason)})`)),
        ]
      : []),
    '*Alcance incluido:*',
    bullets(content.scope_in.map(wiki)),
    ...(content.scope_out.length ? ['*Fuera de alcance:*', bullets(content.scope_out.map(wiki))] : []),
    '*Áreas afectadas:*',
    bullets(content.affected_areas.map((item) => `{{${item.location.replace(/[{}]/g, '')}}} — ${wiki(item.reason)}`)),
    '*Cómo abordarlo:*',
    bullets(content.approach.map(wiki), '#'),
    ...(content.risks.length
      ? ['*Riesgos:*', bullets(content.risks.map((item) => `${wiki(item.risk)} → ${wiki(item.mitigation)}`))]
      : []),
    `*Despliegue esperado:* ${wiki(content.deploy_expectation)}`,
    '*Pruebas para QA:*',
    bullets(content.qa_checks.map(wiki)),
    '*Lo que revisará pr-review y conviene cuidar desde el inicio:*',
    bullets(content.pr_review_watchpoints.map(wiki)),
  ].join('\n')

const parseKey = (value: unknown) => {
  const key = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!ISSUE_KEY.test(key)) throw new HttpError(400, 'La clave del ticket no es válida.')
  return key
}

export const PLANS_ROUTE = '/api/plans'

export const createPlansHandler =
  (db: Db, runner: PlanRunner, jiraEnv: JiraEnv) => async (req: IncomingMessage, res: ServerResponse, pathname: string) => {
    const rest = pathname.slice(PLANS_ROUTE.length).replace(/^\//, '')

    if (!rest && req.method === 'GET') {
      const key = parseKey(new URL(req.url ?? '', 'http://localhost').searchParams.get('ticket'))
      const rows = db.select().from(plans).where(eq(plans.ticketKey, key)).orderBy(asc(plans.id)).all()
      return sendJson(res, 200, { plans: rows.map(toPlan) })
    }

    if (!rest && req.method === 'POST') {
      const body = (await readJson(req)) as Record<string, unknown> | null
      const key = parseKey(body?.ticketKey)
      const ticket = db.select().from(tickets).where(eq(tickets.key, key)).get()
      if (!ticket) throw new HttpError(404, `La card ${key} no existe.`)
      const running = db
        .select()
        .from(plans)
        .where(eq(plans.ticketKey, key))
        .all()
        .some((plan) => plan.status === 'queued' || plan.status === 'running')
      if (running) throw new HttpError(409, `Ya hay un plan en preparación para ${key}.`)

      const row = db
        .insert(plans)
        .values({ ticketKey: key, repositoryId: ticket.repositoryId, status: 'queued', createdAt: new Date().toISOString() })
        .returning()
        .get()
      runner.enqueue(row.id)
      return sendJson(res, 200, { plan: toPlan(row) })
    }

    const publish = rest.match(/^(\d+)\/publish$/)
    if (publish && req.method === 'POST') {
      const row = db.select().from(plans).where(eq(plans.id, Number(publish[1]))).get()
      if (!row) throw new HttpError(404, 'El plan no existe.')
      if (row.status !== 'done' || !row.content) throw new HttpError(409, 'El plan todavía no está listo.')

      const saved = await saveInternalComment(
        jiraEnv,
        row.ticketKey,
        toJiraComment(row.ticketKey, row.content),
        row.jiraCommentId ?? undefined,
      ).catch((error: unknown) => {
        throw new HttpError(502, error instanceof Error ? error.message : 'No se pudo publicar en Jira.')
      })
      const updated = db
        .update(plans)
        .set({ jiraCommentId: saved.id, jiraCommentUrl: saved.url })
        .where(eq(plans.id, row.id))
        .returning()
        .get()
      return sendJson(res, 200, { plan: toPlan(updated) })
    }

    throw new HttpError(405, 'Método no permitido.')
  }
