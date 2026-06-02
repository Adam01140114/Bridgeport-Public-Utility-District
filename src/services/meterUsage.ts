import { shiftMonthKey } from '../data/monthKeyNav'
import type { LogEntry } from '../types/entry'
import { fetchEntriesForLocation } from './entries'

/** Daily log locations whose `meterReading` feeds the monthly “gallons treated” rows. */
export const METER_USAGE_LOCATION_IDS = {
  cain: 'cain-well-daily-log',
  twin: 'twin-lakes-well-i-arsenic-plant',
} as const

export type MonthlyMeterUsage = {
  cainGallons: number | null
  twinGallons: number | null
}

function parseMeterReading(raw: string | undefined): number | null {
  if (!raw?.trim()) return null
  const cleaned = raw.trim().replace(/,/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

/** Latest meter reading logged in that calendar month (by entry date). */
function lastMeterReadingInMonth(entries: LogEntry[], monthKey: string): number | null {
  let latestDate = ''
  let reading: number | null = null
  for (const entry of entries) {
    if (!entry.entryDate.startsWith(monthKey)) continue
    const parsed = parseMeterReading(entry.values.meterReading)
    if (parsed === null) continue
    if (entry.entryDate >= latestDate) {
      latestDate = entry.entryDate
      reading = parsed
    }
  }
  return reading
}

function gallonsBetweenMonths(entries: LogEntry[], monthKey: string): number | null {
  const prevKey = shiftMonthKey(monthKey, -1)
  const current = lastMeterReadingInMonth(entries, monthKey)
  const previous = lastMeterReadingInMonth(entries, prevKey)
  if (current === null || previous === null) return null
  return current - previous
}

export async function computeMonthlyMeterUsage(monthKey: string): Promise<MonthlyMeterUsage> {
  const [cainEntries, twinEntries] = await Promise.all([
    fetchEntriesForLocation(METER_USAGE_LOCATION_IDS.cain),
    fetchEntriesForLocation(METER_USAGE_LOCATION_IDS.twin),
  ])
  return {
    cainGallons: gallonsBetweenMonths(cainEntries, monthKey),
    twinGallons: gallonsBetweenMonths(twinEntries, monthKey),
  }
}
