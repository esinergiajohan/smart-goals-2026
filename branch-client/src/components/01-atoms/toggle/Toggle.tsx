import type { ComponentPropsWithRef } from 'react'
import { classNames } from '../../../utils/classNames.ts'
import { Icon, type IconName } from '../icon/Icon.tsx'
import './toggle.scss'

interface ToggleProps extends ComponentPropsWithRef<'button'> {
  on: boolean
  icon: IconName
}

export function Toggle({ on, icon, className, children, type = 'button', ...props }: ToggleProps) {
  return (
    <button type={type} className={classNames('toggle', on && 'toggle--on', className)} {...props}>
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb">
          <Icon name={icon} />
        </span>
      </span>
      <span className="toggle__label">{children}</span>
    </button>
  )
}
