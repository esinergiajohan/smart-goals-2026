import { ARCHITECTURE_DIAGRAM, PLAN_SEQUENCE, REVIEW_SEQUENCE, WORKFLOW_DIAGRAM } from '../../../content/diagrams.ts'
import { Diagram } from '../../02-molecules/diagram/Diagram.tsx'
import '../report/report.scss'
import './docs.scss'

type Goal = 'Capa 2' | 'Capa 3' | 'Base'
type Trigger = 'jira' | 'claude' | 'kit' | 'bitbucket' | 'github' | 'db' | 'git'

const TRIGGERS: Record<Trigger, string> = {
  jira: 'Jira',
  claude: 'Claude (IA)',
  kit: 'Kit pr-review',
  bitbucket: 'Bitbucket',
  github: 'GitHub',
  db: 'Base local',
  git: 'Repositorio local',
}

interface CardPart {
  title: string
  image: string
  pin: number
  goals: Goal[]
  what: string
  when: string
  triggers: Trigger[]
}

const CARD_PARTS: CardPart[] = [
  {
    title: 'Encabezado del ticket',
    image: '/docs/card-header.png',
    pin: 2,
    goals: ['Base'],
    what: 'Clave, título y fechas del ticket en Jira. La franja de color de la izquierda muestra su estado en Jira (abierta, en curso, finalizada).',
    when: 'Siempre visible. «Borrar» quita la card del tablero, no el ticket de Jira.',
    triggers: ['jira', 'db'],
  },
  {
    title: 'Comentario destacado',
    image: '/docs/card-featured.png',
    pin: 14,
    goals: ['Base'],
    what: 'Fija un comentario de Jira para tenerlo a la vista: el cierre, una instrucción del líder o la nota de QA.',
    when: 'Pega el enlace de un comentario de Jira y pulsa «Destacar».',
    triggers: ['jira'],
  },
  {
    title: 'Plan de abordaje',
    image: '/docs/card-plan-open.png',
    pin: 32,
    goals: ['Capa 3', 'Capa 2'],
    what: 'La IA lee el ticket, su historia, la épica y todos los comentarios desde Jira, revisa el código y entrega el plan con los criterios de pr-review: criterios de aceptación (marcando los inferidos), preguntas para confirmar con el solicitante, archivos a tocar, pasos, riesgos, despliegue y pruebas.',
    when: 'Al iniciar el ticket, antes de programar. «Publicar en Jira» lo deja como nota interna con tu cuenta.',
    triggers: ['jira', 'claude', 'git', 'db'],
  },
  {
    title: 'Ramas',
    image: '/docs/card-branches.png',
    pin: 56,
    goals: ['Base'],
    what: 'La rama de trabajo y sus copias para develop (DEV) y staging (STG). Con «Release» activo, la rama de trabajo es la release y el gráfico muestra las ramas que se le unieron.',
    when: 'Al crear las ramas del ticket. Los nombres se editan aquí y los usa la revisión.',
    triggers: ['db'],
  },
  {
    title: 'Pull requests',
    image: '/docs/card-pull-requests.png',
    pin: 78,
    goals: ['Capa 2'],
    what: 'Cada PR del ticket con su resultado: verde «Aprobado sin devolución», rojo «Devuelto» con el motivo, o ámbar «PR abierto». El número abre el PR.',
    when: 'Se actualiza solo al abrir el tablero. Es la evidencia de la meta del 80 %.',
    triggers: ['bitbucket', 'github', 'db'],
  },
  {
    title: 'Revisión local · pr-review',
    image: '/docs/card-review-history.png',
    pin: 86,
    goals: ['Capa 3'],
    what: '«Revisar» simula el PR antes de pedirlo: el kit pr-review de esinergia y la IA revisan la rama -test igual que lo haría el líder, y dejan el veredicto, los hallazgos y el comentario para el desarrollador, con certificado. Cada revisión queda como una iteración.',
    when: 'Antes de pedir el PR a staging. Si pide ajustes, se corrigen y se vuelve a revisar hasta que quede aprobada.',
    triggers: ['git', 'jira', 'kit', 'claude', 'db'],
  },
  {
    title: 'Despliegue',
    image: '/docs/card-footer.png',
    pin: 94,
    goals: ['Base'],
    what: 'Marca el ticket como desplegado en producción y mueve la card a esa columna. «¿Rollback?» la devuelve a pendientes.',
    when: 'Cuando el cambio ya está en producción.',
    triggers: ['db'],
  },
]

