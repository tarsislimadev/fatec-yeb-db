import React from 'react';
import { Header } from '../components/Header';
import { useParams } from 'react-router-dom';

import { getPersonDetail } from '../services/api'

export function PersonPage() {
  const { id } = useParams();

  const [person, setPerson] = React.useState(null);

  React.useEffect(() => {
    async function fetchPerson() {
      const data = await getPersonDetail(id);
      setPerson(data);
    }
    fetchPerson();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], [id, `/people/${id}`]]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Person Details</h1>
        {person ? (
          <div className="mb-4">
            <p><strong>Name:</strong> {person.name}</p>
            <p><strong>Email:</strong> {person.email}</p>
            <p><strong>Age:</strong> {person.age}</p>
          </div>
        ) : (
          <p>Loading...</p>
        )}
        <a href={`/people/${id}/edit`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Edit Profile
        </a>
        <a href={`/people/${id}/delete`} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
          Delete Profile
        </a>
      </main>
    </div>
  );
}
