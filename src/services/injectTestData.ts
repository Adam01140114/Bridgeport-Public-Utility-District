import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { FieldDef, LocationDef } from '../data/locations'
import { LOCATIONS } from '../data/locations'

const COLLECTION = 'logEntries'
const BATCH_SIZE = 500

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
    case 'textarea':
      return `Test data — ${dateStr}. Routine check (admin inject).`
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

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    const chunk = rows.slice(i, i + BATCH_SIZE)
    for (const row of chunk) {
      const ref = doc(collection(db, COLLECTION))
      batch.set(ref, {
        locationId: row.locationId,
        locationName: row.locationName,
        entryDate: row.entryDate,
        values: row.values,
        submittedAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }

  return {
    documentsWritten: rows.length,
    locationsCount: LOCATIONS.length,
    daysCount: dates.length,
  }
}
