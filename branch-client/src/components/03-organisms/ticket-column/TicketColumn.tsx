import { useId } from 'react'
import type { TicketBranches, TicketStatus, TrackedTicket } from '../../../types/jira.ts'
import { classNames } from '../../../utils/classNames.ts'
import { TicketCard } from '../ticket-card/TicketCard.tsx'
import './ticket-column.scss'

interface TicketColumnProps {
  title: string
  tone: 'pending' | 'deployed'
  tickets: TrackedTicket[]
  statuses: Record<string, TicketStatus>
  emptyMessage: string
  error?: string
  focusKey?: string
  onRemove: (key: string) => void
  onDeployChange: (key: string, deployed: boolean) => void
  onBranchesChange: (key: string, branches: Partial<TicketBranches>) => void
  onFeaturedCommentChange: (key: string, commentId: string | undefined) => void
}

export function TicketColumn({
  title,
  tone,
  tickets,
  statuses,
  emptyMessage,
  error,
  focusKey,
  onRemove,
  onDeployChange,
  onBranchesChange,
  onFeaturedCommentChange,
}: TicketColumnProps) {
  const headingId = useId()

  return (
    <section className={classNames('ticket-column', `ticket-column--${tone}`)} aria-labelledby={headingId}>
      <h2 id={headingId} className="ticket-column__title">
        {title}
        <span className="ticket-column__count">
          {tickets.length}
          <span className="visually-hidden"> {tickets.length === 1 ? 'ticket' : 'tickets'}</span>
        </span>
      </h2>

      {error && (
        <p role="alert" className="ticket-column__empty ticket-column__empty--error">
          {error}
        </p>
      )}

      {tickets.length ? (
        <ul role="list" className="ticket-column__list">
          {tickets.map((ticket) => (
            <li key={ticket.key}>
              <TicketCard
                ticket={ticket}
                status={statuses[ticket.key]}
                focusToggle={ticket.key === focusKey}
                onRemove={onRemove}
                onDeployChange={onDeployChange}
                onBranchesChange={onBranchesChange}
                onFeaturedCommentChange={onFeaturedCommentChange}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ticket-column__empty">{emptyMessage}</p>
      )}
    </section>
  )
}