const AGENTS: Array<{ name: string; what: string; trigger: string; goal: Goal }> = [
  {
    name: 'Claude · plan de abordaje',
    what: 'Lee el ticket desde Jira y el código del proyecto y propone cómo abordarlo con los criterios de pr-review.',
    trigger: '«Generar plan» · bm plan',
    goal: 'Capa 3',
  },
  {
    name: 'Kit pr-review de esinergia',
    what: 'Reúne la evidencia de la rama -test: diferencias, flujo de ramas y bloqueos automáticos.',
    trigger: '«Revisar» · bm review',
    goal: 'Capa 3',
  },
  {
    name: 'Claude · revisión de PR',
    what: 'Aplica la política de pr-review en solo lectura y devuelve veredicto, hallazgos y comentario para el desarrollador.',
    trigger: '«Revisar» · bm review',
    goal: 'Capa 3',
  },
  {
    name: 'Certificación pr-review',
    what: 'Firma el resultado con el commit exacto revisado. Si la rama cambia, hay que revisar de nuevo.',
    trigger: 'Automática al terminar «Revisar»',
    goal: 'Capa 3',
  },
  {
    name: 'Bitbucket y GitHub',
    what: 'Traen tus PR con aprobaciones, cambios pedidos, comentarios y commits del revisor.',
    trigger: 'Al abrir el tablero · «Sincronizar PR» · bm metrics',
    goal: 'Capa 2',
  },
  {
    name: 'Jira',
    what: 'Tickets, estados, comentarios y notas internas publicadas desde la card.',
    trigger: 'Buscador · comentario destacado · plan · columna de abiertos',
    goal: 'Base',
  },
]

const DASHBOARD_PARTS = [
  ['Buscador', 'Busca un ticket de Jira por clave o título y crea su card.'],
  ['Pendientes de despliegue', 'Cards de tickets en curso o que esperan llegar a producción.'],
  ['En producción', 'Cards de tickets ya desplegados.'],
  ['Abiertos, en curso y bloqueados', 'Tus tickets asignados en Jira, con el último comentario si alguien te escribió.'],
  ['Barra de la métrica', 'Septiembre (línea base) contra octubre y noviembre, con la meta del 80 % y las aclaraciones del líder.'],
  ['Sincronizar PR', 'Trae tus PR de todos los proyectos para actualizar la barra y el informe.'],
  ['Informe', 'Los tres objetivos con gráficos, observaciones y descarga en PDF o CSV.'],
]

const COMMANDS = [
  ['bm plan CLAVE --wait', 'Genera el plan de abordaje del ticket.', 'Capa 3'],
  ['bm plan-publish CLAVE', 'Publica el plan en Jira (con tu permiso).', 'Capa 3'],
  ['bm review CLAVE --wait', 'Revisa la rama -test con pr-review.', 'Capa 3'],
  ['bm prs CLAVE --sync', 'Muestra los PR del ticket y su resultado.', 'Capa 2'],
  ['bm metrics --sync --detail', 'Métrica de objetivos con el detalle de cada PR.', 'Capa 2'],
  ['bm card add CLAVE', 'Crea la card de un ticket.', 'Base'],
] as const

const goalClass = (goal: Goal) => `docs__goal docs__goal--${goal === 'Base' ? 'base' : goal === 'Capa 2' ? 'two' : 'three'}`

function GoalTags({ goals }: { goals: Goal[] }) {
  return (
    <span className="docs__goals">
      {goals.map((goal) => (
        <span key={goal} className={goalClass(goal)}>
          {goal === 'Base' ? 'Funcionalidad base' : `Objetivo ${goal}`}
        </span>
      ))}
    </span>
  )
}

