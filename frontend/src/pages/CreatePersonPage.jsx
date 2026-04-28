import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Card } from '../components/common';
import { createPerson } from '../services/api';

export function CreatePersonPage() {
  const [person, setPerson] = React.useState({ full_name: '', role_title: '', email: '' });

  const navigate = useNavigate();

  const createNewPerson = async (personData) => {
    try {
      await createPerson(personData);
      navigate(`/people`);
    } catch (error) {
      console.error('Error creating person:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], ['New', '/people/new']]} />

      <main className="container-mobile">
        <Card className="mb-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              type="text"
              placeholder="Full Name"
              value={person.full_name}
              onChange={(e) => setPerson({ ...person, full_name: e.target.value })}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="Role Title"
              value={person.role_title || ''}
              onChange={(e) => setPerson({ ...person, role_title: e.target.value })}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="email"
              placeholder="Email"
              value={person.email || ''}
              onChange={(e) => setPerson({ ...person, email: e.target.value })}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => createNewPerson(person)}
              className="touch-target rounded-md bg-blue-500 px-4 text-white hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
};
