import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { CARDS_ROUTE, createCardsHandler } from './cards-api.ts'
import { openDatabase } from './db/client.ts'
import { HttpError, sendJson } from './http.ts'
import { createJiraRoutes } from './jira-api.ts'

const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url))
const ENV_FILE = `${ROOT_DIR}.env`
const HOST = '127.0.0.1'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1'])
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH'])

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)

const port = Number(process.env.BRANCH_SERVER_PORT ?? 8787)
const db = openDatabase(process.env.BRANCH_DB_PATH ?? `${ROOT_DIR}data/branch-manager.db`)
const jiraRoutes = createJiraRoutes(process.env)
const cardsHandler = createCardsHandler(db)

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
