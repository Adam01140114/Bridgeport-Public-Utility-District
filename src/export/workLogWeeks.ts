import { getLocationById } from '../data/locations'
import type { LogEntry } from '../types/entry'
import { formatShortDate, formatTimeAmPm } from './entryFormatting'

/** One submission in the work log. */
export type WorkLogRow = {
  entry: LogEntry
  /** Server submission time in ms, or null while the write is still pending locally. */
  submittedMs: number | null
  submittedLabel: string
  operator: string
  site: string
  entryDate: string
  /** Time typed on the form (first time-type field), 12h. */
  formTime: string
  /** First non-empty free-text field (comments, notes, site condition). */
  notes: string
}

/** Sunday–Saturday week of submissions, newest first. */
export type WorkLogWeek = {
  key: string
  start: Date
  end: Date
  label: string
  rows: WorkLogRow[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function weekStartSunday(d: Date): Date {
  const day = startOfLocalDay(d)
  day.setDate(day.getDate() - day.getDay())
  return day
}

function isoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function entryDateAsLocalDate(entryDate: string): Date | null {
  const m = entryDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function submittedMillis(entry: LogEntry): number | null {
  const t = entry.submittedAt
  if (!t || typeof t.toMillis !== 'function') return null
  try {
    return t.toMillis()
  } catch {
    return null
  }
}

export function formatSubmittedFull(ms: number | null): string {
  if (ms === null) return 'Pending…'
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatWeekRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

function firstFormTime(entry: LogEntry): string {
  const def = getLocationById(entry.locationId)
  const timeField = def?.fields.find((f) => f.type === 'time')
  const raw = timeField ? entry.values[timeField.key] : entry.values.time
  return formatTimeAmPm(raw ?? '')
}

function firstNotes(entry: LogEntry): string {
  const def = getLocationById(entry.locationId)
  const keys = def
    ? def.fields.filter((f) => f.type === 'textarea').map((f) => f.key)
    : ['comments', 'notes', 'siteCondition']
  for (const key of keys) {
    const v = entry.values[key]?.trim()
    if (v) return v
  }
  return ''
}

export function toWorkLogRow(entry: LogEntry): WorkLogRow {
  const submittedMs = submittedMillis(entry)
  return {
    entry,
    submittedMs,
    submittedLabel: formatSubmittedFull(submittedMs),
    operator: entry.operator.trim(),
    site: entry.locationName || getLocationById(entry.locationId)?.name || entry.locationId,
    entryDate: entry.entryDate.trim() ? formatShortDate(entry.entryDate) : '',
    formTime: firstFormTime(entry),
    notes: firstNotes(entry),
  }
}

/**
 * Group submissions into Sunday–Saturday weeks by the automatic submission timestamp
 * (falling back to the form date only while a write is still pending). Newest week first,
 * newest submission first inside each week.
 */
export function groupEntriesByWeek(entries: LogEntry[]): WorkLogWeek[] {
  const map = new Map<string, WorkLogWeek>()
  for (const entry of entries) {
    const row = toWorkLogRow(entry)
    const anchor =
      row.submittedMs !== null
        ? new Date(row.submittedMs)
        : (entryDateAsLocalDate(entry.entryDate) ?? new Date())
    const start = weekStartSunday(anchor)
    const key = isoLocal(start)
    let week = map.get(key)
    if (!week) {
      const end = new Date(start.getTime() + 6 * DAY_MS)
      week = { key, start, end, label: formatWeekRangeLabel(start, end), rows: [] }
      map.set(key, week)
    }
    week.rows.push(row)
  }
  const weeks = [...map.values()]
  for (const week of weeks) {
    week.rows.sort((a, b) => (b.submittedMs ?? Infinity) - (a.submittedMs ?? Infinity))
  }
  weeks.sort((a, b) => b.key.localeCompare(a.key))
  return weeks
}

export const WORK_LOG_COLUMNS = [
  'Submitted (auto timestamp)',
  'Operator',
  'Site',
  'Log date',
  'Time on form',
  'Comments / notes',
] as const

/** Table body in chronological order (oldest first), which reads best on a printed weekly log. */
export function workLogTableBody(week: WorkLogWeek): string[][] {
  return [...week.rows]
    .sort((a, b) => (a.submittedMs ?? Infinity) - (b.submittedMs ?? Infinity))
    .map((r) => [r.submittedLabel, r.operator, r.site, r.entryDate, r.formTime, r.notes])
}
