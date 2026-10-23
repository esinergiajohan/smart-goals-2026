import type { TicketStatus, TrackedTicket } from '../../../types/jira.ts'
import type { JoinedBranch } from '../../../types/release.ts'
import { classNames } from '../../../utils/classNames.ts'
import { BRANCH_ORIGIN_LABELS, JOIN_METHOD_LABELS } from '../../../utils/releases.ts'
import { statusTone } from '../../../utils/status.ts'
import './mini-ticket-card.scss'

interface MiniTicketCardProps {
  ticket: TrackedTicket
  status?: TicketStatus
  commits?: number
  branches: JoinedBranch[]
  selected: boolean
  controls: string
  onSelect: () => void
}

const joinLabel = (branch: JoinedBranch) =>
  branch.joined === 0
    ? 'sin unir'
    : branch.joined < branch.commits
      ? `${JOIN_METHOD_LABELS[branch.method]} ${branch.joined}/${branch.commits}`
      : JOIN_METHOD_LABELS[branch.method]

export function MiniTicketCard({ ticket, status, commits, branches, selected, controls, onSelect }: MiniTicketCardProps) {
  const tone = status ? statusTone(status.name, status.category) : 'unknown'
  const fromMain = branches.some((branch) => branch.origin === 'main' && branch.joined > 0)

  return (
    <button
      type="button"
      className={classNames(
        'mini-ticket-card',
        `mini-ticket-card--${tone}`,
        fromMain && 'mini-ticket-card--from-main',
        selected && 'mini-ticket-card--selected',
      )}
      aria-expanded={selected}
      aria-controls={controls}
      title={ticket.summary}
      onClick={onSelect}
    >
      <span className="mini-ticket-card__header">
        <span className="mini-ticket-card__key">{ticket.key}</span>
        <span className="mini-ticket-card__status">{status?.name ?? 'Estado…'}</span>
      </span>

      <span className="mini-ticket-card__footer">
        {commits === undefined ? (
          <span className="mini-ticket-card__chip">…</span>
        ) : (
          <span className={classNames('mini-ticket-card__chip', !commits && 'mini-ticket-card__chip--missing')}>
            {commits ? `${commits} ${commits === 1 ? 'commit' : 'commits'}` : 'sin commits'}
          </span>
        )}
        {branches.map((branch) => (
          <span
            key={branch.name}
            className={classNames(
              'mini-ticket-card__chip',
              `mini-ticket-card__chip--${branch.origin}`,
              !branch.joined && 'mini-ticket-card__chip--pending',
            )}
            title={`${branch.name}: ${joinLabel(branch)}, ${BRANCH_ORIGIN_LABELS[branch.origin]}`}
          >
            {joinLabel(branch)}
          </span>
        ))}
      </span>
    </button>
  )
}
