import type ExcelJS from 'exceljs'
import {
  activeInfluentColumnForBundle,
  WEEKLY_CATEGORY_START_ROWS,
  WEEKLY_INFLUENT_COLUMNS,
  type WeekFieldTestBundle,
} from '../export/weeklyFieldTestToTemplate'

const WEEKS_PER_CATEGORY = 4

/** Diagonal hatch for influent cells with no reading / wrong well for that week. */
const INFLUENT_NA_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'lightTrellis',
  fgColor: { argb: 'FFB8B8B8' },
  bgColor: { argb: 'FFFFFFFF' },
}

const BLACK_FONT_COLOR = { argb: 'FF000000' } as const

function cellHasValue(value: ExcelJS.CellValue): boolean {
  return value !== null && value !== undefined && value !== ''
}

function applyBlackFont(cell: ExcelJS.Cell): void {
  const font = cell.font ?? {}
  cell.font = {
    ...font,
    color: BLACK_FONT_COLOR,
  }
}

function applyHashedEmpty(cell: ExcelJS.Cell): void {
  cell.value = null
  cell.fill = INFLUENT_NA_FILL
  applyBlackFont(cell)
}

/**
 * Cain / Twin influent columns: black text when populated; hatched when empty or not
 * the well used that week (`footer:well` when bundles provided).
 */
export function applyWeeklyInfluentColumnStyles(
  ws: ExcelJS.Worksheet,
  bundles?: WeekFieldTestBundle[]
): void {
  const bundleByWeek = new Map(bundles?.map((b) => [b.weekIndex, b]) ?? [])

  for (const startRow of WEEKLY_CATEGORY_START_ROWS) {
    for (let slot = 0; slot < WEEKS_PER_CATEGORY; slot++) {
      const row = startRow + slot
      const bundle = bundleByWeek.get(slot)
      const activeCol = bundle ? activeInfluentColumnForBundle(bundle) : null

      for (const col of WEEKLY_INFLUENT_COLUMNS) {
        const cell = ws.getRow(row).getCell(col)
        const hasValue = cellHasValue(cell.value)

        if (bundles) {
          if (activeCol === null) {
            applyHashedEmpty(cell)
            continue
          }
          if (col !== activeCol) {
            applyHashedEmpty(cell)
            continue
          }
        }

        if (hasValue) {
          applyBlackFont(cell)
        } else {
          applyHashedEmpty(cell)
        }
      }
    }
  }
}
