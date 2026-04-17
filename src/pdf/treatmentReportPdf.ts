import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { formatMonthTitle } from '../data/treatmentReport'
import {
  buildFeTreatmentReportBody,
  buildFeTreatmentReportHeaderRow,
  buildWeeklyTreatmentReportBody,
  buildWeeklyTreatmentReportHeaderRow,
} from '../export/treatmentReportGrid'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

const DISTRICT = 'Bridgeport Public Utility District'
const REPORT_TITLE = `${DISTRICT} - Monthly Treatment Report`
const MARGIN = 36

function openPdfBlob(doc: jsPDF): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function openTreatmentReportPdf(monthKey: string, entries: TreatmentReportEntry[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(REPORT_TITLE, pageW / 2, y, { align: 'center' })
  y += 20
  doc.setFontSize(11)
  doc.text(`Month Of: ${formatMonthTitle(monthKey)}`, pageW / 2, y, { align: 'center' })
  y += 28

  const weeklyHead = [buildWeeklyTreatmentReportHeaderRow()]
  const weeklyBody = buildWeeklyTreatmentReportBody(monthKey, entries)

  const innerW = pageW - MARGIN * 2
  const catW = 100
  const dateW = 56
  const rest = innerW - catW - dateW
  const locW = rest / 6

  autoTable(doc, {
    startY: y,
    head: weeklyHead,
    body: weeklyBody,
    theme: 'grid',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.35,
    tableWidth: innerW,
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 2.5,
      valign: 'middle',
      halign: 'center',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [255, 245, 180],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: catW, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: dateW },
      ...Object.fromEntries(
        [2, 3, 4, 5, 6, 7].map((i) => [i, { cellWidth: locW }])
      ) as Record<number, { cellWidth: number }>,
    },
    bodyStyles: {
      fillColor: [255, 252, 220],
    },
    margin: { left: MARGIN, right: MARGIN },
    showHead: 'everyPage',
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index !== undefined) {
        const row = weeklyBody[data.row.index]
        if (row && row.every((c) => c === '')) {
          data.cell.styles.fillColor = [255, 255, 255]
          data.cell.styles.textColor = [0, 0, 0]
          data.cell.styles.minCellHeight = 6
          data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 3, right: 3 }
          data.cell.styles.fontStyle = 'normal'
        }
      }
    },
  })

  const last = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable
  let nextY = (last?.finalY ?? y) + 28
  if (nextY > pageH - 120) {
    doc.addPage('l')
    nextY = MARGIN
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Twin Lakes Well I Arsenic Plant — FE tank (daily)', MARGIN, nextY)
  nextY += 18

  const feHead = [buildFeTreatmentReportHeaderRow()]
  const feBody = buildFeTreatmentReportBody(monthKey, entries)
  const feTableW = 280

  autoTable(doc, {
    startY: nextY,
    head: feHead,
    body: feBody,
    theme: 'grid',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.35,
    tableWidth: feTableW,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
      halign: 'center',
    },
    headStyles: {
      fillColor: [255, 245, 180],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [255, 252, 220],
    },
    columnStyles: {
      0: { cellWidth: feTableW * 0.42 },
      1: { cellWidth: feTableW * 0.58 },
    },
    margin: { left: MARGIN, right: MARGIN },
    showHead: 'everyPage',
  })

  openPdfBlob(doc)
}
