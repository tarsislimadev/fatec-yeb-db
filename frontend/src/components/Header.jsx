import React from 'react';
import { useAuthStore } from '../store';

export function Header({ items = [] } = { items: [] }) {
  const auth = {
    isAuthenticated: useAuthStore((state) => state.isAuthenticated),
    user: useAuthStore((state) => state.user),
    logout: useAuthStore((state) => state.logout),
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div>
            {items.map((item, index) => (
              <a href={item[1] || '#'} className="text-blue-600 hover:underline">
                {item[0]}
              </a>
            )).reduce((prev, curr) => [...prev, ' / ', curr], [''])}
          </div>
          <div>
            {auth.isAuthenticated ? (
              <div>
                <a href={'/profile'}>
                  <span className="text-gray-700">{auth.user?.display_name || 'profile'}</span>
                </a>
                <button onClick={auth.logout} className="ml-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                  Logout
                </button>
              </div>
            ) : (
              <a href="/sessions/new" className="text-blue-600 hover:underline">
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
