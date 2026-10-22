import type { Review } from '../../../types/review.ts'
import { BRANCH_ROLE_LABELS } from '../../../utils/branches.ts'
import { classNames } from '../../../utils/classNames.ts'
import { reviewTone } from '../../../utils/review.ts'
import { DateTime } from '../../01-atoms/date-time/DateTime.tsx'
import './review-iteration.scss'

interface ReviewIterationProps {
  review: Review
}

const STATUS_LABELS: Record<Review['status'], string> = {
  queued: 'En cola',
  running: 'Revisando…',
  done: '',
  failed: 'Falló',
}

export function ReviewIteration({ review }: ReviewIterationProps) {
  const tone = reviewTone(review)
  const findings = review.result?.findings ?? []
  const questions = review.result?.questions ?? []

  return (
    <details className={classNames('review-iteration', `review-iteration--${tone}`)}>
      <summary className="review-iteration__summary">
        <span className="review-iteration__label">
          {review.iteration && review.status !== 'failed' ? `Iteración ${review.iteration}` : 'Intento'} ·{' '}
          {BRANCH_ROLE_LABELS[review.role]}
        </span>
        <span className="review-iteration__verdict">{review.verdict ?? STATUS_LABELS[review.status]}</span>
        <span className="review-iteration__date">
          <DateTime value={review.finishedAt ?? review.startedAt ?? review.createdAt} />
        </span>
      </summary>

      <div className="review-iteration__body">
        <p className="review-iteration__branch">
          <code>{review.branch}</code> → <code>{review.base}</code>
          {review.commitSha && <code> @ {review.commitSha.slice(0, 10)}</code>}
        </p>

        {review.status === 'running' && (
          <p role="status">Claude está aplicando pr-review. Puede tardar varios minutos.</p>
        )}
        {review.error && (
          <p role="alert" className="review-iteration__error">
            {review.error}
          </p>
        )}
        {review.summary && <p className="review-iteration__text">{review.summary}</p>}

        {findings.length > 0 && (
          <section className="review-iteration__section">
            <h5 className="review-iteration__heading">Hallazgos ({findings.length})</h5>
            <ul className="review-iteration__list">
              {findings.map((finding, index) => (
                <li key={index} className="review-iteration__finding">
                  <p>
                    <strong className="review-iteration__severity">{finding.severity}</strong> {finding.title}
                  </p>
                  {finding.location && <code className="review-iteration__location">{finding.location}</code>}
                  <p className="review-iteration__text">{finding.recommendation}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {questions.length > 0 && (
          <section className="review-iteration__section">
            <h5 className="review-iteration__heading">Preguntas ({questions.length})</h5>
            <ul className="review-iteration__list">
              {questions.map((question, index) => (
                <li key={index} className="review-iteration__text">
                  {String(question.question ?? '')}
                </li>
              ))}
            </ul>
          </section>
        )}

        {review.developerComment && (
          <details className="review-iteration__comment">
            <summary>Comentario para el desarrollador</summary>
            <pre className="review-iteration__pre">{review.developerComment}</pre>
          </details>
        )}

        {review.status === 'done' && (
          <p className="review-iteration__meta">
            {review.certified ? 'Certificada por pr-review.' : `Sin certificar: ${review.certificationError ?? ''}`}
          </p>
        )}
        {review.outputDir && (
          <p className="review-iteration__meta">
            Archivos: <code>{review.outputDir}</code>
          </p>
        )}
      </div>
    </details>
  )
}
