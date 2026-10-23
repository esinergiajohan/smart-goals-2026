import { useId, useState, type ReactNode } from 'react'
import { useReleaseGraph } from '../../../hooks/useReleaseGraph.ts'
import type { TicketStatus, TrackedTicket } from '../../../types/jira.ts'
import type { ReleaseGroup } from '../../../types/release.ts'
import { classNames } from '../../../utils/classNames.ts'
import { parseCommentUrl } from '../../../utils/commentUrl.ts'
import { BRANCH_ORIGIN_LABELS, familyOf, mixedBranches, releaseFamily } from '../../../utils/releases.ts'
import { Button } from '../../01-atoms/button/Button.tsx'
import { Icon } from '../../01-atoms/icon/Icon.tsx'
import { Input } from '../../01-atoms/input/Input.tsx'
import { Toggle } from '../../01-atoms/toggle/Toggle.tsx'
import { ConfirmDialog } from '../../02-molecules/confirm-dialog/ConfirmDialog.tsx'
import { Modal } from '../../02-molecules/modal/Modal.tsx'
import { ReleaseGraph } from '../release-graph/ReleaseGraph.tsx'
import './release-card.scss'

interface ReleaseCardProps {
  group: ReleaseGroup
  tickets: TrackedTicket[]
  statuses: Record<string, TicketStatus>
  repositoryName?: string
  focusKey?: string
  renderTicket: (ticket: TrackedTicket, focus: boolean) => ReactNode
  onDeployChange: (key: string, deployed: boolean) => void
  onClosureChange: (key: string, closureCommentUrl: string | undefined) => void
}

