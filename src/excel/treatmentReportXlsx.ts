import * as XLSX from 'xlsx'
import { formatMonthTitle } from '../data/treatmentReport'
import {
  buildFeTreatmentReportBody,
  buildFeTreatmentReportHeaderRow,
  buildWeeklyTreatmentReportBody,
  buildWeeklyTreatmentReportHeaderRow,
} from '../export/treatmentReportGrid'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

const TITLE = 'Bridgeport Public Utility District - Monthly Treatment Report'

export function downloadTreatmentReportXlsx(monthKey: string, entries: TreatmentReportEntry[]): void {
  const sub = `Month Of: ${formatMonthTitle(monthKey)}`
  const weeklyHeader = buildWeeklyTreatmentReportHeaderRow()
  const weeklyBody = buildWeeklyTreatmentReportBody(monthKey, entries)

  const weeklyRows: (string | number)[][] = [
    [TITLE],
    [sub],
    [],
    weeklyHeader,
    ...weeklyBody,
  ]

  const feHeader = buildFeTreatmentReportHeaderRow()
  const feBody = buildFeTreatmentReportBody(monthKey, entries)

  const feRows: (string | number)[][] = [
    [TITLE],
    [sub],
    [],
    ['Twin Lakes Well I Arsenic Plant — FE tank (daily)'],
    [],
    feHeader,
    ...feBody,
  ]

  const wsWeekly = XLSX.utils.aoa_to_sheet(weeklyRows)
  const wLast = weeklyHeader.length - 1
  wsWeekly['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: wLast } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: wLast } },
  ]

  const wsFe = XLSX.utils.aoa_to_sheet(feRows)
  const fLast = feHeader.length - 1
  wsFe['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: fLast } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: fLast } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: fLast } },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsWeekly, 'Weekly FTK')
  XLSX.utils.book_append_sheet(wb, wsFe, 'FE Inches')
  XLSX.writeFile(wb, `BPUD-Treatment-Report-${monthKey}.xlsx`)
}
