import type { CellMode, RowTemplate } from '../data/testMonthlyReportLayout'
import {
  EFFLUENT_ROWS,
  fieldKey,
  INFLUENT_ROWS,
  mergesVesselLabelAndArsenic,
} from '../data/testMonthlyReportLayout'

export type SheetMerge = { s: { r: number; c: number }; e: { r: number; c: number } }

const COLS = 8

function val(values: Record<string, string>, rowId: string, field: string): string {
  return values[fieldKey(rowId, field)] ?? ''
}

function cellVal(values: Record<string, string>, row: RowTemplate, field: keyof RowTemplate): string {
  const mode = row[field] as CellMode
  if (mode === 'blank') return ''
  return val(values, row.id, field as string)
}

function pushRow(
  rows: string[][],
  merges: SheetMerge[],
  cells: string[],
  mergeSpecs: { c0: number; c1: number } | null,
): void {
  const r = rows.length
  rows.push([...cells])
  if (mergeSpecs) {
    merges.push({ s: { r, c: mergeSpecs.c0 }, e: { r, c: mergeSpecs.c1 } })
  }
}

function appendSection(
  rows: string[][],
  merges: SheetMerge[],
  sectionRows: RowTemplate[],
  values: Record<string, string>,
): void {
  for (const row of sectionRows) {
    const vesselMerge = mergesVesselLabelAndArsenic(row)

    if (vesselMerge) {
      const cells = Array(COLS).fill('')
      cells[0] = row.label
      cells[2] = cellVal(values, row, 'iron')
      cells[3] = cellVal(values, row, 'chlorine')
      cells[4] = cellVal(values, row, 'ph')
      cells[5] = cellVal(values, row, 'alk')
      cells[6] = cellVal(values, row, 'hard')
      cells[7] = cellVal(values, row, 'temp')
      pushRow(rows, merges, cells, { c0: 0, c1: 1 })
      continue
    }

    const cells = [
      row.label,
      cellVal(values, row, 'arsenic'),
      cellVal(values, row, 'iron'),
      cellVal(values, row, 'chlorine'),
      cellVal(values, row, 'ph'),
      cellVal(values, row, 'alk'),
      cellVal(values, row, 'hard'),
      cellVal(values, row, 'temp'),
    ]
    pushRow(rows, merges, cells, null)
  }
}

export function buildTestMonthlyReportGrid(
  monthTitle: string,
  values: Record<string, string>,
): { header: string[]; body: string[][]; merges: SheetMerge[] } {
  const header = [
    monthTitle,
    'Arsenic — AS',
    'Iron — FE',
    'Chlorine — CL₂',
    'PH',
    'ALK',
    'hard',
    'Temp',
  ]
  const merges: SheetMerge[] = []
  const body: string[][] = []
  appendSection(body, merges, INFLUENT_ROWS, values)
  appendSection(body, merges, EFFLUENT_ROWS, values)
  return { header, body, merges }
}

export function buildSignOffLines(values: Record<string, string>): string[] {
  const well = values['footer:well']?.trim() ?? ''
  const tester = values['footer:tester']?.trim() ?? ''
  const pump = values['footer:pumpGpm']?.trim() ?? ''
  const notes = values['footer:notes']?.trim() ?? ''
  const lines = [
    'Notes',
    `What well is running? ${well}`,
    `Who is testing? ${tester}`,
    `Pump GPM: ${pump}`,
  ]
  if (notes) {
    lines.push('Notes:')
    lines.push(...notes.split(/\r?\n/))
  }
  return lines
}
