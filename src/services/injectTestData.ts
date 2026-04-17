import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { FieldDef, LocationDef } from '../data/locations'
import { LOCATIONS } from '../data/locations'
import { FE_INCHES_EXPORT_LOCATION } from '../export/treatmentReportGrid'
import {
  TREATMENT_CATEGORIES,
  daysInMonthFromKey,
  locationsForCategory,
  weekRowDate,
  weekSlotFromDateInMonth,
} from '../data/treatmentReport'

const LOG_COLLECTION = 'logEntries'
const TREATMENT_COLLECTION = 'treatmentReportEntries'
const BATCH_SIZE = 500

/**
 * Demo pattern for weekly FTK test data: Cain = 1st & 4th week rows (slots 0, 3); Twin = 2nd & 3rd (slots 1, 2).
 * Other sample locations still get all four slots.
 */
function includeWeeklyTreatmentLocation(treatmentLocation: string, weekSlot: number): boolean {
  if (treatmentLocation === 'Cain Well #4') {
    return weekSlot === 0 || weekSlot === 3
  }
  if (treatmentLocation === 'Twin Well #2') {
    return weekSlot === 1 || weekSlot === 2
  }
  return true
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Every calendar day from 2026-01-01 through 2026-03-31 (inclusive). */
function eachDayJanThroughMar2026(): string[] {
  const dates: string[] = []
  const cur = new Date(2026, 0, 1)
  const end = new Date(2026, 2, 31)
  while (cur <= end) {
    dates.push(formatYmd(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function valueForField(f: FieldDef, dateStr: string, salt: number): string {
  if (f.key === 'comments' || f.type === 'textarea') {
    return 'test comment'
  }
  const n = Math.abs(
    (salt + f.key.length * 31 + dateStr.split('-').reduce((a, x) => a + Number(x), 0)) % 10000
  )
  switch (f.type) {
    case 'date':
      return dateStr
    case 'time': {
      const h = 6 + (n % 12)
      const m = n % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    case 'select': {
      const opts = f.options?.length ? f.options : ['On']
      return opts[n % opts.length] ?? opts[0]
    }
    case 'text':
    default:
      return String(100 + (n % 899))
  }
}

function buildTestValues(location: LocationDef, dateStr: string): Record<string, string> {
  const salt =
    location.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) +
    Number(dateStr.replace(/-/g, ''))
  const out: Record<string, string> = {}
  for (const f of location.fields) {
    out[f.key] = valueForField(f, dateStr, salt)
  }
  return out
}

export interface InjectTestDataResult {
  documentsWritten: number
  logDocumentsWritten: number
  treatmentDocumentsWritten: number
  locationsCount: number
  daysCount: number
}

/**
 * Inserts one log entry per calendar day (Jan–Mar 2026) for every location.
 * Uses batched writes (500 ops per batch).
 */
export async function injectTestDataForAllLocations(): Promise<InjectTestDataResult> {
  const dates = eachDayJanThroughMar2026()
  type Row = {
    locationId: string
    locationName: string
    entryDate: string
    values: Record<string, string>
  }
  const rows: Row[] = []
  for (const location of LOCATIONS) {
    for (const dateStr of dates) {
      rows.push({
        locationId: location.id,
        locationName: location.name,
        entryDate: dateStr,
        values: buildTestValues(location, dateStr),
      })
    }
  }

  type TreatmentRow = {
    monthKey: string
    entryDate: string
    weekSlot: number
    category: (typeof TREATMENT_CATEGORIES)[number]
    location: string
    value: string
  }
  const treatmentRows: TreatmentRow[] = []
  const monthKeys = ['2026-01', '2026-02', '2026-03']
  for (const monthKey of monthKeys) {
    for (const category of TREATMENT_CATEGORIES) {
      const locs = locationsForCategory(category)
      if (category === 'FE Inches') {
        const dim = daysInMonthFromKey(monthKey)
        const location = FE_INCHES_EXPORT_LOCATION
        for (let day = 1; day <= dim; day++) {
          const entryDate = `${monthKey}-${String(day).padStart(2, '0')}`
          const seed =
            monthKey.split('-').reduce((a, x) => a + Number(x), 0) +
            category.length * 13 +
            location.length * 7 +
            day * 19
          treatmentRows.push({
            monthKey,
            entryDate,
            weekSlot: weekSlotFromDateInMonth(entryDate, monthKey),
            category,
            location,
            value: (0.02 + (seed % 75) / 100).toFixed(2),
          })
        }
      } else {
        for (let slot = 0; slot < 4; slot++) {
          const entryDate = weekRowDate(monthKey, slot)
          for (const location of locs) {
            if (!includeWeeklyTreatmentLocation(location, slot)) continue
            const seed =
              monthKey.split('-').reduce((a, x) => a + Number(x), 0) +
              category.length * 13 +
              location.length * 7 +
              slot * 17
            treatmentRows.push({
              monthKey,
              entryDate,
              weekSlot: weekSlotFromDateInMonth(entryDate, monthKey),
              category,
              location,
              value: (0.02 + (seed % 75) / 100).toFixed(2),
            })
          }
        }
      }
    }
  }

  type BatchWriteRow =
    | {
        kind: 'log'
        locationId: string
        locationName: string
        entryDate: string
        values: Record<string, string>
      }
    | {
        kind: 'treatment'
        monthKey: string
        entryDate: string
        weekSlot: number
        category: string
        location: string
        value: string
      }

  const allRows: BatchWriteRow[] = [
    ...rows.map((r) => ({ kind: 'log' as const, ...r })),
    ...treatmentRows.map((r) => ({ kind: 'treatment' as const, ...r })),
  ]

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    const chunk = allRows.slice(i, i + BATCH_SIZE)
    for (const row of chunk) {
      if (row.kind === 'log') {
        const ref = doc(collection(db, LOG_COLLECTION))
        batch.set(ref, {
          locationId: row.locationId,
          locationName: row.locationName,
          entryDate: row.entryDate,
          values: row.values,
          submittedAt: serverTimestamp(),
        })
      } else {
        const ref = doc(collection(db, TREATMENT_COLLECTION))
        batch.set(ref, {
          monthKey: row.monthKey,
          entryDate: row.entryDate,
          weekSlot: row.weekSlot,
          category: row.category,
          location: row.location,
          value: row.value,
          submittedAt: serverTimestamp(),
        })
      }
    }
    await batch.commit()
  }

  return {
    documentsWritten: rows.length + treatmentRows.length,
    logDocumentsWritten: rows.length,
    treatmentDocumentsWritten: treatmentRows.length,
    locationsCount: LOCATIONS.length,
    daysCount: dates.length,
  }
}
