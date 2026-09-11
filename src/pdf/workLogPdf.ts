import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { WORK_LOG_COLUMNS, workLogTableBody, type WorkLogWeek } from '../export/workLogWeeks'

const DISTRICT = 'Bridgeport Public Utility District'
const MARGIN = 40

function openPdfBlob(doc: jsPDF): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function openWorkLogWeekPdf(week: WorkLogWeek): void {
  if (week.rows.length === 0) return
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(DISTRICT, pageW / 2, y, { align: 'center' })
  y += 20
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('Daily Work Log', pageW / 2, y, { align: 'center' })
  y += 16
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.text(`Week of ${week.label}`, pageW / 2, y, { align: 'center' })
  y += 12
  doc.setFontSize(8)
  doc.text('Timestamps are recorded automatically when each entry is submitted from the app.', pageW / 2, y, {
    align: 'center',
  })
  y += 18

  autoTable(doc, {
    startY: y,
    head: [[...WORK_LOG_COLUMNS]],
    body: workLogTableBody(week),
    theme: 'grid',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.5,
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 70 },
      2: { cellWidth: 150 },
      3: { cellWidth: 62, halign: 'center' },
      4: { cellWidth: 62, halign: 'center' },
    },
    margin: { left: MARGIN, right: MARGIN },
    showHead: 'everyPage',
  })

  openPdfBlob(doc)
}
