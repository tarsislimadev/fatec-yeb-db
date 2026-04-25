import React from 'react';
import { Header } from '../components/Header';
import { getPeople } from '../services/api';

export function PeoplePage() {
  const [people, setPeople] = React.useState([]);

  React.useEffect(async () => {
    try {
      const { data } = await getPeople();
      console.log('Fetched people:', data);
      setPeople(data.people);
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people']]} />

      <nav className="max-w-7xl mx-auto px-4 py-4 flex flex items-center justify-end space-x-4">
        <div></div>
        <div>
          <a href="/people/new" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Add New Person
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {people.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
        ) : (
          <p className="text-gray-600">
            This is the People Page. List of people will be displayed here.
          </p>
        )}
      </main>
    </div>
  );
};
