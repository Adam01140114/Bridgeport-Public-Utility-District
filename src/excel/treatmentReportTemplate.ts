import ExcelJS from 'exceljs'
import {
  daysInMonthFromKey,
  formatMonthTitle,
  vesselColumnsForCategory,
  weekRowDate,
} from '../data/treatmentReport'
import type { TreatmentCategory } from '../data/treatmentReport'
import {
  buildMonthlyNoteLines,
  WEEKLY_SHEET_SUMMARY,
} from '../export/monthlyReportNotes'
import {
  buildWeeklyTemplateCells,
  type WeekFieldTestBundle,
} from '../export/weeklyFieldTestToTemplate'
import type { MonthlyMeterUsage } from '../services/meterUsage'
import { FE_INCHES_EXPORT_LOCATION } from '../export/treatmentReportGrid'
import type { TreatmentReportEntry } from '../types/treatmentEntry'
import templateAssetUrl from '../assets/monthly-treatment-report-template.xlsx?url'

const SHEET_WEEKLY = 'Weekly Field Test'
const SHEET_FE = 'FE Tank (inches)'

const WEEKLY_MONTH_CELL = 'D2'
const FE_MONTH_CELL = 'C4'
const FE_DATA_START_ROW = 7
const FE_TEMPLATE_DAY_COUNT = 30

const WEEKLY_CATEGORY_BLOCKS: { category: TreatmentCategory; startRow: number }[] = [
  { category: 'CL2 - Res. (FTK)', startRow: 5 },
  { category: 'Iron (FTK)', startRow: 9 },
  { category: 'Arsenic (FTK)', startRow: 13 },
  { category: 'PH (FTK)', startRow: 17 },
]

const LOCATION_COLUMN: Record<string, number> = {
  'Cain Well #4': 3,
  'Twin Well #2': 4,
  'Weekly Eff.': 5,
  'Vessel #1 Eff.': 6,
  'Vessel #2 Eff.': 7,
  'Vessel #3 Eff.': 8,
}

const WEEKLY_DATA_COLS = [2, 3, 4, 5, 6, 7, 8] as const

let templateLoadPromise: Promise<ArrayBuffer> | null = null

