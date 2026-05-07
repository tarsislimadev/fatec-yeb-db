import React from 'react';
import { Header } from '../components/Header';
import { getFlaggedTranscripts, approveTranscript, rejectTranscript, confirmOptOut } from '../services/api';
import { Card, Button } from '../components/common';

export function TranscriptsPage() {
  const [transcripts, setTranscripts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const fetchTranscripts = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFlaggedTranscripts(page, 20);
      setTranscripts(Array.isArray(data) ? data : data.transcripts || []);
      setTotalPages(data.meta?.total_pages || 1);
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    fetchTranscripts();
  }, [fetchTranscripts]);

  const handleApprove = async (transcriptId) => {
    try {
      setActionLoading(transcriptId);
      await approveTranscript(transcriptId);
      await fetchTranscripts();
    } catch (err) {
      console.error('Error approving transcript:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (transcriptId) => {
    try {
      setActionLoading(transcriptId);
      await rejectTranscript(transcriptId, 'Rejected during review');
      await fetchTranscripts();
    } catch (err) {
      console.error('Error rejecting transcript:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmOptOut = async (transcriptId) => {
    if (!confirm('Confirm this opt-out? The phone will be permanently suppressed.')) {
      return;
    }

    try {
      setActionLoading(transcriptId);
      await confirmOptOut(transcriptId, 'Opt-out confirmed');
      await fetchTranscripts();
    } catch (err) {
      console.error('Error confirming opt-out:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && transcripts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Transcripts', '/transcripts']]} />
        <main className="container-mobile">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading transcripts...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Transcripts', '/transcripts']]} />

      <main className="container-mobile space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Header */}
        <Card>
          <h1 className="text-2xl font-bold text-gray-900">Transcript Review Queue</h1>
          <p className="mt-1 text-sm text-gray-600">
            {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''} pending review
          </p>
        </Card>

        {/* Transcripts List */}
        {transcripts.length > 0 ? (
          <div className="space-y-3">
            {transcripts.map((transcript) => (
              <Card key={transcript.id} className="space-y-4">
                {/* Top Row with confidence and phone */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{transcript.phone_number}</p>
                    <p className="text-sm text-gray-600">{transcript.prospect_name || 'Unknown Prospect'}</p>
                    <p className="text-xs text-gray-500 mt-1">Call ID: {transcript.call_id}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            transcript.confidence_score >= 70 ? 'bg-green-600' : 'bg-yellow-600'
                          }`}
                          style={{ width: `${transcript.confidence_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-12">
                        {transcript.confidence_score}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">confidence</p>
                  </div>
                </div>

                {/* Dialed At */}
                <div className="text-sm text-gray-600">
                  Dialed: {transcript.dialed_at ? new Date(transcript.dialed_at).toLocaleString() : '—'}
                </div>

                {/* Transcript Text */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Transcript:</p>
                  <p className="text-gray-900 leading-relaxed">
                    {transcript.raw_text || 'No transcript content'}
                  </p>
                </div>

                {/* Flags/Alerts */}
                {transcript.low_confidence && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <p className="font-medium text-yellow-900">⚠️ Low Confidence Score</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      This transcript may not be accurate ({transcript.confidence_score}% confidence)
                    </p>
                  </div>
                )}

                {transcript.opt_out_detected && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="font-medium text-red-900">🚫 Opt-Out Keywords Detected</p>
                    {transcript.opt_out_keywords && (
                      <p className="text-sm text-red-800 mt-1">
                        Keywords: {transcript.opt_out_keywords.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t sm:flex-row">
                  <a
                    href={`/calls/detail?id=${transcript.call_id}`}
                    className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                  >
                    View Call
                  </a>
                  {transcript.opt_out_detected && (
                    <button
                      onClick={() => handleConfirmOptOut(transcript.id)}
                      disabled={actionLoading === transcript.id}
                      className="flex-1 rounded-md bg-red-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === transcript.id ? 'Confirming...' : 'Confirm Opt-Out'}
                    </button>
                  )}
                  <button
                    onClick={() => handleApprove(transcript.id)}
                    disabled={actionLoading === transcript.id}
                    className="flex-1 rounded-md bg-green-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === transcript.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(transcript.id)}
                    disabled={actionLoading === transcript.id}
                    className="flex-1 rounded-md bg-slate-400 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-500 disabled:opacity-50"
                  >
                    {actionLoading === transcript.id ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-lg font-semibold text-gray-900">✓ All caught up!</p>
            <p className="mt-2 text-gray-600">No transcripts pending review at this time.</p>
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

        {/* Back to Dashboard */}
        <button
          onClick={() => (window.location.href = '/calls/dashboard')}
          className="w-full rounded-lg bg-slate-200 px-4 py-3 font-medium text-slate-800 hover:bg-slate-300"
      >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
}
