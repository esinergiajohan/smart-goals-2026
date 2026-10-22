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
