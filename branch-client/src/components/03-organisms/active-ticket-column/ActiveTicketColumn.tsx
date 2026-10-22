import { useId } from 'react'
import type { ActiveTicket } from '../../../types/jira.ts'
import { ActiveTicketCard } from '../active-ticket-card/ActiveTicketCard.tsx'
import './active-ticket-column.scss'

interface ActiveTicketColumnProps {
  title: string
  tickets: ActiveTicket[]
  loading: boolean
  error?: string
  emptyMessage: string
}

export function ActiveTicketColumn({ title, tickets, loading, error, emptyMessage }: ActiveTicketColumnProps) {
  const headingId = useId()

  return (
    <section className="active-ticket-column" aria-labelledby={headingId} aria-busy={loading}>
      <h2 id={headingId} className="active-ticket-column__title">
        {title}
        <span className="active-ticket-column__count">
          {tickets.length}
          <span className="visually-hidden"> {tickets.length === 1 ? 'ticket' : 'tickets'}</span>
        </span>
      </h2>

      {error ? (
        <p role="alert" className="active-ticket-column__message active-ticket-column__message--error">
          {error}
        </p>
      ) : loading ? (
        <p role="status" className="active-ticket-column__message">
          Cargando tickets…
        </p>
      ) : tickets.length ? (
        <ul role="list" className="active-ticket-column__list">
          {tickets.map((ticket) => (
            <li key={ticket.key}>
              <ActiveTicketCard ticket={ticket} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="active-ticket-column__message">{emptyMessage}</p>
      )}
    </section>
  )
}
