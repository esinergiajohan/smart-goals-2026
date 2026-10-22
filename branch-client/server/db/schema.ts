import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { TicketBranches } from '../../src/types/jira.ts'

export const tickets = sqliteTable('tickets', {
  key: text('key').primaryKey(),
  summary: text('summary').notNull(),
  created: text('created').notNull(),
  updated: text('updated').notNull(),
  addedAt: text('added_at').notNull(),
  deployedAt: text('deployed_at'),
  featuredCommentId: text('featured_comment_id'),
  branches: text('branches', { mode: 'json' }).$type<Partial<TicketBranches>>(),
})
