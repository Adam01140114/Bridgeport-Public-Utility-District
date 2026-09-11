import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { downloadWorkLogWeekXlsx } from '../excel/workLogXlsx'
import { groupEntriesByWeek, type WorkLogWeek } from '../export/workLogWeeks'
import { openWorkLogWeekPdf } from '../pdf/workLogPdf'
import { subscribeAllEntries } from '../services/allEntries'
import type { LogEntry } from '../types/entry'
import { backNavOnDarkClass, backNavOnLightClass } from '../ui/backNav'

function ExportButtons({ week, compact }: { week: WorkLogWeek; compact?: boolean }) {
  const base = compact
    ? 'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition sm:min-h-[40px]'
    : 'inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl px-5 text-sm font-semibold shadow-sm transition sm:min-h-[44px] sm:flex-none'
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => openWorkLogWeekPdf(week)}
        className={`${base} bg-bpud-water text-white shadow-bpud-water/25 hover:bg-[#185a9e]`}
      >
        PDF
      </button>
      <button
        type="button"
        onClick={() => downloadWorkLogWeekXlsx(week)}
        className={`${base} border border-slate-300 bg-white text-slate-800 ring-1 ring-slate-100 hover:bg-slate-50`}
      >
        Excel
      </button>
    </div>
  )
}

function WeekTable({ week }: { week: WorkLogWeek }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 ring-1 ring-slate-100">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Submitted (auto)</th>
            <th className="px-3 py-2">Operator</th>
            <th className="px-3 py-2">Site</th>
            <th className="px-3 py-2">Log date</th>
            <th className="px-3 py-2">Time on form</th>
            <th className="px-3 py-2">Comments / notes</th>
          </tr>
        </thead>
        <tbody>
          {week.rows.map((row) => (
            <tr key={row.entry.id} className="border-t border-slate-200/80 align-top odd:bg-white even:bg-slate-50/60">
              <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-bpud-ink">
                {row.submittedLabel}
              </td>
              <td className="px-3 py-2 text-slate-800">{row.operator || '—'}</td>
              <td className="px-3 py-2 text-slate-800">{row.site}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-700">{row.entryDate || '—'}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-700">{row.formTime || '—'}</td>
              <td className="max-w-[22rem] px-3 py-2 text-slate-600">
                <span className="line-clamp-3 break-words">{row.notes || '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WorkLogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [openWeekKey, setOpenWeekKey] = useState<string | null>(null)

  useEffect(() => {
    return subscribeAllEntries(setEntries, (e) => setError(e.message))
  }, [])

  const weeks = useMemo(() => groupEntriesByWeek(entries), [entries])
  // A week that disappears (all its entries deleted) simply falls back to the week list.
  const openWeek = openWeekKey ? weeks.find((w) => w.key === openWeekKey) ?? null : null

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <Link to="/" className={`${backNavOnDarkClass} mb-4 block w-fit sm:mb-0 sm:inline-flex`}>
          ← Home
        </Link>
        <h1 className="mt-0 text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:mt-2 sm:text-3xl">
          Daily Work Log
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-100/85">
          Every daily log entry is time-stamped by the server the moment it is submitted. Pick a
          week to review who logged what and when, then export it as PDF or Excel for the weekly
          report.
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

      <section className="rounded-2xl bg-white/95 p-5 shadow-xl shadow-black/15 ring-1 ring-white/60 sm:p-8">
        {weeks.length === 0 && !error ? (
          <p className="text-center text-base text-slate-500 sm:text-sm">
            No submissions yet. Entries appear here automatically as the crew saves daily logs.
          </p>
        ) : !openWeek ? (
          <>
            <h2 className="text-lg font-semibold text-bpud-deep sm:text-xl">Weeks</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-1">
              Sunday through Saturday, newest first. Open a week to see each submission.
            </p>
            <ul className="mt-6 space-y-3">
              {weeks.map((week) => {
                const operators = [...new Set(week.rows.map((r) => r.operator).filter(Boolean))]
                return (
                  <li key={week.key} className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setOpenWeekKey(week.key)}
                      className="flex min-h-[52px] flex-1 items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3.5 text-left ring-1 ring-slate-100 transition hover:border-sky-200 hover:bg-sky-50/60 sm:min-h-[48px] sm:min-w-0 sm:py-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-bpud-ink sm:text-sm">
                          Week of {week.label}
                        </span>
                        {operators.length ? (
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {operators.join(', ')}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm text-slate-500">
                        {week.rows.length} {week.rows.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </button>
                    <ExportButtons week={week} compact />
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setOpenWeekKey(null)} className={backNavOnLightClass}>
                ← All weeks
              </button>
              <ExportButtons week={openWeek} />
            </div>
            <h2 className="text-base font-semibold text-bpud-deep sm:text-lg">
              Week of {openWeek.label}
              <span className="ml-2 text-sm font-normal text-slate-500">
                {openWeek.rows.length} {openWeek.rows.length === 1 ? 'entry' : 'entries'}
              </span>
            </h2>
            <WeekTable week={openWeek} />
          </div>
        )}
      </section>
    </div>
  )
}
