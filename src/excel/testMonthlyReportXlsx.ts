import type { WeekFieldTestBundle } from '../export/weeklyFieldTestToTemplate'
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
 * field-test readings (all weeks in the month) and Twin Lakes FE tank rows, preserve
 * all template formatting and colors.
 */
export async function exportMonthlyFieldTestReportXlsx(params: {
  monthKey: string
  weeks: WeekFieldTestBundle[]
}): Promise<void> {
  const { monthKey, weeks } = params
  const workbook = await loadTreatmentReportTemplateWorkbook()
  const weekly = workbook.getWorksheet(SHEET_WEEKLY)
  const fe = workbook.getWorksheet(SHEET_FE)
  if (!weekly || !fe) {
    throw new Error('Treatment report template is missing required worksheets')
  }

  fillWeeklySheetFromFieldTests(weekly, monthKey, weeks)

  const treatmentEntries = await fetchTreatmentEntriesForMonth(monthKey)
  fillFeSheetFromTreatmentEntries(fe, monthKey, treatmentEntries)

  await writeTreatmentReportWorkbook(workbook, `BPUD-Monthly-Treatment-Report-${monthKey}.xlsx`)
}
