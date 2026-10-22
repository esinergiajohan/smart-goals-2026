import { useId, useState, type FormEvent } from 'react'
import { useFeaturedComment } from '../../../hooks/useFeaturedComment.ts'
import { parseCommentUrl } from '../../../utils/commentUrl.ts'
import { truncate } from '../../../utils/truncate.ts'
import { Button } from '../../01-atoms/button/Button.tsx'
import { DateTime } from '../../01-atoms/date-time/DateTime.tsx'
import { Icon } from '../../01-atoms/icon/Icon.tsx'
import { Input } from '../../01-atoms/input/Input.tsx'
import './featured-comment.scss'

const PREVIEW_LENGTH = 300

interface FeaturedCommentProps {
  ticketKey: string
  commentId?: string
  onChange: (commentId: string | undefined) => void
}

export function FeaturedComment({ ticketKey, commentId, onChange }: FeaturedCommentProps) {
  const headingId = useId()
  const inputId = useId()
  const errorId = useId()
  const [draft, setDraft] = useState('')
  const [formError, setFormError] = useState<string>()
  const [expanded, setExpanded] = useState(false)
  const { loading, comment, error } = useFeaturedComment(ticketKey, commentId)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const link = parseCommentUrl(draft)
    if (!link) {
      setFormError('Pega el enlace de un comentario de Jira (debe traer focusedCommentId).')
      return
    }
    if (link.key !== ticketKey) {
      setFormError(`Ese comentario es de ${link.key}, esta card es de ${ticketKey}.`)
      return
    }
    setFormError(undefined)
    setDraft('')
    setExpanded(false)
    onChange(link.commentId)
  }

  const remove = () => {
    setExpanded(false)
    onChange(undefined)
  }

  return (
    <section className="featured-comment" aria-labelledby={headingId}>
      <h4 id={headingId} className="featured-comment__title">
        <Icon name="star" />
        Comentario destacado
      </h4>

      {commentId ? (
        <div className="featured-comment__body" aria-busy={loading}>
          {loading && <p role="status">Cargando comentario…</p>}

          {error && (
            <p role="alert" className="featured-comment__error">
              {error}
            </p>
          )}

          {comment && (
            <>
              <p className="featured-comment__meta">
                <strong className="featured-comment__author">{comment.author}</strong>
                {comment.created && <DateTime value={comment.created} />}
              </p>
              <p className="featured-comment__text">
                {expanded ? comment.text : truncate(comment.text, PREVIEW_LENGTH)}
              </p>
            </>
          )}

          <div className="featured-comment__actions">
            {comment && (
              <a href={comment.url} target="_blank" rel="noopener noreferrer" className="featured-comment__link">
                Abrir en Jira
                <span className="visually-hidden"> (se abre en una pestaña nueva)</span>
              </a>
            )}
            {comment && comment.text.length > PREVIEW_LENGTH && (
              <Button variant="ghost" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                {expanded ? 'Ver menos' : 'Ver más'}
              </Button>
            )}
            <Button variant="ghost" onClick={remove}>
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <form className="featured-comment__form" noValidate onSubmit={handleSubmit}>
          <label htmlFor={inputId} className="visually-hidden">
            Enlace del comentario de {ticketKey}
          </label>
          <Input
            id={inputId}
            className="featured-comment__input"
            type="url"
            value={draft}
            placeholder="Pega el enlace del comentario"
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? errorId : undefined}
            autoComplete="off"
            onChange={(event) => {
              setDraft(event.target.value)
              setFormError(undefined)
            }}
          />
          <Button type="submit" variant="secondary" disabled={!draft.trim()}>
            Destacar
          </Button>
          {formError && (
            <p id={errorId} role="alert" className="featured-comment__error featured-comment__form-error">
              {formError}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
