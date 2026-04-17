import {
  TREATMENT_CATEGORIES,
  daysInMonthFromKey,
  vesselColumnsForCategory,
  weekRowDate,
} from '../data/treatmentReport'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

/** Column order for PDF / Excel treatment report grids. */
export const TREATMENT_REPORT_HEADER_LOCATIONS = [
  'Cain Well #4',
  'Twin Well #2',
  'Weekly Eff.',
  'Vessel #1 Eff.',
  'Vessel #2 Eff.',
  'Vessel #3 Eff.',
] as const

export const TREATMENT_REPORT_COLUMN_COUNT = 2 + TREATMENT_REPORT_HEADER_LOCATIONS.length

export function formatTreatmentReportShortMdy(iso: string): string {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  const mo = Number(m[2])
  const d = Number(m[3])
  const y = Number(m[1]) % 100
  return `${mo}/${d}/${String(y).padStart(2, '0')}`
}

function weeklyCellValue(
  entries: TreatmentReportEntry[],
  category: string,
  location: string,
  weekSlot: number
): string {
  const hit = entries.find(
    (e) => e.category === category && e.location === location && e.weekSlot === weekSlot
  )
  return hit?.value?.trim() ?? ''
}

function feInchesDayCellValue(
  entries: TreatmentReportEntry[],
  entryDate: string,
  location: string
): string {
  const hit = entries.find(
    (e) =>
      e.category === 'FE Inches' && e.location === location && e.entryDate === entryDate
  )
  return hit?.value?.trim() ?? ''
}

/** Body rows for the monthly grid: weekly categories × 4 week rows; FE Inches × one row per calendar day; blank row between categories. */
export function buildTreatmentReportTableBody(
  monthKey: string,
  entries: TreatmentReportEntry[]
): string[][] {
  const body: string[][] = []

  TREATMENT_CATEGORIES.forEach((category, index) => {
    const showVessels = vesselColumnsForCategory(category)

    if (category === 'FE Inches') {
      const dim = daysInMonthFromKey(monthKey)
      for (let day = 1; day <= dim; day++) {
        const entryDate = `${monthKey}-${String(day).padStart(2, '0')}`
        body.push([
          category,
          formatTreatmentReportShortMdy(entryDate),
          ...TREATMENT_REPORT_HEADER_LOCATIONS.map((loc) => {
            if (!showVessels && loc.startsWith('Vessel')) return ''
            return feInchesDayCellValue(entries, entryDate, loc)
          }),
        ])
      }
    } else {
      for (let slot = 0; slot < 4; slot++) {
        const rowDate = weekRowDate(monthKey, slot)
        body.push([
          category,
          formatTreatmentReportShortMdy(rowDate),
          ...TREATMENT_REPORT_HEADER_LOCATIONS.map((loc) => {
            if (!showVessels && loc.startsWith('Vessel')) return ''
            return weeklyCellValue(entries, category, loc, slot)
          }),
        ])
      }
    }

    if (index < TREATMENT_CATEGORIES.length - 1) {
      body.push(Array.from({ length: TREATMENT_REPORT_COLUMN_COUNT }, () => ''))
    }
  })

  return body
}
