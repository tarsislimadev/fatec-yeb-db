import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPhoneDetail, updatePhone, deletePhone, addPhoneOwner, removePhoneOwner, getPeople } from '../services/api';
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
  const [activeTab, setActiveTab] = useState('details');
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [newOwner, setNewOwner] = useState({
    owner_type: 'person',
    owner_id: '',
    relation_label: '',
    confidence_score: 100,
  });

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const { data } = await getPeople(1, 10000); // Fetch all people for owner selection
      setPeople(data.people);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load people');
    }
  };

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
      <Header items={[['Yeb', '/'], ['Phones', '/phones'], [phone.e164_number, `/phones/detail?id=${phone.id}`]]} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {['details', 'owners', 'channels', 'consents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize ${activeTab === tab
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Owners</h2>
              <Button onClick={() => setShowOwnerForm(!showOwnerForm)} className="mb-4">
                {showOwnerForm ? 'Cancel' : 'Add New Owner'}
              </Button>
            </div>

            {showOwnerForm && (
              <Card className="mb-4">
                <form onSubmit={handleAddOwner}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Person</label>
                    <select
                      onChange={(e) => setNewOwner({ ...newOwner, owner_type: 'person', owner_id: e.target.value, })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="">Select a person</option>
                      {(people || []).map((person) => (
                        <option
                          key={person.id}
                          value={person.id}
                          label={`${person.full_name || person.name || 'Unnamed'} (${person.id})`}
                        />
                      ))}
                    </select>
                  </div>

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
                      <p className="text-sm mt-1">
                        <span className="font-medium">Type: </span>
                        <span className="capitalize"></span>{owner.owner_type}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-medium">ID:</span> <a href={`/people/item?id=${owner.owner_id}`} target="_blank" rel="noopener noreferrer">{owner.owner_id}</a>
                      </p>
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
