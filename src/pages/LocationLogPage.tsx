import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { FieldDef } from '../data/locations'
import { getLocationById } from '../data/locations'
import type { TreatmentCategory, TreatmentLocation } from '../data/treatmentReport'
import { isDailyTreatmentCategory, weekSlotFromDateInMonth } from '../data/treatmentReport'
import { downloadMonthlyLogXlsx } from '../excel/monthlyLogXlsx'
import { openMonthlyLogPdf } from '../pdf/monthlyLogPdf'
import { deleteEntry, saveEntry, subscribeEntriesForLocation } from '../services/entries'
import {
  deleteTreatmentEntry,
  findTreatmentEntryConflict,
  findTreatmentEntryConflictDaily,
  saveTreatmentEntry,
} from '../services/treatmentEntries'
import type { LogEntry } from '../types/entry'
import { backNavOnDarkClass, backNavOnLightClass } from '../ui/backNav'
import type { TreatmentReportEntry } from '../types/treatmentEntry'

function emptyStateForFields(fields: FieldDef[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, '']))
}

function openNativePicker(el: HTMLInputElement) {
  try {
    if (typeof el.showPicker === 'function') {
      el.showPicker()
    }
  } catch {
    /* showPicker can throw if blocked; WebKit CSS handles most cases */
  }
}

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef
  value: string
  onChange: (v: string) => void
}) {
  const base =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base leading-normal text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25 min-h-[52px] sm:min-h-[44px] sm:rounded-lg sm:px-3 sm:py-2.5 sm:text-sm'

  if (def.type === 'textarea') {
    return (
      <textarea
        id={def.key}
        name={def.key}
        rows={4}
        className={base + ' min-h-[7rem] resize-y py-3.5 sm:min-h-[5rem] sm:py-2.5'}
        placeholder={def.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (def.type === 'select') {
    return (
      <select
        id={def.key}
        name={def.key}
        className={base + ' cursor-pointer appearance-auto pr-10 sm:pr-9'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {(def.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  if (def.type === 'date' || def.type === 'time') {
    return (
      <input
        id={def.key}
        name={def.key}
        type={def.type}
        className={base + ' field-datetime cursor-pointer'}
        placeholder={def.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => openNativePicker(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openNativePicker(e.currentTarget)
          }
        }}
      />
    )
  }

  return (
    <input
      id={def.key}
      name={def.key}
      type={def.type}
      className={base}
      placeholder={def.placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function formatSubmittedAt(entry: LogEntry): string {
  const t = entry.submittedAt
  if (!t || typeof t.toDate !== 'function') return '—'
  try {
    return t.toDate().toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

/** Stable key for grouping: "YYYY-MM", or "_unknown" if the date is missing or not YYYY-MM-DD. */
function monthKeyFromEntryDate(entryDate: string): string {
  const t = entryDate?.trim()
  if (!t) return '_unknown'
  const m = t.match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : '_unknown'
}

function formatMonthHeading(ymKey: string): string {
  if (ymKey === '_unknown') return 'Other'
  const [y, mo] = ymKey.split('-').map(Number)
  if (!y || !mo) return ymKey
  return new Date(y, mo - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

type WeeklySourceConfig = {
  locationId: string
  treatmentLocation: TreatmentLocation
  fields: Array<{ key: string; category: TreatmentCategory }>
  /** Twin Lakes: map daily “FE tank” into Monthly Treatment Report row “FE Inches”. */
  feTankTreatment?: {
    key: 'feTank'
    category: 'FE Inches'
    location: TreatmentLocation
  }
}

const WEEKLY_SOURCE_CONFIG: WeeklySourceConfig[] = [
  {
    locationId: 'cain-well-daily-log',
    treatmentLocation: 'Cain Well #4',
    fields: [
      { key: 'weeklyArsenicFtk', category: 'Arsenic (FTK)' },
      { key: 'weeklyIronFtk', category: 'Iron (FTK)' },
      { key: 'weeklyPhFtk', category: 'PH (FTK)' },
      { key: 'weeklyCl2ResFtk', category: 'CL2 - Res. (FTK)' },
    ],
  },
  {
    locationId: 'twin-lakes-well-i-arsenic-plant',
    treatmentLocation: 'Twin Well #2',
    fields: [
      { key: 'weeklyArsenicFtk', category: 'Arsenic (FTK)' },
      { key: 'weeklyIronFtk', category: 'Iron (FTK)' },
      { key: 'weeklyPhFtk', category: 'PH (FTK)' },
      { key: 'weeklyCl2ResFtk', category: 'CL2 - Res. (FTK)' },
    ],
    feTankTreatment: { key: 'feTank', category: 'FE Inches', location: 'Twin Well #2' },
  },
]

function compareEntryDateDesc(a: LogEntry, b: LogEntry): number {
  const da = a.entryDate.trim()
  const db = b.entryDate.trim()
  if (da !== db) return db.localeCompare(da)
  const ta = a.submittedAt?.toMillis?.() ?? 0
  const tb = b.submittedAt?.toMillis?.() ?? 0
  return tb - ta
}

function SavedEntryCard({
  entry,
  fields,
  onDelete,
  deleteBusy,
}: {
  entry: LogEntry
  fields: FieldDef[]
  onDelete: () => void
  deleteBusy: boolean
}) {
  return (
    <li className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 ring-1 ring-slate-100 sm:p-4">
      <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
          <span className="text-base font-semibold text-bpud-ink sm:text-sm">
            {entry.entryDate || '—'}
          </span>
          <span className="text-sm text-slate-500 sm:text-xs">Submitted {formatSubmittedAt(entry)}</span>
        </div>
        <button
          type="button"
          disabled={deleteBusy}
          onClick={onDelete}
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center self-start rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-800 ring-1 ring-red-100/80 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[36px]"
        >
          {deleteBusy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:mt-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2">
        {fields.map((f) => {
          const v = entry.values[f.key]
          const display = v !== undefined && v !== '' ? v : '—'
          return (
            <div key={f.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 text-slate-500 sm:max-w-[40%]">
                {f.label}
                {f.cadence === 'weekly' ? ' (Weekly)' : ''}
              </dt>
              <dd className="font-medium break-words text-slate-800 sm:flex-1">{display}</dd>
            </div>
          )
        })}
      </dl>
    </li>
  )
}

export function LocationLogPage() {
  const { locationId = '' } = useParams()
  const location = getLocationById(locationId)

  const [values, setValues] = useState<Record<string, string>>({})
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [firestoreError, setFirestoreError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [openMonthKey, setOpenMonthKey] = useState<string | null>(null)
  const [exportMonthKey, setExportMonthKey] = useState<string | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  const entriesByMonth = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of entries) {
      const key = monthKeyFromEntryDate(entry.entryDate)
      const list = map.get(key)
      if (list) list.push(entry)
      else map.set(key, [entry])
    }
    for (const list of map.values()) {
      list.sort(compareEntryDateDesc)
    }
    return map
  }, [entries])

  const monthKeysSorted = useMemo(() => {
    const keys = [...entriesByMonth.keys()]
    keys.sort((a, b) => {
      if (a === '_unknown') return 1
      if (b === '_unknown') return -1
      return b.localeCompare(a)
    })
    return keys
  }, [entriesByMonth])

  const entriesForOpenMonth = openMonthKey ? (entriesByMonth.get(openMonthKey) ?? []) : []
  const dailyFields = useMemo(
    () => location?.fields.filter((f) => f.cadence !== 'weekly') ?? [],
    [location]
  )
  const weeklyFields = useMemo(
    () => location?.fields.filter((f) => f.cadence === 'weekly') ?? [],
    [location]
  )

  useEffect(() => {
    if (!location) return
    setValues(emptyStateForFields(location.fields))
  }, [location])

  useEffect(() => {
    setOpenMonthKey(null)
  }, [locationId])

  useEffect(() => {
    if (!location) return
    const unsub = subscribeEntriesForLocation(
      location.id,
      setEntries,
      (e) => setFirestoreError(e.message)
    )
    return () => unsub()
  }, [location])

  useEffect(() => {
    if (openMonthKey && !entriesByMonth.has(openMonthKey)) {
      setOpenMonthKey(null)
    }
  }, [openMonthKey, entriesByMonth])

  useEffect(() => {
    if (!exportMonthKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportMonthKey(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exportMonthKey])

  const setField = useCallback((key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }))
  }, [])

  const handleDeleteEntry = useCallback(async (entry: LogEntry) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    setDeletingEntryId(entry.id)
    setFirestoreError(null)
    try {
      await deleteEntry(entry.id)
    } catch (err) {
      setFirestoreError(err instanceof Error ? err.message : 'Could not delete entry.')
    } finally {
      setDeletingEntryId(null)
    }
  }, [])

  const entryDate = values.date ?? ''

  const canSubmit = useMemo(() => {
    if (!location) return false
    return Boolean(entryDate.trim())
  }, [location, entryDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location || !canSubmit) return
    setSaving(true)
    setSaveMessage(null)
    setFirestoreError(null)
    try {
      const monthKey = monthKeyFromEntryDate(entryDate.trim())
      const weeklyConfig = WEEKLY_SOURCE_CONFIG.find((c) => c.locationId === location.id)
      const pendingWeekly: Array<{
        category: TreatmentCategory
        location: TreatmentLocation
        value: string
      }> = []
      if (weeklyConfig) {
        for (const wf of weeklyConfig.fields) {
          const value = (values[wf.key] ?? '').trim()
          if (value !== '') {
            pendingWeekly.push({
              category: wf.category,
              location: weeklyConfig.treatmentLocation,
              value,
            })
          }
        }
        const ft = weeklyConfig.feTankTreatment
        if (ft) {
          const value = (values[ft.key] ?? '').trim()
          if (value !== '') {
            pendingWeekly.push({
              category: ft.category,
              location: ft.location,
              value,
            })
          }
        }
      }

      const weeklyConflicts: TreatmentReportEntry[] = []
      for (const weekly of pendingWeekly) {
        const conflict = isDailyTreatmentCategory(weekly.category)
          ? await findTreatmentEntryConflictDaily({
              monthKey,
              entryDate: entryDate.trim(),
              category: weekly.category,
              location: weekly.location,
            })
          : await findTreatmentEntryConflict({
              monthKey,
              weekSlot: weekSlotFromDateInMonth(entryDate.trim(), monthKey),
              category: weekly.category,
              location: weekly.location,
            })
        if (conflict) weeklyConflicts.push(conflict)
      }

      for (const conflict of weeklyConflicts) {
        const daily = isDailyTreatmentCategory(conflict.category)
        const ok = window.confirm(
          daily
            ? `You already have a ${conflict.category} reading at ${conflict.location} on this date ` +
                `(${conflict.entryDate}). Replace it?`
            : `You already have a weekly ${conflict.category} reading at ${conflict.location} for this ` +
                `month's week slot (logged on ${conflict.entryDate}). Replace it?`
        )
        if (!ok) {
          setSaving(false)
          return
        }
      }

      await saveEntry({
        locationId: location.id,
        locationName: location.name,
        entryDate: entryDate.trim(),
        values: { ...values },
      })

      for (const conflict of weeklyConflicts) {
        await deleteTreatmentEntry(conflict.id)
      }
      for (const weekly of pendingWeekly) {
        await saveTreatmentEntry({
          monthKey,
          entryDate: entryDate.trim(),
          weekSlot: weekSlotFromDateInMonth(entryDate.trim(), monthKey),
          category: weekly.category,
          location: weekly.location,
          value: weekly.value,
        })
      }

      setValues(emptyStateForFields(location.fields))
      setSaveMessage('Entry saved.')
      window.setTimeout(() => setSaveMessage(null), 4000)
    } catch (err) {
      setFirestoreError(err instanceof Error ? err.message : 'Could not save entry.')
    } finally {
      setSaving(false)
    }
  }

  if (!location) {
    return (
      <div className="rounded-2xl bg-white/95 p-6 text-center shadow-xl ring-1 ring-white/60 sm:p-8">
        <p className="text-base text-slate-700">That location was not found.</p>
        <Link to="/" className={`${backNavOnLightClass} mt-5`}>
          ← Back to locations
        </Link>
      </div>
    )
  }

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
            {location.name}
          </h1>
          {location.shortDescription ? (
            <p className="mt-2 text-sm leading-relaxed text-sky-100/85 sm:mt-1">
              {location.shortDescription}
            </p>
          ) : null}
        </div>
      </div>

      {firestoreError ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-base text-amber-950 sm:text-sm"
        >
          <p className="font-medium">Connection or permission issue</p>
          <p className="mt-1 text-amber-900/90">{firestoreError}</p>
          <p className="mt-2 text-xs text-amber-800/80">
            In the Firebase console, enable Firestore and deploy rules. If the console suggests an
            index for this query, create it (see <code className="rounded bg-amber-100/80 px-1">firestore.indexes.json</code> in this project).
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl bg-white/95 p-5 shadow-xl shadow-black/15 ring-1 ring-white/60 sm:p-8">
        <h2 className="text-lg font-semibold text-bpud-deep sm:text-xl">New entry</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-1">
          Fill in today&apos;s readings. Date is required; everything else is optional unless your
          procedure says otherwise.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 sm:space-y-6">
          <div className="space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                Daily
              </span>
              <p className="text-xs text-slate-500">These fields are for daily readings.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
              {dailyFields.map((field) => (
                <div key={field.key} className={field.gridClass ?? ''}>
                  <label
                    htmlFor={field.key}
                    className="mb-2 block text-sm font-semibold text-slate-700 sm:mb-1.5 sm:text-xs sm:font-semibold sm:uppercase sm:tracking-wide sm:text-slate-500"
                  >
                    {field.label}
                  </label>
                  <FieldInput
                    def={field}
                    value={values[field.key] ?? ''}
                    onChange={(v) => setField(field.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {weeklyFields.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-violet-200/90 bg-violet-50/60 p-4 sm:p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="inline-flex w-fit rounded-full bg-violet-200/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-900">
                  Weekly
                </span>
                <p className="text-xs text-violet-900/75">
                  These values feed the Monthly Treatment Report and override same-week duplicates.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                {weeklyFields.map((field) => (
                  <div key={field.key} className={field.gridClass ?? ''}>
                    <label
                      htmlFor={field.key}
                      className="mb-2 block text-sm font-semibold text-slate-700 sm:mb-1.5 sm:text-xs sm:font-semibold sm:uppercase sm:tracking-wide sm:text-slate-500"
                    >
                      {field.label}
                    </label>
                    <FieldInput
                      def={field}
                      value={values[field.key] ?? ''}
                      onChange={(v) => setField(field.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-bpud-water px-6 text-base font-semibold text-white shadow-md shadow-bpud-water/30 transition hover:bg-[#185a9e] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px] sm:w-auto sm:px-5 sm:text-sm"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
            {saveMessage ? (
              <span className="text-center text-sm font-medium text-emerald-700 sm:text-left">
                {saveMessage}
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white/95 p-5 shadow-xl shadow-black/15 ring-1 ring-white/60 sm:p-8">
        <h2 className="text-lg font-semibold text-bpud-deep sm:text-xl">Saved entries</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-1">
          {openMonthKey
            ? 'Entries for the selected month (newest day first).'
            : 'Choose a month to open its log entries. Months are newest first.'}
        </p>

        {entries.length === 0 ? (
          <p className="mt-8 text-center text-base text-slate-500 sm:text-sm">
            No entries yet for this site.
          </p>
        ) : !openMonthKey ? (
          <ul className="mt-6 space-y-3">
            {monthKeysSorted.map((key) => {
              const count = entriesByMonth.get(key)?.length ?? 0
              const label = formatMonthHeading(key)
              return (
                <li key={key} className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenMonthKey(key)}
                    className="flex min-h-[52px] flex-1 items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3.5 text-left ring-1 ring-slate-100 transition hover:border-sky-200 hover:bg-sky-50/60 sm:min-h-[48px] sm:min-w-0 sm:py-3"
                  >
                    <span className="text-base font-semibold text-bpud-ink sm:text-sm">{label}</span>
                    <span className="shrink-0 text-sm text-slate-500">
                      {count} {count === 1 ? 'entry' : 'entries'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMonthKey(key)}
                    className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-sky-300/90 bg-white px-5 text-sm font-semibold text-sky-800 shadow-sm ring-1 ring-sky-100/80 transition hover:bg-sky-50 sm:min-h-[48px] sm:px-4"
                  >
                    Export
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-6 space-y-4">
            <button type="button" onClick={() => setOpenMonthKey(null)} className={backNavOnLightClass}>
              ← All months
            </button>
            <h3 className="text-base font-semibold text-bpud-deep sm:text-sm">
              {formatMonthHeading(openMonthKey)}
            </h3>
            <ul className="space-y-4">
              {entriesForOpenMonth.map((entry) => (
                <SavedEntryCard
                  key={entry.id}
                  entry={entry}
                  fields={location.fields}
                  deleteBusy={deletingEntryId === entry.id}
                  onDelete={() => handleDeleteEntry(entry)}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {exportMonthKey ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setExportMonthKey(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-dialog-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="export-dialog-title" className="text-lg font-semibold text-bpud-deep">
              Export {formatMonthHeading(exportMonthKey)}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Choose PDF to open a printable monthly log, or Excel to download a spreadsheet with
              this month&apos;s entries.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const list = entriesByMonth.get(exportMonthKey) ?? []
                  openMonthlyLogPdf({
                    location,
                    monthKey: exportMonthKey,
                    entries: list,
                  })
                  setExportMonthKey(null)
                }}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-bpud-water px-5 text-sm font-semibold text-white shadow-md shadow-bpud-water/25 transition hover:bg-[#185a9e] sm:min-h-[44px]"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  const list = entriesByMonth.get(exportMonthKey) ?? []
                  downloadMonthlyLogXlsx({
                    location,
                    monthKey: exportMonthKey,
                    entries: list,
                  })
                  setExportMonthKey(null)
                }}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-50 sm:min-h-[44px]"
              >
                Excel
              </button>
            </div>
            <button
              type="button"
              onClick={() => setExportMonthKey(null)}
              className="mt-4 w-full min-h-[44px] text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
