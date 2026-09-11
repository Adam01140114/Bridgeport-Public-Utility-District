import { buildMonthlyReportNoteLines } from '../export/monthlyReportNotes'
import type { WeekFieldTestBundle } from '../export/weeklyFieldTestToTemplate'
import { computeMonthlyMeterUsage } from '../services/meterUsage'
import { fetchTreatmentEntriesForMonth } from '../services/treatmentEntries'
import {
  fillFeSheetFromTreatmentEntries,
  fillWeeklySheetFromFieldTests,
  loadTreatmentReportTemplateWorkbook,
  writeTreatmentReportWorkbook,
} from './treatmentReportTemplate'

const SHEET_WEEKLY = 'Weekly Field Test'
const SHEET_FE = 'FE Tank (inches)'

/**
 * Export the district monthly treatment workbook: load `template.xlsx`, fill weekly
 * field-test readings (all weeks in the month), the "Field Kit Data" label, the monthly
 * backwash count, report notes, and Twin Lakes FE tank rows. Template formatting is preserved.
 */
export async function exportMonthlyFieldTestReportXlsx(params: {
  monthKey: string
  weeks: WeekFieldTestBundle[]
  /** Month-level notes typed on the report month screen. */
  monthNotes: string
  /** Backwashes for the month (daily-log total, or the manual override). */
  backwashCount: number
}): Promise<void> {
  const { monthKey, weeks, monthNotes, backwashCount } = params
  const workbook = await loadTreatmentReportTemplateWorkbook()
  const weekly = workbook.getWorksheet(SHEET_WEEKLY)
  const fe = workbook.getWorksheet(SHEET_FE)
  if (!weekly || !fe) {
    throw new Error('Treatment report template is missing required worksheets')
  }

  const [usage, treatmentEntries] = await Promise.all([
    computeMonthlyMeterUsage(monthKey),
    fetchTreatmentEntriesForMonth(monthKey),
  ])
  const noteLines = buildMonthlyReportNoteLines({ monthNotes, weeks })
  fillWeeklySheetFromFieldTests(weekly, monthKey, weeks, usage, { backwashCount, noteLines })
  fillFeSheetFromTreatmentEntries(fe, monthKey, treatmentEntries)

  await writeTreatmentReportWorkbook(workbook, `BPUD-Monthly-Treatment-Report-${monthKey}.xlsx`)
}
