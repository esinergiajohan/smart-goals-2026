import { formatLongDate } from '../../../utils/formatDate.ts'

interface DateTimeProps {
  value: string
}

export function DateTime({ value }: DateTimeProps) {
  return <time dateTime={value}>{formatLongDate(value)}</time>
}
