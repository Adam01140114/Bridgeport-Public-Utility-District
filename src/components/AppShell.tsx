import { Link } from 'react-router-dom'
import headerLogo from '../../header_logo.png'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col">
      <header className="shrink-0 border-b border-white/10 bg-[#071a2e]/80 pt-[env(safe-area-inset-top,0)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 px-4 py-3 sm:justify-between sm:px-6 sm:py-4">
          <Link
            to="/"
            aria-label="Bridgeport Public Utility District"
            className="group flex min-h-[48px] w-full items-center justify-center text-white no-underline sm:min-h-0 sm:w-auto sm:flex-none sm:justify-start"
          >
            <img
              src={headerLogo}
              alt=""
              aria-hidden
              className="h-16 w-auto shrink-0 rounded-lg border border-sky-200/60 bg-white p-1.5 shadow-lg shadow-black/20 ring-2 ring-white/65 transition group-hover:border-sky-100 group-hover:ring-white/90 sm:h-20"
            />
          </Link>
          <nav className="flex w-full max-w-full flex-wrap items-stretch justify-end gap-2 text-sky-100/90 sm:max-w-none sm:w-auto sm:items-center sm:gap-3 sm:text-xs">
            <Link
              to="/treatment-report"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium ring-1 ring-white/25 transition hover:bg-white/10 sm:min-h-0 sm:flex-none sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs"
            >
              Treatment report
            </Link>
            <Link
              to="/records"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium ring-1 ring-white/25 transition hover:bg-white/10 sm:min-h-0 sm:flex-none sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs"
            >
              All records
            </Link>
            <Link
              to="/admin/settings"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium ring-1 ring-white/25 transition hover:bg-white/10 sm:min-h-0 sm:flex-none sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs"
            >
              Settings
            </Link>
            <span className="hidden self-center text-sky-100/40 sm:inline">|</span>
            <span className="hidden self-center text-sky-100/70 sm:inline">
              Bridgeport Public Utility District Field Log
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="shrink-0 border-t border-white/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-sky-100/50 sm:text-[11px]">
        Bridgeport Public Utility District — water operations
      </footer>
    </div>
  )
}
