import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { formatMonthTitle } from '../data/treatmentReport'
import {
  TREATMENT_REPORT_HEADER_LOCATIONS,
  buildTreatmentReportTableBody,
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
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(REPORT_TITLE, pageW / 2, y, { align: 'center' })
  y += 20
  doc.setFontSize(11)
  doc.text(`Month Of: ${formatMonthTitle(monthKey)}`, pageW / 2, y, { align: 'center' })
  y += 28

  const head = [['Category', 'DATE', ...TREATMENT_REPORT_HEADER_LOCATIONS]]
  const body = buildTreatmentReportTableBody(monthKey, entries)

  const innerW = pageW - MARGIN * 2
  const catW = 108
  const dateW = 64
  const rest = innerW - catW - dateW
  const locW = rest / 6

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.35,
    tableWidth: innerW,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3,
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
      if (data.section !== 'body' || data.row.index === undefined) return
      const row = body[data.row.index]
      if (row && row.every((c) => c === '')) {
        data.cell.styles.fillColor = [255, 255, 255]
        data.cell.styles.minCellHeight = 6
        data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 3, right: 3 }
        data.cell.styles.fontStyle = 'normal'
      }
    },
  })

  openPdfBlob(doc)
}
