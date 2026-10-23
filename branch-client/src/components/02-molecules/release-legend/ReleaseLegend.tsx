import { classNames } from '../../../utils/classNames.ts'
import './release-legend.scss'

const ORIGINS = [
  { tone: 'main', label: 'de main' },
  { tone: 'release', label: 'de la release' },
  { tone: 'alert', label: 'otra base' },
]

const STROKES = [
  { stroke: 'merge', label: 'merge' },
  { stroke: 'cherry-pick', label: 'cherry-pick' },
  { stroke: 'direct', label: 'commits directos' },
  { stroke: 'pending', label: 'sin unir' },
]

const CHEVRON_STOPS = [6, 14, 22]

export function ReleaseLegend() {
  return (
    <section className="release-legend" aria-label="Leyenda del grafo de releases">
      <div className="release-legend__group">
        <span className="release-legend__title">Color · de dónde sale</span>
        {ORIGINS.map(({ tone, label }) => (
          <span key={tone} className={classNames('release-legend__origin', `release-legend__origin--${tone}`)}>
            {label}
          </span>
        ))}
      </div>
      <div className="release-legend__group">
        <span className="release-legend__title">Trazo · cómo entró</span>
        {STROKES.map(({ stroke, label }) => (
          <span key={stroke} className="release-legend__stroke">
            <svg viewBox="0 0 28 8" className="release-legend__sample" aria-hidden="true">
              <path d="M 1 4 H 27" className={`release-legend__line release-legend__line--${stroke}`} />
              {stroke === 'cherry-pick' &&
                CHEVRON_STOPS.map((x) => (
                  <path key={x} d="M -2.5 -3 L 1.5 0 L -2.5 3" transform={`translate(${x} 4)`} className="release-legend__chevron" />
                ))}
            </svg>
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
