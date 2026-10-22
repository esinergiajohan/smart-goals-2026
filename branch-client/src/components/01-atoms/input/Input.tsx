import type { InputHTMLAttributes } from 'react'
import { classNames } from '../../../utils/classNames.ts'
import './input.scss'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames('input', className)} {...props} />
}
