import type { ReactNode } from 'react'
import { Icon, type IconName } from '../../01-atoms/icon/Icon.tsx'
import './meta-item.scss'

interface MetaItemProps {
  icon: IconName
  label: string
  children: ReactNode
}

export function MetaItem({ icon, label, children }: MetaItemProps) {
  return (
    <div className="meta-item">
      <Icon name={icon} className="meta-item__icon" />
      <dt className="meta-item__label">{label}:</dt>
      <dd className="meta-item__value">{children}</dd>
    </div>
  )
}
