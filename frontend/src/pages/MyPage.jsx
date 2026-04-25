import React from 'react';
import { Header } from '../components/Header';

export function MyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], ['Me', '/people/me']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1>My Profile</h1>
        <p>This is your profile page. You can view and update your details here.</p>
      </main>
    </div>
  );
};
