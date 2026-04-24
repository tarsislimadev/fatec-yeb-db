import React from 'react';
import { Header } from '../components/Header';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Dashboard', '/dashboard']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1>Welcome to the Phone Catalog App</h1>
        <p>Discover a wide range of phones and their details.</p>
      </main>
    </div>
  );
}
