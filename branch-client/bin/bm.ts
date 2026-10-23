import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import type { JiraTicket, TicketBranches, TrackedTicket } from '../src/types/jira.ts'
import type { Delivery, DeliveryMetrics } from '../src/types/pullRequest.ts'
import type { Repository, Review } from '../src/types/review.ts'
import { BASELINE_PERIOD, FIRST_ATTEMPT_TARGET, formatRate, GOAL_PERIOD } from '../src/utils/goals.ts'

const API = `http://127.0.0.1:${process.env.BRANCH_SERVER_PORT ?? 8787}/api`
const POLL_MS = 10_000
const EXIT = { ok: 0, error: 1, rejected: 2, inconclusive: 3 } as const

const HELP = `Branch Manager CLI: todo lo que hace la card, desde la terminal.

Uso: bm <comando> [opciones] [--json]

  health                                   Comprueba que la API local responde
  repos                                    Lista los repositorios registrados
  repo add --name N --path P [--base staging] [--dev develop] [--prod main]
  cards                                    Lista las cards
  card add KEY                             Crea la card leyendo el ticket desde Jira
  card set KEY [--repo NOMBRE|ID|none] [--work R] [--dev R] [--stg R]
               [--test R] [--test-base R]   (por defecto <work>-test contra producción)
               [--release true|false] [--merged r1,r2] [--deployed true|false]
               [--comment ID|none]
  card rm KEY
  reviews KEY                              Historial de revisiones de la card
  review KEY [--wait]                      PR simulado: pr-review + Claude sobre <rama de trabajo>-test
                                           contra la rama de producción del repo

  prs KEY [--sync]                         PR de la card y si cada entrega salió al primer intento
  metrics [--sync] [--from AAAA-MM-DD --to AAAA-MM-DD]
                                           PR aprobados sin retrabajo (por defecto línea base y meta)

Códigos de salida de «review --wait»: 0 aprobado, 2 rechazado, 3 no concluyente, 1 error.
La API debe estar arriba: npm run dev (o npm run server) en branch-client.`

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: 'boolean' },
    wait: { type: 'boolean' },
    sync: { type: 'boolean' },
    from: { type: 'string' },
    to: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
    role: { type: 'string' },
    name: { type: 'string' },
    path: { type: 'string' },
    base: { type: 'string' },
    dev: { type: 'string' },
    prod: { type: 'string' },
    repo: { type: 'string' },
    work: { type: 'string' },
    stg: { type: 'string' },
    test: { type: 'string' },
    'test-base': { type: 'string' },
    release: { type: 'string' },
    merged: { type: 'string' },
    deployed: { type: 'string' },
    comment: { type: 'string' },
  },
})

class CliError extends Error {}

const request = async <T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> => {
  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      method: init?.method,
      headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new CliError(`La API de Branch Manager no responde en ${API}. Arráncala con «npm run dev» en branch-client.`)
  }
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new CliError(data.error ?? `La API respondió ${response.status}`)
  return data
}

const print = (human: string, data: unknown) => {
  console.log(options.json ? JSON.stringify(data, null, 2) : human)
}

const requireKey = (value: string | undefined) => {
  if (!value) throw new CliError('Falta la clave del ticket (por ejemplo PSE-3117).')
  return value.toUpperCase()
}

const parseBoolean = (value: string, field: string) => {
  if (value === 'true') return true
  if (value === 'false') return false
  throw new CliError(`--${field} debe ser true o false.`)
}

const findRepository = async (value: string) => {
  const { repositories } = await request<{ repositories: Repository[] }>('/repositories')
  const repository = repositories.find((item) => String(item.id) === value || item.name === value)
  if (!repository) throw new CliError(`No existe el repositorio «${value}». Regístralo con «bm repo add».`)
  return repository
}