export function ReleaseCard({
  group,
  tickets,
  statuses,
  repositoryName,
  focusKey,
  renderTicket,
  onDeployChange,
  onClosureChange,
}: ReleaseCardProps) {
  const titleId = useId()
  const bodyId = useId()
  const urlId = useId()
  const urlErrorId = useId()
  const { graph, error, loading, refresh } = useReleaseGraph(group)
  const isMember = (key?: string) => Boolean(key && group.ticketKeys.includes(key))
  const [selected, setSelected] = useState(isMember(focusKey) ? focusKey : undefined)
  const [lastFocus, setLastFocus] = useState(focusKey)
  const [closing, setClosing] = useState<string>()
  const [closureDraft, setClosureDraft] = useState('')
  const [closureError, setClosureError] = useState<string>()
  const [confirmingDeploy, setConfirmingDeploy] = useState(false)
  const [open, setOpen] = useState(false)

  if (focusKey !== lastFocus) {
    setLastFocus(focusKey)
    if (isMember(focusKey)) setSelected(focusKey)
  }

  const selectedTicket = tickets.find((ticket) => ticket.key === selected)
  const mixed = graph ? mixedBranches(graph) : []
  const closures = Object.fromEntries(tickets.map((ticket) => [ticket.key, ticket.closureCommentUrl]))
  const unfinished = tickets.filter((ticket) => statuses[ticket.key]?.category !== 'done' && !ticket.closureCommentUrl)
  const deployed = tickets.every((ticket) => ticket.deployedAt)

  const handleClosureChange = (key: string, closing: boolean) => {
    if (!closing) return onClosureChange(key, undefined)
    setClosureDraft('')
    setClosureError(undefined)
    setClosing(key)
  }

  const confirmClosure = () => {
    if (!closing) return
    const link = parseCommentUrl(closureDraft)
    if (!link) return setClosureError('Pega el enlace de un comentario de Jira (debe traer focusedCommentId).')
    if (link.key !== closing) return setClosureError(`Ese comentario es de ${link.key}, no de ${closing}.`)
    onClosureChange(closing, closureDraft.trim())
    setClosing(undefined)
  }

  const confirmDeploy = () => {
    setConfirmingDeploy(false)
    tickets.forEach((ticket) => onDeployChange(ticket.key, !deployed))
  }

  return (
    <article className={classNames('release-card', !open && 'release-card--collapsed')} aria-labelledby={titleId}>
      <header className="release-card__header">
        <span className="release-card__tag">Release</span>
        {repositoryName && <span className="release-card__repo">{repositoryName}</span>}
        <Button variant="ghost" className="release-card__refresh" disabled={loading} onClick={refresh}>
          {loading ? 'Analizando…' : 'Actualizar'}
        </Button>
      </header>

      <h3 id={titleId} className="release-card__title">
        <button
          type="button"
          className="release-card__toggle"
          aria-expanded={open}
          aria-controls={open ? bodyId : undefined}
          onClick={() => setOpen((current) => !current)}
        >
          {group.branch}
          <Icon name="chevron" className="release-card__chevron" />
        </button>
      </h3>

      {!open && (
        <p className="release-card__summary">
          {tickets.length} cards ·{' '}
          {deployed
            ? 'desplegada'
            : unfinished.length
              ? `faltan ${unfinished.length} por finalizar`
              : 'lista para desplegar'}
        </p>
      )}

      {graph && mixed.length > 0 && (
        <p role="alert" className="release-card__alert">
          Mezcla de bases: la release es de la familia {releaseFamily(graph)} y{' '}
          {mixed.length === 1 ? 'esta rama viene' : 'estas ramas vienen'} de otra:{' '}
          {mixed.map((branch) => `${branch.name} (${BRANCH_ORIGIN_LABELS[branch.origin]}, familia ${familyOf(branch.origin)})`).join(', ')}.
        </p>
      )}

      {error && (
        <p role="alert" className="release-card__alert">
          {error}
        </p>
      )}

      {open && (
        <div id={bodyId} className="release-card__body">
          {graph ? (
            <ReleaseGraph
              graph={graph}
              ticketKeys={group.ticketKeys}
              statuses={statuses}
              selected={selected}
              closures={closures}
              onSelect={setSelected}
              onClosureChange={handleClosureChange}
            />
          ) : (
            !error && <p className="release-card__loading">Analizando las ramas de la release…</p>
          )}

          <footer className="release-card__footer">
            {deployed || !unfinished.length ? (
              <Toggle
                on={deployed}
                icon="rocket"
                aria-haspopup="dialog"
                aria-describedby={titleId}
                onClick={() => setConfirmingDeploy(true)}
              >
                {deployed ? '¿Rollback de la release?' : 'Desplegado en producción'}
              </Toggle>
            ) : (
              <p className="release-card__pending">
                Para desplegar, faltan por finalizar: {unfinished.map((ticket) => ticket.key).join(', ')}.
              </p>
            )}
          </footer>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDeploy}
        title={deployed ? `¿Hacer rollback de ${group.branch}?` : `¿${group.branch} ya está desplegada en producción?`}
        confirmLabel={deployed ? 'Sí, hacer rollback' : 'Sí, está en producción'}
        confirmVariant={deployed ? 'warning' : 'success'}
        onCancel={() => setConfirmingDeploy(false)}
        onConfirm={confirmDeploy}
      >
        <p>
          {deployed
            ? `Los ${tickets.length} tickets volverán a la columna «Pendientes de despliegue».`
            : `Los ${tickets.length} tickets pasarán a la columna «En producción».`}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(closing)}
        title={`¿Dar por finalizada ${closing ?? ''}?`}
        confirmLabel="Dar por finalizada"
        onCancel={() => setClosing(undefined)}
        onConfirm={confirmClosure}
      >
        <p>
          Cuenta como finalizada para desplegar la release aunque Jira diga «{closing ? statuses[closing]?.name : ''}».
          Pega el enlace del comentario de Jira donde lo justificas.
        </p>
        <label htmlFor={urlId} className="release-card__label">
          Enlace del comentario
        </label>
        <Input
          id={urlId}
          inputMode="url"
          autoComplete="off"
          value={closureDraft}
          placeholder="https://…atlassian.net/browse/…?focusedCommentId=…"
          aria-invalid={Boolean(closureError)}
          aria-describedby={closureError ? urlErrorId : undefined}
          onChange={(event) => setClosureDraft(event.target.value)}
        />
        {closureError && (
          <p id={urlErrorId} role="alert" className="release-card__error">
            {closureError}
          </p>
        )}
      </ConfirmDialog>

      <Modal
        open={Boolean(selectedTicket)}
        title={selectedTicket ? `Card completa de ${selectedTicket.key}` : ''}
        onClose={() => setSelected(undefined)}
      >
        {selectedTicket && renderTicket(selectedTicket, selectedTicket.key === focusKey)}
      </Modal>
    </article>
  )
}