const NAV = [
  ['#flujo', 'Flujo'],
  ['#card', 'Anatomía de la card'],
  ['#agentes', 'Agentes y servicios'],
  ['#tablero', 'Tablero'],
  ['#informe', 'Informe'],
  ['#cli', 'Para agentes de IA'],
  ['#arquitectura', 'Arquitectura'],
]

export function DocsPage() {
  return (
    <div className="report docs">
      <header className="docs__hero">
        <p className="report__eyebrow">Branch Manager · Jira Smart Project · esinergia</p>
        <h1 className="docs__title">Cómo funciona Branch Manager</h1>
        <p className="docs__lead">
          Un tablero que acompaña cada ticket desde Jira hasta producción: planifica con IA, revisa el PR antes de que
          llegue al líder y mide cuántos PR se aprueban a la primera.
        </p>
        <nav className="docs__nav" aria-label="Secciones">
          {NAV.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a className="docs__nav-primary" href="/informe">
            Ver informe
          </a>
          <a href="/">Volver al tablero</a>
        </nav>
      </header>

      <section className="docs__features" aria-label="Lo esencial">
        <article>
          <span className={goalClass('Capa 3')}>Objetivo Capa 3</span>
          <h2>Planifica con IA</h2>
          <p>Lee el ticket desde Jira y deja una nota de cómo abordarlo con los criterios de pr-review.</p>
        </article>
        <article>
          <span className={goalClass('Capa 3')}>Objetivo Capa 3</span>
          <h2>Revisa antes del PR</h2>
          <p>pr-review y Claude revisan la rama -test como lo haría el líder, con certificado.</p>
        </article>
        <article>
          <span className={goalClass('Capa 2')}>Objetivo Capa 2</span>
          <h2>Mide el resultado</h2>
          <p>Cada PR de Bitbucket y GitHub muestra si se aprobó a la primera, contra la línea base de septiembre.</p>
        </article>
      </section>

      <section id="flujo" className="docs__section">
        <header className="docs__section-head">
          <span className="docs__step">01</span>
          <div>
            <h2>Flujo de trabajo</h2>
            <p>De Jira a producción. Los pasos verdes los ejecuta la IA; los ámbar son el resultado que se mide.</p>
          </div>
        </header>
        <Diagram title="Del ticket al PR aprobado" definition={WORKFLOW_DIAGRAM} />
      </section>

      <section id="card" className="docs__section">
        <header className="docs__section-head">
          <span className="docs__step">02</span>
          <div>
            <h2>Anatomía de la card</h2>
            <p>Cada card es un ticket. De arriba hacia abajo sigue el orden del trabajo.</p>
          </div>
        </header>
        <div className="docs__anatomy">
          <div className="docs__card-figure">
            <img src="/docs/card.png" alt="Card completa de un ticket en Branch Manager" />
            {CARD_PARTS.map((part, index) => (
              <a key={part.title} className="docs__pin" href={`#parte-${index + 1}`} style={{ top: `${part.pin}%` }}>
                {index + 1}
                <span className="visually-hidden">{part.title}</span>
              </a>
            ))}
          </div>
          <ol className="docs__parts">
            {CARD_PARTS.map((part, index) => (
              <li key={part.title} id={`parte-${index + 1}`} className="docs__part">
                <div className="docs__part-head">
                  <span className="docs__number">{index + 1}</span>
                  <h3>{part.title}</h3>
                  <GoalTags goals={part.goals} />
                </div>
                <img className="docs__shot" src={part.image} alt={`Sección «${part.title}» de la card`} loading="lazy" />
                <dl className="docs__facts">
                  <div>
                    <dt>Qué hace</dt>
                    <dd>{part.what}</dd>
                  </div>
                  <div>
                    <dt>Cuándo</dt>
                    <dd>{part.when}</dd>
                  </div>
                  <div>
                    <dt>Qué se dispara</dt>
                    <dd className="docs__chips">
                      {part.triggers.map((trigger) => (
                        <span key={trigger} className={`docs__chip docs__chip--${trigger}`}>
                          {TRIGGERS[trigger]}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="agentes" className="docs__section">
        <header className="docs__section-head">
          <span className="docs__step">03</span>
          <div>
            <h2>Agentes y servicios</h2>
            <p>Quién hace qué cuando pulsas un botón. La IA siempre trabaja en solo lectura sobre tu código.</p>
          </div>
        </header>
        <table className="report__table docs__table">
          <thead>
            <tr>
              <th scope="col">Agente o servicio</th>
              <th scope="col">Qué hace</th>
              <th scope="col">Se dispara con</th>
              <th scope="col">Objetivo</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((agent) => (
              <tr key={agent.name}>
                <th scope="row">{agent.name}</th>
                <td>{agent.what}</td>
                <td>{agent.trigger}</td>
                <td>
                  <span className={goalClass(agent.goal)}>{agent.goal === 'Base' ? 'Base' : agent.goal}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="docs__diagrams">
          <Diagram title="Qué pasa al pulsar «Generar plan»" definition={PLAN_SEQUENCE} />
          <Diagram title="Qué pasa al pulsar «Revisar»" definition={REVIEW_SEQUENCE} />
        </div>
      </section>

      <section id="tablero" className="docs__section">
        <header className="docs__section-head">
          <span className="docs__step">04</span>
          <div>
            <h2>El tablero</h2>
            <p>La pantalla principal reúne tus tickets, sus PR y tu avance.</p>
          </div>
        </header>
        <img className="docs__wide" src="/docs/dashboard.png" alt="Tablero de Branch Manager" loading="lazy" />
        <dl className="docs__grid">
          {DASHBOARD_PARTS.map(([name, what]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="informe" className="docs__section">
        <header className="docs__section-head">
          <span className="docs__step">05</span>
          <div>
            <h2>El informe</h2>
            <p>Resume los tres objetivos y se descarga en PDF o CSV.</p>
          </div>
        </header>
        <img className="docs__wide" src="/docs/report.png" alt="Informe de objetivos" loading="lazy" />
        <dl className="docs__grid">
          <div>
            <dt>Objetivos cumplidos</dt>
            <dd>Sección destacada con cuántos objetivos se cumplen y su resultado.</dd>
          </div>
          <div>
            <dt>Gráficos por mes</dt>
            <dd>Septiembre aparece con ★ porque es la línea base, sin pr-review. La línea punteada es la meta.</dd>
          </div>
          <div>
            <dt>3 entregas comparadas</dt>
            <dd>Tres PR de septiembre contra tres de octubre, con sus aclaraciones.</dd>
          </div>
          <div>
            <dt>Descargar PDF y CSV</dt>
            <dd>El PDF va directo al grano; el CSV trae el detalle de todos los PR para Excel.</dd>
          </div>
        </dl>
      </section>

      <section id="cli" className="docs__section">
        <header className="docs__section-head">
          <span className="docs__step">06</span>
          <div>
            <h2>Para agentes de IA</h2>
            <p>Todo lo que hace la card también se hace desde la terminal con el comando bm, para que cualquier agente lo use.</p>
          </div>
        </header>
        <div className="docs__commands">
          {COMMANDS.map(([command, what, goal]) => (
            <article key={command} className="docs__command">
              <code>{command}</code>
              <p>{what}</p>
              <span className={goalClass(goal)}>{goal === 'Base' ? 'Base' : goal}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="arquitectura" className="docs__section">
        <header className="docs__section-head">
          <span className="docs__step">07</span>
          <div>
            <h2>Arquitectura</h2>
            <p>Todo corre en tu equipo. Las credenciales nunca salen del servidor local ni llegan a la IA.</p>
          </div>
        </header>
        <Diagram title="Componentes" definition={ARCHITECTURE_DIAGRAM} />
      </section>
    </div>
  )
}
