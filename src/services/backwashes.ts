import { BACKWASH_FIELD_KEY, BACKWASH_LOCATION_ID } from '../data/locations'
import type { LogEntry } from '../types/entry'
import { fetchEntriesForLocation } from './entries'

function parseBackwashCount(raw: string | undefined): number {
  const t = raw?.trim() ?? ''
  if (!t) return 0
  const n = Number(t.replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

/** Sum of "Backwashes performed" across every Twin Lakes daily entry dated in the month. */
export function sumBackwashesInMonth(entries: LogEntry[], monthKey: string): number {
  let total = 0
  for (const entry of entries) {
    if (!entry.entryDate.startsWith(monthKey)) continue
    total += parseBackwashCount(entry.values[BACKWASH_FIELD_KEY])
  }
  return total
}

export async function computeMonthlyBackwashCount(monthKey: string): Promise<number> {
  const entries = await fetchEntriesForLocation(BACKWASH_LOCATION_ID)
  return sumBackwashesInMonth(entries, monthKey)
}
