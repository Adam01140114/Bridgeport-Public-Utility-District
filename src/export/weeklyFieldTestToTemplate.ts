import {
  analyteStorageKey,
  type AnalyteStorageName,
} from '../data/testMonthlyReportLayout'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Cain influent column weeks 1 & 4; Twin influent column weeks 2 & 3 (matches district sheet pattern). */
const CAIN_WEEK_INDICES = new Set([0, 3])
const TWIN_WEEK_INDICES = new Set([1, 2])

const CATEGORY_START_ROW = {
  chlorine: 5,
  iron: 9,
  arsenic: 13,
  ph: 17,
} as const

type TemplateCategory = keyof typeof CATEGORY_START_ROW

const STORAGE_ANALYTE_BY_CATEGORY: Record<TemplateCategory, AnalyteStorageName> = {
  chlorine: 'chlorine',
  iron: 'iron',
  arsenic: 'arsenic',
  ph: 'ph',
}

const VESSEL_EFFLUENT_ROWS = ['ex-v1', 'ex-v2', 'ex-v3'] as const

export type WeekFieldTestBundle = {
  weekIndex: number
  values: Record<string, string>
  /** Used for the DATE column when `header:date` is missing. */
  fallbackDateIso: string
}

function readAnalyte(
  values: Record<string, string>,
  rowId: string,
  analyte: AnalyteStorageName
): string {
  return values[analyteStorageKey(rowId, analyte)]?.trim() ?? ''
}

function hasValue(raw: string): boolean {
  return raw.length > 0
}

function weekDateIso(bundle: WeekFieldTestBundle): string {
  const header = bundle.values['header:date']?.trim() ?? ''
  if (ISO_DATE_RE.test(header)) return header
  return bundle.fallbackDateIso
}

export type TemplateWeeklyCell = {
  row: number
  col: number
  value: string
}

export type TemplateWeeklyDate = {
  row: number
  dateIso: string
}

/** Map all weeks of field-test form data into template weekly sheet coordinates. */
export function buildWeeklyTemplateCells(
  bundles: WeekFieldTestBundle[],
): { values: TemplateWeeklyCell[]; dates: TemplateWeeklyDate[] } {
  const values: TemplateWeeklyCell[] = []
  const dates: TemplateWeeklyDate[] = []

  for (const bundle of bundles) {
    const { weekIndex } = bundle
    if (weekIndex < 0 || weekIndex > 3) continue

    const dateIso = weekDateIso(bundle)

    for (const category of Object.keys(CATEGORY_START_ROW) as TemplateCategory[]) {
      const row = CATEGORY_START_ROW[category] + weekIndex
      dates.push({ row, dateIso })

      const analyte = STORAGE_ANALYTE_BY_CATEGORY[category]
      const influent = readAnalyte(bundle.values, 'in-skid', analyte)
      const effluent = readAnalyte(bundle.values, 'ex-skid', analyte)

      if (CAIN_WEEK_INDICES.has(weekIndex) && hasValue(influent)) {
        values.push({ row, col: 3, value: influent })
      }
      if (TWIN_WEEK_INDICES.has(weekIndex) && hasValue(influent)) {
        values.push({ row, col: 4, value: influent })
      }
      if (hasValue(effluent)) {
        values.push({ row, col: 5, value: effluent })
      }

      if (category === 'chlorine' || category === 'iron') {
        VESSEL_EFFLUENT_ROWS.forEach((rowId, index) => {
          const vesselVal = readAnalyte(bundle.values, rowId, analyte)
          if (hasValue(vesselVal)) {
            values.push({ row, col: 6 + index, value: vesselVal })
          }
        })
      }
    }
  }

  return { values, dates }
}
