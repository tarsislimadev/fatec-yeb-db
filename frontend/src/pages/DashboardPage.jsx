import React from 'react';
import { Header } from '../components/Header'

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Dashboard', '/dashboard']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <a className="text-blue-600 hover:text-blue-800" href={'/phones'}>
          View Phone List
        </a>
        <br />
        <a className="text-blue-600 hover:text-blue-800" href={'/people'}>
          View People List
        </a>
      </main>
    </div>
  );
}
