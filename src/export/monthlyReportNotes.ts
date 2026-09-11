import type { WeekFieldTestBundle } from './weeklyFieldTestToTemplate'
import { weekDateIso } from './weeklyFieldTestToTemplate'
import { formatTreatmentReportShortMdy } from './treatmentReportGrid'

/**
 * Fixed cells on the template "Weekly Field Test" sheet (template.xlsx at the repo root, which
 * is the district's own "Monthly Treatment Field Kit Data Report" layout). The title, the
 * "Number of backwashes during this month:" label, and the "Notes:" label are part of the
 * template; the export only writes values.
 */
export const WEEKLY_SHEET_SUMMARY = {
  gallonsCainRow: 22,
  gallonsTwinRow: 23,
  gallonsValueCol: 3,
  /** The count goes in the tan cell to the right of the district's backwash label (E22:H22). */
  backwashesRow: 22,
  backwashesValueCol: 9,
} as const

/** The bordered "Notes:" box: label in D25, note lines in D26:H29 (bottom edge on row 30). */
export const WEEKLY_SHEET_NOTES = {
  firstRow: 26,
  lastRow: 29,
  firstCol: 4,
  lastCol: 8,
  /** Merged D:H holds about this many characters at the template's 12pt font (checked in Excel). */
  maxCharsPerLine: 56,
  /** Template row height in points; used to grow the box when there are more lines than rows. */
  lineHeightPt: 15.6,
} as const

/** Label shown on the in-app weekly form and the weekly PDF (the Excel title already carries it). */
export const FIELD_KIT_DATA_LABEL = 'Field Kit Data'

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
 * Lines are pre-wrapped so each fits one row of the Notes box.
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
