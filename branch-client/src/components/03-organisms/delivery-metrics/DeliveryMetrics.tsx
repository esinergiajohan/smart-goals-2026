import { useId, useState } from 'react'
import { useDeliveryMetrics } from '../../../hooks/useDeliveryMetrics.ts'
import { BASELINE_PERIOD, FIRST_ATTEMPT_TARGET, formatRate, GOAL_PERIOD } from '../../../utils/goals.ts'
import { classNames } from '../../../utils/classNames.ts'
import { Button } from '../../01-atoms/button/Button.tsx'
import { ConfirmDialog } from '../../02-molecules/confirm-dialog/ConfirmDialog.tsx'
import './delivery-metrics.scss'

const PERIODS = [BASELINE_PERIOD, GOAL_PERIOD]

export function DeliveryMetrics() {
  const headingId = useId()
  const { metrics, syncing, error, sync } = useDeliveryMetrics(PERIODS)
  const [confirming, setConfirming] = useState(false)

  return (
    <section className="delivery-metrics" aria-labelledby={headingId} aria-busy={syncing}>
      <h2 id={headingId} className="delivery-metrics__title">
        PR aprobados sin devolución
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
                      {metric.firstAttempt} de {metric.closed} PR · {metric.reviewerComments} aclaraciones
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
        Cada PR tuyo hacia staging o develop. Cuenta como devuelto si tuvo «Request changes», comentarios o commits del
        revisor, o si el revisor lo declinó. No cuentan los PR que cerraste tú sin revisión.
      </p>

      <Button onClick={() => setConfirming(true)} disabled={syncing} aria-haspopup="dialog">
        {syncing ? 'Sincronizando…' : 'Sincronizar PR'}
      </Button>

      {error && (
        <p role="alert" className="delivery-metrics__error">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title="¿Sincronizar los PR?"
        confirmLabel="Sí, sincronizar"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          void sync()
        }}
      >
        <p>
          Consulta tus PR en Bitbucket, sin cambiar nada allá, y recalcula los indicadores. Puede tardar unos
          segundos.
        </p>
      </ConfirmDialog>
    </section>
  )
}
