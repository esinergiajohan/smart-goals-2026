import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from './http.ts'

export interface JiraEnv {
  JIRA_BASE_URL?: string
  JIRA_EMAIL?: string
  JIRA_API_TOKEN?: string
}

interface JiraIssue {
  key: string
  fields: {
    summary: string
    created: string
    updated: string
    status?: { name: string; statusCategory?: { key: string } }
    project?: { key: string; name: string }
  }
}

const SEARCH_ROUTE = '/api/jira/search'
const ACTIVE_ROUTE = '/api/jira/active'
const STATUSES_ROUTE = '/api/jira/statuses'
const COMMENT_ROUTE = '/api/jira/comment'
const COMMENT_ID = /^\d+$/
const FEATURED_COMMENT_LENGTH = 1000
const STATUSES_MAX_KEYS = 100
const MAX_RESULTS = 10
const ACTIVE_MAX_RESULTS = 100
const ACTIVE_JQL =
  'assignee = currentUser() AND status in ("Abierto", "Abierta", "Reabierto", "Reabierta", "En curso", "Bloqueado", "Blocked") ORDER BY updated DESC'
const COMMENT_CONCURRENCY = 8
const COMMENT_EXCERPT_LENGTH = 200
export const ISSUE_KEY = /^[A-Z][A-Z0-9_]+-\d+$/i
const LUCENE_RESERVED = /[+\-&|!(){}[\]^"~*?:\\/]/g

interface JiraContext {
  baseUrl: string
  headers: Record<string, string>
}

interface AdfNode {
  type?: string
  text?: string
  attrs?: { text?: string; url?: string; shortName?: string }
  content?: AdfNode[]
}

interface JiraComment {
  id: string
  created?: string
  author?: { accountId?: string; displayName?: string }
  body?: AdfNode | string
}

class JiraHttpError extends Error {
  status: number

  constructor(status: number) {
    super(`Jira respondió ${status}`)
    this.status = status
  }
}

const buildJql = (query: string) => {
  let match: string
  if (ISSUE_KEY.test(query)) {
    match = `key = "${query.toUpperCase()}"`
  } else {
    const words = query.replace(LUCENE_RESERVED, ' ').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return null
    match = `summary ~ "${words.join(' ')}*"`
  }
  return `${match} ORDER BY updated DESC`
}

const jiraGet = async <T>({ baseUrl, headers }: JiraContext, path: string): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, { headers })
  if (!response.ok) throw new JiraHttpError(response.status)
  return (await response.json()) as T
}

const INLINE_PARENTS = new Set(['paragraph', 'heading', 'codeBlock'])

const adfToText = (node: AdfNode | string | undefined, blockSeparator = ' '): string => {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'mention') return node.attrs?.text ?? ''
  if (node.type === 'emoji') return node.attrs?.shortName ?? ''
  if (node.type === 'inlineCard') return node.attrs?.url ?? ''
  if (node.type === 'hardBreak') return blockSeparator
  return (node.content ?? [])
    .map((child) => adfToText(child, blockSeparator))
    .join(INLINE_PARENTS.has(node.type ?? '') ? '' : blockSeparator)
}

const mapLimit = async <T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const fetchPendingComment = async (context: JiraContext, key: string, myAccountId: string) => {
  const { comments } = await jiraGet<{ comments: JiraComment[] }>(
    context,
    `/rest/api/3/issue/${key}/comment?orderBy=-created&maxResults=1`,
  )
  const last = comments[0]
  if (!last || last.author?.accountId === myAccountId) return null

  const text = adfToText(last.body).replace(/\s+/g, ' ').trim()
  return {
    author: last.author?.displayName ?? 'Alguien',
    excerpt: text.slice(0, COMMENT_EXCERPT_LENGTH),
    url: `${context.baseUrl}/browse/${key}?focusedCommentId=${last.id}`,
  }
}

const MISSING_ENV = 'Faltan JIRA_BASE_URL, JIRA_EMAIL o JIRA_API_TOKEN en el .env de la raíz del proyecto.'

const createJiraContext = (env: JiraEnv): JiraContext | null => {
  const baseUrl = env.JIRA_BASE_URL?.replace(/\/+$/, '')
  if (!baseUrl || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN) return null

  return {
    baseUrl,
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64')}`,
      Accept: 'application/json',
    },
  }
}

const withJira = async (env: JiraEnv, res: ServerResponse, task: (context: JiraContext) => Promise<unknown>) => {
  const context = createJiraContext(env)
  if (!context) {
    sendJson(res, 500, { error: MISSING_ENV })
    return
  }

  try {
    sendJson(res, 200, await task(context))
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof JiraHttpError ? error.message : 'No se pudo conectar con Jira',
    })
  }
}

