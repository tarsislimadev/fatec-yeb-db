import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Card } from '../components/common';
import { createPerson } from '../services/api';

export function CreatePersonPage() {
  const [person, setPerson] = React.useState({ full_name: '', role_title: '', email: '', document: '' });
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [errorMessage, setErrorMessage] = React.useState('');

  const navigate = useNavigate();

  const createNewPerson = async (personData) => {
    try {
      setErrorMessage('');
      setFieldErrors({});

      const nextErrors = {};
      if (!personData.full_name.trim()) {
        nextErrors.full_name = 'Full name is required';
      }
      if (!personData.email.trim()) {
        nextErrors.email = 'Email is required';
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }

      const payload = {
        full_name: personData.full_name.trim(),
        role_title: personData.role_title?.trim() || null,
        email: personData.email.trim().toLowerCase(),
        document: personData.document?.trim() || null,
      };

      await createPerson(payload);
      navigate(`/people`);
    } catch (error) {
      console.error('Error creating person:', error);
      setErrorMessage(error.response?.data?.error?.message || 'Failed to create person');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['People', '/people'], ['New', '/people/new']]} />

      <main className="container-mobile">
        <Card className="mb-6">
          <div className="grid gap-3 lg:grid-cols-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Full Name</label>
              <input
                type="text"
                value={person.full_name}
                onChange={(e) => setPerson({ ...person, full_name: e.target.value })}
                className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors.full_name ? (
                <p className="text-xs text-red-600">{fieldErrors.full_name}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Role Title</label>
              <input
                type="text"
                value={person.role_title || ''}
                onChange={(e) => setPerson({ ...person, role_title: e.target.value })}
                className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Email</label>
              <input
                type="email"
                value={person.email || ''}
                onChange={(e) => setPerson({ ...person, email: e.target.value })}
                className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors.email ? (
                <p className="text-xs text-red-600">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Document (CPF/CNPJ)</label>
              <input
                type="text"
                value={person.document || ''}
                onChange={(e) => setPerson({ ...person, document: e.target.value })}
                className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => createNewPerson(person)}
              className="touch-target rounded-md bg-blue-500 px-4 text-white hover:bg-blue-700"
            >
              Create
            </button>
          </div>
          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </Card>
      </main>
    </div>
  );
};
