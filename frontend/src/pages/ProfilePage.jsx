import React from 'react';
import { Header } from '../components/Header';

export function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Profile', '/profile']]} />

      <main className="bg-white shadow rounded-lg p-6 w-full max-w-md mx-auto mt-10">
        <h1 className="text-3xl font-bold mb-4">Profile Page</h1>
        <p className="text-gray-600 mb-6">This is your profile page. You can view and edit your information here.</p>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Edit Profile
        </button>
      </main>
    </div>
  );
}
