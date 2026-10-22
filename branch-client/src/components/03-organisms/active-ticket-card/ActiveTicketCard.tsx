import type { ActiveTicket } from '../../../types/jira.ts'
import { classNames } from '../../../utils/classNames.ts'
import { truncate } from '../../../utils/truncate.ts'
import { Icon } from '../../01-atoms/icon/Icon.tsx'
import { ProjectBadge } from '../../01-atoms/project-badge/ProjectBadge.tsx'
import { StatusChip } from '../../01-atoms/status-chip/StatusChip.tsx'
import './active-ticket-card.scss'

const COMMENT_PREVIEW_LENGTH = 80

interface ActiveTicketCardProps {
  ticket: ActiveTicket
}

export function ActiveTicketCard({ ticket }: ActiveTicketCardProps) {
  const titleId = `active-ticket-${ticket.key}-title`

  return (
    <article
      className={classNames('active-ticket-card', ticket.pendingComment && 'active-ticket-card--urgent')}
      aria-labelledby={titleId}
    >
      <header className="active-ticket-card__header">
        <ProjectBadge projectKey={ticket.projectKey} name={ticket.projectName} />
        <StatusChip status={ticket.status} />
      </header>

      <h3 id={titleId} className="active-ticket-card__title">
        <a
          className="active-ticket-card__key"
          href={ticket.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ticket.key}
          <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
        </a>{' '}
        {ticket.summary}
      </h3>

      {ticket.pendingComment && (
        <a
          className="active-ticket-card__comment"
          href={ticket.pendingComment.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="active-ticket-card__author">
            <Icon name="alert" />
            <span className="visually-hidden">Comentario sin responder de </span>
            {ticket.pendingComment.author}
          </span>
          <span className="active-ticket-card__excerpt">
            {truncate(ticket.pendingComment.excerpt, COMMENT_PREVIEW_LENGTH)}
          </span>
          <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
        </a>
      )}
    </article>
  )
}
