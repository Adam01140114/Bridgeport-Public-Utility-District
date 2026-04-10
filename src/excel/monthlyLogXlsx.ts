import * as XLSX from 'xlsx'
import type { FieldDef, LocationDef } from '../data/locations'
import {
  cellForField,
  fieldByKey,
  monthTitleLine,
  sortChronological,
} from '../export/entryFormatting'
import type { LogEntry } from '../types/entry'

const DISTRICT = 'Bridgeport Public Utility District'

function isLiftStationLayout(fields: FieldDef[]): boolean {
  return fields.some((f) => f.key === 'pump1MeterRead')
}

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim()
}

function buildLiftStationSheet(
  location: LocationDef,
  monthKey: string,
  entries: LogEntry[],
): { name: string; rows: (string | number)[][] } {
  const sorted = sortChronological(entries)
  const hasFlow = location.fields.some((f) => f.key === 'flowMeterRead')
  const f = (key: string) => fieldByKey(location.fields, key)

  const head = hasFlow
    ? [
        [
          'Date',
          'Time',
          'Pump #1 Meter Reading',
          'Pump #1 HRS',
          'Pump #2 Meter Reading',
          'Pump #2 HRS',
          'Pump # On/off',
          'Flow meter reading',
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

  const titleRows: (string | number)[][] = [
    [DISTRICT],
    [`${location.name} — Daily log`],
    [monthTitleLine(monthKey)],
    [],
  ]

  const rows = [...titleRows, ...head, ...body]
  const safeName = sanitizeFilenamePart(location.name).slice(0, 28) || 'Log'
  return { name: safeName, rows }
}

function buildGenericSheet(
  location: LocationDef,
  monthKey: string,
  entries: LogEntry[],
): { name: string; rows: (string | number)[][] } {
  const fields = location.fields
  const sorted = sortChronological(entries)
  const head = [fields.map((f) => f.label)]
  const body: string[][] = sorted.map((e) => fields.map((field) => cellForField(e, field)))

  const titleRows: (string | number)[][] = [
    [DISTRICT],
    [`${location.name} — Daily log`],
    [monthTitleLine(monthKey)],
    [],
  ]

  const rows = [...titleRows, ...head, ...body]
  const safeName = sanitizeFilenamePart(location.name).slice(0, 28) || 'Log'
  return { name: safeName, rows }
}

export function downloadMonthlyLogXlsx(params: {
  location: LocationDef
  monthKey: string
  entries: LogEntry[]
}): void {
  const { location, monthKey, entries } = params
  if (entries.length === 0) return

  const { name, rows } = isLiftStationLayout(location.fields)
    ? buildLiftStationSheet(location, monthKey, entries)
    : buildGenericSheet(location, monthKey, entries)

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, name)

  const monthPart = monthKey === '_unknown' ? 'unknown-month' : monthKey
  const fileBase = sanitizeFilenamePart(`BPUD-${location.name}-${monthPart}`)
  XLSX.writeFile(wb, `${fileBase}.xlsx`)
}
