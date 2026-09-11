import type { WeekFieldTestBundle } from './weeklyFieldTestToTemplate'
import { weekDateIso } from './weeklyFieldTestToTemplate'
import { formatTreatmentReportShortMdy } from './treatmentReportGrid'

/** Fixed cells on the template "Weekly Field Test" sheet (see template.xlsx at the repo root). */
export const WEEKLY_SHEET_SUMMARY = {
  gallonsCainRow: 22,
  gallonsTwinRow: 23,
  gallonsValueCol: 3,
  /** Empty template row directly under the gallons rows; styled like them at export time. */
  backwashesRow: 24,
  backwashesLabel: 'Number of Backwashes this month:',
} as const

/** DDW asked for a label saying the sheet holds field-kit (not lab) results. Row 3 is blank in the template. */
export const WEEKLY_SHEET_FIELD_KIT_LABEL = {
  row: 3,
  firstCol: 1,
  lastCol: 8,
  text: 'Field Kit Data',
} as const

/** The bordered "Observations:" box (D26:H29) that the app fills with report notes. */
export const WEEKLY_SHEET_NOTES = {
  labelRow: 25,
  firstRow: 26,
  lastRow: 29,
  firstCol: 4,
  lastCol: 8,
  /** Merged D:H is roughly this wide at the template's 12pt font. */
  maxCharsPerLine: 68,
} as const

/** Same label used on the in-app form and the weekly PDF. */
export const FIELD_KIT_DATA_LABEL = WEEKLY_SHEET_FIELD_KIT_LABEL.text

function wrapLine(line: string, max: number): string[] {
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const out: string[] = []
  let cur = ''
  for (const word of words) {
    if (!cur) {
      cur = word
    } else if (cur.length + 1 + word.length <= max) {
      cur = `${cur} ${word}`
    } else {
      out.push(cur)
      cur = word
    }
    while (cur.length > max) {
      out.push(cur.slice(0, max))
      cur = cur.slice(max)
    }
  }
  if (cur) out.push(cur)
  return out
}

function nonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/**
 * Notes for the monthly report: month-level notes first, then each week's
 * "Additional notes" from the weekly field-test form, prefixed with the week and date.
 * Lines are pre-wrapped so each fits one row of the Observations box.
 */
export function buildMonthlyReportNoteLines(params: {
  monthNotes: string
  weeks: WeekFieldTestBundle[]
}): string[] {
  const { monthNotes, weeks } = params
  const max = WEEKLY_SHEET_NOTES.maxCharsPerLine
  const lines: string[] = []

  for (const line of nonEmptyLines(monthNotes)) {
    lines.push(...wrapLine(line, max))
  }

  for (const bundle of [...weeks].sort((a, b) => a.weekIndex - b.weekIndex)) {
    const noteLines = nonEmptyLines(bundle.values['footer:notes'] ?? '')
    if (noteLines.length === 0) continue
    const prefix = `Week ${bundle.weekIndex + 1} (${formatTreatmentReportShortMdy(weekDateIso(bundle))}): `
    noteLines.forEach((line, i) => {
      lines.push(...wrapLine(i === 0 ? prefix + line : line, max))
    })
  }

  return lines
}
