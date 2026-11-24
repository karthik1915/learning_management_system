export interface FormatDateOptions {
  locale?: string
  timeZone?: string
  includeTime?: boolean
}

export function formatDate(
  isoString: string | Date | null | undefined,
  options: FormatDateOptions = {},
): string {
  if (!isoString) return '—'

  const date = isoString instanceof Date ? isoString : new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'

  const { locale, timeZone, includeTime = false } = options

  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: 'medium', // e.g. "Nov 15, 2026"
    ...(includeTime ? { timeStyle: 'short' } : {}), // e.g. "11:19 AM"
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}
