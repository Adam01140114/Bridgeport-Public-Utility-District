import { Link } from 'react-router-dom'
import { LOCATIONS } from '../data/locations'

export function HomePage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl bg-white/95 p-5 shadow-xl shadow-black/20 ring-1 ring-white/60 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.5rem] font-semibold leading-tight tracking-tight text-bpud-deep sm:text-3xl">
              Choose a location
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">
              Tap the site where you are recording. Each location has its own form — entries save
              automatically and show up newest first.
            </p>
          </div>
          <Link
            to="/admin/settings"
            className="inline-flex shrink-0 items-center justify-center self-start rounded-xl border border-slate-300/90 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-slate-100 sm:py-2"
          >
            Admin Settings
          </Link>
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
        {LOCATIONS.map((loc) => (
          <li key={loc.id}>
            <Link
              to={`/location/${loc.id}`}
              className="group flex min-h-[4.75rem] flex-col justify-center rounded-xl border border-white/20 bg-white/90 p-5 shadow-md shadow-black/10 ring-1 ring-slate-200/80 transition active:scale-[0.99] hover:border-sky-300/60 hover:bg-white hover:shadow-lg hover:ring-sky-200/50 sm:min-h-0 sm:p-4"
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
    </div>
  )
}
