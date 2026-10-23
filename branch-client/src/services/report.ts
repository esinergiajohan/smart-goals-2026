import type { ReportPeriod, ReportUsage } from '../types/report.ts'
import { apiRequest } from './api.ts'

export async function fetchReportPeriod(from: string, to: string, signal?: AbortSignal): Promise<ReportPeriod> {
  return apiRequest<ReportPeriod>(`/api/metrics?${new URLSearchParams({ from, to, detail: '1' })}`, { signal })
}

export async function fetchReportUsage(signal?: AbortSignal): Promise<ReportUsage> {
  return apiRequest<ReportUsage>('/api/report', { signal })
}
