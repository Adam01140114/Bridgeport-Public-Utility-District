import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { FieldDef } from '../data/locations'
import { getLocationById } from '../data/locations'
import { openMonthlyLogPdf } from '../pdf/monthlyLogPdf'
import { saveEntry, subscribeEntriesForLocation } from '../services/entries'
import type { LogEntry } from '../types/entry'

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

function compareEntryDateDesc(a: LogEntry, b: LogEntry): number {
  const da = a.entryDate.trim()
  const db = b.entryDate.trim()
  if (da !== db) return db.localeCompare(da)
  const ta = a.submittedAt?.toMillis?.() ?? 0
  const tb = b.submittedAt?.toMillis?.() ?? 0
  return tb - ta
}

function SavedEntryCard({ entry, fields }: { entry: LogEntry; fields: FieldDef[] }) {
  return (
    <li className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 ring-1 ring-slate-100 sm:p-4">
      <div className="flex flex-col gap-1 border-b border-slate-200/80 pb-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
        <span className="text-base font-semibold text-bpud-ink sm:text-sm">
          {entry.entryDate || '—'}
        </span>
        <span className="text-sm text-slate-500 sm:text-xs">Submitted {formatSubmittedAt(entry)}</span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:mt-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2">
        {fields.map((f) => {
          const v = entry.values[f.key]
          const display = v !== undefined && v !== '' ? v : '—'
          return (
            <div key={f.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
              <dt className="shrink-0 text-slate-500 sm:max-w-[40%]">{f.label}</dt>
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

  const setField = useCallback((key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }))
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
      await saveEntry({
        locationId: location.id,
        locationName: location.name,
        entryDate: entryDate.trim(),
        values: { ...values },
      })
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
        <Link
          to="/"
          className="mt-5 inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl px-4 text-base font-medium text-sky-700 underline-offset-2 ring-1 ring-sky-200 hover:bg-sky-50 hover:underline"
        >
          Back to locations
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
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-100/90 underline-offset-2 hover:underline"
          >
            ← All locations
          </Link>
          <h1 className="mt-1 text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:mt-2 sm:text-3xl">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
            {location.fields.map((field) => (
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
              const monthEntries = entriesByMonth.get(key) ?? []
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
                    onClick={() =>
                      openMonthlyLogPdf({
                        location,
                        monthKey: key,
                        entries: monthEntries,
                      })
                    }
                    className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-sky-300/90 bg-white px-5 text-sm font-semibold text-sky-800 shadow-sm ring-1 ring-sky-100/80 transition hover:bg-sky-50 sm:min-h-[48px] sm:px-4"
                  >
                    View PDF
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setOpenMonthKey(null)}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              ← All months
            </button>
            <h3 className="text-base font-semibold text-bpud-deep sm:text-sm">
              {formatMonthHeading(openMonthKey)}
            </h3>
            <ul className="space-y-4">
              {entriesForOpenMonth.map((entry) => (
                <SavedEntryCard key={entry.id} entry={entry} fields={location.fields} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
