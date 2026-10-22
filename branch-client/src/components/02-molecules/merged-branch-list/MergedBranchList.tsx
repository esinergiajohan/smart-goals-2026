import { useEffect, useRef } from 'react'
import { Button } from '../../01-atoms/button/Button.tsx'
import { Input } from '../../01-atoms/input/Input.tsx'
import './merged-branch-list.scss'

interface MergedBranchListProps {
  branches: string[]
  placeholder: string
  onChange: (branches: string[]) => void
}

export function MergedBranchList({ branches, placeholder, onChange }: MergedBranchListProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const pendingFocus = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (pendingFocus.current === undefined) return
    inputs.current[pendingFocus.current]?.focus()
    pendingFocus.current = undefined
  }, [branches.length])

  return (
    <div className="merged-branch-list" role="group" aria-label="Ramas unidas a la release">
      <p className="merged-branch-list__title">Ramas unidas</p>

      {branches.length > 0 && (
        <ul role="list" className="merged-branch-list__items">
          {branches.map((branch, index) => (
            <li key={index} className="merged-branch-list__item">
              <Input
                ref={(element) => {
                  inputs.current[index] = element
                }}
                className="merged-branch-list__control"
                aria-label={`Rama unida ${index + 1}`}
                value={branch}
                placeholder={placeholder}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => onChange(branches.map((value, i) => (i === index ? event.target.value : value)))}
              />
              <Button
                variant="ghost"
                aria-label={`Quitar rama unida ${index + 1}`}
                onClick={() => onChange(branches.filter((_, i) => i !== index))}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="secondary"
        className="merged-branch-list__add"
        onClick={() => {
          onChange([...branches, ''])
          pendingFocus.current = branches.length
        }}
      >
        + Agregar rama
      </Button>
    </div>
  )
}
