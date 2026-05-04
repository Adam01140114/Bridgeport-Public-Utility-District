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

export function mergesVesselLabelAndArsenic(row: RowTemplate): boolean {
  return row.vesselMerge === true
}
