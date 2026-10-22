import { existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAbsolute } from 'node:path'
import { asc, eq, or } from 'drizzle-orm'
import type { Repository } from '../src/types/review.ts'
import type { Db } from './db/client.ts'
import { repositories } from './db/schema.ts'
import { HttpError, readJson, sendJson } from './http.ts'
import { git } from './process.ts'

type RepositoryRow = typeof repositories.$inferSelect

const MAX_NAME_LENGTH = 80
const NAME = /^[\w.-]+$/

const toRepository = ({ id, name, path, baseBranch, developmentBranch, productionBranch }: RepositoryRow): Repository => ({
  id,
  name,
  path,
  baseBranch,
  developmentBranch,
  productionBranch,
})

export const parseBranchName = async (repoPath: string, value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `Falta la rama «${field}».`)
  const name = value.trim()
  if (!(await git(repoPath, ['check-ref-format', '--branch', name])).ok) {
    throw new HttpError(400, `La rama «${name}» no tiene un nombre válido.`)
  }
  return name
}

const parseRepository = async (body: unknown) => {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Faltan los datos del repositorio.')
  const { name, path, baseBranch, developmentBranch, productionBranch } = body as Record<string, unknown>

  if (typeof name !== 'string' || !NAME.test(name.trim()) || name.trim().length > MAX_NAME_LENGTH) {
    throw new HttpError(400, 'El nombre solo admite letras, números, punto, guion y guion bajo.')
  }
  if (typeof path !== 'string' || !isAbsolute(path.trim()) || !existsSync(path.trim())) {
    throw new HttpError(400, 'La ruta debe ser absoluta y existir en este equipo.')
  }
  const root = await git(path.trim(), ['rev-parse', '--show-toplevel'])
  if (!root.ok) throw new HttpError(400, 'La ruta no es un repositorio Git.')

  return {
    name: name.trim(),
    path: root.output,
    baseBranch: await parseBranchName(root.output, baseBranch, 'base'),
    developmentBranch: await parseBranchName(root.output, developmentBranch, 'desarrollo'),
    productionBranch: await parseBranchName(root.output, productionBranch, 'producción'),
  }
}

export const REPOSITORIES_ROUTE = '/api/repositories'

export const createRepositoriesHandler = (db: Db) => async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'GET') {
    const rows = db.select().from(repositories).orderBy(asc(repositories.name)).all()
    return sendJson(res, 200, { repositories: rows.map(toRepository) })
  }

  if (req.method === 'POST') {
    const values = await parseRepository(await readJson(req))
    const duplicate = db
      .select()
      .from(repositories)
      .where(or(eq(repositories.name, values.name), eq(repositories.path, values.path)))
      .get()
    if (duplicate) throw new HttpError(409, `Ya existe el repositorio «${duplicate.name}» con ese nombre o ruta.`)

    const row = db
      .insert(repositories)
      .values({ ...values, createdAt: new Date().toISOString() })
      .returning()
      .get()
    return sendJson(res, 200, { repository: toRepository(row) })
  }

  throw new HttpError(405, 'Método no permitido.')
}
