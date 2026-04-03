import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col">
      <header className="shrink-0 border-b border-white/10 bg-[#071a2e]/80 pt-[env(safe-area-inset-top,0)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            to="/"
            className="group flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-white no-underline sm:min-h-0 sm:flex-none"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-400/20 ring-1 ring-sky-300/40 sm:h-10 sm:w-10">
              <svg
                className="h-6 w-6 text-sky-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path d="M12 2.5c-2.5 3.5-4 6.2-4 9a4 4 0 108 0c0-2.8-1.5-5.5-4-9z" />
                <path d="M8 18h8M9 22h6" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/90">
                Bridgeport PUD
              </p>
              <p className="text-sm font-semibold leading-tight text-white group-hover:text-sky-100">
                Field data log
              </p>
            </div>
          </Link>
          <nav className="flex w-full max-w-full flex-wrap items-stretch justify-end gap-2 text-sky-100/90 sm:max-w-none sm:w-auto sm:items-center sm:gap-3 sm:text-xs">
            <Link
              to="/records"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium ring-1 ring-white/25 transition hover:bg-white/10 sm:min-h-0 sm:flex-none sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs"
            >
              All records
            </Link>
            <span className="hidden self-center text-sky-100/40 sm:inline">|</span>
            <span className="hidden self-center text-sky-100/70 sm:inline">
              Paperless rounds by site &amp; date
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
