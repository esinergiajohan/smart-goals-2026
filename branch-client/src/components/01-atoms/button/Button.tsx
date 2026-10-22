import type { ButtonHTMLAttributes } from 'react'
import { classNames } from '../../../utils/classNames.ts'
import './button.scss'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'secondary' | 'ghost' | 'success' | 'warning'
}

export function Button({ variant = 'secondary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames('button', `button--${variant}`, className)}
      {...props}
    />
  )
}
