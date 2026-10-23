import { useReport } from '../../../hooks/useReport.ts'
import type { ReportDelivery, ReportPeriod } from '../../../types/report.ts'
import { formatLongDate } from '../../../utils/formatDate.ts'
import { FIRST_ATTEMPT_TARGET, formatRate, REPORT_MONTHS } from '../../../utils/goals.ts'
import { BarChart } from '../../02-molecules/bar-chart/BarChart.tsx'
import './report.scss'

const GOAL_CAPA_2 =
  '(Capa 2 - Crecimiento) Lograr que al menos el 80% de los pull requests de Git entre octubre y el 30 de noviembre de 2026, realizados con apoyo de IA, se aprueben sin retrabajo, verificando antes de cada envío los criterios de aceptación del ticket y los estándares técnicos, definiendo y confirmando con el solicitante los criterios cuando el ticket no los trae, y comparándolo contra la línea base de septiembre registrada en Branch Manager.'
const GOAL_CAPA_3 =
  '(Capa 3 - Transversal IA) Integrar en Branch Manager el código de pr-review de Esinergia y combinarlo con un modelo de IA (Gemini o Claude) antes del 30 de noviembre de 2026, para aplicar la revisión del PR antes de que llegue al líder: al iniciar cada ticket, leyéndolo desde Jira sin copiarlo a mano y dejando una nota sobre cómo abordarlo según sus criterios; y antes de solicitar el PR a staging, revisando la entrega y dejando las correcciones a aplicar o el visto bueno, en Branch Manager o como comentario en Jira si la API lo permite. Se demostrará con 3 entregas comparadas una reducción de al menos 80% en las aclaraciones durante la revisión del líder.'
const GOAL_CAPA_1 =
  '(Capa 1 - Fundacional) Construir y publicar una biblioteca de conocimiento de Site Studio en video para el equipo Frontend que cubra los temas de dependencia confirmados con los seniors, y lograr una calificación promedio de al menos 4 sobre 5 por parte de mínimo 6 desarrolladores antes del 30 de noviembre de 2026.'

const DESTINATIONS: Record<string, string> = { staging: 'Staging', develop: 'Develop' }

const perPr = (period?: ReportPeriod) => period?.metrics.reviewerCommentsPerDelivery ?? null

const reduction = (before: number | null, after: number | null) =>
  before && after !== null ? (before - after) / before : null

const BOM = String.fromCharCode(0xfeff)

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

