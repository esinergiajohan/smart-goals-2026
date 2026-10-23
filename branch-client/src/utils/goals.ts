export interface GoalPeriod {
  label: string
  from: string
  to: string
}

export const FIRST_ATTEMPT_TARGET = 0.8

export const BASELINE_PERIOD: GoalPeriod = { label: 'Septiembre (línea base)', from: '2026-09-01', to: '2026-10-01' }

export const GOAL_PERIOD: GoalPeriod = { label: 'Octubre – noviembre', from: '2026-10-01', to: '2026-12-01' }

export const formatRate = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 1000) / 10} %`)
