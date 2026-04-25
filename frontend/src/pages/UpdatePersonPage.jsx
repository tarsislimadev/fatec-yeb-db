import React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';

import { getPersonDetail } from '../services/api'

export function UpdatePersonPage() {
  const { personId } = useParams();

  const [person, setPerson] = React.useState(null);

  React.useEffect(() => {
    const fetchPerson = async () => {
      try {
        const data = await getPersonDetail(personId);
        setPerson(data);
      } catch (error) {
        console.error('Error fetching person detail:', error);
      }
    };

    fetchPerson();
  }, [personId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], [personId, `/people/${personId}`], ['Update']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1>Update Person</h1>
        <p>This is the Update Person Page. You can update person details here.</p>
        {person && JSON.stringify({ person })}
      </main>
    </div>
  );
};
