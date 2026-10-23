import { useId, useState } from 'react'
import { usePlans } from '../../../hooks/usePlans.ts'
import type { PlanContent } from '../../../types/plan.ts'
import { Button } from '../../01-atoms/button/Button.tsx'
import { DateTime } from '../../01-atoms/date-time/DateTime.tsx'
import { ConfirmDialog } from '../../02-molecules/confirm-dialog/ConfirmDialog.tsx'
import './ticket-plan.scss'

interface TicketPlanProps {
  ticketKey: string
}

const SOURCE_LABELS: Record<PlanContent['acceptance_criteria'][number]['source'], string> = {
  ticket: 'ticket',
  historia: 'historia',
  comentario: 'comentario',
  inferido: 'por confirmar',
}

function PlanSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <section className="ticket-plan__section">
      <h5 className="ticket-plan__heading">{title}</h5>
      <ul className="ticket-plan__list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export function TicketPlan({ ticketKey }: TicketPlanProps) {
  const headingId = useId()
  const [confirming, setConfirming] = useState(false)
  const [confirmingStart, setConfirmingStart] = useState(false)
  const { latest, active, error, start, publish } = usePlans(ticketKey)
  const content = latest?.status === 'done' ? latest.content : undefined

  return (
    <section className="ticket-plan" aria-labelledby={headingId}>
      <div className="ticket-plan__header">
        <h4 id={headingId} className="ticket-plan__title">
          Plan de abordaje
        </h4>
        <Button disabled={active} aria-haspopup="dialog" onClick={() => setConfirmingStart(true)}>
          {content ? 'Regenerar plan' : 'Generar plan'}
        </Button>
      </div>

      {active && <p role="status">Leyendo el ticket en Jira y aplicando los criterios de pr-review…</p>}
      {latest?.status === 'failed' && (
        <p role="alert" className="ticket-plan__error">
          {latest.error}
        </p>
      )}
      {error && (
        <p role="alert" className="ticket-plan__error">
          {error}
        </p>
      )}

      {content && latest && (
        <details className="ticket-plan__plan">
          <summary className="ticket-plan__summary">
            <span className="ticket-plan__type">{content.ticket_type}</span>
            <span>{content.summary}</span>
            {latest.finishedAt && (
              <span className="ticket-plan__date">
                <DateTime value={latest.finishedAt} />
              </span>
            )}
          </summary>

          <div className="ticket-plan__body">
            <PlanSection
              title="Criterios de aceptación"
              items={content.acceptance_criteria.map((item) => `${item.criterion} (${SOURCE_LABELS[item.source]})`)}
            />
            <PlanSection
              title="Preguntas para confirmar antes de implementar"
              items={content.questions.map((item) => `${item.question} → ${item.to}. ${item.reason}`)}
            />
            <PlanSection title="Alcance incluido" items={content.scope_in} />
            <PlanSection title="Fuera de alcance" items={content.scope_out} />
            <PlanSection
              title="Áreas afectadas"
              items={content.affected_areas.map((item) => `${item.location}: ${item.reason}`)}
            />
            <PlanSection title="Cómo abordarlo" items={content.approach} />
            <PlanSection title="Riesgos" items={content.risks.map((item) => `${item.risk} → ${item.mitigation}`)} />
            <PlanSection title="Despliegue esperado" items={[content.deploy_expectation]} />
            <PlanSection title="Pruebas para QA" items={content.qa_checks} />
            <PlanSection title="Lo que revisará pr-review" items={content.pr_review_watchpoints} />

            <div className="ticket-plan__actions">
              {latest.jiraCommentUrl && (
                <a className="ticket-plan__link" href={latest.jiraCommentUrl} target="_blank" rel="noreferrer">
                  Ver la nota en Jira
                  <span className="visually-hidden"> (se abre en otra pestaña)</span>
                </a>
              )}
              <Button onClick={() => setConfirming(true)}>
                {latest.jiraCommentId ? 'Actualizar nota en Jira' : 'Publicar en Jira'}
              </Button>
            </div>
          </div>
        </details>
      )}

      <ConfirmDialog
        open={confirmingStart}
        title={content ? `¿Regenerar el plan de ${ticketKey}?` : `¿Generar el plan de ${ticketKey}?`}
        confirmLabel={content ? 'Sí, regenerar' : 'Sí, generar'}
        onCancel={() => setConfirmingStart(false)}
        onConfirm={() => {
          setConfirmingStart(false)
          void start()
        }}
      >
        <p>
          Claude lee el ticket en Jira y arma el plan con los criterios de pr-review. Tarda unos minutos y consume uso
          de Claude.
          {content && ' El plan actual queda en el historial.'}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming}
        title={`¿Publicar el plan en ${ticketKey}?`}
        confirmLabel={latest?.jiraCommentId ? 'Sí, actualizar la nota' : 'Sí, publicar'}
        confirmVariant="success"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          if (latest) void publish(latest.id)
        }}
      >
        <p>
          {latest?.jiraCommentId
            ? 'Se reemplazará la nota interna que ya publicaste con este plan.'
            : 'Se publicará como nota interna en Jira, con tu cuenta.'}
        </p>
      </ConfirmDialog>
    </section>
  )
}
