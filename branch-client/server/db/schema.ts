import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import type { ReviewResult, ReviewRole, ReviewStatus } from '../../src/types/review.ts'
import type { TicketBranches } from '../../src/types/jira.ts'
import type { PullRequestState } from '../../src/types/pullRequest.ts'

export const repositories = sqliteTable('repositories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  path: text('path').notNull().unique(),
  baseBranch: text('base_branch').notNull(),
  developmentBranch: text('development_branch').notNull(),
  productionBranch: text('production_branch').notNull(),
  createdAt: text('created_at').notNull(),
})

export const tickets = sqliteTable('tickets', {
  key: text('key').primaryKey(),
  summary: text('summary').notNull(),
  created: text('created').notNull(),
  updated: text('updated').notNull(),
  addedAt: text('added_at').notNull(),
  deployedAt: text('deployed_at'),
  featuredCommentId: text('featured_comment_id'),
  branches: text('branches', { mode: 'json' }).$type<Partial<TicketBranches>>(),
  repositoryId: integer('repository_id').references(() => repositories.id, { onDelete: 'set null' }),
})

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketKey: text('ticket_key').notNull(),
  repositoryId: integer('repository_id')
    .notNull()
    .references(() => repositories.id),
  role: text('role').$type<ReviewRole>().notNull(),
  branch: text('branch').notNull(),
  base: text('base').notNull(),
  status: text('status').$type<ReviewStatus>().notNull(),
  mode: text('mode').$type<'review' | 'recheck'>(),
  iteration: integer('iteration'),
  previousReviewId: integer('previous_review_id'),
  outputDir: text('output_dir'),
  commitSha: text('commit_sha'),
  decision: text('decision'),
  verdict: text('verdict'),
  summary: text('summary'),
  result: text('result', { mode: 'json' }).$type<ReviewResult>(),
  developerComment: text('developer_comment'),
  certified: integer('certified', { mode: 'boolean' }),
  certificationError: text('certification_error'),
  error: text('error'),
  costUsd: real('cost_usd'),
  createdAt: text('created_at').notNull(),
  startedAt: text('started_at'),
  finishedAt: text('finished_at'),
})

export const pullRequests = sqliteTable(
  'pull_requests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    repositoryId: integer('repository_id')
      .notNull()
      .references(() => repositories.id),
    externalId: integer('external_id').notNull(),
    ticketKey: text('ticket_key'),
    title: text('title').notNull(),
    sourceBranch: text('source_branch').notNull(),
    destinationBranch: text('destination_branch').notNull(),
    state: text('state').$type<PullRequestState>().notNull(),
    url: text('url').notNull(),
    authorId: text('author_id').notNull(),
    createdAt: text('created_at').notNull(),
    closedAt: text('closed_at'),
    approvedBy: text('approved_by', { mode: 'json' }).$type<string[]>().notNull(),
    changesRequested: integer('changes_requested').notNull(),
    pushesAfterOpen: integer('pushes_after_open').notNull(),
    syncedAt: text('synced_at').notNull(),
  },
  (table) => [uniqueIndex('pull_requests_repository_external').on(table.repositoryId, table.externalId)],
)
