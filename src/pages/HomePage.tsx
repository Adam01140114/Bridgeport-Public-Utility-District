import { Link } from 'react-router-dom'
import { LOCATIONS } from '../data/locations'

export function HomePage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        to="/treatment-report"
        className="group relative block overflow-hidden rounded-2xl border border-emerald-300/70 bg-white p-6 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-200/70 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-xl sm:p-7"
      >
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/90">
              Water quality
            </p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-bpud-deep sm:text-2xl">
              Monthly Treatment Report
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Weekly FTK readings (arsenic, iron, pH, chlorine residual) by sample location. Pick a
              month, add readings, export PDF or Excel in the district worksheet format.
            </p>
          </div>
          <span className="mt-3 inline-flex shrink-0 items-center self-start rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition group-hover:bg-emerald-700 sm:mt-1">
            Open →
          </span>
        </div>
      </Link>

      <section className="rounded-2xl border border-white/20 bg-white/95 p-5 shadow-xl shadow-black/15 ring-1 ring-white/60 sm:p-7">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-xl font-semibold text-bpud-deep sm:text-2xl">Daily Logs</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Select a site to record or review daily operational entries.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
          {LOCATIONS.map((loc) => (
            <li key={loc.id}>
              <Link
                to={`/location/${loc.id}`}
                className="group flex min-h-[4.75rem] flex-col justify-center rounded-xl border border-slate-300 bg-white p-5 shadow-md shadow-black/10 ring-1 ring-slate-300/90 transition active:scale-[0.99] hover:border-sky-400/70 hover:bg-white hover:shadow-lg hover:ring-sky-300/60 sm:min-h-0 sm:p-4"
              >
                <span className="text-base font-semibold text-bpud-ink group-hover:text-bpud-water sm:font-medium">
                  {loc.name}
                </span>
                {loc.shortDescription ? (
                  <span className="mt-1.5 text-sm text-slate-500 sm:mt-1 sm:text-xs">
                    {loc.shortDescription}
                  </span>
                ) : null}
                <span className="mt-3 text-sm font-medium text-sky-700 sm:mt-3 sm:text-xs sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                  Open log →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
