import type { WeekFieldTestBundle } from './weeklyFieldTestToTemplate'

export const WEEKLY_SHEET_SUMMARY = {
  gallonsCainRow: 22,
  gallonsTwinRow: 23,
  gallonsValueCol: 3,
  notesFirstRow: 26,
  notesMaxRows: 24,
} as const

const KNOWN_NOTE_PREFIXES = [
  'Twin Well',
  'Twin Treated',
  'Cain Well',
  'Cain Treated',
] as const

function formatNoteLine(label: string, body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return ''
  const prefix = `${label} -`
  if (trimmed.toLowerCase().startsWith(label.toLowerCase())) return trimmed
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return trimmed
  return `${prefix} ${trimmed}`
}

function lineHasKnownPrefix(line: string): boolean {
  const lower = line.toLowerCase()
  return KNOWN_NOTE_PREFIXES.some((p) => lower.startsWith(p.toLowerCase()))
}

function influentNoteLabel(well: string): string | null {
  if (well === 'Cain Well') return 'Cain Well'
  if (well === 'Twin Lakes Well') return 'Twin Well'
  return null
}

function treatedNoteLabel(well: string): string | null {
  if (well === 'Cain Well') return 'Cain Treated'
  if (well === 'Twin Lakes Well') return 'Twin Treated'
  return null
}

function inferNoteLabel(bundle: WeekFieldTestBundle, line: string): string | null {
  const well = bundle.values['footer:well']?.trim() ?? ''
  if (!well) return null
  if (/\btreated\b/i.test(line)) return treatedNoteLabel(well)
  return influentNoteLabel(well)
}

/**
 * Build note lines for the monthly Excel sheet from each week’s additional notes and
 * “What well is running?” selection.
 */
export function buildMonthlyNoteLines(bundles: WeekFieldTestBundle[]): string[] {
  const sorted = [...bundles].sort((a, b) => a.weekIndex - b.weekIndex)
  const lines: string[] = []
  const seen = new Set<string>()

  const push = (line: string) => {
    const t = line.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    lines.push(t)
  }

  for (const bundle of sorted) {
    const block = bundle.values['footer:notes']?.trim()
    if (!block) continue

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line) continue

      if (lineHasKnownPrefix(line)) {
        push(line)
        continue
      }

      const label = inferNoteLabel(bundle, line)
      if (label) {
        push(formatNoteLine(label, line))
      } else {
        push(line)
      }
    }
  }

  return lines
}
