import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { shiftMonthKey } from '../data/monthKeyNav'
import { formatMonthTitle } from '../data/treatmentReport'
import {
  type CellMode,
  EFFLUENT_ROWS,
  fieldKey,
  INFLUENT_ROWS,
  mergesVesselLabelAndArsenic,
  type RowTemplate,
} from '../data/testMonthlyReportLayout'
import { exportTestMonthlyReportXlsx } from '../excel/testMonthlyReportXlsx'
import { exportTestMonthlyReportPdf } from '../pdf/testMonthlyReportPdf'
import { backNavOnDarkClass, backNavOnLightClass } from '../ui/backNav'

function monthKeyFromParts(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

const cellInputClass =
  'w-full min-h-[40px] border-0 bg-transparent px-2 py-1.5 text-center text-sm text-slate-900 outline-none placeholder:text-slate-400/80 focus:bg-white/60 sm:min-h-[36px] sm:text-xs'

const cellInputClassOnRed =
  'w-full min-h-[40px] border-0 bg-transparent px-2 py-1.5 text-center text-sm text-slate-900 outline-none placeholder:text-slate-400/80 focus:bg-[#fde4df]/90 sm:min-h-[36px] sm:text-xs'

const cellInputClassOnBlue =
  'w-full min-h-[40px] border-0 bg-transparent px-2 py-1.5 text-center text-sm text-slate-900 outline-none placeholder:text-slate-400/80 focus:bg-[#e8f4fd]/95 sm:min-h-[36px] sm:text-xs'

const cellBlankClass = 'min-h-[40px] bg-black/[0.04] sm:min-h-[36px]'

const cellBlankClassRed = 'min-h-[40px] bg-[#fcd5ce] sm:min-h-[36px]'

const cellBlankClassBlue = 'min-h-[40px] bg-[#cfe8fc] sm:min-h-[36px]'

type AnalyticDataSurface = 'default' | 'redBand' | 'blueBand'

function isVesselRow(rowId: string): boolean {
  return /^(in|ex)-v[123]$/.test(rowId)
}

/** As / Cl₂ tints; Fe red except vessel rows (white) and except Skid effluent (blue with As/Cl). */
function analyticDataCellSurface(rowId: string, column: 'as' | 'fe' | 'cl2'): AnalyticDataSurface {
  if (rowId === 'ex-skid' && (column === 'as' || column === 'fe' || column === 'cl2')) {
    return 'blueBand'
  }
  if (rowId === 'in-skid' && (column === 'as' || column === 'cl2')) {
    return 'redBand'
  }
  if (column === 'fe' && rowId !== 'ex-skid' && !isVesselRow(rowId)) {
    return 'redBand'
  }
  return 'default'
}

function noteColumnSurface(
  row: RowTemplate,
  col: 'ph' | 'alk' | 'hard' | 'temp',
  section: 'influent' | 'effluent',
): AnalyticDataSurface {
  const mode = row[col]
  if (mode !== 'input') return 'default'
  return section === 'influent' ? 'redBand' : 'blueBand'
}

function MonthPicker({
  pickerYear,
  setPickerYear,
  onSelectMonth,
}: {
  pickerYear: number
  setPickerYear: (y: number | ((n: number) => number)) => void
  onSelectMonth: (key: string) => void
}) {
  const now = useMemo(() => new Date(), [])
  return (
    <section className="overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-sky-400/10 p-6 shadow-2xl shadow-black/20 ring-1 ring-white/30 backdrop-blur-md sm:p-10">
      <p className="text-center text-sm font-medium uppercase tracking-[0.25em] text-sky-200/80 sm:text-left">
        Select month
      </p>
      <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-[#071a2e]/40 px-2 py-2 ring-1 ring-white/10 sm:justify-start">
        <button
          type="button"
          onClick={() => setPickerYear((y) => y - 1)}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg text-white transition hover:bg-white/10"
          aria-label="Previous year"
        >
          ‹
        </button>
        <span className="min-w-[5rem] text-center text-xl font-semibold tabular-nums text-white">
          {pickerYear}
        </span>
        <button
          type="button"
          onClick={() => setPickerYear((y) => y + 1)}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg text-white transition hover:bg-white/10"
          aria-label="Next year"
        >
          ›
        </button>
      </div>
      <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const key = monthKeyFromParts(pickerYear, monthIndex)
          const label = new Date(pickerYear, monthIndex, 1).toLocaleString(undefined, {
            month: 'short',
          })
          const isCurrent = now.getFullYear() === pickerYear && now.getMonth() === monthIndex
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectMonth(key)}
              className={
                'group relative flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-2xl border px-4 py-3 text-left transition sm:min-h-[5rem] ' +
                (isCurrent
                  ? 'border-sky-300/60 bg-sky-400/20 ring-2 ring-sky-300/50'
                  : 'border-white/15 bg-white/[0.07] ring-1 ring-white/10 hover:border-sky-200/40 hover:bg-white/[0.12]')
              }
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-200/70">
                {label}
              </span>
              <span className="mt-2 text-2xl font-bold tabular-nums text-white sm:text-xl">
                {monthIndex + 1}
              </span>
              <span className="mt-1 text-[10px] font-medium text-sky-200/50 opacity-0 transition group-hover:opacity-100">
                Open →
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

type MonthWeekSlice = {
  weekNumber: number
  start: Date
  end: Date
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Local calendar date as `YYYY-MM-DD` for `<input type="date">` (avoids UTC shifts). */
function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Map legacy `HHMM` or empty to `HH:mm` for `<input type="time">`. */
function normalizeHeaderTimeForNative(s: string): string {
  const t = (s ?? '').trim()
  if (/^\d{2}:\d{2}$/.test(t)) return t
  if (/^\d{3,4}$/.test(t)) {
    const pad = t.padStart(4, '0')
    return `${pad.slice(0, 2)}:${pad.slice(2, 4)}`
  }
  return ''
}

/** At most four weeks per month: 1–7, 8–14, 15–21, then 22–last (remaining days roll into week 4). */
function weekSlicesInMonth(monthKey: string): MonthWeekSlice[] {
  const [y, mo] = monthKey.split('-').map(Number)
  if (!y || !mo) return []
  const lastDay = new Date(y, mo, 0).getDate()
  const slices: MonthWeekSlice[] = []

  const pushSlice = (weekNumber: number, startDay: number, endDay: number) => {
    slices.push({
      weekNumber,
      start: new Date(y, mo - 1, startDay),
      end: new Date(y, mo - 1, endDay),
    })
  }

  for (let w = 0; w < 3; w++) {
    const startDay = w * 7 + 1
    if (startDay > lastDay) return slices
    const endDay = Math.min(startDay + 6, lastDay)
    pushSlice(w + 1, startDay, endDay)
  }

  const week4Start = 22
  if (week4Start > lastDay) return slices
  pushSlice(4, week4Start, lastDay)
  return slices
}

function weekStorageKey(monthKey: string, weekIndex: number): string {
  return `${monthKey}|w${weekIndex}`
}

function WeekPicker({
  monthKey,
  onSelectWeek,
  onBackToMonth,
}: {
  monthKey: string
  onSelectWeek: (weekIndex: number) => void
  onBackToMonth: () => void
}) {
  const weeks = useMemo(() => weekSlicesInMonth(monthKey), [monthKey])
  return (
    <section className="overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-sky-400/10 p-6 shadow-2xl shadow-black/20 ring-1 ring-white/30 backdrop-blur-md sm:p-10">
      <button
        type="button"
        onClick={onBackToMonth}
        className={`${backNavOnLightClass} mb-6 block w-fit`}
      >
        ← Change month
      </button>
      <p className="text-center text-sm font-medium uppercase tracking-[0.25em] text-sky-200/80 sm:text-left">
        Select week
      </p>
      <p className="mt-2 text-center text-lg font-semibold text-white sm:text-left sm:text-xl">
        {formatMonthTitle(monthKey)}
      </p>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {weeks.map((w, i) => (
          <button
            key={w.weekNumber}
            type="button"
            onClick={() => onSelectWeek(i)}
            className="group flex min-h-[4.5rem] flex-col items-start justify-center rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-left ring-1 ring-white/10 transition hover:border-sky-200/40 hover:bg-white/[0.12] sm:min-h-[4.25rem]"
          >
            <span className="text-lg font-bold tabular-nums text-white sm:text-xl">Week {w.weekNumber}</span>
            <span className="mt-1 text-[10px] font-medium text-sky-200/50 opacity-0 transition group-hover:opacity-100">
              Open →
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function DataCell({
  mode,
  value,
  onChange,
  placeholder,
  surface = 'default',
}: {
  mode: CellMode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  surface?: AnalyticDataSurface
}) {
  if (mode === 'blank') {
    const blankBg =
      surface === 'redBand' ? cellBlankClassRed : surface === 'blueBand' ? cellBlankClassBlue : cellBlankClass
    return <td className={`border border-slate-800/90 ${blankBg}`} aria-hidden />
  }
  const tdBg =
    surface === 'redBand' ? 'bg-[#fcd5ce]' : surface === 'blueBand' ? 'bg-[#cfe8fc]' : 'bg-white/90'
  const inputClass =
    surface === 'redBand' ? cellInputClassOnRed : surface === 'blueBand' ? cellInputClassOnBlue : cellInputClass
  return (
    <td className={`border border-slate-800/90 p-0 ${tdBg}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </td>
  )
}

const vesselDisabledStripeStyle: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-32deg, transparent, transparent 5px, rgba(71,85,105,0.22) 5px, rgba(71,85,105,0.22) 7px)',
}

/** PH / ALK / hard / Temp are not entered per individual vessel row (skid-level only). */
function VesselNoteDisabledCell({ band }: { band: 'influent' | 'effluent' }) {
  const bandBg = band === 'influent' ? 'bg-[#fcd5ce]' : 'bg-[#cfe8fc]'
  return (
    <td
      className={`relative border border-slate-800/90 p-0 ${bandBg}`}
      title="Not used for individual vessel rows"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-slate-400/25" style={vesselDisabledStripeStyle} />
      <div className="relative min-h-[40px] sm:min-h-[36px]" />
    </td>
  )
}

const mergedLabelCellClass =
  'border border-slate-800 px-3 py-3 text-center align-middle text-xs font-semibold leading-snug text-slate-900 sm:text-sm'

/** Paper form: vessel row label strip is white on the tinted row band. */
const mergedVesselLabelCellClass = `${mergedLabelCellClass} bg-white`

const fieldTestingHeaderRowClass =
  'bg-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-900 sm:text-xs'

function InfluentEffluentSectionDividerRow() {
  return (
    <tbody aria-hidden="true">
      <tr>
        <td colSpan={8} className="h-2.5 border-0 bg-white p-0" />
      </tr>
    </tbody>
  )
}

function FieldTestingColumnHeaderRow({
  monthTitle,
  visualRepeat,
}: {
  monthTitle: string
  /** Mid-table copy: same look as thead, hidden from assistive tech (real headers stay in thead). */
  visualRepeat?: boolean
}) {
  return (
    <tr className={fieldTestingHeaderRowClass} aria-hidden={visualRepeat ? true : undefined}>
      <th
        scope="col"
        className="border border-slate-800 px-2 py-2 text-left font-semibold normal-case tracking-normal sm:w-[9.5rem] sm:text-xs"
      >
        {monthTitle}
      </th>
      <th scope="col" className="min-w-[9.5rem] whitespace-nowrap border border-slate-800 px-2 py-2">
        Arsenic — AS
      </th>
      <th scope="col" className="min-w-[8.25rem] whitespace-nowrap border border-slate-800 px-2 py-2">
        Iron — FE
      </th>
      <th scope="col" className="min-w-[10.5rem] whitespace-nowrap border border-slate-800 px-2 py-2">
        <span className="inline-flex items-baseline gap-0">
          <span>Chlorine — CL</span>
          <sub className="translate-y-[-0.04em] text-[1.2em] font-bold leading-none">2</sub>
        </span>
      </th>
      <th scope="col" className="min-w-[6rem] border border-slate-800 px-2 py-2">
        PH
      </th>
      <th scope="col" className="min-w-[6rem] border border-slate-800 px-2 py-2">
        ALK
      </th>
      <th scope="col" className="min-w-[6rem] border border-slate-800 px-2 py-2">
        hard
      </th>
      <th scope="col" className="min-w-[6rem] border border-slate-800 px-2 py-2">
        Temp
      </th>
    </tr>
  )
}

function FieldTestingTable({
  rows,
  values,
  onChange,
  rowBandClass,
  fieldNotesSection,
}: {
  rows: RowTemplate[]
  values: Record<string, string>
  onChange: (key: string, v: string) => void
  rowBandClass: string
  fieldNotesSection: 'influent' | 'effluent'
}) {
  return (
    <tbody>
      {rows.map((row) => {
        const vesselMerge = mergesVesselLabelAndArsenic(row)

        return (
          <tr key={row.id} className={rowBandClass}>
            {vesselMerge ? (
              <th colSpan={2} scope="row" className={mergedVesselLabelCellClass}>
                {row.label}
              </th>
            ) : (
              <th
                scope="row"
                className="border border-slate-800 px-2 py-2 text-left text-xs font-semibold text-slate-900 sm:w-[9.5rem] sm:text-sm"
              >
                {row.label}
              </th>
            )}
            {!vesselMerge && (
              <DataCell
                mode={row.arsenic}
                value={values[fieldKey(row.id, 'as')] ?? ''}
                onChange={(v) => onChange(fieldKey(row.id, 'as'), v)}
                surface={analyticDataCellSurface(row.id, 'as')}
              />
            )}
            <DataCell
              mode={row.iron}
              value={values[fieldKey(row.id, 'fe')] ?? ''}
              onChange={(v) => onChange(fieldKey(row.id, 'fe'), v)}
              surface={analyticDataCellSurface(row.id, 'fe')}
            />
            <DataCell
              mode={row.chlorine}
              value={values[fieldKey(row.id, 'cl2')] ?? ''}
              onChange={(v) => onChange(fieldKey(row.id, 'cl2'), v)}
              surface={analyticDataCellSurface(row.id, 'cl2')}
            />
            {vesselMerge ? (
              <>
                <VesselNoteDisabledCell band={fieldNotesSection} />
                <VesselNoteDisabledCell band={fieldNotesSection} />
                <VesselNoteDisabledCell band={fieldNotesSection} />
                <VesselNoteDisabledCell band={fieldNotesSection} />
              </>
            ) : (
              <>
                <DataCell
                  mode={row.ph}
                  value={values[fieldKey(row.id, 'ph')] ?? ''}
                  onChange={(v) => onChange(fieldKey(row.id, 'ph'), v)}
                  surface={noteColumnSurface(row, 'ph', fieldNotesSection)}
                />
                <DataCell
                  mode={row.alk}
                  value={values[fieldKey(row.id, 'alk')] ?? ''}
                  onChange={(v) => onChange(fieldKey(row.id, 'alk'), v)}
                  surface={noteColumnSurface(row, 'alk', fieldNotesSection)}
                />
                <DataCell
                  mode={row.hard}
                  value={values[fieldKey(row.id, 'hard')] ?? ''}
                  onChange={(v) => onChange(fieldKey(row.id, 'hard'), v)}
                  surface={noteColumnSurface(row, 'hard', fieldNotesSection)}
                />
                <DataCell
                  mode={row.temp}
                  value={values[fieldKey(row.id, 'temp')] ?? ''}
                  onChange={(v) => onChange(fieldKey(row.id, 'temp'), v)}
                  surface={noteColumnSurface(row, 'temp', fieldNotesSection)}
                />
              </>
            )}
          </tr>
        )
      })}
    </tbody>
  )
}

type ReportPhase = 'month' | 'week' | 'form'

export function TestMonthlyReportPage() {
  const now = useMemo(() => new Date(), [])
  const [pickerYear, setPickerYear] = useState(now.getFullYear())
  const [phase, setPhase] = useState<ReportPhase>('month')
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null)
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)
  const [valuesByWeek, setValuesByWeek] = useState<Record<string, Record<string, string>>>({})
  const [tableMotion, setTableMotion] = useState<{ seq: number; dir: 'left' | 'right' | null }>({
    seq: 0,
    dir: null,
  })

  const weekSlicesForMonth = useMemo(
    () => (activeMonthKey ? weekSlicesInMonth(activeMonthKey) : []),
    [activeMonthKey],
  )
  const currentWeekSlice = weekSlicesForMonth[activeWeekIndex] ?? null
  const lastWeekIndex = Math.max(0, weekSlicesForMonth.length - 1)

  const weekDateIsoBounds = useMemo(() => {
    if (!currentWeekSlice) return { min: '', max: '' }
    return { min: toIsoDateLocal(currentWeekSlice.start), max: toIsoDateLocal(currentWeekSlice.end) }
  }, [currentWeekSlice])

  const storageKey =
    activeMonthKey && phase === 'form' ? weekStorageKey(activeMonthKey, activeWeekIndex) : null
  const values = storageKey ? (valuesByWeek[storageKey] ?? {}) : {}

  const onFieldChange = useCallback(
    (key: string, v: string) => {
      if (!storageKey) return
      setValuesByWeek((prev) => ({
        ...prev,
        [storageKey]: { ...(prev[storageKey] ?? {}), [key]: v },
      }))
    },
    [storageKey],
  )

  useEffect(() => {
    if (!storageKey || !activeMonthKey) return
    const slices = weekSlicesInMonth(activeMonthKey)
    const slice = slices[activeWeekIndex]
    if (!slice) return
    const min = toIsoDateLocal(slice.start)
    const max = toIsoDateLocal(slice.end)
    setValuesByWeek((prev) => {
      const cur = prev[storageKey]
      if (!cur) return prev
      const d = cur['header:date'] ?? ''
      if (!ISO_DATE_RE.test(d) || (d >= min && d <= max)) return prev
      return { ...prev, [storageKey]: { ...cur, 'header:date': '' } }
    })
  }, [storageKey, activeMonthKey, activeWeekIndex])

  const selectMonth = useCallback((key: string) => {
    setActiveMonthKey(key)
    setActiveWeekIndex(0)
    setPhase('week')
  }, [])

  const selectWeekAndOpenForm = useCallback((weekIndex: number) => {
    setActiveWeekIndex(weekIndex)
    setPhase('form')
    setTableMotion({ seq: 0, dir: null })
  }, [])

  const goToChangeMonth = useCallback(() => {
    setActiveMonthKey(null)
    setActiveWeekIndex(0)
    setPhase('month')
    setTableMotion({ seq: 0, dir: null })
  }, [])

  const goPrevWeek = useCallback(() => {
    setTableMotion((m) => ({ seq: m.seq + 1, dir: 'left' }))
    if (activeWeekIndex > 0) {
      setActiveWeekIndex((i) => i - 1)
      return
    }
    const prevKey = shiftMonthKey(activeMonthKey!, -1)
    const prevWeeks = weekSlicesInMonth(prevKey)
    setActiveMonthKey(prevKey)
    setActiveWeekIndex(Math.max(0, prevWeeks.length - 1))
  }, [activeWeekIndex, activeMonthKey])

  const goNextWeek = useCallback(() => {
    setTableMotion((m) => ({ seq: m.seq + 1, dir: 'right' }))
    if (activeWeekIndex < lastWeekIndex) {
      setActiveWeekIndex((i) => i + 1)
      return
    }
    const nextKey = shiftMonthKey(activeMonthKey!, 1)
    setActiveMonthKey(nextKey)
    setActiveWeekIndex(0)
  }, [activeWeekIndex, lastWeekIndex, activeMonthKey])

  useEffect(() => {
    if (!activeMonthKey) return
    const y = Number(activeMonthKey.split('-')[0])
    if (!Number.isNaN(y)) setPickerYear(y)
  }, [activeMonthKey])

  const footerFieldId = (field: string) =>
    storageKey ? `tmr-${field}-${storageKey.replace(/[^a-zA-Z0-9]/g, '-')}` : `tmr-${field}`

  const headerFieldId = (field: string) =>
    storageKey ? `tmr-hdr-${field}-${storageKey.replace(/[^a-zA-Z0-9]/g, '-')}` : `tmr-hdr-${field}`

  if (phase === 'month' || !activeMonthKey) {
    return (
      <div className="space-y-8 sm:space-y-10">
        <div>
          <Link to="/" className={`${backNavOnDarkClass} mb-4 block w-fit sm:mb-0 sm:inline-flex`}>
            ← Home
          </Link>
          <h1 className="mt-0 text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:mt-2 sm:text-3xl">
            New Monthly Report
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-100/85 sm:text-sm">
            Experimental UI — pick a month, then a week, to open the paper-style weekly field
            testing layout. Export PDF or Excel from the form.
          </p>
        </div>
        <MonthPicker pickerYear={pickerYear} setPickerYear={setPickerYear} onSelectMonth={selectMonth} />
      </div>
    )
  }

  if (phase === 'week') {
    return (
      <div className="space-y-8 sm:space-y-10">
        <div>
          <Link to="/" className={`${backNavOnDarkClass} mb-4 block w-fit sm:mb-0 sm:inline-flex`}>
            ← Home
          </Link>
          <h1 className="mt-0 text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:mt-2 sm:text-3xl">
            New Monthly Report
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-100/85 sm:text-sm">
            Choose which week of {formatMonthTitle(activeMonthKey)} you are recording.
          </p>
        </div>
        <WeekPicker
          monthKey={activeMonthKey}
          onSelectWeek={selectWeekAndOpenForm}
          onBackToMonth={goToChangeMonth}
        />
      </div>
    )
  }

  const weekHeadingLine =
    currentWeekSlice &&
    `Weekly field testing — ${formatMonthTitle(activeMonthKey)} Week ${currentWeekSlice.weekNumber}`

  const tableAnimClass =
    tableMotion.dir === 'right'
      ? 'animate-[tmr-slide-from-right_320ms_ease-out_both]'
      : tableMotion.dir === 'left'
        ? 'animate-[tmr-slide-from-left_320ms_ease-out_both]'
        : ''

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="flex flex-col items-start gap-2">
          <Link to="/" className={`${backNavOnDarkClass} block w-fit`}>
            ← Home
          </Link>
          <button type="button" onClick={goToChangeMonth} className={`${backNavOnLightClass} block w-fit`}>
            Change date
          </button>
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">
          Experimental
        </p>
        <h1 className="mt-1 text-xl font-semibold leading-snug text-white sm:text-2xl">
          {weekHeadingLine}
        </h1>
      </div>

      <div className="rounded-2xl border-2 border-slate-900 bg-white shadow-2xl ring-1 ring-slate-300/80">
        <div className="border-b-2 border-slate-900 bg-white px-4 py-3 text-center sm:px-6">
          <h2 className="text-base font-bold tracking-wide text-slate-900 sm:text-lg">
            Bridgeport PUD Arsenic Plant Weekly Field Testing
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-600">
            Month: {formatMonthTitle(activeMonthKey)}
          </p>
          {currentWeekSlice && (
            <p className="mt-0.5 text-xs font-medium text-slate-500">Week {currentWeekSlice.weekNumber}</p>
          )}
          <div className="mx-auto mt-4 flex max-w-lg flex-col gap-3 text-left sm:max-w-none sm:flex-row sm:justify-center sm:gap-6">
            <div className="flex-1 sm:max-w-[11rem]">
              <label htmlFor={headerFieldId('date')} className="block text-[11px] font-semibold text-slate-600">
                Date
              </label>
              <input
                id={headerFieldId('date')}
                type="date"
                min={weekDateIsoBounds.min}
                max={weekDateIsoBounds.max}
                value={ISO_DATE_RE.test(values['header:date'] ?? '') ? (values['header:date'] as string) : ''}
                onChange={(e) => onFieldChange('header:date', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-500 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-600"
              />
            </div>
            <div className="flex-1 sm:max-w-[9rem]">
              <label htmlFor={headerFieldId('time')} className="block text-[11px] font-semibold text-slate-600">
                Time
              </label>
              <input
                id={headerFieldId('time')}
                type="time"
                step={60}
                value={normalizeHeaderTimeForNative(values['header:time'] ?? '')}
                onChange={(e) => onFieldChange('header:time', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-500 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-600"
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div
            key={tableMotion.seq}
            className={`overflow-x-auto ${tableAnimClass}`}
          >
            <table className="w-full min-w-[920px] border-collapse border-2 border-slate-900 text-left">
              <thead>
                <FieldTestingColumnHeaderRow monthTitle={formatMonthTitle(activeMonthKey)} />
              </thead>
              <FieldTestingTable
                rows={INFLUENT_ROWS}
                values={values}
                onChange={onFieldChange}
                rowBandClass="bg-[#fcd5ce]"
                fieldNotesSection="influent"
              />
              <InfluentEffluentSectionDividerRow />
              <tbody>
                <FieldTestingColumnHeaderRow
                  monthTitle={formatMonthTitle(activeMonthKey)}
                  visualRepeat
                />
              </tbody>
              <FieldTestingTable
                rows={EFFLUENT_ROWS}
                values={values}
                onChange={onFieldChange}
                rowBandClass="bg-[#cfe8fc]"
                fieldNotesSection="effluent"
              />
            </table>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="rounded-lg border-2 border-slate-800 bg-[#fff7c2] p-4 shadow-inner sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900">Notes</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor={footerFieldId('well')} className="block text-xs font-semibold text-slate-700">
                  What well is running?
                </label>
                <input
                  id={footerFieldId('well')}
                  type="text"
                  value={values['footer:well'] ?? ''}
                  onChange={(e) => onFieldChange('footer:well', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600"
                  placeholder="e.g. Twin"
                />
              </div>
              <div>
                <label htmlFor={footerFieldId('tester')} className="block text-xs font-semibold text-slate-700">
                  Who is testing?
                </label>
                <input
                  id={footerFieldId('tester')}
                  type="text"
                  value={values['footer:tester'] ?? ''}
                  onChange={(e) => onFieldChange('footer:tester', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600"
                  placeholder="Initials or name"
                />
              </div>
              <div>
                <label htmlFor={footerFieldId('pumpGpm')} className="block text-xs font-semibold text-slate-700">
                  Pump GPM
                </label>
                <input
                  id={footerFieldId('pumpGpm')}
                  type="text"
                  value={values['footer:pumpGpm'] ?? ''}
                  onChange={(e) => onFieldChange('footer:pumpGpm', e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600"
                  placeholder="e.g. 641"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor={footerFieldId('notes')} className="block text-xs font-semibold text-slate-700">
                Additional notes
              </label>
              <textarea
                id={footerFieldId('notes')}
                rows={6}
                value={values['footer:notes'] ?? ''}
                onChange={(e) => onFieldChange('footer:notes', e.target.value)}
                className="mt-1 min-h-[8rem] w-full resize-y rounded-md border border-slate-600 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600"
                placeholder="Additional observations, issues, or context for this visit."
              />
            </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-5 sm:justify-between">
            <button
              type="button"
              onClick={goPrevWeek}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <span aria-hidden>←</span>
              Last week
            </button>
            <button
              type="button"
              onClick={goNextWeek}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Next week
              <span aria-hidden>→</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!activeMonthKey || !currentWeekSlice) return
                exportTestMonthlyReportPdf({
                  monthKey: activeMonthKey,
                  weekNumber: currentWeekSlice.weekNumber,
                  monthTitle: formatMonthTitle(activeMonthKey),
                  values,
                })
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-slate-700 bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeMonthKey || !currentWeekSlice) return
                exportTestMonthlyReportXlsx({
                  monthKey: activeMonthKey,
                  weekNumber: currentWeekSlice.weekNumber,
                  monthTitle: formatMonthTitle(activeMonthKey),
                  values,
                })
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-emerald-800 bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
