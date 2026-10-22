import type { TicketStatus } from '../../../types/jira.ts'
import { classNames } from '../../../utils/classNames.ts'
import { statusTone } from '../../../utils/status.ts'
import './status-strip.scss'

interface StatusStripProps {
  status?: TicketStatus
}

export function StatusStrip({ status }: StatusStripProps) {
  const tone = status ? statusTone(status.name, status.category) : 'unknown'

  return (
    <div className={classNames('status-strip', `status-strip--${tone}`)} title={status?.name}>
      <span className="visually-hidden">Estado: </span>
      <span className="status-strip__label">{status?.name ?? 'Estado…'}</span>
    </div>
  )
}