const describeReview = (review: Review) =>
  [
    `#${review.id} · ${review.iteration ? `iteración ${review.iteration}` : 'intento'} · ${review.role.toUpperCase()} · ${review.branch} → ${review.base}`,
    `  estado: ${review.status}${review.verdict ? ` · ${review.verdict}` : ''}${review.certified === undefined ? '' : review.certified ? ' · certificada' : ' · sin certificar'}`,
    review.summary && `  resumen: ${review.summary}`,
    ...(review.result?.findings ?? []).map((finding) => `  - [${finding.severity}] ${finding.title}`),
    review.error && `  error: ${review.error}`,
    review.outputDir && `  archivos: ${review.outputDir}`,
  ]
    .filter(Boolean)
    .join('\n')

const reviewExitCode = (review: Review) => {
  if (review.status === 'failed') return EXIT.error
  if (review.decision?.startsWith('APROBADO')) return EXIT.ok
  if (review.decision?.startsWith('RECHAZADO')) return EXIT.rejected
  return EXIT.inconclusive
}

const waitForReview = async (key: string, id: number) => {
  for (;;) {
    const { reviews } = await request<{ reviews: Review[] }>(`/reviews?${new URLSearchParams({ ticket: key })}`)
    const review = reviews.find((item) => item.id === id)
    if (!review) throw new CliError(`La revisión #${id} desapareció.`)
    if (review.status === 'done' || review.status === 'failed') return review
    if (!options.json) console.error(`… ${review.status} (${new Date().toLocaleTimeString()})`)
    await sleep(POLL_MS)
  }
}

const describeDelivery = (delivery: Delivery) => {
  const status =
    delivery.firstAttempt === true
      ? 'aprobado al primer intento'
      : delivery.firstAttempt === null
        ? 'abierto, sin correcciones'
        : `requirió ${delivery.reworks} corrección(es)`
  const pullRequests = delivery.pullRequests.map((item) => `#${item.externalId} ${item.state}`).join(', ')
  return `${delivery.ticketKey} → ${delivery.destinationBranch}: ${status} (${pullRequests})`
}

