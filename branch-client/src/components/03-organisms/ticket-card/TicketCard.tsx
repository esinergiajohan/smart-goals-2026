import { useEffect, useId, useRef, useState } from 'react'
import { usePullRequests } from '../../../hooks/usePullRequests.ts'
import type { RepositoryDraft } from '../../../services/repositories.ts'
import type { TicketBranches, TicketStatus, TrackedTicket } from '../../../types/jira.ts'
import type { Repository } from '../../../types/review.ts'
import { classNames } from '../../../utils/classNames.ts'
import { Badge } from '../../01-atoms/badge/Badge.tsx'
import { Button } from '../../01-atoms/button/Button.tsx'
import { DateTime } from '../../01-atoms/date-time/DateTime.tsx'
import { Icon } from '../../01-atoms/icon/Icon.tsx'
import { StatusStrip } from '../../01-atoms/status-strip/StatusStrip.tsx'
import { Toggle } from '../../01-atoms/toggle/Toggle.tsx'
import { ConfirmDialog } from '../../02-molecules/confirm-dialog/ConfirmDialog.tsx'
import { DeliveryBadges } from '../../02-molecules/delivery-badges/DeliveryBadges.tsx'
import { MetaItem } from '../../02-molecules/meta-item/MetaItem.tsx'
import { FeaturedComment } from '../featured-comment/FeaturedComment.tsx'
import { TicketBranches as TicketBranchesPanel } from '../ticket-branches/TicketBranches.tsx'
import { TicketPlan } from '../ticket-plan/TicketPlan.tsx'
import { TicketReview } from '../ticket-review/TicketReview.tsx'
import './ticket-card.scss'

interface TicketCardProps {
  ticket: TrackedTicket
  status?: TicketStatus
  repositories: Repository[]
  focusToggle?: boolean
  collapsible?: boolean
  onRemove: (key: string) => void
  onDeployChange: (key: string, deployed: boolean) => void
  onBranchesChange: (key: string, branches: Partial<TicketBranches>) => void
  onFeaturedCommentChange: (key: string, commentId: string | undefined) => void
  onRepositoryChange: (key: string, repositoryId: number | undefined) => void
  onAddRepository: (draft: RepositoryDraft) => Promise<Repository>
}

export function TicketCard({
  ticket,
  status,
  repositories,
  focusToggle = false,
  collapsible = false,
  onRemove,
  onDeployChange,
  onBranchesChange,
  onFeaturedCommentChange,
  onRepositoryChange,
  onAddRepository,
}: TicketCardProps) {
  const titleId = `ticket-card-${ticket.key}-title`
  const bodyId = useId()
  const deployed = Boolean(ticket.deployedAt)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const pullRequests = usePullRequests(ticket.key, Boolean(ticket.repositoryId))
  const [open, setOpen] = useState(!collapsible || focusToggle)
  const [lastFocus, setLastFocus] = useState(focusToggle)

  if (focusToggle !== lastFocus) {
    setLastFocus(focusToggle)
    if (focusToggle) setOpen(true)
  }

  useEffect(() => {
    if (focusToggle) toggleRef.current?.focus()
  }, [focusToggle])

  return (
    <article
      className={classNames('ticket-card', deployed && 'ticket-card--deployed', !open && 'ticket-card--collapsed')}
      aria-labelledby={titleId}
    >
      <StatusStrip status={status} />
      <header className="ticket-card__header">
        <Badge>{ticket.key}</Badge>
        <Button
          variant="ghost"
          className="ticket-card__remove"
          aria-label={`Borrar ${ticket.key}`}
          aria-haspopup="dialog"
          onClick={() => setRemoving(true)}
        >
          Borrar
        </Button>
      </header>

      <h3 id={titleId} className="ticket-card__title">
        {collapsible ? (
          <button
            type="button"
            className="ticket-card__toggle"
            aria-expanded={open}
            aria-controls={open ? bodyId : undefined}
            onClick={() => setOpen((current) => !current)}
          >
            {ticket.summary}
            <Icon name="chevron" className="ticket-card__chevron" />
          </button>
        ) : (
          ticket.summary
        )}
      </h3>

      {open && (
        <div id={bodyId} className="ticket-card__body">
          <dl className="ticket-card__meta">
            <MetaItem icon="calendar" label="Creación">
              <DateTime value={ticket.created} />
            </MetaItem>
            <MetaItem icon="pencil" label="Últ. interacción">
              <DateTime value={ticket.updated} />
            </MetaItem>
          </dl>

          <FeaturedComment
            ticketKey={ticket.key}
            commentId={ticket.featuredCommentId}
            onChange={(commentId) => onFeaturedCommentChange(ticket.key, commentId)}
          />

          <TicketPlan ticketKey={ticket.key} />

          <TicketBranchesPanel ticket={ticket} onChange={(branches) => onBranchesChange(ticket.key, branches)} />

          <TicketReview
            ticket={ticket}
            repositories={repositories}
            onRepositoryChange={(repositoryId) => onRepositoryChange(ticket.key, repositoryId)}
            onAddRepository={onAddRepository}
          />

          <DeliveryBadges deliveries={pullRequests.deliveries} error={pullRequests.error} />

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
        </div>
      )}

      <ConfirmDialog
        open={removing}
        title={`¿Borrar la card ${ticket.key}?`}
        confirmLabel="Sí, borrar"
        confirmVariant="warning"
        onCancel={() => setRemoving(false)}
        onConfirm={() => {
          setRemoving(false)
          onRemove(ticket.key)
        }}
      >
        <p className="ticket-card__dialog-summary">{ticket.summary}</p>
        <p>
          Se pierden las ramas, el comentario destacado y la justificación de cierre que guardaste en esta card. El
          ticket sigue en Jira.
        </p>
      </ConfirmDialog>

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
