import React from 'react';
import { Header } from '../components/Header';
import { getCallDashboard, getCalls } from '../services/api';
import { Card } from '../components/common';

export function CallCenterDashboardPage() {
  const [metrics, setMetrics] = React.useState(null);
  const [recentCalls, setRecentCalls] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchDashboard = React.useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, callsData] = await Promise.all([
        getCallDashboard(),
        getCalls(1, 10, { sort: 'dialed_at', order: 'desc' }),
      ]);
      setMetrics(dashboardData);
      setRecentCalls(Array.isArray(callsData) ? callsData : callsData.calls || []);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchDashboard().finally(() => setRefreshing(false));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Call Center', '/calls/dashboard']]} />
        <main className="container-mobile">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const successRate = metrics?.success_rate ?? 0;
  const avgDuration = metrics?.avg_duration_seconds ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Call Center', '/calls/dashboard']]} />

      <main className="container-mobile space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Call Center Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Real-time voice calling metrics</p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboard().finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-600">Total Calls</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {metrics?.calls_total ?? 0}
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">✓ {metrics?.calls_completed ?? 0}</span>
              <span className="text-red-600">✗ {metrics?.calls_failed ?? 0}</span>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-gray-600">Success Rate</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{successRate.toFixed(1)}%</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-gray-600">Avg Duration</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {avgDuration > 0 ? `${Math.round(avgDuration)}s` : '—'}
            </p>
            <p className="mt-2 text-xs text-gray-500">per call</p>
          </Card>

          <Card>
            <p className="text-sm text-gray-600">Opt-Outs Today</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {metrics?.opt_outs_today ?? 0}
            </p>
            <p className="mt-2 text-xs text-gray-500">phones suppressed</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Campaigns */}
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
            {metrics?.active_campaigns && metrics.active_campaigns.length > 0 ? (
              <div className="space-y-3">
                {metrics.active_campaigns.map((campaign) => {
                  const total = campaign.calls_total || 0;
                  const completed = campaign.calls_completed || 0;
                  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                  
                  return (
                    <div key={campaign.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <a
                          href={`/campaigns/detail?id=${campaign.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          {campaign.name}
                        </a>
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          campaign.status === 'running'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{completed}/{total}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No active campaigns</p>
            )}
          </Card>

          {/* Flagged Transcripts Alert */}
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Alerts & Actions</h2>
            <div className="space-y-3">
              {metrics?.flagged_transcripts_count > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-yellow-900">Transcripts Pending Review</p>
                      <p className="text-sm text-yellow-800">{metrics.flagged_transcripts_count} transcripts flagged for manual review</p>
                    </div>
                  </div>
                  <a
                    href="/transcripts"
                    className="mt-2 inline-block text-sm font-medium text-yellow-700 hover:text-yellow-900"
                  >
                    Review Now →
                  </a>
                </div>
              )}

              {metrics?.calls_pending > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-blue-900">Calls In Queue</p>
                      <p className="text-sm text-blue-800">{metrics.calls_pending} calls pending execution</p>
                    </div>
                  </div>
                  <a
                    href="/calls"
                    className="mt-2 inline-block text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    View Queue →
                  </a>
                </div>
              )}

              {metrics?.flagged_transcripts_count === 0 && metrics?.calls_pending === 0 && (
                <p className="text-sm text-gray-600 py-4 text-center">All systems operating normally</p>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Calls */}
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
          {recentCalls.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Phone</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Duration</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Dialed</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                        {call.phone_number || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          call.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : call.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : call.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                        {call.duration_seconds ? `${call.duration_seconds}s` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600 text-xs">
                        {call.dialed_at ? new Date(call.dialed_at).toLocaleString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <a
                          href={`/calls/detail?id=${call.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600 py-4 text-center">No recent calls</p>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          <a
            href="/campaigns"
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
          >
            Manage Campaigns
          </a>
          <a
            href="/calls"
            className="flex-1 rounded-lg bg-slate-200 px-4 py-3 text-center font-medium text-slate-800 hover:bg-slate-300"
          >
            View All Calls
          </a>
        </div>
      </main>
    </div>
  );
}
