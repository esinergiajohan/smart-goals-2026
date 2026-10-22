export interface JiraTicket {
  key: string
  summary: string
  created: string
  updated: string
}

export interface TrackedTicket extends JiraTicket {
  deployedAt?: string
}
