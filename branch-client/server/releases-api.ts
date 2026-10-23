import type { IncomingMessage, ServerResponse } from 'node:http'
import { eq } from 'drizzle-orm'
import { groupReleases } from '../src/utils/releases.ts'
import type { Db } from './db/client.ts'
import { repositories, tickets } from './db/schema.ts'
import { HttpError, sendJson } from './http.ts'
import { analyzeRelease } from './release-graph.ts'
import { parseBranchName } from './repositories-api.ts'

const releaseGroups = (db: Db) =>
  groupReleases(
    db
      .select()
      .from(tickets)
      .all()
      .map((row) => ({ key: row.key, branches: row.branches ?? undefined, repositoryId: row.repositoryId ?? undefined })),
  )

const parseRepository = (db: Db, value: string | null) => {
  const id = Number(value)
  const repository = Number.isInteger(id) ? db.select().from(repositories).where(eq(repositories.id, id)).get() : undefined
  if (!repository) throw new HttpError(400, 'El repositorio no es válido.')
  return repository
}

export const RELEASES_ROUTE = '/api/releases'
export const RELEASE_GRAPH_ROUTE = '/api/releases/graph'

export const createReleasesHandlers = (db: Db) => ({
  releases: async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.')
    const names = new Map(db.select().from(repositories).all().map((row) => [row.id, row.name]))
    const releases = releaseGroups(db).map((group) => ({ ...group, repositoryName: names.get(group.repositoryId) }))
    return sendJson(res, 200, { releases })
  },

  graph: async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.')
    const params = new URL(req.url ?? '', 'http://localhost').searchParams
    const repository = parseRepository(db, params.get('repositoryId'))
    const branch = await parseBranchName(repository.path, params.get('branch'), 'release')

    const cards = db
      .select()
      .from(tickets)
      .where(eq(tickets.repositoryId, repository.id))
      .all()
      .filter((row) => row.branches?.hasRelease && row.branches.work?.trim() === branch)
    if (!cards.length) throw new HttpError(404, `Ninguna card con release usa la rama «${branch}».`)

    const graph = await analyzeRelease(repository, {
      branch,
      ticketKeys: cards.map((row) => row.key),
      mergedBranches: cards.flatMap((row) => row.branches?.merged ?? []),
    })
    return sendJson(res, 200, { graph })
  },
})
