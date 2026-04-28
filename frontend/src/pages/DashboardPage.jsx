import React from 'react';
import { Header } from '../components/Header'

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Dashboard', '/dashboard']]} />

      <main className="container-mobile">
        <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
          <a className="touch-target justify-start rounded-xl bg-white px-4 py-4 text-base font-medium text-blue-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-blue-800" href="/phones">
            View Phone List
          </a>
          <a className="touch-target justify-start rounded-xl bg-white px-4 py-4 text-base font-medium text-blue-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-blue-800" href="/people">
            View People List
          </a>
        </div>
      </main>
    </div>
  );
}
