import React from 'react';
import { Header } from '../components/Header';

export function MyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], ['Me', '/people/me']]} />

      <main className="container-mobile">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-600">This is your profile page. You can view and update your details here.</p>
        </div>
      </main>
    </div>
  );
};
