import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { FieldDef, LocationDef } from '../data/locations'
import {
  cellForField,
  fieldByKey,
  monthTitleLine,
  sortChronological,
} from '../export/entryFormatting'
import type { LogEntry } from '../types/entry'

const DISTRICT = 'Bridgeport Public Utility District'
const MARGIN = 40
const MIN_LIFT_ROWS = 15

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
  const hasFlow = location.fields.some((f) => f.key === 'flowMeterRead')
  const f = (key: string) => fieldByKey(location.fields, key)

  const head = hasFlow
    ? [
        [
          'Date',
          'Time',
          'Pump #1 Meter Reading',
          'HRS',
          'Pump #2 Meter Reading',
          'HRS',
          'Pump # On/off',
          'Flow Meter Reading',
          'Comments / Sign',
        ],
      ]
    : [
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

  const body: string[][] = sorted.map((e) => {
    const row = [
      cellForField(e, f('date')),
      cellForField(e, f('time')),
      cellForField(e, f('pump1MeterRead')),
      cellForField(e, f('pump1Hours')),
      cellForField(e, f('pump2MeterRead')),
      cellForField(e, f('pump2Hours')),
      cellForField(e, f('pumpOnOff')),
    ]
    if (hasFlow) {
      row.push(cellForField(e, f('flowMeterRead')), cellForField(e, f('comments')))
    } else {
      row.push(cellForField(e, f('comments')))
    }
    return row
  })

  const colCount = hasFlow ? 9 : 8
  while (body.length < MIN_LIFT_ROWS) {
    body.push(Array(colCount).fill('') as string[])
  }

  const innerW = pageW - MARGIN * 2
  const commentColW = 168
  const restW = innerW - commentColW
  const weights = hasFlow
    ? [12, 11, 14, 8, 14, 8, 10, 12]
    : [12, 11, 16, 9, 16, 9, 11]
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const w = [...weights.map((wt) => (restW * wt) / weightSum), commentColW]

  const columnStyles: Record<number, { cellWidth: number; halign: 'center' | 'left'; valign: 'top'; overflow?: 'linebreak' }> =
    {}
  for (let i = 0; i < w.length; i++) {
    const isComment = i === w.length - 1
    columnStyles[i] = {
      cellWidth: w[i],
      halign: isComment ? 'left' : 'center',
      valign: 'top',
      ...(isComment ? { overflow: 'linebreak' as const } : {}),
    }
  }

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
    columnStyles,
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
