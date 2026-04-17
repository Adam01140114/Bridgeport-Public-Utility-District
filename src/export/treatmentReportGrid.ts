import {
  TREATMENT_CATEGORIES,
  daysInMonthFromKey,
  vesselColumnsForCategory,
  weekRowDate,
} from '../data/treatmentReport'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

/** Column order for weekly FTK grid (PDF/Excel sheet 1). */
export const TREATMENT_REPORT_HEADER_LOCATIONS = [
  'Cain Well #4',
  'Twin Well #2',
  'Weekly Eff.',
  'Vessel #1 Eff.',
  'Vessel #2 Eff.',
  'Vessel #3 Eff.',
] as const

/** FE tank readings from Twin Lakes Well I Arsenic Plant map to this treatment location in-app. */
export const FE_INCHES_EXPORT_LOCATION = 'Twin Well #2' as const

const WEEKLY_EXPORT_CATEGORIES = TREATMENT_CATEGORIES.filter((c) => c !== 'FE Inches')

export function buildWeeklyTreatmentReportHeaderRow(): string[] {
  return ['Category', 'DATE', ...TREATMENT_REPORT_HEADER_LOCATIONS]
}

export const WEEKLY_TREATMENT_REPORT_COLUMN_COUNT = buildWeeklyTreatmentReportHeaderRow().length

/** Second table / sheet: Twin Lakes daily FE only. */
export function buildFeTreatmentReportHeaderRow(): string[] {
  return ['FE date', 'FE Inches']
}

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

function feInchesForCalendarDay(
  entries: TreatmentReportEntry[],
  entryDate: string
): { dateDisplay: string; value: string } {
  const hit = entries.find(
    (e) =>
      e.category === 'FE Inches' &&
      e.location === FE_INCHES_EXPORT_LOCATION &&
      e.entryDate === entryDate
  )
  return {
    dateDisplay: formatTreatmentReportShortMdy(entryDate),
    value: hit?.value?.trim() ?? '',
  }
}

/** Weekly FTK only; blank rows between categories. */
export function buildWeeklyTreatmentReportBody(
  monthKey: string,
  entries: TreatmentReportEntry[]
): string[][] {
  const body: string[][] = []

  WEEKLY_EXPORT_CATEGORIES.forEach((category, index) => {
    const showVessels = vesselColumnsForCategory(category)

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

    if (index < WEEKLY_EXPORT_CATEGORIES.length - 1) {
      body.push(Array.from({ length: WEEKLY_TREATMENT_REPORT_COLUMN_COUNT }, () => ''))
    }
  })

  return body
}

/** One row per calendar day; Twin Lakes FE tank via treatment entries. */
export function buildFeTreatmentReportBody(
  monthKey: string,
  entries: TreatmentReportEntry[]
): string[][] {
  const dim = daysInMonthFromKey(monthKey)
  const rows: string[][] = []
  for (let day = 1; day <= dim; day++) {
    const entryDate = `${monthKey}-${String(day).padStart(2, '0')}`
    const fe = feInchesForCalendarDay(entries, entryDate)
    rows.push([fe.dateDisplay, fe.value])
  }
  return rows
}
