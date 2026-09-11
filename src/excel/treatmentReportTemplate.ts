import ExcelJS from 'exceljs'
import {
  daysInMonthFromKey,
  formatMonthTitle,
  vesselColumnsForCategory,
  weekRowDate,
} from '../data/treatmentReport'
import type { TreatmentCategory } from '../data/treatmentReport'
import {
  WEEKLY_SHEET_FIELD_KIT_LABEL,
  WEEKLY_SHEET_NOTES,
  WEEKLY_SHEET_SUMMARY,
} from '../export/monthlyReportNotes'
import {
  buildWeeklyTemplateCells,
  type WeekFieldTestBundle,
} from '../export/weeklyFieldTestToTemplate'
import type { MonthlyMeterUsage } from '../services/meterUsage'
import { FE_INCHES_EXPORT_LOCATION } from '../export/treatmentReportGrid'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

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

const COL_CAIN_INFLUENT = 3
const COL_TWIN_INFLUENT = 4
const BLACK_FONT_ARGB = 'FF000000'

/**
 * Load repo `template.xlsx` (via `public/template.xlsx`, synced on build; live root file in dev).
 * Cache-bust every export so the browser never reuses an old workbook.
 */
function templateFetchUrl(): string {
  const base = import.meta.env.BASE_URL
  const path = base.endsWith('/') ? `${base}template.xlsx` : `${base}/template.xlsx`
  return `${path}?t=${Date.now()}`
}

