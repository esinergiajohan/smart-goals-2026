import type { ReactNode } from 'react'
import './dashboard.scss'

interface DashboardTemplateProps {
  title: string
  search: ReactNode
  children: ReactNode
}

export function DashboardTemplate({ title, search, children }: DashboardTemplateProps) {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="visually-hidden">{title}</h1>
        <div className="dashboard__search">{search}</div>
      </header>
      <main className="dashboard__content">{children}</main>
    </div>
  )
}
