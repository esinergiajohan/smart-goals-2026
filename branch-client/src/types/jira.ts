export interface JiraTicket {
  key: string
  summary: string
  created: string
  updated: string
}

export interface TrackedTicket extends JiraTicket {
  deployedAt?: string
  featuredCommentId?: string
  branches?: Partial<TicketBranches>
}

export interface PendingComment {
  author: string
  excerpt: string
  url: string
}

export interface ActiveTicket {
  key: string
  summary: string
  status: string
  projectKey: string
  projectName: string
  url: string
  pendingComment: PendingComment | null
}

export type BranchRole = 'work' | 'dev' | 'stg'

export interface TicketBranches {
  work: string
  dev: string
  stg: string
  merged: string[]
  hasRelease: boolean
}

export interface TicketStatus {
  name: string
  category: string
}

export interface FeaturedComment {
  author: string
  created: string
  text: string
  url: string
}
