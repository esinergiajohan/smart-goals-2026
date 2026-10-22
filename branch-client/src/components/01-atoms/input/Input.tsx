import type { ComponentPropsWithRef } from 'react'
import { classNames } from '../../../utils/classNames.ts'
import './input.scss'

export function Input({ className, ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={classNames('input', className)} {...props} />
}
