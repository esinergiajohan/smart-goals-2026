import { useId } from 'react'
import type { Delivery } from '../../../types/pullRequest.ts'
import { classNames } from '../../../utils/classNames.ts'
import './delivery-badges.scss'

interface DeliveryBadgesProps {
  deliveries: Delivery[]
  error?: string
}

const DESTINATION_LABELS: Record<string, string> = { staging: 'STG', develop: 'DEV', main: 'MAIN', master: 'MAIN' }

const toneOf = (delivery: Delivery) =>
  delivery.firstAttempt === true ? 'approved' : delivery.firstAttempt === false ? 'rework' : 'pending'

const describe = (delivery: Delivery) => {
  const [pullRequest] = delivery.pullRequests
  if (delivery.firstAttempt === true) return 'Aprobado sin devolución'
  if (delivery.firstAttempt === null) return 'PR abierto, sin devoluciones'
  const reasons = [
    pullRequest.changesRequested && `${pullRequest.changesRequested} cambios pedidos`,
    pullRequest.reviewerComments && `${pullRequest.reviewerComments} comentarios del revisor`,
    pullRequest.reviewerCommits && `${pullRequest.reviewerCommits} commits del revisor`,
    pullRequest.state === 'DECLINED' && 'declinado por el revisor',
  ].filter(Boolean)
  return `Devuelto: ${reasons.join(', ')}`
}

export function DeliveryBadges({ deliveries, error }: DeliveryBadgesProps) {
  const headingId = useId()
  if (!deliveries.length && !error) return null

  return (
    <section className="delivery-badges" aria-labelledby={headingId}>
      <h4 id={headingId} className="delivery-badges__title">
        Pull requests
      </h4>
      {error && (
        <p role="alert" className="delivery-badges__error">
          {error}
        </p>
      )}
      <ul role="list" className="delivery-badges__list">
        {deliveries.map((delivery) => {
          const [last] = delivery.pullRequests
          const destination = DESTINATION_LABELS[delivery.destinationBranch] ?? delivery.destinationBranch
          return (
            <li
              key={last.id}
              className={classNames('delivery-badges__item', `delivery-badges__item--${toneOf(delivery)}`)}
            >
              <span className="delivery-badges__destination">{destination}</span>
              <span className="delivery-badges__status">{describe(delivery)}</span>
              <a className="delivery-badges__link" href={last.url} target="_blank" rel="noreferrer">
                #{last.externalId}
                <span className="visually-hidden">
                  {' '}
                  de {delivery.ticketKey} hacia {delivery.destinationBranch} (se abre en otra pestaña)
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
