import { useId, type InputHTMLAttributes } from 'react'
import { Icon } from '../../01-atoms/icon/Icon.tsx'
import { Input } from '../../01-atoms/input/Input.tsx'
import './search-field.scss'

interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function SearchField({ label, id, ...inputProps }: SearchFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="search-field">
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>
      <Icon name="search" className="search-field__icon" />
      <Input id={inputId} type="search" className="search-field__input" {...inputProps} />
    </div>
  )
}
