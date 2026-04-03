import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { FieldDef, LocationDef } from '../data/locations'
import type { LogEntry } from '../types/entry'

const DISTRICT = 'Bridgeport Public Utility District'
const MARGIN = 40
const MIN_LIFT_ROWS = 15

function formatShortDate(ymd: string): string {
  const t = ymd?.trim()
  const m = t?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return t ?? ''
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

/** HTML time inputs use 24h (e.g. "19:02"); PDF shows 12h with AM/PM. */
function formatTimeAmPm(raw: string): string {
  const t = raw?.trim()
  if (!t) return ''
  if (/\b(am|pm)\b/i.test(t)) return t
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return t
  const h24 = Number(m[1])
  if (h24 > 23 || Number(m[2]) > 59) return t
  const min = m[2]
  const period = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${min} ${period}`
}

function monthTitleLine(monthKey: string): string {
  if (monthKey === '_unknown') return 'For ____________________'
  const [y, mo] = monthKey.split('-').map(Number)
  if (!y || !mo) return 'For ____________________'
  const d = new Date(y, mo - 1, 1)
  const monthName = d.toLocaleString(undefined, { month: 'long' })
  return `For ${monthName} ${y}`
}

function sortChronological(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => {
    const c = a.entryDate.trim().localeCompare(b.entryDate.trim())
    if (c !== 0) return c
    const ta = a.values['time'] ?? ''
    const tb = b.values['time'] ?? ''
    return ta.localeCompare(tb)
  })
}

function cellForField(entry: LogEntry, field: FieldDef): string {
  if (field.key === 'date' && entry.entryDate.trim()) return formatShortDate(entry.entryDate)
  const raw = entry.values[field.key]
  if (raw === undefined || raw === '') return ''
  if (field.type === 'time') return formatTimeAmPm(raw)
  return raw
}

function fieldByKey(fields: FieldDef[], key: string): FieldDef {
  return fields.find((f) => f.key === key) ?? { key, label: key, type: 'text' }
}

function isLiftStationLayout(fields: FieldDef[]): boolean {
  return fields.some((f) => f.key === 'pump1MeterRead')
}

function openPdfBlob(doc: jsPDF): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function drawLiftStationPdf(doc: jsPDF, location: LocationDef, monthKey: string, entries: LogEntry[]) {
  const pageW = doc.internal.pageSize.getWidth()
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(DISTRICT, pageW / 2, y, { align: 'center' })
  y += 22

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bolditalic')
  doc.text(`${location.name} - Daily Log`, pageW / 2, y, { align: 'center' })
  y += 20

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(11)
  doc.text(monthTitleLine(monthKey), pageW / 2, y, { align: 'center' })
  y += 28

  const sorted = sortChronological(entries)
  const head = [
    [
      'Date',
      'Time',
      'Pump #1 Meter Reading',
      'HRS',
      'Pump #2 Meter Reading',
      'HRS',
      'Pump # On/off',
      'Comments / Sign',
    ],
  ]

  const f = (key: string) => fieldByKey(location.fields, key)
  const body: string[][] = sorted.map((e) => [
    cellForField(e, f('date')),
    cellForField(e, f('time')),
    cellForField(e, f('pump1MeterRead')),
    cellForField(e, f('pump1Hours')),
    cellForField(e, f('pump2MeterRead')),
    cellForField(e, f('pump2Hours')),
    cellForField(e, f('pumpOnOff')),
    cellForField(e, f('comments')),
  ])

  while (body.length < MIN_LIFT_ROWS) {
    body.push(['', '', '', '', '', '', '', ''])
  }

  const innerW = pageW - MARGIN * 2
  /** Fixed width for comments (~24% of page); remaining width split across the other seven columns. */
  const commentColW = 168
  const restW = innerW - commentColW
  const weight7 = [12, 11, 16, 9, 16, 9, 11]
  const weightSum = weight7.reduce((a, b) => a + b, 0)
  const w = [
    ...weight7.map((wt) => (restW * wt) / weightSum),
    commentColW,
  ]

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.5,
    tableWidth: innerW,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: w[0], halign: 'center', valign: 'top' },
      1: { cellWidth: w[1], halign: 'center', valign: 'top' },
      2: { cellWidth: w[2], halign: 'center', valign: 'top' },
      3: { cellWidth: w[3], halign: 'center', valign: 'top' },
      4: { cellWidth: w[4], halign: 'center', valign: 'top' },
      5: { cellWidth: w[5], halign: 'center', valign: 'top' },
      6: { cellWidth: w[6], halign: 'center', valign: 'top' },
      7: {
        cellWidth: w[7],
        halign: 'left',
        valign: 'top',
        overflow: 'linebreak',
      },
    },
    margin: { left: MARGIN, right: MARGIN },
    showHead: 'everyPage',
  })
}

function drawGenericPdf(doc: jsPDF, location: LocationDef, monthKey: string, entries: LogEntry[]) {
  const pageW = doc.internal.pageSize.getWidth()
  let y = MARGIN
  const fields = location.fields

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(DISTRICT, pageW / 2, y, { align: 'center' })
  y += 20

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bolditalic')
  doc.text(`${location.name} - Daily Log`, pageW / 2, y, { align: 'center' })
  y += 18

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.text(monthTitleLine(monthKey), pageW / 2, y, { align: 'center' })
  y += 24

  const sorted = sortChronological(entries)
  const head = [fields.map((f) => f.label)]
  const body: string[][] = sorted.map((e) => fields.map((field) => cellForField(e, field)))

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.5,
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 2,
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    margin: { left: MARGIN, right: MARGIN },
    showHead: 'everyPage',
  })
}

export function openMonthlyLogPdf(params: {
  location: LocationDef
  monthKey: string
  entries: LogEntry[]
}): void {
  const { location, monthKey, entries } = params
  if (entries.length === 0) return

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  })

  if (isLiftStationLayout(location.fields)) {
    drawLiftStationPdf(doc, location, monthKey, entries)
  } else {
    drawGenericPdf(doc, location, monthKey, entries)
  }

  openPdfBlob(doc)
}
