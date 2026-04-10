import type { FieldDef } from '../data/locations'
import type { LogEntry } from '../types/entry'

export function formatShortDate(ymd: string): string {
  const t = ymd?.trim()
  const m = t?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return t ?? ''
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

/** HTML time inputs use 24h (e.g. "19:02"); exports show 12h with AM/PM. */
export function formatTimeAmPm(raw: string): string {
  const t = raw?.trim()
  if (!t) return ''
  if (/\b(am|pm)\b/i.test(t)) return t
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return t
  const h24 = Number(m[1])
  if (h24 > 23 || Number(m[2]) > 59) return t
  const min = m[2]
  const period = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${min} ${period}`
}

export function monthTitleLine(monthKey: string): string {
  if (monthKey === '_unknown') return 'For ____________________'
  const [y, mo] = monthKey.split('-').map(Number)
  if (!y || !mo) return 'For ____________________'
  const d = new Date(y, mo - 1, 1)
  const monthName = d.toLocaleString(undefined, { month: 'long' })
  return `For ${monthName} ${y}`
}

export function sortChronological(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => {
    const c = a.entryDate.trim().localeCompare(b.entryDate.trim())
    if (c !== 0) return c
    const ta = a.values['time'] ?? ''
    const tb = b.values['time'] ?? ''
    return ta.localeCompare(tb)
  })
}

export function cellForField(entry: LogEntry, field: FieldDef): string {
  if (field.key === 'date' && entry.entryDate.trim()) return formatShortDate(entry.entryDate)
  const raw = entry.values[field.key]
  if (raw === undefined || raw === '') return ''
  if (field.type === 'time') return formatTimeAmPm(raw)
  return raw
}

export function fieldByKey(fields: FieldDef[], key: string): FieldDef {
  return fields.find((f) => f.key === key) ?? { key, label: key, type: 'text' }
}
