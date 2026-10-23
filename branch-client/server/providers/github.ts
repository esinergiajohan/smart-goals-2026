import type { PullRequestState } from '../../src/types/pullRequest.ts'
import { runProcess } from '../process.ts'
import type { GitProvider, PullRequestQuery, RemotePullRequest } from './types.ts'

const REMOTE = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/
const GH_TIMEOUT_MS = 60_000
const DETAIL_CONCURRENCY = 4
const BOT = /\[bot\]$/

interface GitHubUser {
  login: string
}

interface GitHubPull {
  number: number
  title: string
  state: 'open' | 'closed'
  merged_at: string | null
  closed_at: string | null
  created_at: string
  html_url: string
  user: GitHubUser
  merged_by: GitHubUser | null
  head: { ref: string }
  base: { ref: string }
}

interface GitHubReview {
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
  body: string | null
  user: GitHubUser | null
}

interface GitHubComment {
  user: GitHubUser | null
}

interface GitHubEvent {
  event: string
  actor: GitHubUser | null
}

interface GitHubCommit {
  commit: { committer: { date: string } | null }
}

export const githubRepository = (remoteUrl: string) => {
  const match = remoteUrl.trim().match(REMOTE)
  return match ? `${match[1]}/${match[2]}` : null
}

const gh = async <T>(args: string[]): Promise<T> => {
  const result = await runProcess('gh', ['api', ...args], { cwd: process.cwd(), timeoutMs: GH_TIMEOUT_MS })
  if (result.code !== 0) throw new Error(`GitHub (gh api) falló: ${result.stderr.trim().slice(0, 300)}`)
  return JSON.parse(result.stdout) as T
}

const pages = async <T>(path: string) => (await gh<T[][]>(['--paginate', '--slurp', path])).flat()

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

const isoSecond = (value: string | undefined, offsetSeconds = 0) =>
  value ? new Date(new Date(value).getTime() + offsetSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z') : undefined

const stateOf = (pull: GitHubPull): PullRequestState =>
  pull.merged_at ? 'MERGED' : pull.state === 'open' ? 'OPEN' : 'DECLINED'

export const createGitHubProvider = (remoteUrl: string): GitProvider => {
  const remote = githubRepository(remoteUrl)
  if (!remote) throw new Error(`El remoto ${remoteUrl} no es un repositorio de GitHub.`)
  let canonical: Promise<string> | undefined
  const repository = () => (canonical ??= gh<{ full_name: string }>([`repos/${remote}`]).then((repo) => repo.full_name))

  const search = async (terms: string[]) => {
    const query = [`repo:${await repository()}`, 'is:pr', ...terms].join(' ')
    const result = await gh<Array<{ items: Array<{ number: number }> }>>([
      '-X',
      'GET',
      'search/issues',
      '-f',
      `q=${query}`,
      '-f',
      'per_page=100',
      '--paginate',
      '--slurp',
    ])
    return result.flatMap((page) => page.items.map((item) => item.number))
  }

  const detail = async (number: number): Promise<RemotePullRequest> => {
    const base = `repos/${await repository()}`
    const [pull, reviews, issueComments, reviewComments, commits] = await Promise.all([
      gh<GitHubPull>([`${base}/pulls/${number}`]),
      pages<GitHubReview>(`${base}/pulls/${number}/reviews?per_page=100`),
      pages<GitHubComment>(`${base}/issues/${number}/comments?per_page=100`),
      pages<GitHubComment>(`${base}/pulls/${number}/comments?per_page=100`),
      pages<GitHubCommit>(`${base}/pulls/${number}/commits?per_page=100`),
    ])
    const author = pull.user.login
    const closer =
      stateOf(pull) === 'DECLINED'
        ? (await pages<GitHubEvent>(`${base}/issues/${number}/events?per_page=100`))
            .filter((event) => event.event === 'closed')
            .at(-1)?.actor?.login
        : undefined
    const byReviewer = (user: GitHubUser | null) => Boolean(user && user.login !== author && !BOT.test(user.login))

    return {
      externalId: pull.number,
      title: pull.title,
      sourceBranch: pull.head.ref,
      destinationBranch: pull.base.ref,
      state: stateOf(pull),
      url: pull.html_url,
      authorId: author,
      createdAt: new Date(pull.created_at).toISOString(),
      closedAt: pull.merged_at ?? pull.closed_at ?? undefined,
      approvedBy: [
        ...new Set(reviews.filter((review) => review.state === 'APPROVED' && review.user).map((review) => review.user!.login)),
      ],
      changesRequested: reviews.filter((review) => review.state === 'CHANGES_REQUESTED').length,
      pushesAfterOpen: commits.filter(
        (item) => item.commit.committer && item.commit.committer.date > pull.created_at,
      ).length,
      reviewerComments:
        reviews.filter((review) => byReviewer(review.user) && review.body?.trim()).length +
        issueComments.filter((comment) => byReviewer(comment.user)).length +
        reviewComments.filter((comment) => byReviewer(comment.user)).length,
      ...(pull.merged_by && { mergedBy: pull.merged_by.login }),
      ...(closer && { closedBy: closer }),
    }
  }

  return {
    name: 'github',

    async currentUserId() {
      return (await gh<GitHubUser>(['user'])).login
    },

    async pullRequests(query: PullRequestQuery) {
      const filters = [
        ...(query.authorId ? [`author:${query.authorId}`] : []),
        ...(query.createdFrom || query.createdTo
          ? [`created:${isoSecond(query.createdFrom) ?? '*'}..${isoSecond(query.createdTo, -1) ?? '*'}`]
          : []),
      ]
      const searches = [
        ...(query.branches ?? []).map((branch) => [...filters, `head:${branch}`]),
        ...(query.branchContains ? [[...filters, `${query.branchContains} in:title`]] : []),
      ]
      const numbers = new Set<number>()
      for (const terms of searches.length ? searches : [filters]) {
        for (const number of await search(terms)) numbers.add(number)
      }
      return mapLimit([...numbers], DETAIL_CONCURRENCY, detail)
    },
  }
}
