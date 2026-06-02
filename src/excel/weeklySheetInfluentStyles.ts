import type ExcelJS from 'exceljs'
import {
  WEEKLY_CATEGORY_START_ROWS,
  WEEKLY_INFLUENT_COLUMNS,
} from '../export/weeklyFieldTestToTemplate'

const WEEKS_PER_CATEGORY = 4

/** Hatch pattern for empty Cain / Twin influent cells only. */
const INFLUENT_EMPTY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'lightTrellis',
  fgColor: { argb: 'FFB8B8B8' },
  bgColor: { argb: 'FFFFFFFF' },
}

const BLACK_FONT_COLOR = { argb: 'FF000000' } as const

function cellHasValue(value: ExcelJS.CellValue): boolean {
  return value !== null && value !== undefined && value !== ''
}

/**
 * Cain / Twin influent columns only: black text when there is a value (keep row
 * band color); light hatch when the cell is empty. No other columns are changed.
 */
export function applyWeeklyInfluentColumnStyles(ws: ExcelJS.Worksheet): void {
  for (const startRow of WEEKLY_CATEGORY_START_ROWS) {
    for (let slot = 0; slot < WEEKS_PER_CATEGORY; slot++) {
      const row = startRow + slot

      for (const col of WEEKLY_INFLUENT_COLUMNS) {
        const cell = ws.getRow(row).getCell(col)

        if (cellHasValue(cell.value)) {
          const font = cell.font ?? {}
          cell.font = { ...font, color: BLACK_FONT_COLOR }
        } else {
          cell.fill = INFLUENT_EMPTY_FILL
          const font = cell.font ?? {}
          cell.font = { ...font, color: BLACK_FONT_COLOR }
        }
      }
    }
  }
}
