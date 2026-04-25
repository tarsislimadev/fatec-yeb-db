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
      alert(`Person created`);
      navigate(`/people`);
    } catch (error) {
      console.error('Error creating person:', error);
      alert('Failed to create person. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], ['New', '/people/new']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Full Name"
              value={person.full_name}
              onChange={(e) => setPerson({ ...person, full_name: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="Role Title"
              value={person.role_title || ''}
              onChange={(e) => setPerson({ ...person, role_title: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="email"
              placeholder="Email"
              value={person.email || ''}
              onChange={(e) => setPerson({ ...person, email: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => createNewPerson(person)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Create
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
};
