/**
 * ## Excel export fidelity — implementation plan (paper-matching layout)
 *
 * ### Current export (this file, SheetJS `xlsx`)
 * - Builds one sheet from the same logical grid as the UI (`buildTestMonthlyReportGrid`):
 *   header row, influent rows, effluent rows, merged cells for vessel / skid-effluent spans,
 *   column widths (`!cols`), and sign-off lines.
 * - **Limits of the community `xlsx` writer:** cell fills, borders, and rich typography are either
 *   not written or are inconsistent in `.xlsx` output. We get accurate **values**, **merge ranges**,
 *   and **column widths**, not full visual parity with the browser.
 *
 * ### Target: “exactly like on screen” (colors, borders, row tints)
 * 1. **Add `exceljs`** (or SheetJS Pro) as a dependency — both support fills, borders, fonts, and
 *    merged regions reliably.
 * 2. **Single layout spec** (recommended next refactor): a small DSL or shared array describing
 *    each logical cell: `{ r, c, rowspan, colspan, value, fill, border, font, horizontalAlign }`
 *    derived from the same source as React (`RowTemplate` + `analyticDataCellSurface` rules +
 *    `fieldNotesSection`). Generate **both** DOM classes and Excel styles
 *    from that spec to avoid drift.
 * 3. **Colors to reproduce:** influent band `#fcd5ce`, effluent `#cfe8fc`, vessel label white,
 *    analytic red/blue cells, field-note prefix strips, sign-off yellow `#fff7c2`, header grey
 *    `slate-200`, outer border `slate-900`.
 * 4. **Row heights:** match `min-h` approximations (~36–40px → points) per row type.
 * 5. **Prefixes:** store full string in data; Excel shows one cell with full value (already true).
 *    Optional: split into two columns to mimic prefix + suffix columns.
 * 6. **QA:** snapshot exported file next to HTML print/PDF; automate regression with golden file
 *    byte comparison after exceljs migration.
 *
 * Until that migration, PDF (`testMonthlyReportPdf.ts`) is better for pixel-faithful sharing;
 * Excel here is optimized for **data + merges + widths** for office workflows.
 */

import * as XLSX from 'xlsx'
import { buildSignOffLines, buildTestMonthlyReportGrid } from '../export/testMonthlyReportGrid'

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim()
}

export function exportTestMonthlyReportXlsx(params: {
  monthKey: string
  weekNumber: number
  monthTitle: string
  values: Record<string, string>
}): void {
  const { monthKey, weekNumber, monthTitle, values } = params
  const { header, body, merges } = buildTestMonthlyReportGrid(monthTitle, values)
  const signOff = buildSignOffLines(values)

  const preface: string[][] = [
    ['Date', values['header:date'] ?? ''],
    ['Time', values['header:time'] ?? ''],
    [],
  ]
  /** First row of the main table header in the sheet (0-based). */
  const tableHeaderRow = preface.length
  /** Body row index 0 from the grid builder → sheet row = tableHeaderRow + 1. */
  const bodyRowOffset = tableHeaderRow + 1
  const offsetMerges = merges.map((m) => ({
    s: { r: m.s.r + bodyRowOffset, c: m.s.c },
    e: { r: m.e.r + bodyRowOffset, c: m.e.c },
  }))

  const spacer: string[][] = [[]]
  const signRows = signOff.map((line) => {
    const row = Array(header.length).fill('')
    row[0] = line
    return row
  })

  const aoa: string[][] = [...preface, header, ...body, ...spacer, ...signRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!merges'] = offsetMerges
  ws['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Weekly field test')
  const base = `BPUD-Weekly-Field-Test-${sanitizeFilenamePart(monthKey)}-W${weekNumber}`
  XLSX.writeFile(wb, `${base}.xlsx`)
}
