const longDateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatLongDate = (iso: string) => {
  const text = longDateFormatter.format(new Date(iso))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const shortDateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatShortDate = (iso: string) =>
  shortDateFormatter
    .formatToParts(new Date(iso))
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value.replace('.', ''))
    .join(' ')
