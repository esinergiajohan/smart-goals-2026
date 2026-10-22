import { useId, useState } from 'react'
import { useReviews } from '../../../hooks/useReviews.ts'
import type { RepositoryDraft } from '../../../services/repositories.ts'
import type { TrackedTicket } from '../../../types/jira.ts'
import type { Repository, ReviewRole } from '../../../types/review.ts'
import { BRANCH_ROLE_LABELS, resolveBranches } from '../../../utils/branches.ts'
import { Button } from '../../01-atoms/button/Button.tsx'
import { RepositoryForm } from '../../02-molecules/repository-form/RepositoryForm.tsx'
import { ReviewIteration } from '../../02-molecules/review-iteration/ReviewIteration.tsx'
import './ticket-review.scss'

const ROLES: ReviewRole[] = ['stg', 'dev']
const ADD_REPOSITORY = 'add'

interface TicketReviewProps {
  ticket: TrackedTicket
  repositories: Repository[]
  onRepositoryChange: (repositoryId: number | undefined) => void
  onAddRepository: (draft: RepositoryDraft) => Promise<Repository>
}

export function TicketReview({ ticket, repositories, onRepositoryChange, onAddRepository }: TicketReviewProps) {
  const headingId = useId()
  const selectId = useId()
  const [adding, setAdding] = useState(false)
  const { reviews, active, error, start } = useReviews(ticket.key)
  const branches = resolveBranches(ticket)
  const repository = repositories.find((item) => item.id === ticket.repositoryId)
  const baseFor = (role: ReviewRole) => (role === 'stg' ? repository?.baseBranch : repository?.developmentBranch)

  const handleRepositoryChange = (value: string) => {
    if (value === ADD_REPOSITORY) {
      setAdding(true)
      return
    }
    onRepositoryChange(value ? Number(value) : undefined)
  }

  const handleAddRepository = async (draft: RepositoryDraft) => {
    const created = await onAddRepository(draft)
    setAdding(false)
    onRepositoryChange(created.id)
  }

  return (
    <section className="ticket-review" aria-labelledby={headingId}>
      <h4 id={headingId} className="ticket-review__title">
        Revisión local · pr-review
      </h4>

      <div className="ticket-review__repository">
        <label htmlFor={selectId} className="ticket-review__label">
          Repositorio
        </label>
        <select
          id={selectId}
          className="ticket-review__select"
          value={adding ? ADD_REPOSITORY : (ticket.repositoryId ?? '')}
          onChange={(event) => handleRepositoryChange(event.target.value)}
        >
          <option value="">Sin asignar</option>
          {repositories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          <option value={ADD_REPOSITORY}>+ Agregar repositorio…</option>
        </select>
      </div>

      {adding && <RepositoryForm onSubmit={handleAddRepository} onCancel={() => setAdding(false)} />}

      {repository && !adding && (
        <ul role="list" className="ticket-review__targets">
          {ROLES.map((role) => (
            <li key={role} className={`ticket-review__target ticket-review__target--${role}`}>
              <span className="ticket-review__role">{BRANCH_ROLE_LABELS[role]}</span>
              <code className="ticket-review__branch">
                {branches[role]} → {baseFor(role)}
              </code>
              <Button
                disabled={active}
                aria-label={`Revisar ${branches[role]} hacia ${baseFor(role)}`}
                onClick={() => start(role)}
              >
                Revisar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="ticket-review__error">
          {error}
        </p>
      )}

      {reviews.length > 0 && (
        <ol role="list" className="ticket-review__history" aria-label={`Revisiones de ${ticket.key}`}>
          {[...reviews].reverse().map((review) => (
            <li key={review.id}>
              <ReviewIteration review={review} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
