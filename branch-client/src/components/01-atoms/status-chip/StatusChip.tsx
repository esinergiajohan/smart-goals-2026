import { classNames } from '../../../utils/classNames.ts'
import { statusTone } from '../../../utils/status.ts'
import './status-chip.scss'

interface StatusChipProps {
  status: string
}

export function StatusChip({ status }: StatusChipProps) {
  return <span className={classNames('status-chip', `status-chip--${statusTone(status)}`)}>{status}</span>
}
