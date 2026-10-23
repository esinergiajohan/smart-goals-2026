import type { ReactNode } from 'react'
import './dashboard.scss'

interface DashboardTemplateProps {
  title: string
  search: ReactNode
  summary?: ReactNode
  children: ReactNode
}

export function DashboardTemplate({ title, search, summary, children }: DashboardTemplateProps) {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="visually-hidden">{title}</h1>
        <div className="dashboard__search">{search}</div>
      </header>
      {summary && <div className="dashboard__summary">{summary}</div>}
      <main className="dashboard__content">{children}</main>
    </div>
  )
}