function loadTemplateBuffer(): Promise<ArrayBuffer> {
  return fetch(templateFetchUrl(), { cache: 'no-store' }).then((res) => {
    if (!res.ok) {
      throw new Error(
        `Failed to load treatment report template (${res.status}). Ensure template.xlsx exists at the project root and run npm run dev or npm run sync-template.`
      )
    }
    return res.arrayBuffer()
  })
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

/** Only set `.value` — never clear or restyle static template regions (notes, labels, etc.). */
function writeWeeklyValue(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | number | Date
): void {
  const cell = ws.getRow(row).getCell(col)
  cell.value = value
  if (col === COL_CAIN_INFLUENT || col === COL_TWIN_INFLUENT) {
    cell.font = { ...(cell.font ?? {}), color: { argb: BLACK_FONT_ARGB } }
  }
}

export function fillWeeklySheetFromTreatmentEntries(
  ws: ExcelJS.Worksheet,
  monthKey: string,
  entries: TreatmentReportEntry[]
): void {
  ws.getCell(WEEKLY_MONTH_CELL).value = formatMonthTitle(monthKey)

  for (const { category, startRow } of WEEKLY_CATEGORY_BLOCKS) {
    const showVessels = vesselColumnsForCategory(category)

    for (let slot = 0; slot < 4; slot++) {
      const row = startRow + slot
      writeWeeklyValue(ws, row, 2, isoToLocalDate(weekRowDate(monthKey, slot)))

      for (const [location, col] of Object.entries(LOCATION_COLUMN)) {
        if (!showVessels && location.startsWith('Vessel')) continue
        const raw = weeklyCellValue(entries, category, location, slot)
        if (!raw) continue
        writeWeeklyValue(ws, row, col, coerceExportValue(raw))
      }
    }
  }
}

export function fillWeeklySheetSummary(ws: ExcelJS.Worksheet, usage: MonthlyMeterUsage): void {
  const col = WEEKLY_SHEET_SUMMARY.gallonsValueCol
  if (usage.cainGallons !== null) {
    ws.getRow(WEEKLY_SHEET_SUMMARY.gallonsCainRow).getCell(col).value = usage.cainGallons
  }
  if (usage.twinGallons !== null) {
    ws.getRow(WEEKLY_SHEET_SUMMARY.gallonsTwinRow).getCell(col).value = usage.twinGallons
  }
}

/** Deep copy so later edits to one cell never leak into the template cell it was cloned from. */
function cloneStyle(src: ExcelJS.Cell): Partial<ExcelJS.Style> {
  return JSON.parse(JSON.stringify(src.style ?? {})) as Partial<ExcelJS.Style>
}

/** "Field Kit Data" banner on the blank row between the month line and the table header. */
export function fillWeeklySheetFieldKitLabel(ws: ExcelJS.Worksheet): void {
  const { row, firstCol, lastCol, text } = WEEKLY_SHEET_FIELD_KIT_LABEL
  const cell = ws.getRow(row).getCell(firstCol)
  cell.value = text
  cell.font = { bold: true, size: 12, color: { argb: BLACK_FONT_ARGB } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.mergeCells(row, firstCol, row, lastCol)
}

/** "Number of backwashes during this month" box beside the gallons rows, styled like them. */
export function fillWeeklySheetBackwashes(ws: ExcelJS.Worksheet, count: number): void {
  const {
    backwashesRow,
    backwashesLabelStartCol,
    backwashesLabelEndCol,
    backwashesValueCol,
    backwashesLabel,
    gallonsCainRow,
    gallonsValueCol,
  } = WEEKLY_SHEET_SUMMARY
  const src = ws.getRow(gallonsCainRow)
  const row = ws.getRow(backwashesRow)

  const label = row.getCell(backwashesLabelStartCol)
  label.style = cloneStyle(src.getCell(1))
  label.value = backwashesLabel
  label.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.mergeCells(backwashesRow, backwashesLabelStartCol, backwashesRow, backwashesLabelEndCol)
  const edge = { style: 'thin' as const }
  label.border = { left: edge, right: edge, top: edge, bottom: edge }

  const value = row.getCell(backwashesValueCol)
  value.style = cloneStyle(src.getCell(gallonsValueCol))
  value.value = count
}

/**
 * Write note lines into the Observations box (one line per row, D:H merged). If there are more
 * lines than template rows, a middle row of the box is duplicated so the borders stay intact
 * and the static sample-point IDs in column A keep their order.
 */
export function fillWeeklySheetNotes(ws: ExcelJS.Worksheet, lines: string[]): void {
  if (lines.length === 0) return
  const { firstRow, lastRow, firstCol, lastCol } = WEEKLY_SHEET_NOTES
  const templateRows = lastRow - firstRow + 1
  const extra = Math.max(0, lines.length - templateRows)

  if (extra > 0) {
    const staticColumnA = Array.from({ length: templateRows }, (_, i) =>
      ws.getRow(firstRow + i).getCell(1).value,
    )
    const middleRow = lastRow - 1
    ws.duplicateRow(middleRow, extra, true)
    const newLastRow = lastRow + extra
    for (let row = firstRow; row <= newLastRow; row++) {
      ws.getRow(row).getCell(1).value = staticColumnA[row - firstRow] ?? null
    }
  }

  lines.forEach((line, i) => {
    const row = firstRow + i
    const cell = ws.getRow(row).getCell(firstCol)
    // Merging copies the first cell's style across the range, which would drop the box's
    // right edge (kept on the last column); carry both outer edges onto the merged cell.
    const leftEdge = cell.border?.left
    const rightEdge = ws.getRow(row).getCell(lastCol).border?.right
    cell.value = line
    cell.font = { size: 12, color: { argb: BLACK_FONT_ARGB } }
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: false }
    ws.mergeCells(row, firstCol, row, lastCol)
    cell.border = {
      ...(leftEdge ? { left: leftEdge } : {}),
      ...(rightEdge ? { right: rightEdge } : {}),
    }
  })
}

export function fillWeeklySheetFromFieldTests(
  ws: ExcelJS.Worksheet,
  monthKey: string,
  bundles: WeekFieldTestBundle[],
  usage: MonthlyMeterUsage,
  extras: { backwashCount: number; noteLines: string[] },
): void {
  ws.getCell(WEEKLY_MONTH_CELL).value = formatMonthTitle(monthKey)
  fillWeeklySheetFieldKitLabel(ws)

  const { values, dates } = buildWeeklyTemplateCells(bundles)
  for (const { row, dateIso } of dates) {
    writeWeeklyValue(ws, row, 2, isoToLocalDate(dateIso))
  }
  for (const { row, col, value } of values) {
    writeWeeklyValue(ws, row, col, coerceExportValue(value))
  }

  fillWeeklySheetSummary(ws, usage)
  fillWeeklySheetBackwashes(ws, extras.backwashCount)
  // Notes last: it may insert rows, and everything above it uses fixed row numbers.
  fillWeeklySheetNotes(ws, extras.noteLines)
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
