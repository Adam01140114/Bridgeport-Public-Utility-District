import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LOCATIONS, getLocationById } from '../data/locations'
import { subscribeAllEntries } from '../services/allEntries'
import type { LogEntry } from '../types/entry'
import { backNavOnLightClass } from '../ui/backNav'

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

export function AllRecordsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeAllEntries(setEntries, (e) => setError(e.message))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const loc of LOCATIONS) map.set(loc.id, [])
    for (const e of entries) {
      const list = map.get(e.locationId)
      if (list) list.push(e)
      else map.set(e.locationId, [e])
    }
    const rows: { id: string; name: string; items: LogEntry[] }[] = []
    for (const loc of LOCATIONS) {
      const items = map.get(loc.id) ?? []
      if (items.length) rows.push({ id: loc.id, name: loc.name, items })
    }
    const known = new Set(LOCATIONS.map((l) => l.id))
    for (const [id, items] of map) {
      if (!known.has(id) && items.length) {
        rows.push({ id, name: items[0]?.locationName ?? id, items })
      }
    }
    return rows
  }, [entries])

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl bg-white/95 p-5 shadow-xl shadow-black/20 ring-1 ring-white/60 sm:p-8">
        <Link to="/" className={backNavOnLightClass}>
          ← Back to locations
        </Link>
        <h1 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-tight text-bpud-deep sm:mt-3 sm:text-3xl">
          All records
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">
          Every saved entry, grouped by site. Newest submissions appear first within each site.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {error}
        </div>
      ) : null}

      {grouped.length === 0 && !error ? (
        <p className="text-center text-sm text-sky-100/80">No entries in the database yet.</p>
      ) : (
        <div className="space-y-10">
          {grouped.map((group) => {
            const locDef = getLocationById(group.id)
            const fields = locDef?.fields ?? []
            return (
              <section
                key={group.id}
                className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-white/60 sm:p-8"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
                  <h2 className="text-lg font-semibold text-bpud-ink">{group.name}</h2>
                  <Link
                    to={`/location/${group.id}`}
                    className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 hover:underline sm:min-h-0 sm:text-xs"
                  >
                    Add entry at this site →
                  </Link>
                </div>
                <ul className="mt-4 space-y-4">
                  {group.items.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm"
                    >
                      <div className="flex flex-col gap-1 text-bpud-ink sm:flex-row sm:flex-wrap sm:gap-2">
                        <span className="text-base font-semibold sm:text-sm">
                          Log date: {entry.entryDate || '—'}
                        </span>
                        <span className="text-sm text-slate-500 sm:text-xs">
                          {formatSubmittedAt(entry)}
                        </span>
                      </div>
                      {fields.length ? (
                        <dl className="mt-4 grid gap-3 sm:mt-3 sm:grid-cols-2 sm:gap-2">
                          {fields.map((f) => {
                            const v = entry.values[f.key]
                            const display = v !== undefined && v !== '' ? v : '—'
                            return (
                              <div key={f.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                                <dt className="text-slate-500 sm:max-w-[40%]">{f.label}</dt>
                                <dd className="font-medium break-words text-slate-800 sm:flex-1">
                                  {display}
                                </dd>
                              </div>
                            )
                          })}
                        </dl>
                      ) : (
                        <pre className="mt-2 overflow-x-auto text-xs text-slate-600">
                          {JSON.stringify(entry.values, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
