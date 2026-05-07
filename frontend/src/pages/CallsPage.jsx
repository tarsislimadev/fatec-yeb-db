import React from 'react';
import { Header } from '../components/Header';
import { getCalls, retryCall } from '../services/api';
import { Card, Button } from '../components/common';

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  dialing: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-yellow-100 text-yellow-800',
};

export function CallsPage() {
  const [calls, setCalls] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [retryCalls, setRetryCalls] = React.useState(new Set());

  const fetchCalls = React.useCallback(async () => {
    try {
      setLoading(true);
      const filters = statusFilter ? { status: statusFilter } : {};
      const data = await getCalls(page, 20, filters);
      setCalls(Array.isArray(data) ? data : data.calls || []);
      setTotalPages(data.meta?.total_pages || 1);
    } catch (err) {
      console.error('Error fetching calls:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  React.useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleRetryCall = async (callId) => {
    try {
      setRetryCalls((prev) => new Set(prev).add(callId));
      await retryCall(callId);
      // Refresh the calls list
      await fetchCalls();
    } catch (err) {
      console.error('Error retrying call:', err);
      setError(err.message);
    } finally {
      setRetryCalls((prev) => {
        const newSet = new Set(prev);
        newSet.delete(callId);
        return newSet;
      });
    }
  };

  if (loading && calls.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Calls', '/calls']]} />
        <main className="container-mobile">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading calls...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Calls', '/calls']]} />

      <main className="container-mobile space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Header with Filters */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
            <a
              href="/calls/dashboard"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Dashboard →
            </a>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="dialing">Dialing</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Calls List */}
        {calls.length > 0 ? (
          <>
            {/* Mobile Cards */}
            <div className="grid gap-3 md:hidden">
              {calls.map((call) => (
                <Card key={call.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{call.phone_number}</p>
                      <p className="text-xs text-gray-600">ID: {call.id}</p>
                    </div>
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[call.status]}`}>
                      {call.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-700">Duration:</span> {call.duration_seconds ? `${call.duration_seconds}s` : '—'}</p>
                    <p><span className="font-medium text-gray-700">Dialed:</span> {call.dialed_at ? new Date(call.dialed_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a
                      href={`/calls/detail?id=${call.id}`}
                      className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View
                    </a>
                    {call.status === 'failed' && (
                      <button
                        onClick={() => handleRetryCall(call.id)}
                        disabled={retryCalls.has(call.id)}
                        className="flex-1 rounded-md bg-orange-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        {retryCalls.has(call.id) ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Dialed At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {calls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {call.phone_number}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[call.status]}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {call.duration_seconds ? `${call.duration_seconds}s` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {call.dialed_at ? new Date(call.dialed_at).toLocaleString() : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <a
                          href={`/calls/detail?id=${call.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </a>
                        {call.status === 'failed' && (
                          <>
                            {' | '}
                            <button
                              onClick={() => handleRetryCall(call.id)}
                              disabled={retryCalls.has(call.id)}
                              className="text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                            >
                              {retryCalls.has(call.id) ? 'Retrying...' : 'Retry'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Card className="text-center py-12">
            <p className="text-gray-600">No calls found</p>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
            >
              Previous
            </button>
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
