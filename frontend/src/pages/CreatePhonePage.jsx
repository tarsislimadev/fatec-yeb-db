import React from 'react';
import { Header } from '../components/Header';

export function CreatePhonePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Phones', '/phones'], ['New', '/phones/new']]} />

      <main className="container-mobile">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">Create Phone</h1>
          <p className="text-slate-600">This is the Create Phone Page. You can create phone details here.</p>
        </div>
      </main>
    </div>
  );
};
