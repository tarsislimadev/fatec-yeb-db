import React from 'react';
import { Header } from '../components/Header';
import { 
  getCampaignDetail, 
  updateCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  deleteCampaign,
} from '../services/api';
import { Button, Card } from '../components/common';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  running: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
};

export function CampaignDetailPage() {
  const [campaign, setCampaign] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [editingDescription, setEditingDescription] = React.useState(false);
  const [description, setDescription] = React.useState('');

  const queryParams = new URLSearchParams(window.location.search);
  const campaignId = queryParams.get('id');

  React.useEffect(() => {
    async function fetchCampaign() {
      try {
        setLoading(true);
        const data = await getCampaignDetail(campaignId);
        setCampaign(data);
        setDescription(data.description || '');
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const handleSaveDescription = async () => {
    try {
      setActionLoading(true);
      await updateCampaign(campaignId, { description });
      setCampaign({ ...campaign, description });
      setEditingDescription(false);
    } catch (err) {
      console.error('Error updating campaign:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartCampaign = async () => {
    try {
      setActionLoading(true);
      await startCampaign(campaignId);
      const updated = await getCampaignDetail(campaignId);
      setCampaign(updated);
    } catch (err) {
      console.error('Error starting campaign:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseCampaign = async () => {
    try {
      setActionLoading(true);
      await pauseCampaign(campaignId);
      const updated = await getCampaignDetail(campaignId);
      setCampaign(updated);
    } catch (err) {
      console.error('Error pausing campaign:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeCampaign = async () => {
    try {
      setActionLoading(true);
      await resumeCampaign(campaignId);
      const updated = await getCampaignDetail(campaignId);
      setCampaign(updated);
    } catch (err) {
      console.error('Error resuming campaign:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopCampaign = async () => {
    if (!confirm('Are you sure you want to stop this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await stopCampaign(campaignId);
      const updated = await getCampaignDetail(campaignId);
      setCampaign(updated);
    } catch (err) {
      console.error('Error stopping campaign:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!confirm('Delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteCampaign(campaignId);
      window.location.href = '/campaigns';
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Campaigns', '/campaigns']]} />
        <main className="container-mobile">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading campaign...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Campaigns', '/campaigns']]} />
        <main className="container-mobile">
          <Card className="text-center py-12">
            <p className="text-gray-600">Campaign not found</p>
            <Button className="mt-4" onClick={() => window.location.href = '/campaigns'}>
              Back to Campaigns
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const total = campaign.calls_total || 0;
  const completed = campaign.calls_completed || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Campaigns', '/campaigns'], [campaign.name, `/campaigns/detail?id=${campaignId}`]]} />

      <main className="container-mobile space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Header Section */}
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="mt-1 text-sm text-gray-600">Campaign ID: {campaign.id}</p>
            </div>
            <span className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
              {campaign.status}
            </span>
          </div>

          {/* Description */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            {editingDescription ? (
              <div className="mt-2 space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveDescription}
                    disabled={actionLoading}
                    className="px-3 py-2 text-sm"
                  >
                    {actionLoading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingDescription(false);
                      setDescription(campaign.description || '');
                    }}
                    disabled={actionLoading}
                    className="px-3 py-2 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => campaign.status === 'draft' && setEditingDescription(true)}
                className={`mt-2 rounded-lg border border-gray-200 p-3 ${campaign.status === 'draft' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                <p className="text-gray-700">{campaign.description || <span className="text-gray-500 italic">No description</span>}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Stats Section */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card className="space-y-1">
            <p className="text-sm text-gray-600">Prospects</p>
            <p className="text-2xl font-bold text-gray-900">{campaign.prospect_count || 0}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-sm text-gray-600">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900">{completed}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-sm text-gray-600">Progress</p>
            <p className="text-2xl font-bold text-green-600">{progress}%</p>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Call Progress</p>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 text-center">{completed} of {total} calls completed</p>
        </Card>

        {/* Timeline */}
        <Card className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Timeline</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Created:</span>
              <span className="font-medium text-gray-900">{new Date(campaign.created_at).toLocaleString()}</span>
            </div>
            {campaign.started_at && (
              <div className="flex justify-between">
                <span>Started:</span>
                <span className="font-medium text-gray-900">{new Date(campaign.started_at).toLocaleString()}</span>
              </div>
            )}
            {campaign.ended_at && (
              <div className="flex justify-between">
                <span>Ended:</span>
                <span className="font-medium text-gray-900">{new Date(campaign.ended_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <Card className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Actions</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {campaign.status === 'draft' && (
              <>
                <Button 
                  variant="primary" 
                  onClick={handleStartCampaign}
                  disabled={actionLoading}
                  fullWidth
                >
                  {actionLoading ? 'Starting...' : 'Start Campaign'}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleDeleteCampaign}
                  disabled={actionLoading}
                  fullWidth
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
            {campaign.status === 'running' && (
              <Button 
                variant="secondary" 
                onClick={handlePauseCampaign}
                disabled={actionLoading}
                fullWidth
              >
                {actionLoading ? 'Pausing...' : 'Pause Campaign'}
              </Button>
            )}
            {campaign.status === 'paused' && (
              <>
                <Button 
                  variant="primary" 
                  onClick={handleResumeCampaign}
                  disabled={actionLoading}
                  fullWidth
                >
                  {actionLoading ? 'Resuming...' : 'Resume Campaign'}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleStopCampaign}
                  disabled={actionLoading}
                  fullWidth
                >
                  {actionLoading ? 'Stopping...' : 'Stop Campaign'}
                </Button>
              </>
            )}
            {(campaign.status === 'running' || campaign.status === 'paused') && (
              <Button 
                variant="secondary" 
                onClick={handleStopCampaign}
                disabled={actionLoading}
                fullWidth
              >
                {actionLoading ? 'Stopping...' : 'Stop Campaign'}
              </Button>
            )}
          </div>
        </Card>

        {/* Back Button */}
        <div className="pt-4">
          <Button 
            variant="secondary" 
            onClick={() => window.location.href = '/campaigns'}
            fullWidth
          >
            Back to Campaigns
          </Button>
        </div>
      </main>
    </div>
  );
}
