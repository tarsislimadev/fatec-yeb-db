import React from 'react';
import { Header } from '../components/Header';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Dashboard', '/dashboard']]} />

      <main className="container-mobile">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome to the Phone Catalog App</h1>
          <p className="text-base leading-7 text-slate-600 sm:text-lg">Discover a wide range of phones and their details.</p>
        </div>
      </main>
    </div>
  );
}
