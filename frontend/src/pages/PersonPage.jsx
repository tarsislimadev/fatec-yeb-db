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

      <nav className="max-w-7xl mx-auto px-4 py-4 flex flex items-center justify-end space-x-4">
        <div></div>
        <div>
          <a href={`/people/edit?id=${id}`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Edit
          </a>
          <a href={`/people/delete?id=${id}`} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Delete
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {person ? (
          <div className="mb-4">
            <p><strong>ID:</strong> {person.id}</p>
            <p><strong>Full Name:</strong> {person.full_name}</p>
            <p><strong>Role Title:</strong> {person.role_title}</p>
            <p><strong>Email:</strong> {person.email}</p>
          </div>
        ) : (
          <p>Loading... Details will be displayed here.</p>
        )}
      </main>
    </div>
  );
}
