import { LOCATION_WEEKLY_NOTES } from '../data/testMonthlyReportLayout'
import type { WeekFieldTestBundle } from './weeklyFieldTestToTemplate'

export const WEEKLY_SHEET_SUMMARY = {
  gallonsCainRow: 22,
  gallonsTwinRow: 23,
  gallonsValueCol: 3,
  notesFirstRow: 26,
  notesMaxRows: 24,
} as const

function formatNoteLine(label: string, body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  const prefix = `${label} -`
  if (trimmed.toLowerCase().startsWith(label.toLowerCase())) return trimmed
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return trimmed
  return `${prefix} ${trimmed}`
}

/** One line per location for the monthly sheet; merges non-empty weekly notes in order. */
export function buildMonthlyNoteLines(bundles: WeekFieldTestBundle[]): string[] {
  const sorted = [...bundles].sort((a, b) => a.weekIndex - b.weekIndex)
  const lines: string[] = []

  for (const { key: storageKey, label } of LOCATION_WEEKLY_NOTES) {
    const parts: string[] = []
    for (const bundle of sorted) {
      const text = bundle.values[storageKey]?.trim()
      if (text) parts.push(text)
    }
    if (parts.length > 0) {
      const line = formatNoteLine(label, parts.join('; '))
      if (line) lines.push(line)
    }
  }

  const extraBlocks = sorted
    .map((b) => b.values['footer:notes']?.trim())
    .filter((t): t is string => Boolean(t))
  const seen = new Set<string>()
  for (const block of extraBlocks) {
    if (seen.has(block)) continue
    seen.add(block)
    for (const line of block.split(/\r?\n/)) {
      const t = line.trim()
      if (t) lines.push(t)
    }
  }

  return lines
}