const commands: Record<string, (args: string[]) => Promise<number | void>> = {
  async health() {
    const { repositories } = await request<{ repositories: Repository[] }>('/repositories')
    print(`API activa en ${API} · ${repositories.length} repositorio(s).`, { ok: true, api: API })
  },

  async repos() {
    const { repositories } = await request<{ repositories: Repository[] }>('/repositories')
    print(
      repositories
        .map(
          (item) =>
            `${item.id}\t${item.name}\t${item.path}\tbase=${item.baseBranch} dev=${item.developmentBranch} prod=${item.productionBranch}`,
        )
        .join('\n') || 'No hay repositorios registrados.',
      repositories,
    )
  },

  async repo([action]) {
    if (action !== 'add') throw new CliError('Uso: bm repo add --name N --path P [--base] [--dev] [--prod]')
    const { repository } = await request<{ repository: Repository }>('/repositories', {
      method: 'POST',
      body: {
        name: options.name,
        path: options.path,
        baseBranch: options.base ?? 'staging',
        developmentBranch: options.dev ?? 'develop',
        productionBranch: options.prod ?? 'main',
      },
    })
    print(`Repositorio #${repository.id} ${repository.name} registrado.`, repository)
  },

  async cards() {
    const { cards } = await request<{ cards: TrackedTicket[] }>('/cards')
    print(
      cards.map((card) => `${card.key}\t${card.deployedAt ? 'producción' : 'pendiente'}\t${card.summary}`).join('\n') ||
        'No hay cards.',
      cards,
    )
  },

  async card([action, rawKey]) {
    const key = requireKey(rawKey)

    if (action === 'add') {
      const { issues } = await request<{ issues: JiraTicket[] }>(`/jira/search?${new URLSearchParams({ q: key })}`)
      const ticket = issues.find((issue) => issue.key === key)
      if (!ticket) throw new CliError(`Jira no devolvió el ticket ${key}.`)
      const { card } = await request<{ card: TrackedTicket }>('/cards', { method: 'POST', body: ticket })
      return print(`Card ${card.key} creada: ${card.summary}`, card)
    }

    if (action === 'rm') {
      await request(`/cards/${encodeURIComponent(key)}`, { method: 'DELETE' })
      return print(`Card ${key} borrada.`, { ok: true })
    }

    if (action === 'set') {
      const branches: Partial<TicketBranches> = {}
      if (options.work !== undefined) branches.work = options.work
      if (options.dev !== undefined) branches.dev = options.dev
      if (options.stg !== undefined) branches.stg = options.stg
      if (options.test !== undefined) branches.test = options.test
      if (options['test-base'] !== undefined) branches.testBase = options['test-base']
      if (options.release !== undefined) branches.hasRelease = parseBoolean(options.release, 'release')
      if (options.merged !== undefined) branches.merged = options.merged.split(',').map((item) => item.trim()).filter(Boolean)

      const changes: Record<string, unknown> = {}
      if (Object.keys(branches).length) changes.branches = branches
      if (options.repo !== undefined) {
        changes.repositoryId = options.repo === 'none' ? null : (await findRepository(options.repo)).id
      }
      if (options.deployed !== undefined) {
        changes.deployedAt = parseBoolean(options.deployed, 'deployed') ? new Date().toISOString() : null
      }
      if (options.comment !== undefined) changes.featuredCommentId = options.comment === 'none' ? null : options.comment
      if (!Object.keys(changes).length) throw new CliError('No indicaste ningún cambio para la card.')

      const { card } = await request<{ card: TrackedTicket }>(`/cards/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body: changes,
      })
      return print(`Card ${card.key} actualizada.`, card)
    }

    throw new CliError('Uso: bm card add|set|rm KEY')
  },

  async prs([rawKey]) {
    const key = requireKey(rawKey)
    const data = options.sync
      ? await request<{ deliveries: Delivery[] }>('/pull-requests/sync', { method: 'POST', body: { ticketKey: key } })
      : await request<{ deliveries: Delivery[] }>(`/pull-requests?${new URLSearchParams({ ticket: key })}`)
    print(data.deliveries.map(describeDelivery).join('\n') || `No hay PR registrados para ${key}.`, data.deliveries)
  },

  async metrics() {
    const periods =
      options.from && options.to
        ? [{ label: `${options.from} → ${options.to}`, from: options.from, to: options.to }]
        : [BASELINE_PERIOD, GOAL_PERIOD]
    if (options.sync) {
      for (const period of periods) {
        await request('/pull-requests/sync', { method: 'POST', body: { from: period.from, to: period.to } })
      }
    }
    const results = await Promise.all(
      periods.map(async (period) => ({
        period,
        metrics: (
          await request<{ metrics: DeliveryMetrics }>(
            `/metrics?${new URLSearchParams({ from: period.from, to: period.to })}`,
          )
        ).metrics,
      })),
    )
    print(
      [
        `PR aprobados sin retrabajo (meta ${formatRate(FIRST_ATTEMPT_TARGET)}):`,
        ...results.map(
          ({ period, metrics }) =>
            `  ${period.label}: ${formatRate(metrics.rate)} (${metrics.firstAttempt} de ${metrics.closed} entregas)`,
        ),
      ].join('\n'),
      results,
    )
  },

  async reviews([rawKey]) {
    const key = requireKey(rawKey)
    const { reviews } = await request<{ reviews: Review[] }>(`/reviews?${new URLSearchParams({ ticket: key })}`)
    print(reviews.map(describeReview).join('\n\n') || `No hay revisiones para ${key}.`, reviews)
  },

  async review([rawKey]) {
    const key = requireKey(rawKey)
    if (options.role !== undefined && options.role !== 'test') {
      throw new CliError('pr-review solo se corre sobre la rama -test, no sobre -dev ni -stg.')
    }

    const { review } = await request<{ review: Review }>('/reviews', { method: 'POST', body: { ticketKey: key } })
    if (!options.wait) return print(`Revisión #${review.id} en cola para ${review.branch} → ${review.base}.`, review)

    const finished = await waitForReview(key, review.id)
    print(describeReview(finished), finished)
    return reviewExitCode(finished)
  },
}

const [command, ...args] = positionals
if (options.help || !command || !commands[command]) {
  console.log(HELP)
  process.exit(command && !options.help ? EXIT.error : EXIT.ok)
}

try {
  process.exitCode = (await commands[command](args)) ?? EXIT.ok
} catch (error) {
  console.error(error instanceof CliError ? error.message : error)
  process.exitCode = EXIT.error
}
