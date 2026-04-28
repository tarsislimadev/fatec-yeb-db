import React from 'react';
import { Header } from '../components/Header';
import { useParams } from 'react-router-dom';
import { Loading } from '../components/common';

import { getPersonDetail } from '../services/api'

export function DeletePersonPage() {
  const { personId } = useParams();
  const [person, setPerson] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchPerson() {
      try {
        const data = await getPersonDetail(personId);
        setPerson(data.person);
      } catch (error) {
        console.error('Error fetching person detail:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPerson();
  }, [personId]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], [personId, `/people/${personId}`], ['Delete']]} />

      <main className="container-mobile">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">Delete Person</h1>
          <p className="text-slate-600">This is the Delete Person Page. You can delete person details here.</p>
        </div>
      </main>
    </div>
  );
}
