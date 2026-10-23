import './bar-chart.scss'

export interface BarDatum {
  label: string
  value: number | null
  display: string
  detail: string
  highlight?: boolean
}

interface BarChartProps {
  title: string
  data: BarDatum[]
  max: number
  target?: { value: number; label: string }
  better: 'higher' | 'lower'
}

const WIDTH = 520
const HEIGHT = 220
const PADDING = { top: 24, right: 16, bottom: 40, left: 16 }
const BAR_WIDTH = 72

export function BarChart({ title, data, max, target, better }: BarChartProps) {
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const step = (WIDTH - PADDING.left - PADDING.right) / data.length
  const y = (value: number) => PADDING.top + plotHeight - (Math.min(value, max) / max) * plotHeight

  return (
    <figure className="bar-chart">
      <figcaption className="bar-chart__title">{title}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.display}`).join(', ')}`}>
        <line className="bar-chart__axis" x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y(0)} y2={y(0)} />
        {data.map((datum, index) => {
          const x = PADDING.left + step * index + (step - BAR_WIDTH) / 2
          const meets = datum.value !== null && target ? (better === 'higher' ? datum.value >= target.value : datum.value <= target.value) : false
          return (
            <g key={datum.label}>
              <title>{`${datum.label}: ${datum.display} · ${datum.detail}`}</title>
              {datum.value !== null && (
                <>
                  <path
                    className={`bar-chart__bar ${datum.highlight ? 'bar-chart__bar--baseline' : meets ? 'bar-chart__bar--met' : ''}`}
                    d={`M ${x} ${y(0)} V ${y(datum.value) + 4} q 0 -4 4 -4 H ${x + BAR_WIDTH - 4} q 4 0 4 4 V ${y(0)} Z`}
                  />
                  <text className="bar-chart__value" x={x + BAR_WIDTH / 2} y={y(datum.value) - 8} textAnchor="middle">
                    {datum.display}
                  </text>
                </>
              )}
              {datum.value === null && (
                <text className="bar-chart__empty" x={x + BAR_WIDTH / 2} y={y(0) - 8} textAnchor="middle">
                  sin datos aún
                </text>
              )}
              <text className="bar-chart__label" x={x + BAR_WIDTH / 2} y={HEIGHT - 16} textAnchor="middle">
                {datum.highlight ? `★ ${datum.label}` : datum.label}
              </text>
            </g>
          )
        })}
        {target && (
          <g>
            <line
              className="bar-chart__target"
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(target.value)}
              y2={y(target.value)}
            />
            <text className="bar-chart__target-label" x={WIDTH - PADDING.right} y={y(target.value) - 6} textAnchor="end">
              {target.label}
            </text>
          </g>
        )}
      </svg>
    </figure>
  )
}
