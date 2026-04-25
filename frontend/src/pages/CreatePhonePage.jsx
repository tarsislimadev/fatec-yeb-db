import React from 'react';
import { Header } from '../components/Header';

export function CreatePhonePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Phones', '/phones'], ['New', '/phones/new']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1>Create Phone</h1>
        <p>This is the Create Phone Page. You can create phone details here.</p>
      </main>
    </div>
  );
};
