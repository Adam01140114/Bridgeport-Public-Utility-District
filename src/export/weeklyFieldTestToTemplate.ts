import {
  analyteStorageKey,
  type AnalyteStorageName,
} from '../data/testMonthlyReportLayout'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Template columns on “Weekly Field Test” sheet. */
const COL_CAIN_INFLUENT = 3
const COL_TWIN_INFLUENT = 4
const COL_WEEKLY_EFFLUENT = 5
const COL_VESSEL_EFFLUENT_START = 6

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

/** `footer:well` → influent column (Cain #4 or Twin #2). */
function influentColumnForWeek(bundle: WeekFieldTestBundle): number | null {
  const well = bundle.values['footer:well']?.trim()
  if (well === 'Cain Well') return COL_CAIN_INFLUENT
  if (well === 'Twin Lakes Well') return COL_TWIN_INFLUENT
  return null
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
    const influentCol = influentColumnForWeek(bundle)

    for (const category of Object.keys(CATEGORY_START_ROW) as TemplateCategory[]) {
      const row = CATEGORY_START_ROW[category] + weekIndex
      dates.push({ row, dateIso })

      const analyte = STORAGE_ANALYTE_BY_CATEGORY[category]
      const influent = readAnalyte(bundle.values, 'in-skid', analyte)
      const effluent = readAnalyte(bundle.values, 'ex-skid', analyte)

      if (influentCol !== null && hasValue(influent)) {
        values.push({ row, col: influentCol, value: influent })
      }
      if (hasValue(effluent)) {
        values.push({ row, col: COL_WEEKLY_EFFLUENT, value: effluent })
      }

      if (category === 'chlorine' || category === 'iron') {
        VESSEL_EFFLUENT_ROWS.forEach((rowId, index) => {
          const vesselVal = readAnalyte(bundle.values, rowId, analyte)
          if (hasValue(vesselVal)) {
            values.push({ row, col: COL_VESSEL_EFFLUENT_START + index, value: vesselVal })
          }
        })
      }
    }
  }

  return { values, dates }
}
