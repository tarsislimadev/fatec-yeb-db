import React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';

import { getPersonDetail } from '../services/api'

export const UpdatePersonPage = async () => {
  const { personId } = useParams();

  const person = await getPersonDetail(personId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], [personId, `/people/${personId}`], ['Update']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1>Update Person</h1>
        <p>This is the Update Person Page. You can update person details here.</p>
        {JSON.stringify({ person })}
      </main>
    </div>
  );
};
