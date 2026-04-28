import React from 'react';
import { Header } from '../components/Header';
import { getPeople } from '../services/api';
import { Button, Card } from '../components/common';

export function PeoplePage() {
  const [people, setPeople] = React.useState([]);

  React.useEffect(() => {
    async function fetchPeople() {
      try {
        const { data } = await getPeople();
        console.log('Fetched people:', data);
        setPeople(data.people);
      } catch (error) {
        console.error('Error fetching people:', error);
      }
    }

    fetchPeople();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people']]} />

      <nav className="container-mobile pb-0 pt-4">
        <div className="flex justify-end">
          <Button fullWidth className="sm:w-auto" onClick={() => (window.location.href = '/people/new')}>
            Add New Person
          </Button>
        </div>
      </nav>

      <main className="container-mobile">
        {people.length > 0 ? (
          <>
            <div className="grid gap-3 md:hidden">
              {people.map((person) => (
                <Card key={person.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{person.full_name}</p>
                      <p className="text-sm text-slate-500">ID {person.id}</p>
                    </div>
                    <a href={`/people/detail?id=${person.id}`} className="touch-target rounded-md px-3 text-sm font-medium text-blue-600 hover:bg-slate-100">
                      View
                    </a>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p><span className="font-medium text-slate-700">Role:</span> {person.role_title}</p>
                    <p><span className="font-medium text-slate-700">Email:</span> {person.email}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {people.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {person.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {person.full_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {person.role_title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {person.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <a href={`/people/detail?id=${person.id}`} className="text-blue-500 hover:text-blue-700">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <p className="text-gray-600">
            This is the People Page. List of people will be displayed here.
          </p>
        )}
      </main>
    </div>
  );
};
