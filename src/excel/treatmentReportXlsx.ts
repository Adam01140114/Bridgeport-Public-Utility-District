import {
  fillFeSheetFromTreatmentEntries,
  fillWeeklySheetFromTreatmentEntries,
  loadTreatmentReportTemplateWorkbook,
  writeTreatmentReportWorkbook,
} from './treatmentReportTemplate'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

const SHEET_WEEKLY = 'Weekly Field Test'
const SHEET_FE = 'FE Tank (inches)'

export async function downloadTreatmentReportXlsx(
  monthKey: string,
  entries: TreatmentReportEntry[]
): Promise<void> {
  const workbook = await loadTreatmentReportTemplateWorkbook()
  const weekly = workbook.getWorksheet(SHEET_WEEKLY)
  const fe = workbook.getWorksheet(SHEET_FE)
  if (!weekly || !fe) {
    throw new Error('Treatment report template is missing required worksheets')
  }

  fillWeeklySheetFromTreatmentEntries(weekly, monthKey, entries)
  fillFeSheetFromTreatmentEntries(fe, monthKey, entries)

  await writeTreatmentReportWorkbook(workbook, `BPUD-Treatment-Report-${monthKey}.xlsx`)
}
