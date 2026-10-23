export type PlanStatus = 'queued' | 'running' | 'done' | 'failed'

export interface PlanContent {
  ticket_type: 'Bug' | 'Preventivo' | 'Evolutivo' | 'Ajuste' | 'No seguro'
  summary: string
  acceptance_criteria: Array<{ criterion: string; source: 'ticket' | 'historia' | 'comentario' | 'inferido' }>
  questions: Array<{ question: string; to: string; reason: string }>
  scope_in: string[]
  scope_out: string[]
  affected_areas: Array<{ location: string; reason: string }>
  approach: string[]
  risks: Array<{ risk: string; mitigation: string }>
  deploy_expectation: string
  qa_checks: string[]
  pr_review_watchpoints: string[]
}

export interface Plan {
  id: number
  ticketKey: string
  repositoryId?: number
  status: PlanStatus
  content?: PlanContent
  error?: string
  jiraCommentId?: string
  jiraCommentUrl?: string
  createdAt: string
  finishedAt?: string
}
