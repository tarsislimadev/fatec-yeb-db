import React from 'react';
import { Header } from '../components/Header';
import { getCampaigns } from '../services/api';
import { Button, Card } from '../components/common';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  running: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
};

export function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function fetchCampaigns() {
      try {
        setLoading(true);
        const data = await getCampaigns();
        setCampaigns(Array.isArray(data) ? data : data.campaigns || []);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Campaigns', '/campaigns']]} />
        <main className="container-mobile">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading campaigns...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Campaigns', '/campaigns']]} />

      <nav className="container-mobile pb-0 pt-4">
        <div className="flex justify-end">
          <Button fullWidth className="sm:w-auto" onClick={() => (window.location.href = '/campaigns/new')}>
            New Campaign
          </Button>
        </div>
      </nav>

      <main className="container-mobile">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">Error: {error}</p>
          </div>
        )}

        {campaigns.length > 0 ? (
          <>
            {/* Mobile Cards */}
            <div className="grid gap-3 md:hidden">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{campaign.name}</p>
                      <p className="text-sm text-slate-500">ID {campaign.id}</p>
                    </div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p><span className="font-medium text-slate-700">Prospects:</span> {campaign.prospect_count || 0}</p>
                    <p><span className="font-medium text-slate-700">Calls:</span> {campaign.calls_completed || 0} / {campaign.calls_total || 0}</p>
                    {campaign.started_at && (
                      <p><span className="font-medium text-slate-700">Started:</span> {new Date(campaign.started_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <a href={`/campaigns/detail?id=${campaign.id}`} className="touch-target rounded-md px-3 text-sm font-medium text-blue-600 hover:bg-slate-100">
                    View
                  </a>
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Prospects
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {campaigns.map((campaign) => {
                    const total = campaign.calls_total || 0;
                    const completed = campaign.calls_completed || 0;
                    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {campaign.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {campaign.prospect_count || 0}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                              <div 
                                className="h-full bg-blue-600 transition-all" 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">{completed}/{total}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {campaign.started_at ? new Date(campaign.started_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <a href={`/campaigns/detail?id=${campaign.id}`} className="text-blue-500 hover:text-blue-700">
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No campaigns yet</p>
            <Button onClick={() => (window.location.href = '/campaigns/new')}>
              Create Your First Campaign
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