function loadTemplateBuffer(): Promise<ArrayBuffer> {
  if (!templateLoadPromise) {
    templateLoadPromise = fetch(templateAssetUrl).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load treatment report template (${res.status})`)
      }
      return res.arrayBuffer()
    })
  }
  return templateLoadPromise
}

export async function loadTreatmentReportTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const buffer = await loadTemplateBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const weekly = workbook.getWorksheet(SHEET_WEEKLY)
  const fe = workbook.getWorksheet(SHEET_FE)
  if (!weekly || !fe) {
    throw new Error('Treatment report template is missing required worksheets')
  }
  return workbook
}

function isoToLocalDate(iso: string): Date {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date(iso)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function coerceExportValue(raw: string): string | number {
  const t = raw.trim()
  if (!t) return ''
  const normalized = /^\.\d+$/.test(t) ? `0${t}` : t
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const n = Number(normalized)
    if (!Number.isNaN(n)) return n
  }
  return t
}

function weeklyCellValue(
  entries: TreatmentReportEntry[],
  category: TreatmentCategory,
  location: string,
  weekSlot: number
): string {
  const hit = entries.find(
    (e) => e.category === category && e.location === location && e.weekSlot === weekSlot
  )
  return hit?.value?.trim() ?? ''
}

function feValueForDay(entries: TreatmentReportEntry[], entryDate: string): string {
  const hit = entries.find(
    (e) =>
      e.category === 'FE Inches' &&
      e.location === FE_INCHES_EXPORT_LOCATION &&
      e.entryDate === entryDate
  )
  return hit?.value?.trim() ?? ''
}

function clearWeeklyDataCells(ws: ExcelJS.Worksheet): void {
  for (const { startRow } of WEEKLY_CATEGORY_BLOCKS) {
    for (let slot = 0; slot < 4; slot++) {
      const row = startRow + slot
      for (const col of WEEKLY_DATA_COLS) {
        ws.getRow(row).getCell(col).value = null
      }
    }
  }
}

export function fillWeeklySheetFromTreatmentEntries(
  ws: ExcelJS.Worksheet,
  monthKey: string,
  entries: TreatmentReportEntry[]
): void {
  ws.getCell(WEEKLY_MONTH_CELL).value = formatMonthTitle(monthKey)
  clearWeeklyDataCells(ws)

  for (const { category, startRow } of WEEKLY_CATEGORY_BLOCKS) {
    const showVessels = vesselColumnsForCategory(category)

    for (let slot = 0; slot < 4; slot++) {
      const row = startRow + slot
      const rowDate = weekRowDate(monthKey, slot)
      ws.getRow(row).getCell(2).value = isoToLocalDate(rowDate)

      for (const [location, col] of Object.entries(LOCATION_COLUMN)) {
        if (!showVessels && location.startsWith('Vessel')) continue
        const raw = weeklyCellValue(entries, category, location, slot)
        if (!raw) continue
        ws.getRow(row).getCell(col).value = coerceExportValue(raw)
      }
    }
  }
}

function clearWeeklySummaryCells(ws: ExcelJS.Worksheet): void {
  ws.getRow(WEEKLY_SHEET_SUMMARY.gallonsCainRow).getCell(WEEKLY_SHEET_SUMMARY.gallonsValueCol).value =
    null
  ws.getRow(WEEKLY_SHEET_SUMMARY.gallonsTwinRow).getCell(WEEKLY_SHEET_SUMMARY.gallonsValueCol).value =
    null
  for (let i = 0; i < WEEKLY_SHEET_SUMMARY.notesMaxRows; i++) {
    ws.getRow(WEEKLY_SHEET_SUMMARY.notesFirstRow + i).getCell(1).value = null
  }
}

export function fillWeeklySheetSummary(
  ws: ExcelJS.Worksheet,
  bundles: WeekFieldTestBundle[],
  usage: MonthlyMeterUsage
): void {
  clearWeeklySummaryCells(ws)

  const col = WEEKLY_SHEET_SUMMARY.gallonsValueCol
  if (usage.cainGallons !== null) {
    ws.getRow(WEEKLY_SHEET_SUMMARY.gallonsCainRow).getCell(col).value = usage.cainGallons
  }
  if (usage.twinGallons !== null) {
    ws.getRow(WEEKLY_SHEET_SUMMARY.gallonsTwinRow).getCell(col).value = usage.twinGallons
  }

  const noteLines = buildMonthlyNoteLines(bundles)
  noteLines.forEach((line, index) => {
    if (index >= WEEKLY_SHEET_SUMMARY.notesMaxRows) return
    ws.getRow(WEEKLY_SHEET_SUMMARY.notesFirstRow + index).getCell(1).value = line
  })
}

export function fillWeeklySheetFromFieldTests(
  ws: ExcelJS.Worksheet,
  monthKey: string,
  bundles: WeekFieldTestBundle[],
  usage: MonthlyMeterUsage
): void {
  ws.getCell(WEEKLY_MONTH_CELL).value = formatMonthTitle(monthKey)
  clearWeeklyDataCells(ws)

  const { values, dates } = buildWeeklyTemplateCells(bundles)
  for (const { row, dateIso } of dates) {
    ws.getRow(row).getCell(2).value = isoToLocalDate(dateIso)
  }
  for (const { row, col, value } of values) {
    ws.getRow(row).getCell(col).value = coerceExportValue(value)
  }

  fillWeeklySheetSummary(ws, bundles, usage)
}

function clearFeDayRow(ws: ExcelJS.Worksheet, row: number): void {
  ws.getRow(row).getCell(2).value = null
  ws.getRow(row).getCell(3).value = null
}

function ensureFeRowCapacity(ws: ExcelJS.Worksheet, daysInMonth: number): number {
  const neededLastRow = FE_DATA_START_ROW + daysInMonth - 1
  let lastStyledRow = FE_DATA_START_ROW + FE_TEMPLATE_DAY_COUNT - 1
  while (lastStyledRow < neededLastRow) {
    ws.duplicateRow(lastStyledRow, 1, true)
    lastStyledRow += 1
  }
  return lastStyledRow
}

export function fillFeSheetFromTreatmentEntries(
  ws: ExcelJS.Worksheet,
  monthKey: string,
  entries: TreatmentReportEntry[]
): void {
  ws.getCell(FE_MONTH_CELL).value = formatMonthTitle(monthKey)

  const daysInMonth = daysInMonthFromKey(monthKey)
  const lastStyledRow = ensureFeRowCapacity(ws, daysInMonth)

  for (let row = FE_DATA_START_ROW; row <= lastStyledRow; row++) {
    clearFeDayRow(ws, row)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const row = FE_DATA_START_ROW + day - 1
    const entryDate = `${monthKey}-${String(day).padStart(2, '0')}`
    ws.getRow(row).getCell(2).value = isoToLocalDate(entryDate)
    const raw = feValueForDay(entries, entryDate)
    ws.getRow(row).getCell(3).value = raw ? coerceExportValue(raw) : null
  }
}

export function triggerXlsxDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function writeTreatmentReportWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const out = await workbook.xlsx.writeBuffer()
  triggerXlsxDownload(out, filename)
}
