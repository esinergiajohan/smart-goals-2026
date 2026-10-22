import type { CSSProperties } from 'react'
import './project-badge.scss'

interface ProjectBadgeProps {
  projectKey: string
  name?: string
}

const hueFor = (projectKey: string) => {
  let hash = 0
  for (const char of projectKey) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

export function ProjectBadge({ projectKey, name }: ProjectBadgeProps) {
  return (
    <span
      className="project-badge"
      style={{ '--project-hue': hueFor(projectKey) } as CSSProperties}
      title={name || undefined}
    >
      {projectKey}
    </span>
  )
}
