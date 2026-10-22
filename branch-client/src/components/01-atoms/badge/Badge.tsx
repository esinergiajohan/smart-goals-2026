import type { ReactNode } from 'react'
import './badge.scss'

interface BadgeProps {
  children: ReactNode
}

export function Badge({ children }: BadgeProps) {
  return <span className="badge">{children}</span>
}
