import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPhoneDetail, updatePhone, deletePhone, addPhoneOwner, removePhoneOwner } from '../services/api';
import { Button, Card, Loading, Alert, Input } from '../components/common';

export function PhoneDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [newOwner, setNewOwner] = useState({
    owner_type: 'person',
    owner_id: '',
    relation_label: '',
    confidence_score: 100,
  });

  useEffect(() => {
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

  async function handleDeletePhone() {
    if (!window.confirm('Are you sure you want to delete this phone?')) return;

    try {
      await deletePhone(id);
      navigate('/phones');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete phone');
    }
  }

  async function handleAddOwner(e) {
    e.preventDefault();
    try {
      await addPhoneOwner(id, newOwner);
      setNewOwner({
        owner_type: 'person',
        owner_id: '',
        relation_label: '',
        confidence_score: 100,
      });
      setShowOwnerForm(false);
      await fetchPhone();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add owner');
    }
  }

  async function handleRemoveOwner(ownerRelationId) {
    try {
      await removePhoneOwner(id, ownerRelationId);
      await fetchPhone();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to remove owner');
    }
  }

  if (loading) return <Loading />;
  if (!phone) return <Alert type="error" message={error} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <button onClick={() => navigate('/phones')} className="text-blue-600 hover:underline mb-2">
                ← Back to Phones
              </button>
              <h1 className="text-3xl font-bold font-mono">{phone.e164_number}</h1>
              <p className="text-gray-600">{phone.raw_number}</p>
            </div>
            <Button onClick={handleDeletePhone} variant="danger">
              Delete Phone
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {['details', 'owners', 'channels', 'consents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize ${
                activeTab === tab
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">E.164 Number</p>
                <p className="font-mono font-bold">{phone.e164_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Raw Number</p>
                <p className="font-mono">{phone.raw_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Type</p>
                <p className="capitalize">{phone.type}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="capitalize">{phone.status}</p>
              </div>
              <div>
                <p className="text-gray-600">Country Code</p>
                <p>{phone.country_code}</p>
              </div>
              <div>
                <p className="text-gray-600">National Number</p>
                <p className="font-mono">{phone.national_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Created</p>
                <p>{new Date(phone.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Updated</p>
                <p>{new Date(phone.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Owners Tab */}
        {activeTab === 'owners' && (
          <div>
            <Button onClick={() => setShowOwnerForm(!showOwnerForm)} className="mb-4">
              {showOwnerForm ? 'Cancel' : 'Add Owner'}
            </Button>

            {showOwnerForm && (
              <Card className="mb-4">
                <form onSubmit={handleAddOwner}>
                  <select
                    value={newOwner.owner_type}
                    onChange={(e) => setNewOwner({ ...newOwner, owner_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
                  >
                    <option value="person">Person</option>
                    <option value="business">Business</option>
                    <option value="department">Department</option>
                  </select>

                  <Input
                    label="Owner ID (UUID)"
                    value={newOwner.owner_id}
                    onChange={(val) => setNewOwner({ ...newOwner, owner_id: val })}
                    placeholder="UUID of the owner"
                  />

                  <Input
                    label="Relation Label"
                    value={newOwner.relation_label}
                    onChange={(val) => setNewOwner({ ...newOwner, relation_label: val })}
                    placeholder="e.g., personal, work, reception"
                  />

                  <Input
                    label="Confidence Score (0-100)"
                    type="number"
                    value={newOwner.confidence_score}
                    onChange={(val) => setNewOwner({ ...newOwner, confidence_score: parseInt(val) })}
                  />

                  <Button className="w-full">Add Owner</Button>
                </form>
              </Card>
            )}

            {phone.owners && phone.owners.length > 0 ? (
              <div className="grid gap-3">
                {phone.owners.map((owner) => (
                  <Card key={owner.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium capitalize">{owner.owner_type}</p>
                      <p className="text-sm text-gray-600">{owner.owner_id}</p>
                      {owner.relation_label && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">Label:</span> {owner.relation_label}
                        </p>
                      )}
                      <p className="text-sm mt-1">
                        <span className="font-medium">Confidence:</span> {owner.confidence_score}%
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveOwner(owner.id)}
                      variant="danger"
                      className="text-sm px-3 py-1"
                    >
                      Remove
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <p className="text-gray-500">No owners assigned</p>
              </Card>
            )}
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <div className="grid gap-3">
            {phone.channels && phone.channels.length > 0 ? (
              phone.channels.map((channel) => (
                <Card key={channel.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium capitalize">{channel.channel_type}</p>
                    <p className="text-sm text-gray-600">
                      Status: {channel.is_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Button
                    variant={channel.is_enabled ? 'secondary' : 'primary'}
                    className="text-sm px-3 py-1"
                  >
                    {channel.is_enabled ? 'Disable' : 'Enable'}
                  </Button>
                </Card>
              ))
            ) : (
              <Card className="text-center py-8">
                <p className="text-gray-500">No channels</p>
              </Card>
            )}
          </div>
        )}

        {/* Consents Tab */}
        {activeTab === 'consents' && (
          <div className="grid gap-3">
            {phone.consents && phone.consents.length > 0 ? (
              phone.consents.map((consent) => (
                <Card key={consent.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium capitalize">{consent.consent_type}</p>
                    <p className="text-sm text-gray-600">
                      Status: {consent.status}
                    </p>
                  </div>
                  <select
                    value={consent.status}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="granted">Granted</option>
                    <option value="revoked">Revoked</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </Card>
              ))
            ) : (
              <Card className="text-center py-8">
                <p className="text-gray-500">No consents</p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
