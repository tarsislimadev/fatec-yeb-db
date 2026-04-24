import React from 'react';
import { Header } from '../components/Header'

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Dashboard', '/dashboard']]} />

      <main>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          <p>Welcome to the dashboard! Here you can see an overview of your phone catalog.</p>
        </div>
      </main>
    </div>
  );
}