const searchJira = (
  env: JiraEnv,
  res: ServerResponse,
  jql: string,
  fields: string[],
  maxResults: number,
  toResponse: (issues: JiraIssue[], context: JiraContext) => unknown[] | Promise<unknown[]>,
) =>
  withJira(env, res, async (context) => {
    const response = await fetch(`${context.baseUrl}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: { ...context.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql, fields, maxResults }),
    })

    if (!response.ok) throw new JiraHttpError(response.status)

    const page = (await response.json()) as { issues: JiraIssue[] }
    return { issues: await toResponse(page.issues, context) }
  })

const createSearchHandler = (env: JiraEnv) => async (req: IncomingMessage, res: ServerResponse) => {
  const query = new URL(req.url ?? '', 'http://localhost').searchParams.get('q')?.trim() ?? ''
  const jql = buildJql(query)
  if (!jql) {
    sendJson(res, 200, { issues: [] })
    return
  }

  await searchJira(env, res, jql, ['summary', 'created', 'updated'], MAX_RESULTS, (issues) =>
    issues.map(({ key, fields }) => ({
      key,
      summary: fields.summary,
      created: new Date(fields.created).toISOString(),
      updated: new Date(fields.updated).toISOString(),
    })),
  )
}

const createActiveHandler = (env: JiraEnv) => async (_req: IncomingMessage, res: ServerResponse) => {
  await searchJira(
    env,
    res,
    ACTIVE_JQL,
    ['summary', 'status', 'project'],
    ACTIVE_MAX_RESULTS,
    async (issues, context) => {
      const { accountId } = await jiraGet<{ accountId: string }>(context, '/rest/api/3/myself')
      return mapLimit(issues, COMMENT_CONCURRENCY, async ({ key, fields }) => ({
        key,
        summary: fields.summary,
        status: fields.status?.name ?? '',
        projectKey: fields.project?.key ?? key.split('-')[0],
        projectName: fields.project?.name ?? '',
        url: `${context.baseUrl}/browse/${key}`,
        pendingComment: await fetchPendingComment(context, key, accountId),
      }))
    },
  )
}

const createStatusesHandler = (env: JiraEnv) => async (req: IncomingMessage, res: ServerResponse) => {
  const keys = (new URL(req.url ?? '', 'http://localhost').searchParams.get('keys') ?? '')
    .split(',')
    .map((key) => key.trim().toUpperCase())
    .filter((key) => ISSUE_KEY.test(key))
    .slice(0, STATUSES_MAX_KEYS)

  if (!keys.length) {
    sendJson(res, 200, { issues: [] })
    return
  }

  await searchJira(env, res, `key in (${keys.join(',')})`, ['status'], STATUSES_MAX_KEYS, (issues) =>
    issues.map(({ key, fields }) => ({
      key,
      name: fields.status?.name ?? '',
      category: fields.status?.statusCategory?.key ?? '',
    })),
  )
}

const createCommentHandler = (env: JiraEnv) => async (req: IncomingMessage, res: ServerResponse) => {
  const params = new URL(req.url ?? '', 'http://localhost').searchParams
  const key = params.get('key')?.trim().toUpperCase() ?? ''
  const id = params.get('id')?.trim() ?? ''

  if (!ISSUE_KEY.test(key) || !COMMENT_ID.test(id)) {
    sendJson(res, 400, { error: 'Falta la clave del ticket o el id del comentario.' })
    return
  }

  await withJira(env, res, async (context) => {
    const comment = await jiraGet<JiraComment>(context, `/rest/api/3/issue/${key}/comment/${id}`)
    const text = adfToText(comment.body, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim()
    return {
      comment: {
        author: comment.author?.displayName ?? 'Alguien',
        created: comment.created ? new Date(comment.created).toISOString() : '',
        text: text.slice(0, FEATURED_COMMENT_LENGTH),
        url: `${context.baseUrl}/browse/${key}?focusedCommentId=${comment.id}`,
      },
    }
  })
}

export const fetchIssueBrief = async (env: JiraEnv, key: string) => {
  const context = createJiraContext(env)
  if (!context) throw new Error(MISSING_ENV)

  const issue = await jiraGet<{
    fields: { summary: string; description?: AdfNode | string; issuetype?: { name: string }; status?: { name: string } }
  }>(context, `/rest/api/3/issue/${key}?fields=summary,description,issuetype,status`)
  const description = adfToText(issue.fields.description, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()

  return [
    `# ${key} — ${issue.fields.summary}`,
    '',
    `- Tipo: ${issue.fields.issuetype?.name ?? 'No informado'}`,
    `- Estado: ${issue.fields.status?.name ?? 'No informado'}`,
    `- Enlace: ${context.baseUrl}/browse/${key}`,
    '',
    '## Descripción',
    '',
    description || 'Sin descripción en Jira.',
    '',
  ].join('\n')
}

export const createJiraRoutes = (env: JiraEnv): Record<string, (req: IncomingMessage, res: ServerResponse) => Promise<void>> => ({
  [SEARCH_ROUTE]: createSearchHandler(env),
  [ACTIVE_ROUTE]: createActiveHandler(env),
  [STATUSES_ROUTE]: createStatusesHandler(env),
  [COMMENT_ROUTE]: createCommentHandler(env),
})
