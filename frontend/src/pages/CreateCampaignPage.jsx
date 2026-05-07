import React from 'react';
import { Header } from '../components/Header';
import { createCampaign, getPeople } from '../services/api';
import { Button, Card } from '../components/common';

export function CreateCampaignPage() {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    prospect_ids: [],
  });
  const [people, setPeople] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [selectedProspects, setSelectedProspects] = React.useState(new Set());

  React.useEffect(() => {
    async function fetchPeople() {
      try {
        const data = await getPeople(1, 1000);
        setPeople(Array.isArray(data) ? data : data.people || []);
      } catch (err) {
        console.error('Error fetching people:', err);
        setError('Failed to load prospects');
      }
    }

    fetchPeople();
  }, []);

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleDescriptionChange = (e) => {
    setFormData({ ...formData, description: e.target.value });
  };

  const handleProspectToggle = (prospectId) => {
    const newSelected = new Set(selectedProspects);
    if (newSelected.has(prospectId)) {
      newSelected.delete(prospectId);
    } else {
      newSelected.add(prospectId);
    }
    setSelectedProspects(newSelected);
    setFormData({ ...formData, prospect_ids: Array.from(newSelected) });
  };

  const handleSelectAll = () => {
    if (selectedProspects.size === people.length) {
      setSelectedProspects(new Set());
      setFormData({ ...formData, prospect_ids: [] });
    } else {
      const allIds = new Set(people.map(p => p.id));
      setSelectedProspects(allIds);
      setFormData({ ...formData, prospect_ids: Array.from(allIds) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        setError('Campaign name is required');
        setLoading(false);
        return;
      }

      if (formData.prospect_ids.length === 0) {
        setError('Please select at least one prospect');
        setLoading(false);
        return;
      }

      await createCampaign(formData);
      window.location.href = '/campaigns';
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Campaigns', '/campaigns'], ['New Campaign', '/campaigns/new']]} />

      <main className="container-mobile">
        <Card className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
            <p className="mt-1 text-sm text-gray-600">Set up a new voice calling campaign</p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campaign Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Campaign Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., Q2 Outreach Campaign"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={handleDescriptionChange}
                placeholder="Optional description for this campaign"
                rows="3"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Prospects Selection */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Select Prospects * ({selectedProspects.size} selected)
                </label>
                {people.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {selectedProspects.size === people.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                {people.length > 0 ? (
                  people.map((person) => (
                    <label key={person.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProspects.has(person.id)}
                        onChange={() => handleProspectToggle(person.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-gray-900">{person.full_name}</p>
                        <p className="text-gray-600">{person.email}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 py-4 text-center">No prospects available</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button
                type="submit"
                disabled={loading || selectedProspects.size === 0}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.history.back()}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
