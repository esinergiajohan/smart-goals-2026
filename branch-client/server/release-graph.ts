import type { BranchOrigin, JoinedBranch, ReleaseGraph, ReleaseTicket } from '../src/types/release.ts'
import { existingRefs, resolveRef } from './git-refs.ts'
import { git } from './process.ts'

export interface ReleaseRepository {
  path: string
  productionBranch: string
  baseBranch: string
  developmentBranch: string
}

export interface ReleaseScope {
  branch: string
  ticketKeys: string[]
  mergedBranches: string[]
}

interface Lineage {
  staging: number
  develop: number
}

const ISSUE_IN_TEXT = /(?<![\w-])[A-Z][A-Z0-9]+-\d+(?!\w|-\d)/g
const DELIVERY_COPY = /-(dev|develop|stg|staging|test)(-|$)/i
const MERGE_SUBJECTS = [
  /^Merged in (\S+?)(?: \(pull request #(\d+)\))?$/i,
  /^Merge (?:remote-tracking )?branch '([^']+)'/i,
]
const REMOTE_PREFIX = 'origin/'
const CONCURRENCY = 6
const CACHE_SIZE = 20

const lines = (output: string) => (output ? output.split('\n') : [])

const stripRemote = (name: string) => (name.startsWith(REMOTE_PREFIX) ? name.slice(REMOTE_PREFIX.length) : name)

const keysIn = (text: string) => [...new Set(text.toUpperCase().match(ISSUE_IN_TEXT) ?? [])]

