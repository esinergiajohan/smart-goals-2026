import { useId } from 'react'
import type { BranchRole } from '../../../types/jira.ts'
import { BRANCH_ROLE_LABELS } from '../../../utils/branches.ts'
import { Input } from '../../01-atoms/input/Input.tsx'
import './branch-field.scss'

interface BranchFieldProps {
  role: BranchRole
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export function BranchField({ role, value, placeholder, onChange }: BranchFieldProps) {
  const inputId = useId()

  return (
    <div className={`branch-field branch-field--${role}`}>
      <label htmlFor={inputId} className="branch-field__label">
        {BRANCH_ROLE_LABELS[role]}
      </label>
      <Input
        id={inputId}
        className="branch-field__control"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
