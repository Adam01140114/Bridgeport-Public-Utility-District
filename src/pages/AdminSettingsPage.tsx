import { useState } from 'react'
import { Link } from 'react-router-dom'
import { injectTestDataForAllLocations } from '../services/injectTestData'

export function AdminSettingsPage() {
  const [injecting, setInjecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInjectTestData() {
    setError(null)
    setInjecting(true)
    try {
      const result = await injectTestDataForAllLocations()
      window.alert(
        `Test data injected.\n\n` +
          `• ${result.documentsWritten} entries written\n` +
          `• ${result.locationsCount} locations × ${result.daysCount} days (Jan–Mar 2026)\n\n` +
          `Firestore may take a moment to show new data everywhere.`
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Injection failed.'
      setError(msg)
      window.alert(`Could not inject test data:\n\n${msg}`)
    } finally {
      setInjecting(false)
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-sky-100/90 underline-offset-2 hover:underline"
        >
          ← Home
        </Link>
        <h1 className="mt-3 text-[1.5rem] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
          Admin settings
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-sky-100/85 sm:text-sm">
          Internal tools for development and demos. Test data is written to your Firestore database
          using the same rules as normal entries.
        </p>
      </div>

      <section className="rounded-2xl bg-white/95 p-5 shadow-xl shadow-black/15 ring-1 ring-white/60 sm:p-8">
        <h2 className="text-lg font-semibold text-bpud-deep sm:text-xl">Test data</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Adds one entry per day for January, February, and March 2026 for{' '}
          <strong>every</strong> location (full three-month span). Existing data is not removed.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : null}
        <div className="mt-6">
          <button
            type="button"
            disabled={injecting}
            onClick={handleInjectTestData}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-amber-400/90 bg-amber-50 px-6 text-sm font-semibold text-amber-950 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
          >
            {injecting ? 'Injecting…' : 'Inject test data'}
          </button>
        </div>
      </section>
    </div>
  )
}
