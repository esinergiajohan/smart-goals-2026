export type StatusTone = 'open' | 'progress' | 'blocked' | 'done'

export const statusTone = (name: string, category?: string): StatusTone => {
  const normalized = name.toLowerCase()
  if (normalized.includes('bloque') || normalized.includes('block')) return 'blocked'
  if (category === 'done') return 'done'
  if (category === 'indeterminate' || normalized.includes('curso')) return 'progress'
  return 'open'
}
