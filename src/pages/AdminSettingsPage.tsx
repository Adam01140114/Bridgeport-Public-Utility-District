import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAllAppData } from '../services/deleteAllAppData'
import { injectTestDataForAllLocations } from '../services/injectTestData'
import { backNavOnDarkClass } from '../ui/backNav'

export function AdminSettingsPage() {
  const [injecting, setInjecting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInjectTestData() {
    setError(null)
    setInjecting(true)
    try {
      const result = await injectTestDataForAllLocations()
      window.alert(
        `Test data injected.\n\n` +
          `• ${result.documentsWritten} total entries written\n` +
          `• ${result.logDocumentsWritten} location log entries\n` +
          `• ${result.treatmentDocumentsWritten} treatment report entries\n` +
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

  async function handleDeleteAllData() {
    setError(null)
    const typed = window.prompt(
      'This permanently deletes ALL location logs and treatment report data in Firestore.\n\nType DELETE ALL (exactly) to confirm:'
    )
    if (typed !== 'DELETE ALL') {
      if (typed !== null) window.alert('Confirmation text did not match. Nothing was deleted.')
      return
    }
    if (!window.confirm('Last chance: delete every log entry and treatment report entry?')) {
      return
    }
    setDeleting(true)
    try {
      const result = await deleteAllAppData()
      window.alert(
        `All data deleted.\n\n` +
          `• ${result.logEntriesDeleted} location log documents removed\n` +
          `• ${result.treatmentEntriesDeleted} treatment report documents removed`
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed.'
      setError(msg)
      window.alert(`Could not delete all data:\n\n${msg}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <Link
          to="/"
          className={`${backNavOnDarkClass} mb-4 block w-fit sm:mb-0 sm:inline-flex`}
        >
          ← Home
        </Link>
        <h1 className="mt-0 text-[1.5rem] font-semibold leading-tight tracking-tight text-white sm:mt-3 sm:text-3xl">
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
          <strong>every</strong> location (full three-month span), plus weekly treatment report
          entries for those months (Cain Well #4 on 1st and 4th week rows, Twin Well #2 on 2nd and
          3rd; FE Inches daily at Twin Well #2 only). Comment-style fields are filled with the text{' '}
          <strong>test comment</strong>. Existing data is not removed.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : null}
        <div className="mt-6">
          <button
            type="button"
            disabled={injecting || deleting}
            onClick={handleInjectTestData}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-amber-400/90 bg-amber-50 px-6 text-sm font-semibold text-amber-950 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
          >
            {injecting ? 'Injecting…' : 'Inject test data'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-red-300/80 bg-white/95 p-5 shadow-xl shadow-red-900/10 ring-1 ring-red-200/70 sm:p-8">
        <h2 className="text-lg font-semibold text-red-900 sm:text-xl">Danger zone</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Permanently delete <strong>all</strong> documents in <code className="rounded bg-slate-100 px-1">logEntries</code> and{' '}
          <code className="rounded bg-slate-100 px-1">treatmentReportEntries</code>. This cannot be undone.
        </p>
        <div className="mt-6">
          <button
            type="button"
            disabled={deleting || injecting}
            onClick={handleDeleteAllData}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-red-400 bg-red-50 px-6 text-sm font-semibold text-red-900 shadow-sm ring-1 ring-red-200/90 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
          >
            {deleting ? 'Deleting…' : 'Delete all data'}
          </button>
        </div>
      </section>
    </div>
  )
}
