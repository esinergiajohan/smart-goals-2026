import type { ComponentPropsWithoutRef } from 'react'
import { classNames } from '../../../utils/classNames.ts'
import './switch.scss'

interface SwitchProps extends Omit<ComponentPropsWithoutRef<'button'>, 'role' | 'aria-checked' | 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Switch({ checked, onChange, className, children, type = 'button', ...props }: SwitchProps) {
  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      className={classNames('switch', checked && 'switch--on', className)}
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{children}</span>
    </button>
  )
}
