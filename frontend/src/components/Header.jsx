import React from 'react';
import { useAuthStore } from '../store';

export function Header({ items = [] } = { items: [] }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const auth = {
    isAuthenticated: useAuthStore((state) => state.isAuthenticated),
    user: useAuthStore((state) => state.user),
    logout: useAuthStore((state) => state.logout),
  }

  const title = items[0]?.[0] || 'Yeb';

  function renderCrumbs(itemClassName = 'text-sm font-medium text-blue-600 hover:text-blue-800', showSeparators = true) {
    return items.map((item, index) => (
      <React.Fragment key={`${item[0]}-${index}`}>
        {showSeparators && index > 0 && <span className="text-slate-300">/</span>}
        <a href={item[1] || '#'} className={itemClassName}>
          {item[0]}
        </a>
      </React.Fragment>
    ));
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-3 md:hidden">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            {items.length > 1 && (
              <p className="truncate text-xs text-slate-500">{items.slice(1).map((item) => item[0]).join(' / ')}</p>
            )}
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((current) => !current)}
            className="touch-target rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm"
          >
            Menu
          </button>
        </div>

        <div className="hidden items-center justify-between gap-4 py-4 md:flex">
          <nav className="flex flex-wrap items-center gap-2">
            {renderCrumbs()}
          </nav>

          <div className="flex items-center gap-3">
            {auth.isAuthenticated ? (
              <>
                <a href="/profile" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                  {auth.user?.display_name || 'profile'}
                </a>
                <button onClick={auth.logout} className="touch-target rounded-md bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-700">
                  Logout
                </button>
              </>
            ) : (
              <a href="/sessions/new" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                Login
              </a>
            )}
          </div>
        </div>

        <div className={`${menuOpen ? 'block' : 'hidden'} border-t border-slate-200 py-4 md:hidden`}>
          <nav className="flex flex-col gap-3">
            {renderCrumbs('block rounded-md px-2 py-1 text-base font-medium text-blue-600 hover:bg-slate-100 hover:text-blue-800', false)}
          </nav>

          <div className="mt-4 flex flex-col gap-3">
            {auth.isAuthenticated ? (
              <>
                <a href="/profile" className="touch-target justify-start rounded-md px-2 text-base font-medium text-slate-700 hover:bg-slate-100">
                  {auth.user?.display_name || 'profile'}
                </a>
                <button onClick={auth.logout} className="touch-target rounded-md bg-red-500 px-4 text-base font-semibold text-white hover:bg-red-700">
                  Logout
                </button>
              </>
            ) : (
              <a href="/sessions/new" className="touch-target justify-start rounded-md px-2 text-base font-medium text-blue-600 hover:bg-slate-100">
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
