import { useId } from 'react'
import { useDeliveryMetrics } from '../../../hooks/useDeliveryMetrics.ts'
import { BASELINE_PERIOD, FIRST_ATTEMPT_TARGET, formatRate, GOAL_PERIOD } from '../../../utils/goals.ts'
import { classNames } from '../../../utils/classNames.ts'
import { Button } from '../../01-atoms/button/Button.tsx'
import './delivery-metrics.scss'

const PERIODS = [BASELINE_PERIOD, GOAL_PERIOD]

export function DeliveryMetrics() {
  const headingId = useId()
  const { metrics, syncing, error, sync } = useDeliveryMetrics(PERIODS)

  return (
    <section className="delivery-metrics" aria-labelledby={headingId} aria-busy={syncing}>
      <h2 id={headingId} className="delivery-metrics__title">
        PR aprobados sin retrabajo
        <span className="delivery-metrics__target">Meta {formatRate(FIRST_ATTEMPT_TARGET)}</span>
      </h2>

      <dl className="delivery-metrics__periods">
        {PERIODS.map((period, index) => {
          const metric = metrics[index]
          const reached = metric?.rate !== null && metric?.rate !== undefined && metric.rate >= FIRST_ATTEMPT_TARGET
          return (
            <div key={period.from} className="delivery-metrics__period">
              <dt className="delivery-metrics__label">{period.label}</dt>
              <dd
                className={classNames(
                  'delivery-metrics__value',
                  metric && (reached ? 'delivery-metrics__value--reached' : 'delivery-metrics__value--below'),
                )}
              >
                {metric ? (
                  <>
                    {formatRate(metric.rate)}
                    <span className="delivery-metrics__detail">
                      {metric.firstAttempt} de {metric.closed} entregas
                    </span>
                  </>
                ) : (
                  '…'
                )}
              </dd>
            </div>
          )
        })}
      </dl>

      <p className="delivery-metrics__note">
        Una entrega es un ticket hacia staging o develop. Es primer intento si se resolvió con un solo PR, sin
        «Request changes» ni pushes después de abrirlo. No cuentan los PR que cerraste tú sin revisión.
      </p>

      <Button onClick={sync} disabled={syncing}>
        {syncing ? 'Sincronizando…' : 'Sincronizar PR'}
      </Button>

      {error && (
        <p role="alert" className="delivery-metrics__error">
          {error}
        </p>
      )}
    </section>
  )
}
