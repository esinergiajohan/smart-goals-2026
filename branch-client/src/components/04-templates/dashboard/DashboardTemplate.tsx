import type { ReactNode } from 'react'
import './dashboard.scss'

interface DashboardTemplateProps {
  title: string
  search: ReactNode
  legend?: ReactNode
  summary?: ReactNode
  children: ReactNode
}

export function DashboardTemplate({ title, search, legend, summary, children }: DashboardTemplateProps) {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="visually-hidden">{title}</h1>
        <div className="dashboard__search">{search}</div>
        <nav className="dashboard__nav" aria-label="Páginas">
          <a className="dashboard__link dashboard__link--primary" href="/informe">
            Informe
          </a>
          <a className="dashboard__link" href="/documentacion">
            Documentación
          </a>
        </nav>
      </header>
      {legend && <div className="dashboard__legend">{legend}</div>}
      {summary && <div className="dashboard__summary">{summary}</div>}
      <main className="dashboard__content">{children}</main>
    </div>
  )
}
