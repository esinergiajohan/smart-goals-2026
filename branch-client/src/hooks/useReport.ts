import { useEffect, useState } from 'react'
import { fetchReportPeriod, fetchReportUsage } from '../services/report.ts'
import type { ReportPeriod, ReportUsage } from '../types/report.ts'
import { GOAL_PERIOD, REPORT_MONTHS } from '../utils/goals.ts'

interface ReportState {
  months: ReportPeriod[]
  goal?: ReportPeriod
  usage?: ReportUsage
  error?: string
}

export function useReport() {
  const [state, setState] = useState<ReportState>({ months: [] })

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      Promise.all(REPORT_MONTHS.map((month) => fetchReportPeriod(month.from, month.to, controller.signal))),
      fetchReportPeriod(GOAL_PERIOD.from, GOAL_PERIOD.to, controller.signal),
      fetchReportUsage(controller.signal),
    ])
      .then(([months, goal, usage]) => setState({ months, goal, usage }))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setState({ months: [], error: cause instanceof Error ? cause.message : 'No se pudo generar el informe' })
        }
      })
    return () => controller.abort()
  }, [])

  return state
}
