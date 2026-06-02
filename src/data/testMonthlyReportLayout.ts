export type CellMode = 'input' | 'blank'

export type RowTemplate = {
  id: string
  label: string
  arsenic: CellMode
  iron: CellMode
  chlorine: CellMode
  ph: CellMode
  alk: CellMode
  hard: CellMode
  temp: CellMode
  /** Label cell merges with arsenic column (blank As) — vessel rows. */
  vesselMerge?: boolean
}

export const INFLUENT_ROWS: RowTemplate[] = [
  {
    id: 'in-skid',
    label: 'Skid - Influent',
    arsenic: 'input',
    iron: 'input',
    chlorine: 'input',
    ph: 'input',
    alk: 'input',
    hard: 'input',
    temp: 'input',
  },
  {
    id: 'in-v1',
    label: 'Vessel - 1 Influent',
    arsenic: 'blank',
    iron: 'input',
    chlorine: 'input',
    ph: 'blank',
    alk: 'blank',
    hard: 'blank',
    temp: 'blank',
    vesselMerge: true,
  },
  {
    id: 'in-v2',
    label: 'Vessel - 2 Influent',
    arsenic: 'blank',
    iron: 'input',
    chlorine: 'input',
    ph: 'blank',
    alk: 'blank',
    hard: 'blank',
    temp: 'blank',
    vesselMerge: true,
  },
  {
    id: 'in-v3',
    label: 'Vessel - 3 Influent',
    arsenic: 'blank',
    iron: 'input',
    chlorine: 'input',
    ph: 'blank',
    alk: 'blank',
    hard: 'blank',
    temp: 'blank',
    vesselMerge: true,
  },
]

export const EFFLUENT_ROWS: RowTemplate[] = [
  {
    id: 'ex-skid',
    label: 'Skid - Effluent',
    arsenic: 'input',
    iron: 'input',
    chlorine: 'input',
    ph: 'input',
    alk: 'input',
    hard: 'input',
    temp: 'input',
  },
  {
    id: 'ex-v1',
    label: 'Vessel - 1 Effluent',
    arsenic: 'blank',
    iron: 'input',
    chlorine: 'input',
    ph: 'blank',
    alk: 'blank',
    hard: 'blank',
    temp: 'blank',
    vesselMerge: true,
  },
  {
    id: 'ex-v2',
    label: 'Vessel - 2 Effluent',
    arsenic: 'blank',
    iron: 'input',
    chlorine: 'input',
    ph: 'blank',
    alk: 'blank',
    hard: 'blank',
    temp: 'blank',
    vesselMerge: true,
  },
  {
    id: 'ex-v3',
    label: 'Vessel - 3 Effluent',
    arsenic: 'blank',
    iron: 'input',
    chlorine: 'input',
    ph: 'blank',
    alk: 'blank',
    hard: 'blank',
    temp: 'blank',
    vesselMerge: true,
  },
]

export function fieldKey(rowId: string, field: string): string {
  return `${rowId}:${field}`
}

/** Keys used in Firestore / form state (`in-skid:as`, etc.) — not the RowTemplate property names. */
export const ANALYTE_STORAGE_KEYS = {
  arsenic: 'as',
  iron: 'fe',
  chlorine: 'cl2',
  ph: 'ph',
  alk: 'alk',
  hard: 'hard',
  temp: 'temp',
} as const

export type AnalyteStorageName = keyof typeof ANALYTE_STORAGE_KEYS

export function analyteStorageKey(rowId: string, analyte: AnalyteStorageName): string {
  return fieldKey(rowId, ANALYTE_STORAGE_KEYS[analyte])
}

export function mergesVesselLabelAndArsenic(row: RowTemplate): boolean {
  return row.vesselMerge === true
}

/** Weekly location notes on the monthly report export (rows under “Notes:”). */
export const LOCATION_WEEKLY_NOTES = [
  { key: 'note:twinWell', label: 'Twin Well' },
  { key: 'note:twinTreated', label: 'Twin Treated' },
  { key: 'note:cainWell', label: 'Cain Well' },
  { key: 'note:cainTreated', label: 'Cain Treated' },
] as const