const mapLimit = async <T, R>(items: T[], limit: number, run: (item: T) => Promise<R>) => {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await run(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const freshestRef = async (repoPath: string, name: string) => {
  const refs = await existingRefs(repoPath, name)
  if (!refs.length) return resolveRef(repoPath, name)
  if (refs.length > 1 && (await git(repoPath, ['merge-base', '--is-ancestor', refs[0], refs[1]])).ok) return refs[1]
  return refs[0]
}

const optionalRef = async (repoPath: string, name: string) =>
  (await existingRefs(repoPath, name)).length ? freshestRef(repoPath, name) : null

const isAncestor = async (repoPath: string, ancestor: string, descendant: string) =>
  (await git(repoPath, ['merge-base', '--is-ancestor', ancestor, descendant])).ok

const ownCommits = async (repoPath: string, tip: string, ...excluded: string[]) =>
  lines((await git(repoPath, ['rev-list', '--no-merges', tip, ...excluded.map((ref) => `^${ref}`)])).output)

const firstParentSet = async (repoPath: string, production: string, trunk: string | null) =>
  new Set(trunk ? lines((await git(repoPath, ['rev-list', '--first-parent', `${production}..${trunk}`])).output) : [])

const originOf = (lineage: Lineage, forkInMain: boolean): BranchOrigin => {
  if (lineage.develop || lineage.staging) return lineage.develop >= lineage.staging ? 'develop' : 'staging'
  return forkInMain ? 'main' : 'release'
}

const cache = new Map<string, ReleaseGraph>()

const remember = (key: string, graph: ReleaseGraph) => {
  cache.set(key, graph)
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string)
  return graph
}

export const analyzeRelease = async (repository: ReleaseRepository, scope: ReleaseScope): Promise<ReleaseGraph> => {
  const { path } = repository
  const release = await freshestRef(path, scope.branch)
  const production = await freshestRef(path, repository.productionBranch)
  const staging = await optionalRef(path, repository.baseBranch)
  const develop = await optionalRef(path, repository.developmentBranch)

  const ticketKeys = new Set(scope.ticketKeys.map((key) => key.toUpperCase()))
  const projects = new Set([...ticketKeys].map((key) => key.split('-')[0]))
  const ticketsIn = (text: string) => keysIn(text).filter((key) => projects.has(key.split('-')[0]))
  const explicit = new Set(scope.mergedBranches.map((name) => name.trim()).filter(Boolean))
  const releaseSlug = scope.branch.split('/').pop() ?? scope.branch
  const refLines = lines(
    (await git(path, ['for-each-ref', '--format=%(objectname) %(refname:short)', 'refs/heads', 'refs/remotes/origin']))
      .output,
  )
  const refShas = new Map<string, string>()
  for (const line of refLines) {
    const [sha, ref] = line.split(' ')
    if (ref) refShas.set(ref, sha)
  }

  const isCandidate = (name: string) => {
    if (name === scope.branch || name === 'HEAD' || name === 'origin') return false
    if (explicit.has(name)) return true
    if (DELIVERY_COPY.test(name)) return false
    return name.includes(releaseSlug) || ticketsIn(name).some((key) => ticketKeys.has(key))
  }
  const candidateNames = [...new Set([...refShas.keys()].map(stripRemote))].filter(isCandidate).sort()

  const cacheKey = [
    path,
    scope.branch,
    ...[release, production, staging, develop].map((ref) => (ref ? refShas.get(ref) : '')),
    ...candidateNames.flatMap((name) => [name, refShas.get(name), refShas.get(`${REMOTE_PREFIX}${name}`)]),
    [...ticketKeys].sort().join(','),
  ].join('|')
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const stagingLine = await firstParentSet(path, production, staging)
  const developLine = await firstParentSet(path, production, develop)
  const lineageOf = async (tip: string): Promise<Lineage> => {
    const commits = lines((await git(path, ['rev-list', `${production}..${tip}`])).output)
    return {
      staging: commits.filter((sha) => stagingLine.has(sha)).length,
      develop: commits.filter((sha) => developLine.has(sha)).length,
    }
  }

  const merges = lines(
    (
      await git(path, [
        'log',
        '--first-parent',
        '--merges',
        '--format=%H%x09%P%x09%cI%x09%s',
        `${production}..${release}`,
      ])
    ).output,
  )

  const mergedBranches = await mapLimit(merges, CONCURRENCY, async (line): Promise<JoinedBranch | null> => {
    const [sha, parents, date, subject] = line.split('\t')
    const [first, second] = parents.split(' ')
    if (!second) return null
    const short = sha.slice(0, 9)

    if (await isAncestor(path, second, production)) {
      const commits = (await ownCommits(path, second, first)).length
      return { name: repository.productionBranch, method: 'sync', origin: 'main', commits, joined: commits, sha: short, joinedAt: date }
    }
    const commits = (await ownCommits(path, second, first, production)).length

    const parsed = MERGE_SUBJECTS.map((pattern) => subject.match(pattern)).find(Boolean)
    const pointing = lines(
      (await git(path, ['for-each-ref', '--points-at', second, '--format=%(refname:short)', 'refs/heads', 'refs/remotes/origin']))
        .output,
    ).map(stripRemote)
    const name = parsed?.[1] ? stripRemote(parsed[1]) : (pointing.find((ref) => ref !== scope.branch) ?? subject)
    if (name === scope.branch) return null

    const fork = (await git(path, ['merge-base', first, second])).output
    const subjects = (await git(path, ['log', '--no-merges', '--format=%s', `${first}..${second}`])).output
    return {
      name,
      ticketKey: ticketsIn(name)[0] ?? ticketsIn(subjects)[0],
      method: 'merge',
      origin: originOf(await lineageOf(second), await isAncestor(path, fork, production)),
      commits,
      joined: commits,
      sha: short,
      joinedAt: date,
      ...(parsed?.[2] && { pullRequest: Number(parsed[2]) }),
    }
  })

  const mergedNames = new Set(mergedBranches.flatMap((branch) => (branch ? [branch.name] : [])))
  const pickedBranches = await mapLimit(
    candidateNames.filter((name) => !mergedNames.has(name)),
    CONCURRENCY,
    async (name): Promise<JoinedBranch | null> => {
      const ref = await freshestRef(path, name)
      if (await isAncestor(path, ref, release)) return null
      const fork = (await git(path, ['merge-base', ref, release])).output
      if (!fork) return null
      const own = new Set(await ownCommits(path, ref, fork, production))
      if (!own.size) return null

      const joined = lines((await git(path, ['cherry', release, ref, fork])).output).filter(
        (entry) => entry.startsWith('-') && own.has(entry.slice(2)),
      )
      return {
        name,
        ticketKey: ticketsIn(name)[0],
        method: 'cherry-pick',
        origin: originOf(await lineageOf(ref), await isAncestor(path, fork, production)),
        commits: own.size,
        joined: joined.length,
        sha: (await git(path, ['rev-parse', '--short', ref])).output,
      }
    },
  )

  const tickets = new Map<string, ReleaseTicket>()
  for (const line of lines(
    (await git(path, ['log', '--no-merges', '--format=%cI%x09%s', `${production}..${release}`])).output,
  )) {
    const [date, subject] = line.split('\t')
    for (const key of ticketsIn(subject)) {
      const ticket = tickets.get(key) ?? { key, commits: 0, lastCommitAt: date }
      ticket.commits += 1
      tickets.set(key, ticket)
    }
  }

  const base = (await git(path, ['merge-base', release, production])).output
  const [baseSha, baseDate, baseSubject] = (await git(path, ['log', '-1', '--format=%h%x09%cI%x09%s', base])).output.split(
    '\t',
  )

  return remember(cacheKey, {
    branch: scope.branch,
    ref: release,
    production,
    base: { sha: baseSha, subject: baseSubject, date: baseDate },
    commits: (await ownCommits(path, release, production)).length,
    lineage: await lineageOf(release),
    branches: [...mergedBranches, ...pickedBranches].filter((branch): branch is JoinedBranch => branch !== null),
    tickets: [...tickets.values()],
    analyzedAt: new Date().toISOString(),
  })
}
