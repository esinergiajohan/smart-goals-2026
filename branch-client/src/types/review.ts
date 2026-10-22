export type ReviewRole = 'test' | 'dev' | 'stg'

export type ReviewStatus = 'queued' | 'running' | 'done' | 'failed'

export interface ReviewFinding {
  severity: string
  title: string
  location?: string
  evidence: string
  impact: string
  recommendation: string
  suggested_change?: string
  blocks_staging?: boolean
}

export interface ReviewQuestion {
  question?: string
  [field: string]: unknown
}

export interface ReviewResult {
  schema_version?: string
  decision: string
  verdict: string
  summary: string
  ticket_type?: string
  findings: ReviewFinding[]
  risks: unknown[]
  questions: ReviewQuestion[]
  scope_boundary: unknown[]
  qa_tests?: string[]
  main_promotion: Record<string, unknown>
  [field: string]: unknown
}

export interface Repository {
  id: number
  name: string
  path: string
  baseBranch: string
  developmentBranch: string
  productionBranch: string
}

export interface Review {
  id: number
  ticketKey: string
  repositoryId: number
  role: ReviewRole
  branch: string
  base: string
  status: ReviewStatus
  mode?: 'review' | 'recheck'
  iteration?: number
  outputDir?: string
  commitSha?: string
  decision?: string
  verdict?: string
  summary?: string
  result?: ReviewResult
  developerComment?: string
  certified?: boolean
  certificationError?: string
  error?: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
}
