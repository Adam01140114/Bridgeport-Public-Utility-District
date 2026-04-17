import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TREATMENT_CATEGORIES_MANUAL_REPORT,
  daysInMonthFromKey,
  formatMonthTitle,
  isDailyTreatmentCategory,
  isDateInMonthKey,
  locationsForCategory,
  weekSlotFromDateInMonth,
  type TreatmentCategory,
  type TreatmentLocation,
} from '../data/treatmentReport'
import { downloadTreatmentReportXlsx } from '../excel/treatmentReportXlsx'
import { formatShortDate } from '../export/entryFormatting'
import { openTreatmentReportPdf } from '../pdf/treatmentReportPdf'
import {
  deleteTreatmentEntry,
  saveTreatmentEntry,
  subscribeTreatmentEntriesForMonth,
  updateTreatmentEntryValue,
} from '../services/treatmentEntries'
import type { TreatmentReportEntry } from '../types/treatmentEntry'
import { backNavOnDarkClass, backNavOnLightClass } from '../ui/backNav'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthKeyFromParts(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function parseMonthKey(key: string): { year: number; monthIndex: number } | null {
  const m = key.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const mo = Number(m[2]) - 1
  if (year < 2000 || year > 2100 || mo < 0 || mo > 11) return null
  return { year, monthIndex: mo }
}

function buildCalendarCells(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1)
  const last = new Date(year, monthIndex + 1, 0)
  const startPad = first.getDay()
  const days = last.getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function findConflict(
  list: TreatmentReportEntry[],
  monthKey: string,
  entryDate: string,
  category: TreatmentCategory,
  location: TreatmentLocation
): TreatmentReportEntry | undefined {
  const d = entryDate.trim()
  if (isDailyTreatmentCategory(category)) {
    return list.find(
      (e) =>
        e.monthKey === monthKey &&
        e.entryDate === d &&
        e.category === category &&
        e.location === location
    )
  }
  const slot = weekSlotFromDateInMonth(entryDate, monthKey)
  return list.find(
    (e) =>
      e.monthKey === monthKey &&
      e.weekSlot === slot &&
      e.category === category &&
      e.location === location
  )
}

function formatSubmittedAt(entry: TreatmentReportEntry): string {
  const t = entry.submittedAt
  if (!t || typeof t.toDate !== 'function') return '—'
  try {
    return t.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

export function TreatmentReportPage() {
  const now = useMemo(() => new Date(), [])
  const [pickerYear, setPickerYear] = useState(now.getFullYear())
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null)

  const [entries, setEntries] = useState<TreatmentReportEntry[]>([])
  const [firestoreError, setFirestoreError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [dayMenuDate, setDayMenuDate] = useState<string | null>(null)
  const [formDate, setFormDate] = useState('')
  const [formCategory, setFormCategory] = useState<TreatmentCategory | ''>('')
  const [formLocation, setFormLocation] = useState<TreatmentLocation | ''>('')
  const [formValue, setFormValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [conflictEntry, setConflictEntry] = useState<TreatmentReportEntry | null>(null)
  const [dayMenuEditingId, setDayMenuEditingId] = useState<string | null>(null)
  const [dayMenuEditValue, setDayMenuEditValue] = useState('')
  const [dayMenuSavingId, setDayMenuSavingId] = useState<string | null>(null)

  const parsedActive = activeMonthKey ? parseMonthKey(activeMonthKey) : null

  useEffect(() => {
    if (!activeMonthKey) {
      setEntries([])
      return
    }
    const unsub = subscribeTreatmentEntriesForMonth(
      activeMonthKey,
      setEntries,
      (e) => setFirestoreError(e.message)
    )
    return () => unsub()
  }, [activeMonthKey])

  /** FE Inches is only sourced from Twin Lakes logs; hide it from this page’s calendar and lists. */
  const entriesForUi = useMemo(
    () => entries.filter((e) => e.category !== 'FE Inches'),
    [entries]
  )

  const daysWithData = useMemo(() => {
    const s = new Set<number>()
    if (!activeMonthKey) return s
    for (const e of entriesForUi) {
      if (!isDateInMonthKey(e.entryDate, activeMonthKey)) continue
      const m = e.entryDate.match(/-(\d{2})$/)
      if (m) s.add(Number(m[1]))
    }
    return s
  }, [entriesForUi, activeMonthKey])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, TreatmentReportEntry[]>()
    for (const entry of entriesForUi) {
      const list = map.get(entry.entryDate)
      if (list) list.push(entry)
      else map.set(entry.entryDate, [entry])
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.category.localeCompare(b.category) || a.location.localeCompare(b.location))
    }
    return map
  }, [entriesForUi])

  const locationOptions = useMemo(() => {
    if (!formCategory) return [] as TreatmentLocation[]
    return locationsForCategory(formCategory)
  }, [formCategory])

  useEffect(() => {
    if (!formLocation) return
    if (!locationOptions.includes(formLocation as TreatmentLocation)) {
      setFormLocation('')
    }
  }, [formLocation, locationOptions])

  const dim = activeMonthKey ? daysInMonthFromKey(activeMonthKey) : 31
  const dateMin = activeMonthKey ? `${activeMonthKey}-01` : ''
  const dateMax = activeMonthKey ? `${activeMonthKey}-${String(dim).padStart(2, '0')}` : ''

  const canSubmitAdd =
    Boolean(activeMonthKey && formDate && formCategory && formLocation) && !saving

  const openAddModal = useCallback((prefillDate?: string) => {
    if (!activeMonthKey) return
    setFormDate(prefillDate ?? `${activeMonthKey}-01`)
    setFormCategory('')
    setFormLocation('')
    setFormValue('')
    setConflictEntry(null)
    setAddOpen(true)
  }, [activeMonthKey])

  const runSave = useCallback(
    async (override: boolean) => {
      if (!activeMonthKey || !formDate || !formCategory || !formLocation) return
      const conflict = findConflict(entries, activeMonthKey, formDate, formCategory, formLocation)
      if (conflict && !override) {
        setConflictEntry(conflict)
        return
      }
      setSaving(true)
      setFirestoreError(null)
      try {
        if (conflict && override) {
          await deleteTreatmentEntry(conflict.id)
        }
        await saveTreatmentEntry({
          monthKey: activeMonthKey,
          entryDate: formDate,
          weekSlot: weekSlotFromDateInMonth(formDate, activeMonthKey),
          category: formCategory,
          location: formLocation,
          value: formValue.trim(),
        })
        setAddOpen(false)
        setConflictEntry(null)
      } catch (err) {
        setFirestoreError(err instanceof Error ? err.message : 'Could not save entry.')
      } finally {
        setSaving(false)
      }
    },
    [activeMonthKey, formDate, formCategory, formLocation, formValue, entries]
  )

  const handleDelete = useCallback(async (entry: TreatmentReportEntry) => {
    if (!window.confirm('Delete this treatment reading?')) return
    setDeletingId(entry.id)
    setFirestoreError(null)
    try {
      await deleteTreatmentEntry(entry.id)
    } catch (err) {
      setFirestoreError(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handleDayMenuEditSave = useCallback(
    async (entry: TreatmentReportEntry) => {
      setDayMenuSavingId(entry.id)
      setFirestoreError(null)
      try {
        await updateTreatmentEntryValue({
          entryId: entry.id,
          value: dayMenuEditValue.trim(),
        })
        setDayMenuEditingId(null)
        setDayMenuEditValue('')
      } catch (err) {
        setFirestoreError(err instanceof Error ? err.message : 'Could not update reading.')
      } finally {
        setDayMenuSavingId(null)
      }
    },
    [dayMenuEditValue]
  )

  const calendarCells = parsedActive
    ? buildCalendarCells(parsedActive.year, parsedActive.monthIndex)
    : []

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/"
            className={`${backNavOnDarkClass} mb-4 block w-fit sm:mb-0 sm:inline-flex`}
          >
            ← Home
          </Link>
          <h1 className="mt-0 text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:mt-2 sm:text-3xl">
            Monthly Treatment Report
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sky-100/85 sm:text-sm">
            Weekly FTK readings by category and sample location. FE Inches on exports comes from the
            Twin Lakes Well I Arsenic Plant daily log (FE tank), not from this screen. Pick a month to
            view or add entries, then export a district-style PDF or Excel file.
          </p>
        </div>
      </div>

      {firestoreError ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-base text-amber-950 sm:text-sm"
        >
          <p className="font-medium">Connection or permission issue</p>
          <p className="mt-1 text-amber-900/90">{firestoreError}</p>
        </div>
      ) : null}

      {!activeMonthKey ? (
        <section className="overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-sky-400/10 p-6 shadow-2xl shadow-black/20 ring-1 ring-white/30 backdrop-blur-md sm:p-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-8">
            <p className="text-center text-sm font-medium uppercase tracking-[0.25em] text-sky-200/80 sm:text-left">
              Select date
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-[#071a2e]/40 px-2 py-2 ring-1 ring-white/10">
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
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const key = monthKeyFromParts(pickerYear, monthIndex)
              const label = new Date(pickerYear, monthIndex, 1).toLocaleString(undefined, {
                month: 'short',
              })
              const isCurrent =
                now.getFullYear() === pickerYear && now.getMonth() === monthIndex
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveMonthKey(key)}
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
      ) : (
        <>
          <section className="rounded-2xl border border-white/15 bg-white/95 p-5 shadow-xl ring-1 ring-white/50 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => setActiveMonthKey(null)}
                  className={backNavOnLightClass}
                >
                  ← Change month
                </button>
                <h2 className="mt-2 text-2xl font-semibold text-bpud-deep sm:text-3xl">
                  {formatMonthTitle(activeMonthKey)}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {entriesForUi.length} reading{entriesForUi.length === 1 ? '' : 's'} this month
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-bpud-water px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#185a9e] sm:min-h-[44px]"
                >
                  Add entry
                </button>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:min-h-[44px]"
                >
                  Export
                </button>
              </div>
            </div>

            {parsedActive ? (
              <div className="mt-8 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {formatMonthTitle(activeMonthKey)}
                </p>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500 sm:text-xs">
                  {WEEKDAY_LABELS.map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1.5 sm:gap-2">
                  {calendarCells.map((day, i) => {
                    if (day === null) {
                      return <div key={`e-${i}`} className="aspect-square min-h-[2.5rem]" />
                    }
                    const has = daysWithData.has(day)
                    const iso = `${activeMonthKey}-${String(day).padStart(2, '0')}`
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => setDayMenuDate(iso)}
                        aria-label={`Open readings for ${formatShortDate(iso)}`}
                        className={
                          'flex aspect-square min-h-[2.5rem] flex-col items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition hover:shadow-sm sm:min-h-[3rem] ' +
                          (has
                            ? 'border-sky-300 bg-sky-50 text-bpud-water shadow-inner shadow-sky-100'
                            : 'border-slate-200/80 bg-white text-slate-600')
                        }
                      >
                        {day}
                        {has ? (
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" title="Has readings" />
                        ) : (
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-transparent" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <ul className="mt-8 space-y-3">
              {entriesForUi.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-10 text-center text-sm text-slate-500">
                  No readings yet. Use <strong>Add entry</strong> to record a value.
                </li>
              ) : (
                entriesForUi.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-bpud-ink">
                        {e.category} · {e.location}
                      </p>
                      <p className="text-xs text-slate-500">
                        Date {formatShortDate(e.entryDate)}
                        {isDailyTreatmentCategory(e.category)
                          ? ' · Daily'
                          : ` · Week slot ${e.weekSlot + 1}`}{' '}
                        · Submitted {formatSubmittedAt(e)}
                      </p>
                      <p className="text-base font-medium text-slate-800">
                        Reading: {e.value?.trim() ? e.value : '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === e.id}
                      onClick={() => handleDelete(e)}
                      className="inline-flex min-h-[40px] shrink-0 items-center justify-center self-start rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 sm:self-center"
                    >
                      {deletingId === e.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      )}

      {addOpen && activeMonthKey ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          role="presentation"
          onClick={() => !saving && setAddOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-treatment-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="add-treatment-title" className="text-lg font-semibold text-bpud-deep">
              Choose a date and category to enter
            </h3>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="tr-date" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date (this month only)
                </label>
                <input
                  id="tr-date"
                  type="date"
                  min={dateMin}
                  max={dateMax}
                  value={formDate}
                  onChange={(ev) => setFormDate(ev.target.value)}
                  className="field-datetime w-full rounded-xl border border-slate-200 px-4 py-3 text-base shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="tr-cat" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </label>
                <select
                  id="tr-cat"
                  value={formCategory}
                  onChange={(ev) =>
                    setFormCategory((ev.target.value || '') as TreatmentCategory | '')
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base shadow-sm outline-none focus:border-sky-500 sm:text-sm"
                >
                  <option value="">Select category…</option>
                  {TREATMENT_CATEGORIES_MANUAL_REPORT.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {formCategory ? (
                <div>
                  <label htmlFor="tr-loc" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </label>
                  <select
                    id="tr-loc"
                    value={formLocation}
                    onChange={(ev) =>
                      setFormLocation((ev.target.value || '') as TreatmentLocation | '')
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base shadow-sm outline-none focus:border-sky-500 sm:text-sm"
                  >
                    <option value="">Select location…</option>
                    {locationOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {formCategory && formLocation ? (
                <div>
                  <label htmlFor="tr-val" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reading / result (optional)
                  </label>
                  <input
                    id="tr-val"
                    type="text"
                    value={formValue}
                    onChange={(ev) => setFormValue(ev.target.value)}
                    placeholder="e.g. 0.012"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base shadow-sm outline-none focus:border-sky-500 sm:text-sm"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setAddOpen(false)}
                className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmitAdd}
                onClick={() => runSave(false)}
                className="min-h-[44px] rounded-xl bg-bpud-water px-5 text-sm font-semibold text-white shadow-md hover:bg-[#185a9e] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {conflictEntry && activeMonthKey ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onClick={() => !saving && setConflictEntry(null)}
        >
          <div
            role="alertdialog"
            aria-labelledby="conflict-title"
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h4 id="conflict-title" className="text-lg font-semibold text-bpud-deep">
              {isDailyTreatmentCategory(conflictEntry.category)
                ? 'Reading already exists on this date'
                : 'Reading already exists this week'}
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {isDailyTreatmentCategory(conflictEntry.category) ? (
                <>
                  You already have a <strong>{conflictEntry.category}</strong> reading at{' '}
                  <strong>{conflictEntry.location}</strong> on{' '}
                  <strong>{formatShortDate(conflictEntry.entryDate)}</strong>. Would you like to
                  replace it?
                </>
              ) : (
                <>
                  You already have a <strong>{conflictEntry.category}</strong> reading at{' '}
                  <strong>{conflictEntry.location}</strong> for this week's slot (logged on{' '}
                  <strong>{formatShortDate(conflictEntry.entryDate)}</strong>). Would you like to
                  replace it?
                </>
              )}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConflictEntry(null)}
                className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void runSave(true)
                }}
                className="min-h-[44px] rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white shadow-md hover:bg-amber-700"
              >
                {saving ? 'Overriding…' : 'Override'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportOpen && activeMonthKey ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setExportOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="tr-export-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="tr-export-title" className="text-lg font-semibold text-bpud-deep">
              Export {formatMonthTitle(activeMonthKey)}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              PDF: weekly FTK table, then a separate Twin Lakes FE table. Excel: two sheets —{' '}
              <strong>Weekly FTK</strong> and <strong>FE Inches</strong>.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  openTreatmentReportPdf(activeMonthKey, entries)
                  setExportOpen(false)
                }}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-bpud-water px-5 text-sm font-semibold text-white shadow-md hover:bg-[#185a9e]"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadTreatmentReportXlsx(activeMonthKey, entries)
                  setExportOpen(false)
                }}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Excel
              </button>
            </div>
            <button
              type="button"
              onClick={() => setExportOpen(false)}
              className="mt-4 w-full text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {dayMenuDate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
          role="presentation"
          onClick={() => setDayMenuDate(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-readings-title"
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="day-readings-title" className="text-lg font-semibold text-bpud-deep">
              Readings for {formatShortDate(dayMenuDate)}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Entries captured on this date in the selected month.
            </p>
            <ul className="mt-4 space-y-2">
              {(entriesByDate.get(dayMenuDate) ?? []).length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No readings were entered on this date.
                </li>
              ) : (
                (entriesByDate.get(dayMenuDate) ?? []).map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 text-sm"
                  >
                    <p className="font-semibold text-bpud-ink">
                      {entry.category} · {entry.location}
                    </p>
                    {dayMenuEditingId === entry.id ? (
                      <div className="mt-2 space-y-2">
                        <label htmlFor={`edit-reading-${entry.id}`} className="text-xs text-slate-500">
                          Reading
                        </label>
                        <input
                          id={`edit-reading-${entry.id}`}
                          type="text"
                          value={dayMenuEditValue}
                          onChange={(ev) => setDayMenuEditValue(ev.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            disabled={dayMenuSavingId === entry.id}
                            onClick={() => {
                              setDayMenuEditingId(null)
                              setDayMenuEditValue('')
                            }}
                            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={dayMenuSavingId === entry.id}
                            onClick={() => {
                              void handleDayMenuEditSave(entry)
                            }}
                            className="min-h-[40px] rounded-lg bg-bpud-water px-3 text-sm font-semibold text-white hover:bg-[#185a9e] disabled:opacity-50"
                          >
                            {dayMenuSavingId === entry.id ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-slate-700">
                        Reading: {entry.value?.trim() ? entry.value : '—'}
                      </p>
                    )}
                    {dayMenuEditingId ? null : (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDayMenuEditingId(entry.id)
                            setDayMenuEditValue(entry.value ?? '')
                          }}
                          className="min-h-[40px] rounded-lg border border-sky-200 bg-white px-3 text-sm font-medium text-sky-800 hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === entry.id}
                          onClick={() => {
                            void handleDelete(entry)
                          }}
                          className="min-h-[40px] rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === entry.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
            {dayMenuEditingId ? null : (
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (dayMenuDate) openAddModal(dayMenuDate)
                    setDayMenuDate(null)
                  }}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-bpud-water px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#185a9e]"
                >
                  Add entry
                </button>
                <button
                  type="button"
                  onClick={() => setDayMenuDate(null)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
