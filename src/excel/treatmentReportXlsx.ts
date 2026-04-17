import * as XLSX from 'xlsx'
import { formatMonthTitle } from '../data/treatmentReport'
import {
  TREATMENT_REPORT_HEADER_LOCATIONS,
  buildTreatmentReportTableBody,
} from '../export/treatmentReportGrid'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

export function downloadTreatmentReportXlsx(monthKey: string, entries: TreatmentReportEntry[]): void {
  const title = 'Bridgeport Public Utility District - Monthly Treatment Report'
  const sub = `Month Of: ${formatMonthTitle(monthKey)}`
  const headerRow = ['Category', 'DATE', ...TREATMENT_REPORT_HEADER_LOCATIONS]

  const body = buildTreatmentReportTableBody(monthKey, entries)

  const rows: (string | number)[][] = [
    [title],
    [sub],
    [],
    headerRow,
    ...body,
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const colCount = headerRow.length
  const lastCol = colCount - 1
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Treatment Report')
  XLSX.writeFile(wb, `BPUD-Treatment-Report-${monthKey}.xlsx`)
}
