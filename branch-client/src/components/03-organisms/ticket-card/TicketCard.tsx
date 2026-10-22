import { useEffect, useRef, useState } from 'react'
import type { TrackedTicket } from '../../../types/jira.ts'
import { classNames } from '../../../utils/classNames.ts'
import { Badge } from '../../01-atoms/badge/Badge.tsx'
import { Button } from '../../01-atoms/button/Button.tsx'
import { DateTime } from '../../01-atoms/date-time/DateTime.tsx'
import { Toggle } from '../../01-atoms/toggle/Toggle.tsx'
import { ConfirmDialog } from '../../02-molecules/confirm-dialog/ConfirmDialog.tsx'
import { MetaItem } from '../../02-molecules/meta-item/MetaItem.tsx'
import './ticket-card.scss'

interface TicketCardProps {
  ticket: TrackedTicket
  focusToggle?: boolean
  onRemove: (key: string) => void
  onDeployChange: (key: string, deployed: boolean) => void
}

export function TicketCard({ ticket, focusToggle = false, onRemove, onDeployChange }: TicketCardProps) {
  const titleId = `ticket-card-${ticket.key}-title`
  const deployed = Boolean(ticket.deployedAt)
  const [confirming, setConfirming] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (focusToggle) toggleRef.current?.focus()
  }, [focusToggle])

  return (
    <article className={classNames('ticket-card', deployed && 'ticket-card--deployed')} aria-labelledby={titleId}>
      <header className="ticket-card__header">
        <Badge>{ticket.key}</Badge>
        <Button
          variant="ghost"
          className="ticket-card__remove"
          aria-label={`Borrar ${ticket.key}`}
          onClick={() => onRemove(ticket.key)}
        >
          Borrar
        </Button>
      </header>

      <h3 id={titleId} className="ticket-card__title">
        {ticket.summary}
      </h3>

      <dl className="ticket-card__meta">
        <MetaItem icon="calendar" label="Creación">
          <DateTime value={ticket.created} />
        </MetaItem>
        <MetaItem icon="pencil" label="Últ. interacción">
          <DateTime value={ticket.updated} />
        </MetaItem>
      </dl>

      <footer className="ticket-card__footer">
        <Toggle
          ref={toggleRef}
          on={deployed}
          icon="rocket"
          aria-haspopup="dialog"
          aria-describedby={titleId}
          onClick={() => setConfirming(true)}
        >
          {deployed ? '¿Rollback?' : 'Desplegado en producción'}
        </Toggle>
      </footer>

      <ConfirmDialog
        open={confirming}
        title={deployed ? `¿Hacer rollback de ${ticket.key}?` : `¿${ticket.key} ya está desplegado en producción?`}
        confirmLabel={deployed ? 'Sí, hacer rollback' : 'Sí, está en producción'}
        confirmVariant={deployed ? 'warning' : 'success'}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          onDeployChange(ticket.key, !deployed)
        }}
      >
        <p className="ticket-card__dialog-summary">{ticket.summary}</p>
        <p>
          {deployed
            ? 'Volverá a la columna «Pendientes de despliegue».'
            : 'Pasará a la columna «En producción».'}
        </p>
      </ConfirmDialog>
    </article>
  )
}
