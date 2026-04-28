import React from 'react';
import { Header } from '../components/Header';
import { getQueryParam } from '../services/window';

import { getPersonDetail } from '../services/api'

export function PersonPage() {
  const id = getQueryParam('id');

  const [person, setPerson] = React.useState({ id: null, full_name: '', role_title: '', email: '' });

  React.useEffect(() => {
    async function fetchPerson() {
      const data = await getPersonDetail(id);
      setPerson(data.person);
    }
    fetchPerson();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], [id, `/people/detail?id=${id}`]]} />

      <nav className="container-mobile pb-0 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <a href={`/people/edit?id=${id}`} className="touch-target rounded-md bg-blue-500 px-4 text-sm font-bold text-white hover:bg-blue-700">
            Edit
          </a>
          <a href={`/people/delete?id=${id}`} className="touch-target rounded-md bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-700">
            Delete
          </a>
        </div>
      </nav>

      <main className="container-mobile">
        <div className="max-w-2xl rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          {person ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <p><strong>ID:</strong> {person.id}</p>
              <p><strong>Full Name:</strong> {person.full_name}</p>
              <p><strong>Role Title:</strong> {person.role_title}</p>
              <p><strong>Email:</strong> {person.email}</p>
            </div>
          ) : (
            <p>Loading... Details will be displayed here.</p>
          )}
        </div>
      </main>
    </div>
  );
}
