import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhoneStore } from '../store';
import { getPhones, createPhone } from '../services/api';
import { Button, Card, Loading, Alert } from '../components/common';

export function PhonesPage() {
  const navigate = useNavigate();
  const { phones, setPhones, isLoading, setLoading, error, setError } = usePhoneStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ e164_number: '', raw_number: '', type: 'mobile' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPhones();
  }, [currentPage, search, status]);

  async function fetchPhones() {
    setLoading(true);
    try {
      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;

      const data = await getPhones(currentPage, 20, filters);
      setPhones(data.phones);
      setTotalPages(data.meta.total_pages);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load phones');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePhone(e) {
    e.preventDefault();
    setFormError('');

    if (!formData.e164_number && !formData.raw_number) {
      setFormError('Phone number is required');
      return;
    }

    try {
      await createPhone({
        e164_number: formData.e164_number || formData.raw_number,
        raw_number: formData.raw_number,
        type: formData.type,
      });
      setFormData({ e164_number: '', raw_number: '', type: 'mobile' });
      setShowCreateForm(false);
      await fetchPhones();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to create phone');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Phone List</h1>
          <Button onClick={() => navigate('/logout')} variant="secondary">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Filters and Create Button */}
        <Card className="mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Search phone numbers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : 'Add Phone'}
            </Button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreatePhone} className="border-t pt-4">
              {formError && <Alert type="error" message={formError} onClose={() => setFormError('')} />}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="E.164 Format: +55119876543210"
                  value={formData.e164_number}
                  onChange={(e) => setFormData({ ...formData, e164_number: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  placeholder="Raw: (11) 98765-43210"
                  value={formData.raw_number}
                  onChange={(e) => setFormData({ ...formData, raw_number: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded"
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="mobile">Mobile</option>
                  <option value="landline">Landline</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <Button className="w-full">Create Phone</Button>
            </form>
          )}
        </Card>

        {/* Phone List */}
        {isLoading ? (
          <Loading />
        ) : phones.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-500">No phones found</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {phones.map((phone) => (
                <Card
                  key={phone.id}
                  onClick={() => navigate(`/phones/${phone.id}`)}
                  className="cursor-pointer hover:shadow-lg transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-lg">{phone.e164_number}</p>
                      <p className="text-gray-600">{phone.raw_number}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {phone.type}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          phone.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {phone.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Created: {new Date(phone.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="secondary"
                >
                  Previous
                </Button>
                <span className="px-4 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
