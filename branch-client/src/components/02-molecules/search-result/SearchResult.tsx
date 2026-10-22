import type { JiraTicket } from '../../../types/jira.ts'
import { classNames } from '../../../utils/classNames.ts'
import { Badge } from '../../01-atoms/badge/Badge.tsx'
import './search-result.scss'

interface SearchResultProps {
  id: string
  ticket: JiraTicket
  active: boolean
  onSelect: (ticket: JiraTicket) => void
}

export function SearchResult({ id, ticket, active, onSelect }: SearchResultProps) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={classNames('search-result', active && 'search-result--active')}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(ticket)}
    >
      <Badge>{ticket.key}</Badge>
      <span className="search-result__summary">{ticket.summary}</span>
    </li>
  )
}