const downloadCsv = (months: ReportPeriod[]) => {
  const header = ['Mes', 'Proyecto', 'Ticket', 'Destino', 'PR', 'Resultado', 'Devoluciones', 'Aclaraciones', 'Revisor', 'Fecha', 'Enlace']
  const rows = months.flatMap((period, index) =>
    period.deliveries.map((item) => [
      REPORT_MONTHS[index].label,
      item.repository,
      item.ticketKey,
      DESTINATIONS[item.destinationBranch] ?? item.destinationBranch,
      item.pullRequests.join(' '),
      item.firstAttempt === true ? 'Aprobado a la primera' : item.firstAttempt === null ? 'Abierto' : 'Devuelto',
      item.reworks,
      item.reviewerComments,
      item.reviewers.join(', '),
      item.openedAt.slice(0, 10),
      item.url ?? '',
    ]),
  )
  const blob = new Blob([`${BOM}${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}`], {
    type: 'text/csv;charset=utf-8',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'informe-objetivos-2026.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

function Result({ item }: { item: ReportDelivery }) {
  if (item.firstAttempt === true) return <span className="report__badge report__badge--good">✓ A la primera</span>
  if (item.firstAttempt === null) return <span className="report__badge">Abierto</span>
  return <span className="report__badge report__badge--bad">Devuelto</span>
}

function DeliveryTable({ caption, items }: { caption: string; items: ReportDelivery[] }) {
  return (
    <table className="report__table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Proyecto</th>
          <th scope="col">Ticket</th>
          <th scope="col">Destino</th>
          <th scope="col">PR</th>
          <th scope="col">Resultado</th>
          <th scope="col">Aclaraciones</th>
          <th scope="col">Revisor</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.repository}-${item.pullRequests.join()}`}>
            <td>{item.repository}</td>
            <td>{item.ticketKey}</td>
            <td>{DESTINATIONS[item.destinationBranch] ?? item.destinationBranch}</td>
            <td>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.pullRequests[0]?.split(' ')[0]}
                </a>
              ) : (
                item.pullRequests[0]
              )}
            </td>
            <td>
              <Result item={item} />
            </td>
            <td>{item.reviewerComments}</td>
            <td>{item.reviewers.join(', ') || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ReportPage() {
  const { months, goal, usage, error } = useReport()
  const [baseline] = months
  const ready = Boolean(baseline && goal && usage)

  const rateReached = (goal?.metrics.rate ?? 0) >= FIRST_ATTEMPT_TARGET
  const clarificationDrop = reduction(perPr(baseline), perPr(goal))
  const clarificationReached = (clarificationDrop ?? 0) >= 0.8

  const before = (baseline?.deliveries ?? [])
    .filter((item) => item.reviewerComments > 0)
    .sort((a, b) => b.reviewerComments - a.reviewerComments)
    .slice(0, 3)
  const reviewed = new Set(usage?.reviews.tickets ?? [])
  const after = [...(goal?.deliveries ?? [])]
    .filter((item) => item.firstAttempt === true && item.reviewerComments === 0 && item.destinationBranch === 'staging')
    .sort((a, b) => Number(reviewed.has(b.ticketKey)) - Number(reviewed.has(a.ticketKey)) || b.openedAt.localeCompare(a.openedAt))
    .filter((item, index, list) => list.findIndex((other) => other.ticketKey === item.ticketKey) === index)
    .slice(0, 3)

  return (
    <div className="report">
      <header className="report__header">
        <div>
          <p className="report__eyebrow">esinergia S.A.S. · Johan Riascos</p>
          <h1 className="report__title">Informe de objetivos 2026</h1>
          <p className="report__meta">Generado el {formatLongDate(new Date().toISOString())} desde Branch Manager</p>
        </div>
        <nav className="report__actions" aria-label="Acciones del informe">
          <button type="button" className="report__button report__button--primary" onClick={() => window.print()}>
            Descargar PDF
          </button>
          <button type="button" className="report__button" onClick={() => downloadCsv(months)} disabled={!ready}>
            Descargar CSV
          </button>
          <a className="report__button" href="/">
            Volver al tablero
          </a>
        </nav>
      </header>

      {error && (
        <p role="alert" className="report__error">
          {error}
        </p>
      )}
      {!ready && !error && <p role="status">Generando el informe…</p>}

      {ready && baseline && goal && usage && (
        <main className="report__content">
          <section className="report__highlight" aria-labelledby="report-highlight-title">
            <p className="report__highlight-count">
              {[rateReached, clarificationReached].filter(Boolean).length} de 3
            </p>
            <div>
              <h2 id="report-highlight-title" className="report__highlight-title">
                {rateReached && clarificationReached
                  ? 'Dos objetivos cumplidos'
                  : `${[rateReached, clarificationReached].filter(Boolean).length} objetivo(s) cumplido(s)`}
              </h2>
              <ul className="report__highlight-list">
                <li>
                  {rateReached ? '✓' : '…'} <strong>Capa 2 · PR aprobados sin retrabajo:</strong>{' '}
                  {formatRate(goal.metrics.rate)} (meta 80 %).
                </li>
                <li>
                  {clarificationReached ? '✓' : '…'} <strong>Capa 3 · Revisión previa con pr-review e IA:</strong>{' '}
                  {clarificationDrop !== null ? `−${formatRate(clarificationDrop)}` : '—'} en aclaraciones del líder (meta −80 %).
                </li>
                <li>
                  · <strong>Capa 1 · Biblioteca de Site Studio:</strong> se reporta aparte.
                </li>
              </ul>
            </div>
          </section>

          <section className="report__summary" aria-label="Resumen">
            <article className={`report__tile ${rateReached ? 'report__tile--good' : ''}`}>
              <h2>PR aprobados sin retrabajo</h2>
              <p className="report__big">{formatRate(goal.metrics.rate)}</p>
              <p>
                {goal.metrics.firstAttempt} de {goal.metrics.closed} PR de octubre a hoy · meta 80 %
              </p>
              <p className="report__status">{rateReached ? '✓ Cumplido' : 'En curso'}</p>
            </article>
            <article className={`report__tile ${clarificationReached ? 'report__tile--good' : ''}`}>
              <h2>Aclaraciones del líder</h2>
              <p className="report__big">−{formatRate(clarificationDrop)}</p>
              <p>
                De {perPr(baseline)?.toFixed(2)} a {perPr(goal)?.toFixed(2)} aclaraciones por PR · meta −80 %
              </p>
              <p className="report__status">{clarificationReached ? '✓ Cumplido' : 'En curso'}</p>
            </article>
            <article className="report__tile">
              <h2>Biblioteca de Site Studio</h2>
              <p className="report__big">Videos</p>
              <p>Meta: calificación ≥ 4/5 de mínimo 6 desarrolladores</p>
              <p className="report__status">Se reporta aparte</p>
            </article>
          </section>

          <section className="report__section">
            <h2>1. PR de Git aprobados sin retrabajo</h2>
            <p className="report__goal">{GOAL_CAPA_2}</p>
            <BarChart
              title="PR aprobados a la primera, por mes"
              max={1}
              better="higher"
              target={{ value: FIRST_ATTEMPT_TARGET, label: 'Meta 80 %' }}
              data={months.map((period, index) => ({
                label: REPORT_MONTHS[index].label,
                value: period.metrics.closed ? period.metrics.rate : null,
                display: formatRate(period.metrics.rate),
                detail: `${period.metrics.firstAttempt} de ${period.metrics.closed} PR`,
                highlight: REPORT_MONTHS[index].baseline,
              }))}
            />
            <p className="report__legend">★ Septiembre es la línea base: trabajo sin pr-review.</p>
            <h3>Observaciones</h3>
            <ul className="report__list">
              <li>
                <strong>Resultado:</strong> de octubre a hoy, {goal.metrics.firstAttempt} de {goal.metrics.closed} PR se
                aprobaron a la primera ({formatRate(goal.metrics.rate)}), frente a {formatRate(baseline.metrics.rate)} en
                septiembre ({baseline.metrics.firstAttempt} de {baseline.metrics.closed}).
              </li>
              <li>
                <strong>La prueba:</strong> la aprobación a la primera del líder, registrada en Bitbucket y GitHub en los
                proyectos {usage.repositories.filter((name) => name !== 'fsfb').join(', ')}.
              </li>
              <li>
                <strong>Cómo se cuenta:</strong> cada PR hacia staging o develop. Es retrabajo si el revisor lo devolvió:
                pidió cambios, dejó comentarios, tuvo que hacer commits en la rama o lo rechazó.
              </li>
              <li>
                <strong>Cómo se logró:</strong> antes de cada envío se revisaron con pr-review y la IA los criterios de
                aceptación del ticket y los estándares técnicos de esinergia. Cuando el ticket no traía criterios, se
                definieron y confirmaron con el solicitante.
              </li>
            </ul>
          </section>

          <section className="report__section">
            <h2>2. Revisión previa de PR con pr-review de esinergia y una IA</h2>
            <p className="report__goal">{GOAL_CAPA_3}</p>
            <BarChart
              title="Aclaraciones del líder por PR, por mes"
              max={Math.max(...months.map((period) => perPr(period) ?? 0), 0.4)}
              better="lower"
              data={months.map((period, index) => ({
                label: REPORT_MONTHS[index].label,
                value: period.metrics.closed ? perPr(period) : null,
                display: (perPr(period) ?? 0).toFixed(2),
                detail: `${period.metrics.reviewerComments} aclaraciones en ${period.metrics.closed} PR`,
                highlight: REPORT_MONTHS[index].baseline,
              }))}
            />
            <p className="report__legend">★ Septiembre es la línea base: trabajo sin pr-review.</p>

            <h3>3 entregas comparadas</h3>
            <div className="report__compare">
              <DeliveryTable caption="★ Septiembre, sin pr-review" items={before} />
              <DeliveryTable caption="Octubre, con pr-review" items={after} />
            </div>
            <p>
              Aclaraciones en las 3 entregas: {before.reduce((total, item) => total + item.reviewerComments, 0)} en
              septiembre y {after.reduce((total, item) => total + item.reviewerComments, 0)} en octubre.
            </p>

            <h3>Uso de la IA</h3>
            <ul className="report__list">
              <li>
                <strong>Modelo:</strong> Claude (Anthropic), con el código de pr-review de esinergia integrado en Branch
                Manager.
              </li>
              <li>
                <strong>Al iniciar cada ticket:</strong> el botón «Generar plan» lee el ticket, su historia y sus comentarios
                directamente desde Jira y deja una nota de cómo abordarlo con los criterios de pr-review. La nota se
                publica en Jira con «Publicar en Jira». Planes generados: {usage.plans.done}.
              </li>
              <li>
                <strong>Antes del PR a staging:</strong> el botón «Revisar» aplica pr-review sobre la rama -test y deja las
                correcciones o el visto bueno en la card. Revisiones hechas en Branch Manager: {usage.reviews.done}.
              </li>
              <li>
                <strong>Resultado:</strong> las aclaraciones del líder bajaron de {perPr(baseline)?.toFixed(2)} a{' '}
                {perPr(goal)?.toFixed(2)} por PR ({clarificationDrop !== null ? `−${formatRate(clarificationDrop)}` : '—'}).
              </li>
            </ul>
          </section>

          <section className="report__section">
            <h2>3. Biblioteca de conocimiento de Site Studio</h2>
            <p className="report__goal">{GOAL_CAPA_1}</p>
            <h3>Observaciones</h3>
            <ul className="report__list">
              <li>Este objetivo se gestiona y se reporta por fuera de Branch Manager (videos y encuesta al equipo).</li>
            </ul>
          </section>

          <section className="report__section report__annex">
            <h2>Anexo: detalle de PR por mes</h2>
            {months.map((period, index) =>
              period.deliveries.length ? (
                <DeliveryTable
                  key={REPORT_MONTHS[index].label}
                  caption={`${REPORT_MONTHS[index].baseline ? '★ ' : ''}${REPORT_MONTHS[index].label}: ${formatRate(period.metrics.rate)} a la primera`}
                  items={period.deliveries}
                />
              ) : null,
            )}
          </section>
        </main>
      )}
    </div>
  )
}
