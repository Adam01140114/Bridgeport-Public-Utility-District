export type FieldType = 'text' | 'textarea' | 'date' | 'time' | 'select'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
  gridClass?: string
}

export interface LocationDef {
  id: string
  name: string
  shortDescription?: string
  fields: FieldDef[]
}

const onOffOptions = ['On', 'Off']

const liftStationFields: FieldDef[] = [
  { key: 'date', label: 'Date', type: 'date', gridClass: 'sm:col-span-1' },
  { key: 'time', label: 'Time', type: 'time', gridClass: 'sm:col-span-1' },
  {
    key: 'pump1MeterRead',
    label: 'Pump #1 meter read',
    type: 'text',
    placeholder: 'Reading',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'pump1Hours',
    label: 'Pump #1 hours',
    type: 'text',
    placeholder: 'Hours',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'pump2MeterRead',
    label: 'Pump #2 meter read',
    type: 'text',
    placeholder: 'Reading',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'pump2Hours',
    label: 'Pump #2 hours',
    type: 'text',
    placeholder: 'Hours',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'pumpOnOff',
    label: 'Pump ON/OFF',
    type: 'select',
    options: onOffOptions,
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'comments',
    label: 'Comments',
    type: 'textarea',
    gridClass: 'sm:col-span-2',
  },
]

const twinLakesFields: FieldDef[] = [
  { key: 'date', label: 'Date', type: 'date', gridClass: 'sm:col-span-1' },
  { key: 'time', label: 'Time', type: 'time', gridClass: 'sm:col-span-1' },
  {
    key: 'meterReading',
    label: 'Meter reading',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'flowMgd',
    label: 'Flow MGD',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'wellPsi',
    label: 'Well PSI',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'cl2Tank',
    label: 'CL2 tank',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'feTank',
    label: 'FE tank',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'cl2Free',
    label: 'CL2 free',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'dpNumber',
    label: 'D.P #',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'nextBackwashGallon',
    label: 'Next backwash gallon',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'outletPsi',
    label: 'Outlet PSI',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
]

const cainWellFields: FieldDef[] = [
  { key: 'date', label: 'Date', type: 'date', gridClass: 'sm:col-span-1' },
  { key: 'time', label: 'Time', type: 'time', gridClass: 'sm:col-span-1' },
  {
    key: 'meterReading',
    label: 'Meter reading',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'flowMgd',
    label: 'Flow MGD',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'chlorine',
    label: 'Chlorine',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'pressure',
    label: 'Pressure',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'comments',
    label: 'Comments',
    type: 'textarea',
    gridClass: 'sm:col-span-2',
  },
]

const coastingHillWellFields: FieldDef[] = [
  { key: 'date', label: 'Date', type: 'date', gridClass: 'sm:col-span-1' },
  { key: 'time', label: 'Time', type: 'time', gridClass: 'sm:col-span-1' },
  {
    key: 'meterReading',
    label: 'Meter reading',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'gallonsUsed',
    label: 'Gallons used',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'pressure',
    label: 'Pressure',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'wellOnOff',
    label: 'Well ON/OFF',
    type: 'select',
    options: onOffOptions,
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'comments',
    label: 'Comments',
    type: 'textarea',
    gridClass: 'sm:col-span-2',
  },
]

const sewerPondsFields: FieldDef[] = [
  { key: 'date', label: 'Date', type: 'date', gridClass: 'sm:col-span-1' },
  { key: 'time', label: 'Time', type: 'time', gridClass: 'sm:col-span-1' },
  {
    key: 'aeratorsInOut',
    label: "Aerator's In/Out",
    type: 'text',
    gridClass: 'sm:col-span-2',
  },
  {
    key: 'aerator1OnOff',
    label: 'Aerator #1 On/Off',
    type: 'select',
    options: onOffOptions,
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'aerator2OnOff',
    label: 'Aerator #2 On/Off',
    type: 'select',
    options: onOffOptions,
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'aerator3OnOff',
    label: 'Aerator #3 On/Off',
    type: 'select',
    options: onOffOptions,
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'ice',
    label: 'Ice',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'siteCondition',
    label: 'Site condition',
    type: 'textarea',
    gridClass: 'sm:col-span-2',
  },
  {
    key: 'comments',
    label: 'Comments',
    type: 'textarea',
    gridClass: 'sm:col-span-2',
  },
]

const tankFields: FieldDef[] = [
  { key: 'date', label: 'Date', type: 'date', gridClass: 'sm:col-span-1' },
  {
    key: 'time1',
    label: 'Time (tank level #1)',
    type: 'time',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'tankLevel1',
    label: 'Tank level #1',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'siteCondition',
    label: 'Site condition',
    type: 'textarea',
    gridClass: 'sm:col-span-2',
  },
  {
    key: 'time2',
    label: 'Time (tank level #2)',
    type: 'time',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'tankLevel2',
    label: 'Tank level #2',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'time3',
    label: 'Time (tank level #3)',
    type: 'time',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'tankLevel3',
    label: 'Tank level #3',
    type: 'text',
    gridClass: 'sm:col-span-1',
  },
  {
    key: 'comments',
    label: 'Comments',
    type: 'textarea',
    gridClass: 'sm:col-span-2',
  },
]

export const LOCATIONS: LocationDef[] = [
  {
    id: 'cal-trans-lift-station',
    name: 'Cal Trans Lift Station',
    shortDescription: 'Dual pump meter and run hours',
    fields: liftStationFields,
  },
  {
    id: 'art-webb-lift-station',
    name: 'Art Webb Lift Station',
    shortDescription: 'Dual pump meter and run hours',
    fields: liftStationFields,
  },
  {
    id: 'stock-dr-lift-station',
    name: 'Stock Dr. Lift Station',
    shortDescription: 'Dual pump meter and run hours',
    fields: liftStationFields,
  },
  {
    id: 'twin-lakes-well-i-arsenic-plant',
    name: 'Twin Lakes Well I Arsenic Plant',
    shortDescription: 'Well treatment plant readings',
    fields: twinLakesFields,
  },
  {
    id: 'cain-well-daily-log',
    name: 'Cain Well - Daily Log',
    shortDescription: 'Daily well operating log',
    fields: cainWellFields,
  },
  {
    id: 'coasting-hill-construction-water-well',
    name: 'Coasting Hill Construction Water Well',
    shortDescription: 'Construction well usage',
    fields: coastingHillWellFields,
  },
  {
    id: 'sewer-ponds',
    name: 'Sewer Ponds',
    shortDescription: 'Aerators and pond conditions',
    fields: sewerPondsFields,
  },
  {
    id: 'evans-tank',
    name: 'Evans Tank',
    shortDescription: 'Multiple tank level readings',
    fields: tankFields,
  },
  {
    id: 'coasting-hill-tank',
    name: 'Coasting Hill Tank',
    shortDescription: 'Multiple tank level readings',
    fields: tankFields,
  },
]

export function getLocationById(id: string): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id === id)
}
