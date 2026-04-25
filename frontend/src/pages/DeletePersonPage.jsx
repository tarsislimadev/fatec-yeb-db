import React, { use } from 'react';
import { Header } from '../components/Header';
import { useParams } from 'react-router-dom';

import { getPersonDetail } from '../services/api'

export const DeletePersonPage = async () => {
  const { personId } = useParams();

  const person = await getPersonDetail(personId);

  return (
    <div>
      <Header items={[['Yeb', '/'], ['People', '/people'], [personId, `/people/${personId}`], ['Delete']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1>Delete Person</h1>
        <p>This is the Delete Person Page. You can delete person details here.</p>
        {JSON.stringify({ person })}
      </main>
    </div>
  );
};
