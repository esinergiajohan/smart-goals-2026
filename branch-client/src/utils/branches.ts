import type { BranchRole, TicketBranches, TrackedTicket } from '../types/jira.ts'

export const BRANCH_ROLE_LABELS: Record<BranchRole, string> = {
  work: 'Trabajo',
  dev: 'DEV',
  stg: 'STG',
}

export const resolveBranches = (ticket: TrackedTicket): TicketBranches => ({
  work: `feature/${ticket.key}`,
  dev: `feature/${ticket.key}-dev`,
  stg: `feature/${ticket.key}-stg`,
  merged: [],
  hasRelease: false,
  ...ticket.branches,
})
