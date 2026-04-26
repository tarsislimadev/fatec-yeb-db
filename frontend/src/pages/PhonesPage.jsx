import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhoneStore } from '../store';
import { getPhones, createPhone } from '../services/api';
import { Button, Card, Loading, Alert } from '../components/common';
import { Header } from '../components/Header';

export function PhonesPage() {
  const navigate = useNavigate();
  const { phones, setPhones, isLoading, setLoading, error, setError } = usePhoneStore();
  const [filter, setFilter] = useState({ search: '', status: '' });
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total_pages: 1 });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ e164_number: '', raw_number: '', type: 'mobile' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPhones();
  }, [pagination.page, filter]);

  async function fetchPhones() {
    setLoading(true);
    try {
      const filters = {};
      if (filter.search) filters.search = filter.search;
      if (filter.status) filters.status = filter.status;

      const data = await getPhones(pagination.page, pagination.per_page, filters);
      setPhones(data.phones);
      setPagination({ ...pagination, total_pages: data.meta.total_pages });
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
      <Header items={[['Yeb', '/'], ['Phones', '/phones']]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Filters and Create Button */}
        <Card className="mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Search phone numbers..."
              value={filter.search}
              onChange={(e) => {
                setFilter({ ...filter, search: e.target.value });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring"
            />
            <select
              value={filter.status}
              onChange={(e) => {
                setFilter({ ...filter, status: e.target.value });
                setPagination({ ...pagination, page: 1 });
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
                  className="cursor-pointer hover:shadow-lg transition"
                >
                  <a href={`/phones/detail?id=${phone.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-bold text-lg">{phone.e164_number}</p>
                        <p className="text-gray-600">{phone.raw_number}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {phone.type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${phone.status === 'active'
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
                  </a>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page === 1}
                  variant="secondary"
                >
                  Previous
                </Button>
                <span className="px-4 py-2">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <Button
                  onClick={() => setPagination({ ...pagination, page: Math.min(pagination.total_pages, pagination.page + 1) })}
                  disabled={pagination.page === pagination.total_pages}
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
