import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

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
  }
}

const SEARCH_ROUTE = '/api/jira/search'
const MAX_RESULTS = 10
const ISSUE_KEY = /^[A-Z][A-Z0-9_]+-\d+$/i
const LUCENE_RESERVED = /[+\-&|!(){}[\]^"~*?:\\/]/g

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
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

const createSearchHandler = (env: JiraEnv) => async (req: IncomingMessage, res: ServerResponse) => {
  const baseUrl = env.JIRA_BASE_URL?.replace(/\/+$/, '')
  if (!baseUrl || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
    sendJson(res, 500, { error: 'Faltan JIRA_BASE_URL, JIRA_EMAIL o JIRA_API_TOKEN en el .env de la raíz del proyecto.' })
    return
  }

  const query = new URL(req.url ?? '', 'http://localhost').searchParams.get('q')?.trim() ?? ''
  const jql = buildJql(query)
  if (!jql) {
    sendJson(res, 200, { issues: [] })
    return
  }

  try {
    const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jql, fields: ['summary', 'created', 'updated'], maxResults: MAX_RESULTS }),
    })

    if (!response.ok) {
      sendJson(res, 502, { error: `Jira respondió ${response.status}` })
      return
    }

    const page = (await response.json()) as { issues: JiraIssue[] }
    sendJson(res, 200, {
      issues: page.issues.map(({ key, fields }) => ({
        key,
        summary: fields.summary,
        created: new Date(fields.created).toISOString(),
        updated: new Date(fields.updated).toISOString(),
      })),
    })
  } catch {
    sendJson(res, 502, { error: 'No se pudo conectar con Jira' })
  }
}

export function jiraApi(env: JiraEnv): Plugin {
  const handler = createSearchHandler(env)

  return {
    name: 'jira-api',
    configureServer(server) {
      server.middlewares.use(SEARCH_ROUTE, handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(SEARCH_ROUTE, handler)
    },
  }
}
