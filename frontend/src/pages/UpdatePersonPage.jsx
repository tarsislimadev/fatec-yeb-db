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

      <main className="container-mobile">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">Update Person</h1>
          <p className="text-slate-600">This is the Update Person Page. You can update person details here.</p>
        </div>
      </main>
    </div>
  );
};
