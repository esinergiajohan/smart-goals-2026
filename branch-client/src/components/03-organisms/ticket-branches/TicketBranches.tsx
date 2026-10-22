import type { TicketBranches as TicketBranchesValue, TrackedTicket } from '../../../types/jira.ts'
import { resolveBranches } from '../../../utils/branches.ts'
import { Switch } from '../../01-atoms/switch/Switch.tsx'
import { MergedBranchList } from '../../02-molecules/merged-branch-list/MergedBranchList.tsx'
import { BranchField } from '../../02-molecules/branch-field/BranchField.tsx'
import { BranchGraph } from '../branch-graph/BranchGraph.tsx'
import './ticket-branches.scss'

interface TicketBranchesProps {
  ticket: TrackedTicket
  onChange: (branches: Partial<TicketBranchesValue>) => void
}

export function TicketBranches({ ticket, onChange }: TicketBranchesProps) {
  const branches = resolveBranches(ticket)

  return (
    <section className="ticket-branches" aria-label={`Ramas de ${ticket.key}`}>
      <div className="ticket-branches__header">
        <h4 className="ticket-branches__title">Ramas</h4>
        <Switch checked={branches.hasRelease} onChange={(hasRelease) => onChange({ hasRelease })}>
          Release
        </Switch>
      </div>

      {branches.hasRelease && <BranchGraph branches={branches} />}

      <div className="ticket-branches__fields">
        <BranchField
          role="work"
          value={branches.work}
          placeholder={`feature/${ticket.key}`}
          onChange={(work) => onChange({ work })}
        />
        {branches.hasRelease && (
          <MergedBranchList
            branches={branches.merged}
            placeholder={`feature/${ticket.key}-subtarea`}
            onChange={(merged) => onChange({ merged })}
          />
        )}
        <BranchField
          role="dev"
          value={branches.dev}
          placeholder={`feature/${ticket.key}-dev`}
          onChange={(dev) => onChange({ dev })}
        />
        <BranchField
          role="stg"
          value={branches.stg}
          placeholder={`feature/${ticket.key}-stg`}
          onChange={(stg) => onChange({ stg })}
        />
      </div>
    </section>
  )
}
