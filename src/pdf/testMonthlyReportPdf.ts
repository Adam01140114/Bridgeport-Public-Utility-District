import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { formatMonthTitle } from '../data/treatmentReport'
import { buildSignOffLines, buildTestMonthlyReportGrid } from '../export/testMonthlyReportGrid'

const MARGIN = 14

function openPdfBlob(doc: jsPDF): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } }

export function exportTestMonthlyReportPdf(params: {
  monthKey: string
  weekNumber: number
  monthTitle: string
  values: Record<string, string>
}): void {
  const { monthKey, weekNumber, monthTitle, values } = params
  const { header, body } = buildTestMonthlyReportGrid(monthTitle, values)
  const signOff = buildSignOffLines(values)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Bridgeport PUD Arsenic Plant Weekly Field Testing', pageW / 2, y, { align: 'center' })
  y += 20
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Month: ${formatMonthTitle(monthKey)}`, pageW / 2, y, { align: 'center' })
  y += 14
  doc.text(`Week ${weekNumber}`, pageW / 2, y, { align: 'center' })
  y += 18
  doc.setFontSize(9)
  doc.text(`Date: ${values['header:date'] ?? ''}`, MARGIN, y)
  y += 12
  doc.text(`Time: ${values['header:time'] ?? ''}`, MARGIN, y)
  y += 18

  autoTable(doc, {
    startY: y,
    head: [header],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [203, 213, 225], textColor: 20, fontStyle: 'bold' },
    margin: { left: MARGIN, right: MARGIN },
  })

  const finalY = (doc as DocWithAutoTable).lastAutoTable?.finalY
  let y2 = (finalY ?? y + 120) + 16
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  for (const line of signOff) {
    doc.text(line, MARGIN, y2)
    y2 += 12
  }

  openPdfBlob(doc)
}
