import * as XLSX from 'xlsx'
import { WORK_LOG_COLUMNS, workLogTableBody, type WorkLogWeek } from '../export/workLogWeeks'

const DISTRICT = 'Bridgeport Public Utility District'

export function downloadWorkLogWeekXlsx(week: WorkLogWeek): void {
  if (week.rows.length === 0) return
  const rows: string[][] = [
    [DISTRICT],
    ['Daily Work Log — time-stamped automatically at submission'],
    [`Week of ${week.label}`],
    [],
    [...WORK_LOG_COLUMNS],
    ...workLogTableBody(week),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 34 }, { wch: 12 }, { wch: 12 }, { wch: 48 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Work Log')
  XLSX.writeFile(wb, `BPUD-Work-Log-week-of-${week.key}.xlsx`)
}
