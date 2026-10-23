import '../report/report.scss'
import './docs.scss'

interface DocItem {
  name: string
  what: string
  when?: string
}

const SECTIONS: Array<{ title: string; intro?: string; items: DocItem[] }> = [
  {
    title: 'El tablero',
    intro: 'La pantalla principal reúne tus tickets de Jira, sus ramas, sus PR y tu avance en los objetivos.',
    items: [
      { name: 'Buscador', what: 'Busca un ticket de Jira por clave o título y crea su card.', when: 'Al empezar a trabajar un ticket.' },
      {
        name: 'Pendientes de despliegue',
        what: 'Cards de tickets en los que estás trabajando o que esperan llegar a producción.',
      },
      { name: 'En producción', what: 'Cards de tickets que ya marcaste como desplegados.' },
      {
        name: 'Abiertos, en curso y bloqueados',
        what: 'Tus tickets asignados en Jira que siguen abiertos, con el último comentario si alguien te escribió.',
      },
      {
        name: 'Barra «PR aprobados sin devolución»',
        what: 'Compara septiembre (línea base, sin pr-review) contra octubre y noviembre (con pr-review), con la meta del 80 % y las aclaraciones del líder.',
      },
      {
        name: 'Botón «Sincronizar PR»',
        what: 'Trae de Bitbucket y GitHub tus PR de todos los proyectos para actualizar la barra y el informe.',
        when: 'Antes de mirar el informe o después de que te aprueben un PR.',
      },
      { name: 'Botón «Informe»', what: 'Abre el informe de tus objetivos, listo para descargar en PDF o CSV.' },
      { name: 'Botón «Documentación»', what: 'Abre esta página.' },
    ],
  },
  {
    title: 'La card de un ticket',
    intro: 'Cada card es un ticket. De arriba hacia abajo sigue el orden del trabajo.',
    items: [
      { name: 'Clave y título', what: 'El ticket de Jira. La franja de color a la izquierda muestra su estado en Jira.' },
      {
        name: 'Comentario destacado',
        what: 'Pega el enlace de un comentario de Jira para tenerlo siempre a la vista (por ejemplo, el cierre o una instrucción del líder).',
      },
      {
        name: 'Plan de abordaje · «Generar plan»',
        what: 'La IA lee el ticket, su historia y sus comentarios directamente desde Jira, revisa el código del proyecto y te dice cómo abordarlo con los criterios de pr-review: criterios de aceptación, preguntas para confirmar con el solicitante, archivos que se tocan, pasos, riesgos, despliegue y pruebas.',
        when: 'Al iniciar el ticket, antes de programar.',
      },
      {
        name: 'Plan de abordaje · «Publicar en Jira»',
        what: 'Deja el plan como nota interna en el ticket de Jira, con tu cuenta. Si lo vuelves a publicar, se actualiza la misma nota.',
      },
      {
        name: 'Ramas',
        what: 'La rama de trabajo y sus copias para develop (DEV) y staging (STG). Con «Release» activo, la rama de trabajo es la release y puedes ver las ramas que se le unieron.',
      },
      {
        name: 'Pull requests',
        what: 'Cada PR del ticket con su resultado: «Aprobado sin devolución» (verde), «Devuelto» con el motivo (rojo) o «PR abierto» (ámbar). El número abre el PR.',
      },
      {
        name: 'Revisión local · Repositorio',
        what: 'El proyecto (carpeta) donde vive el código del ticket. Se elige una vez por card.',
      },
      {
        name: 'Revisión local · «Revisar»',
        what: 'Simula el PR: pr-review y la IA revisan la rama -test igual que lo haría el líder, y dejan las correcciones o el visto bueno con su certificado. Cada revisión queda como una iteración.',
        when: 'Antes de pedir el PR a staging. Si pide ajustes, se corrigen y se vuelve a revisar.',
      },
      {
        name: '«Desplegado en producción» / «¿Rollback?»',
        what: 'Mueve la card a «En producción» o la devuelve a pendientes.',
      },
    ],
  },
  {
    title: 'El informe',
    items: [
      {
        name: 'Resumen',
        what: 'Los tres objetivos con su resultado y si están cumplidos.',
      },
      {
        name: 'Gráficos por mes',
        what: 'Septiembre aparece con ★ porque es la línea base (sin pr-review). La línea punteada es la meta.',
      },
      { name: '3 entregas comparadas', what: 'Tres PR de septiembre contra tres de octubre, con sus aclaraciones.' },
      { name: 'Observaciones', what: 'Dónde y cómo se cumple cada objetivo y cómo se usó la IA.' },
      { name: '«Descargar PDF»', what: 'Abre la ventana de impresión: elige «Guardar como PDF».' },
      { name: '«Descargar CSV»', what: 'Descarga el detalle de todos los PR para abrirlo en Excel.' },
    ],
  },
  {
    title: 'Flujo de trabajo recomendado',
    items: [
      { name: '1. Crear la card', what: 'Busca el ticket y asigna el repositorio.' },
      { name: '2. Generar el plan', what: 'Revisa el plan, confirma las preguntas con el solicitante y publícalo en Jira.' },
      { name: '3. Implementar', what: 'Trabaja en la rama del ticket.' },
      { name: '4. Revisar', what: 'Crea la rama -test y pulsa «Revisar» hasta que quede aprobada.' },
      { name: '5. Pedir el PR', what: 'Lleva los cambios a DEV y STG y pide el PR. La card mostrará si se aprobó a la primera.' },
    ],
  },
  {
    title: 'Para agentes de IA',
    intro: 'Todo lo que hace la card también se puede hacer desde la terminal con el comando bm, para que cualquier agente lo use.',
    items: [
      { name: 'bm plan CLAVE --wait', what: 'Genera el plan de abordaje.' },
      { name: 'bm review CLAVE --wait', what: 'Revisa la rama -test con pr-review.' },
      { name: 'bm prs CLAVE --sync', what: 'Muestra los PR del ticket y su resultado.' },
      { name: 'bm metrics --sync --detail', what: 'Muestra la métrica de objetivos con el detalle de cada PR.' },
    ],
  },
]

export function DocsPage() {
  return (
    <div className="report docs">
      <header className="report__header">
        <div>
          <p className="report__eyebrow">Branch Manager · Jira Smart Project</p>
          <h1 className="report__title">Documentación</h1>
          <p className="report__meta">Qué hace cada parte y cuándo usarla.</p>
        </div>
        <nav className="report__actions" aria-label="Navegación">
          <a className="report__button" href="/informe">
            Ver informe
          </a>
          <a className="report__button" href="/">
            Volver al tablero
          </a>
        </nav>
      </header>
      <main className="report__content">
        {SECTIONS.map((section) => (
          <section key={section.title} className="report__section">
            <h2>{section.title}</h2>
            {section.intro && <p className="report__legend">{section.intro}</p>}
            <dl className="docs__list">
              {section.items.map((item) => (
                <div key={item.name} className="docs__item">
                  <dt>{item.name}</dt>
                  <dd>
                    {item.what}
                    {item.when && <span className="docs__when">Cuándo: {item.when}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </main>
    </div>
  )
}
