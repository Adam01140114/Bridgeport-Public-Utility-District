export const TREATMENT_CATEGORIES = [
  'Arsenic (FTK)',
  'Iron (FTK)',
  'PH (FTK)',
  'CL2 - Res. (FTK)',
  /** Populated from Twin Lakes daily log “FE tank” (one value per calendar day per location). */
  'FE Inches',
] as const

export type TreatmentCategory = (typeof TREATMENT_CATEGORIES)[number]

/** Categories operators can pick on the Monthly Treatment Report “Add entry” form. FE Inches is only recorded via Twin Lakes daily logs. */
export const TREATMENT_CATEGORIES_MANUAL_REPORT = TREATMENT_CATEGORIES.filter(
  (c): c is Exclude<TreatmentCategory, 'FE Inches'> => c !== 'FE Inches'
)

/** Weekly FTK rows use a 7-day bucket; FE Inches uses the exact entry date for conflicts. */
export function isDailyTreatmentCategory(category: TreatmentCategory): boolean {
  return category === 'FE Inches'
}

export const TREATMENT_LOCATIONS_BASE = [
  'Cain Well #4',
  'Twin Well #2',
  'Weekly Eff.',
] as const

export const TREATMENT_LOCATIONS_VESSELS = [
  'Vessel #1 Eff.',
  'Vessel #2 Eff.',
  'Vessel #3 Eff.',
] as const

export type TreatmentLocationBase = (typeof TREATMENT_LOCATIONS_BASE)[number]
export type TreatmentLocationVessel = (typeof TREATMENT_LOCATIONS_VESSELS)[number]
export type TreatmentLocation = TreatmentLocationBase | TreatmentLocationVessel

const VESSEL_CATEGORIES: TreatmentCategory[] = ['Iron (FTK)', 'CL2 - Res. (FTK)']

export function locationsForCategory(category: TreatmentCategory): TreatmentLocation[] {
  if (VESSEL_CATEGORIES.includes(category)) {
    return [...TREATMENT_LOCATIONS_BASE, ...TREATMENT_LOCATIONS_VESSELS]
  }
  return [...TREATMENT_LOCATIONS_BASE]
}

export function vesselColumnsForCategory(category: TreatmentCategory): boolean {
  return VESSEL_CATEGORIES.includes(category)
}

/** 0–3: days 1–7, 8–14, 15–21, 22–end of month */
export function weekSlotFromDayOfMonth(day: number, daysInMonth: number): number {
  const d = Math.min(Math.max(1, day), daysInMonth)
  return Math.min(3, Math.floor((d - 1) / 7))
}

export function daysInMonthFromKey(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m) return 31
  return new Date(y, m, 0).getDate()
}

export function weekSlotFromDateInMonth(entryDate: string, monthKey: string): number {
  const m = entryDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 0
  const day = Number(m[3])
  const dim = daysInMonthFromKey(monthKey)
  return weekSlotFromDayOfMonth(day, dim)
}

/** Representative date for that week row (first day of bucket in month). */
export function weekRowDate(monthKey: string, slot: number): string {
  const [y, mo] = monthKey.split('-').map(Number)
  if (!y || !mo) return monthKey + '-01'
  const dim = daysInMonthFromKey(monthKey)
  const day = Math.min(dim, 1 + slot * 7)
  return `${monthKey}-${String(day).padStart(2, '0')}`
}

export function formatMonthTitle(monthKey: string): string {
  const [y, mo] = monthKey.split('-').map(Number)
  if (!y || !mo) return monthKey
  return new Date(y, mo - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

export function isDateInMonthKey(entryDate: string, monthKey: string): boolean {
  return entryDate.trim().startsWith(monthKey)
}
