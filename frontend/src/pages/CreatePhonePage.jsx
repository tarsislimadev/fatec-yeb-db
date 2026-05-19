import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Card } from '../components/common';
import { createPhone } from '../services/api';

export function CreatePhonePage() {
  const [phone, setPhone] = React.useState({ e164_number: '', type: 'mobile', country_code: 'BR' });
  const [errorMessage, setErrorMessage] = React.useState('');
  const navigate = useNavigate();

  const createNewPhone = async (phoneData) => {
    try {
      setErrorMessage('');

      const payload = {
        e164_number: phoneData.e164_number.trim(),
        type: phoneData.type,
        country_code: phoneData.country_code || 'BR',
      };

      await createPhone(payload);
      navigate('/phones');
    } catch (error) {
      console.error('Error creating phone:', error);
      setErrorMessage(error.response?.data?.error?.message || 'Failed to create phone');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Phones', '/phones'], ['New', '/phones/new']]} />

      <main className="container-mobile">
        <Card className="mb-6">
          <div className="grid gap-3 lg:grid-cols-1">
            <input
              type="text"
              placeholder="Phone (E.164 or raw)"
              value={phone.e164_number}
              onChange={(e) => setPhone({ ...phone, e164_number: e.target.value })}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={phone.type}
              onChange={(e) => setPhone({ ...phone, type: e.target.value })}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mobile">Mobile</option>
              <option value="landline">Landline</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="unknown">Unknown</option>
            </select>

            <input
              type="text"
              placeholder="Country Code"
              value={phone.country_code}
              onChange={(e) => setPhone({ ...phone, country_code: e.target.value })}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => createNewPhone(phone)}
              className="touch-target rounded-md bg-blue-500 px-4 text-white hover:bg-blue-700"
            >
              Create
            </button>
          </div>
          {errorMessage ? (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </Card>
      </main>
    </div>
  );
};
