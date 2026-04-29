import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPhoneDetail, addPhoneOwner, removePhoneOwner, getPeople, deletePhone, updatePhone } from '../services/api';
import { Button, Card, Loading, Alert, Input } from '../components/common';
import { Header } from '../components/Header'
import { getQueryParam } from '../services/window';

export function PhoneDetailPage() {
  const id = getQueryParam('id');
  const navigate = useNavigate();
  const [phone, setPhone] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [newOwner, setNewOwner] = useState({
    owner_type: 'person',
    owner_id: '',
    relation_label: '',
    confidence_score: 100,
  });
  const [ownerError, setOwnerError] = useState('');

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const result = await getPeople(1, 10000); // Fetch all people for owner selection
      setPeople(result.data?.people || []);
    } catch (err) {
      console.error('Failed to load people:', err);
    }
  };

  useEffect(() => {
    if (!id) {
      setError('Phone ID is required');
      return;
    }
    fetchPhone();
  }, [id]);

  async function fetchPhone() {
    setLoading(true);
    try {
      const data = await getPhoneDetail(id);
      setPhone(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load phone');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddOwner(e) {
    e.preventDefault();
    setOwnerError('');
    
    if (!newOwner.owner_id) {
      setOwnerError('Please select a person');
      return;
    }

    setOwnerLoading(true);
    try {
      await addPhoneOwner(id, newOwner);
      setNewOwner({
        owner_type: 'person',
        owner_id: '',
        relation_label: '',
        confidence_score: 100,
      });
      setShowOwnerForm(false);
      setSuccess('Owner added successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchPhone();
    } catch (err) {
      setOwnerError(err.response?.data?.error?.message || 'Failed to add owner');
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleRemoveOwner(ownerRelationId) {
    if (!confirm('Are you sure you want to remove this owner?')) {
      return;
    }
    try {
      await removePhoneOwner(id, ownerRelationId);
      setSuccess('Owner removed successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchPhone();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to remove owner');
    }
  }

  async function handleDeletePhone() {
    if (!confirm('Are you sure you want to delete this phone? This action cannot be undone.')) {
      return;
    }
    try {
      await deletePhone(id);
      navigate('/phones');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete phone');
    }
  }

  if (loading) return <Loading />;
  if (!phone) return <Alert type="error" message={error} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Phones', '/phones'], [phone.e164_number, `/phones/detail?id=${phone.id}`]]} />

      <main className="container-mobile">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {/* Header with back button and delete */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{phone.e164_number}</h1>
            <p className="text-gray-600">{phone.raw_number}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate('/phones')} variant="secondary" className="w-full sm:w-auto">
              ← Back to Phones
            </Button>
            <Button onClick={handleDeletePhone} variant="danger" className="w-full sm:w-auto">
              Delete Phone
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
          {['details', 'owners'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              className={`touch-target rounded-t-md px-4 text-sm font-medium capitalize transition ${activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">E.164 Number</p>
                <p className="font-mono font-bold text-lg mt-2">{phone.e164_number}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Raw Number</p>
                <p className="font-mono mt-2">{phone.raw_number}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Type</p>
                <p className="capitalize font-semibold mt-2">{phone.type}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <p className="capitalize font-semibold mt-2">{phone.status}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Country Code</p>
                <p className="font-semibold mt-2">{phone.country_code}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">National Number</p>
                <p className="font-mono mt-2">{phone.national_number}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm mt-2">{new Date(phone.created_at).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm mt-2">{new Date(phone.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Owners Tab */}
        {activeTab === 'owners' && (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Owners & Relations</h2>
              <Button onClick={() => setShowOwnerForm(!showOwnerForm)} className="w-full sm:w-auto">
                {showOwnerForm ? '✕ Cancel' : '+ Add Owner'}
              </Button>
            </div>

            {showOwnerForm && (
              <Card className="mb-4 border-2 border-blue-200">
                {ownerError && <Alert type="error" message={ownerError} onClose={() => setOwnerError('')} />}
                <form onSubmit={handleAddOwner}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">Person</label>
                    <select
                      value={newOwner.owner_id}
                      onChange={(e) => setNewOwner({ ...newOwner, owner_type: 'person', owner_id: e.target.value, })}
                      className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a person...</option>
                      {(people || []).map((person) => (
                        <option
                          key={person.id}
                          value={person.id}
                        >
                          {person.full_name || person.name || 'Unnamed'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Relation Label (optional)"
                    value={newOwner.relation_label}
                    onChange={(val) => setNewOwner({ ...newOwner, relation_label: val })}
                    placeholder="e.g., personal, work, reception"
                  />

                  <Input
                    label="Confidence Score (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={newOwner.confidence_score}
                    onChange={(val) => setNewOwner({ ...newOwner, confidence_score: Math.min(100, Math.max(0, parseInt(val) || 0)) })}
                  />

                  <Button disabled={ownerLoading} className="w-full">
                    {ownerLoading ? 'Adding...' : 'Add Owner'}
                  </Button>
                </form>
              </Card>
            )}

            {phone.owners && phone.owners.length > 0 ? (
              <div className="grid gap-3">
                {phone.owners.map((owner) => (
                  <Card key={owner.id} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Type: </span>
                        <span className="capitalize text-blue-600">{owner.owner_type}</span>
                      </p>
                      <p className="text-sm font-mono mt-2 text-gray-600 break-all">{owner.owner_id}</p>
                      {owner.relation_label && (
                        <p className="text-sm mt-2">
                          <span className="font-semibold text-gray-700">Label: </span>
                          <span className="text-gray-600">{owner.relation_label}</span>
                        </p>
                      )}
                      <p className="text-sm mt-2">
                        <span className="font-semibold text-gray-700">Confidence: </span>
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {owner.confidence_score}%
                        </span>
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveOwner(owner.id)}
                      variant="danger"
                      className="w-full text-sm sm:w-auto"
                    >
                      Remove
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12 bg-blue-50">
                <p className="text-gray-600 text-lg">No owners assigned yet</p>
                <p className="text-gray-500 text-sm mt-1">Click "Add Owner" to assign a person to this phone number</p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

