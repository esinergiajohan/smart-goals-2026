import { useId, useState, type FormEvent } from 'react'
import type { RepositoryDraft } from '../../../services/repositories.ts'
import { Button } from '../../01-atoms/button/Button.tsx'
import { Input } from '../../01-atoms/input/Input.tsx'
import './repository-form.scss'

interface RepositoryFormProps {
  onSubmit: (draft: RepositoryDraft) => Promise<unknown>
  onCancel: () => void
}

const FIELDS: Array<{ name: keyof RepositoryDraft; label: string; placeholder: string; mono?: boolean }> = [
  { name: 'name', label: 'Nombre', placeholder: 'redsalud' },
  { name: 'path', label: 'Ruta local', placeholder: '/Volumes/KINGSTON/empresa/Esinergia/redsalud', mono: true },
  { name: 'baseBranch', label: 'Rama base (STG)', placeholder: 'staging', mono: true },
  { name: 'developmentBranch', label: 'Rama desarrollo', placeholder: 'develop', mono: true },
  { name: 'productionBranch', label: 'Rama producción', placeholder: 'main', mono: true },
]

const EMPTY_DRAFT: RepositoryDraft = {
  name: '',
  path: '',
  baseBranch: 'staging',
  developmentBranch: 'develop',
  productionBranch: 'main',
}

export function RepositoryForm({ onSubmit, onCancel }: RepositoryFormProps) {
  const formId = useId()
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit(draft)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el repositorio')
      setSaving(false)
    }
  }

  return (
    <form className="repository-form" onSubmit={handleSubmit} aria-busy={saving}>
      {FIELDS.map(({ name, label, placeholder, mono }) => (
        <div key={name} className="repository-form__field">
          <label htmlFor={`${formId}-${name}`} className="repository-form__label">
            {label}
          </label>
          <Input
            id={`${formId}-${name}`}
            className={mono ? 'repository-form__control repository-form__control--mono' : 'repository-form__control'}
            value={draft[name]}
            placeholder={placeholder}
            required
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))}
          />
        </div>
      ))}

      {error && (
        <p role="alert" className="repository-form__error">
          {error}
        </p>
      )}

      <div className="repository-form__actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar repositorio'}
        </Button>
      </div>
    </form>
  )
}
