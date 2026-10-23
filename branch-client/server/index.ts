import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARDS_ROUTE, createCardsHandler } from './cards-api.ts'
import { openDatabase } from './db/client.ts'
import { HttpError, sendJson } from './http.ts'
import { createJiraRoutes } from './jira-api.ts'
import { createPlanRunner } from './plan-runner.ts'
import { createPlansHandler, PLANS_ROUTE } from './plans-api.ts'
import { createReportHandler, REPORT_ROUTE } from './report-api.ts'
import {
  createPullRequestsHandlers,
  METRICS_ROUTE,
  PULL_REQUESTS_ROUTE,
  PULL_REQUESTS_SYNC_ROUTE,
} from './pull-requests-api.ts'
import { createRepositoriesHandler, REPOSITORIES_ROUTE } from './repositories-api.ts'
import { createReviewRunner } from './review-runner.ts'
import { createReviewsHandler, REVIEWS_ROUTE } from './reviews-api.ts'

const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url))
const DEFAULT_KIT_HOME = fileURLToPath(new URL('../../../pr-review', import.meta.url))
const ENV_FILE = `${ROOT_DIR}.env`
const HOST = '127.0.0.1'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1'])
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH'])

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const port = Number(process.env.BRANCH_SERVER_PORT ?? 8787)
const db = openDatabase(process.env.BRANCH_DB_PATH ?? `${ROOT_DIR}data/branch-manager.db`)
const jiraRoutes = createJiraRoutes(process.env)
const cardsHandler = createCardsHandler(db)
const repositoriesHandler = createRepositoriesHandler(db)
const reviewConfig = {
  kitHome: process.env.PR_REVIEW_KIT_HOME ?? DEFAULT_KIT_HOME,
  reviewsDir: process.env.BRANCH_REVIEWS_DIR ?? join(homedir(), '.branch-manager', 'reviews'),
  pythonBin: process.env.PR_REVIEW_PYTHON ?? 'python3',
  claudeBin: process.env.CLAUDE_BIN ?? 'claude',
  claudeConfigDir: process.env.BRANCH_CLAUDE_CONFIG_DIR ?? process.env.CLAUDE_CONFIG_DIR,
  model: process.env.BRANCH_REVIEW_MODEL,
  jiraEnv: process.env,
}
const reviewRunner = createReviewRunner(db, reviewConfig)
const reviewsHandler = createReviewsHandler(db, reviewRunner)
const plansHandler = createPlansHandler(db, createPlanRunner(db, reviewConfig), process.env)
const pullRequestsHandlers = createPullRequestsHandlers(db, {
  bitbucketEnvFile: process.env.BITBUCKET_ENV_FILE ?? '/Volumes/KINGSTON/7777/gitHub/bitbucket-mvp/.env',
})

const isLocalHost = (host: string | undefined) => {
  try {
    return LOCAL_HOSTNAMES.has(new URL(`http://${host}`).hostname)
  } catch {
    return false
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!isLocalHost(req.headers.host)) throw new HttpError(403, 'Solo se aceptan peticiones locales.')
    if (BODY_METHODS.has(req.method ?? '') && !req.headers['content-type']?.startsWith('application/json')) {
      throw new HttpError(415, 'El cuerpo debe enviarse como application/json.')
    }

    const { pathname } = new URL(req.url ?? '/', 'http://localhost')
    const jiraHandler = jiraRoutes[pathname]
    if (jiraHandler && req.method === 'GET') return await jiraHandler(req, res)
    if (pathname === CARDS_ROUTE || pathname.startsWith(`${CARDS_ROUTE}/`)) return await cardsHandler(req, res, pathname)
    if (pathname === REPOSITORIES_ROUTE) return await repositoriesHandler(req, res)
    if (pathname === REVIEWS_ROUTE) return await reviewsHandler(req, res)
    if (pathname === PULL_REQUESTS_ROUTE) return await pullRequestsHandlers.pullRequests(req, res)
    if (pathname === PULL_REQUESTS_SYNC_ROUTE) return await pullRequestsHandlers.sync(req, res)
    if (pathname === PLANS_ROUTE || pathname.startsWith(`${PLANS_ROUTE}/`)) return await plansHandler(req, res, pathname)
    if (pathname === REPORT_ROUTE) return await createReportHandler(db)(req, res)
    if (pathname === METRICS_ROUTE) return await pullRequestsHandlers.metrics(req, res)

    throw new HttpError(404, 'Ruta no encontrada.')
  } catch (error) {
    if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message })
    console.error(error)
    sendJson(res, 500, { error: 'Error interno del servidor.' })
  }
})

server.listen(port, HOST, () => {
  console.log(`Branch Manager API en http://${HOST}:${port}`)
})
