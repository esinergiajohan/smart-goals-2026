import { existsSync, readFileSync } from 'node:fs'
import type { PullRequestState } from '../../src/types/pullRequest.ts'
import type { GitProvider, PullRequestQuery, RemotePullRequest } from './types.ts'

const API = 'https://api.bitbucket.org/2.0'
const REMOTE = /bitbucket\.org[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/
const STATES: PullRequestState[] = ['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']
const PAGE_SIZE = 50
const ACTIVITY_CONCURRENCY = 6

interface BitbucketPullRequest {
  id: number
  title: string
  state: PullRequestState
  created_on: string
  updated_on: string
  author: { uuid: string }
  source: { branch: { name: string } }
  destination: { branch: { name: string } }
  links: { html: { href: string } }
}

interface BitbucketActivity {
  update?: {
    state: PullRequestState
    date: string
    author?: { display_name: string; uuid?: string }
    source?: { commit?: { hash: string } }
  }
  approval?: { user: { display_name: string } }
  changes_request?: { user: { display_name: string } }
  comment?: { user?: { uuid: string } }
}

interface Page<T> {
  values: T[]
  next?: string
}

export const bitbucketRepository = (remoteUrl: string) => {
  const match = remoteUrl.trim().match(REMOTE)
  return match ? { workspace: match[1], slug: match[2] } : null
}

const readCredentials = (envFile: string) => {
  if (!existsSync(envFile)) throw new Error(`No existe el archivo de credenciales de Bitbucket: ${envFile}`)
  const values = Object.fromEntries(
    readFileSync(envFile, 'utf8')
      .split('\n')
      .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')]
      }),
  )
  if (!values.BITBUCKET_EMAIL || !values.BITBUCKET_TOKEN) {
    throw new Error(`Faltan BITBUCKET_EMAIL o BITBUCKET_TOKEN en ${envFile}`)
  }
  return `Basic ${Buffer.from(`${values.BITBUCKET_EMAIL}:${values.BITBUCKET_TOKEN}`).toString('base64')}`
}

const quote = (value: string) => `"${value.replace(/["\\]/g, '\\$&')}"`

const mapLimit = async <T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) => {
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

export const createBitbucketProvider = (remoteUrl: string, envFile: string): GitProvider => {
  const repository = bitbucketRepository(remoteUrl)
  if (!repository) throw new Error(`El remoto ${remoteUrl} no es un repositorio de Bitbucket.`)
  const authorization = readCredentials(envFile)
  const base = `${API}/repositories/${repository.workspace}/${repository.slug}`

  const get = async <T>(url: string): Promise<T> => {
    const response = await fetch(url.startsWith('http') ? url : `${API}${url}`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`Bitbucket respondió ${response.status}`)
    return (await response.json()) as T
  }

  const all = async <T>(url: string) => {
    const values: T[] = []
    let next: string | undefined = url
    while (next) {
      const page: Page<T> = await get<Page<T>>(next)
      values.push(...page.values)
      next = page.next
    }
    return values
  }

  const toRemote = async (pullRequest: BitbucketPullRequest): Promise<RemotePullRequest> => {
    const activity = await all<BitbucketActivity>(`${base}/pullrequests/${pullRequest.id}/activity?pagelen=${PAGE_SIZE}`)
    const pushedCommits = new Set(
      activity
        .map((entry) => (entry.update?.state === 'OPEN' ? entry.update.source?.commit?.hash : undefined))
        .filter((hash): hash is string => Boolean(hash)),
    )
    const closing = activity.find((entry) => entry.update && entry.update.state !== 'OPEN')

    return {
      externalId: pullRequest.id,
      title: pullRequest.title,
      sourceBranch: pullRequest.source.branch.name,
      destinationBranch: pullRequest.destination.branch.name,
      state: pullRequest.state,
      url: pullRequest.links.html.href,
      authorId: pullRequest.author.uuid,
      createdAt: new Date(pullRequest.created_on).toISOString(),
      closedAt:
        pullRequest.state === 'OPEN'
          ? undefined
          : new Date(closing?.update?.date ?? pullRequest.updated_on).toISOString(),
      approvedBy: [
        ...new Set(
          activity
            .map((entry) => entry.approval?.user.display_name)
            .filter((name): name is string => Boolean(name)),
        ),
      ],
      changesRequested: activity.filter((entry) => entry.changes_request).length,
      pushesAfterOpen: Math.max(pushedCommits.size - 1, 0),
      reviewerComments: activity.filter(
        (entry) => entry.comment && entry.comment.user?.uuid !== pullRequest.author.uuid,
      ).length,
      ...(closing?.update?.author?.uuid && { closedBy: closing.update.author.uuid }),
      ...(pullRequest.state === 'MERGED' &&
        closing?.update?.author && { mergedBy: closing.update.author.display_name }),
    }
  }

  return {
    name: 'bitbucket',

    async currentUserId() {
      const user = await get<{ uuid: string }>('/user')
      return user.uuid
    },

    async pullRequests(query: PullRequestQuery) {
      const branchFilters = [
        ...(query.branches ?? []).map((branch) => `source.branch.name = ${quote(branch)}`),
        ...(query.branchContains ? [`source.branch.name ~ ${quote(query.branchContains)}`] : []),
      ]
      const filters = [
        ...(branchFilters.length ? [`(${branchFilters.join(' OR ')})`] : []),
        ...(query.authorId ? [`author.uuid = ${quote(query.authorId)}`] : []),
        ...(query.createdFrom ? [`created_on >= ${query.createdFrom}`] : []),
        ...(query.createdTo ? [`created_on < ${query.createdTo}`] : []),
      ]
      const params = new URLSearchParams({ pagelen: String(PAGE_SIZE), q: filters.join(' AND ') })
      STATES.forEach((state) => params.append('state', state))

      const pullRequests = await all<BitbucketPullRequest>(`${base}/pullrequests?${params}`)
      return mapLimit(pullRequests, ACTIVITY_CONCURRENCY, toRemote)
    },
  }
}
