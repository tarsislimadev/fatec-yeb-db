import React from 'react';
import { Header } from '../components/Header';
import { getCallDetail } from '../services/api';
import { Card } from '../components/common';

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  dialing: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-yellow-100 text-yellow-800',
};

const dispositionColors = {
  answered: 'text-green-700',
  no_answer: 'text-yellow-700',
  busy: 'text-orange-700',
  canceled: 'text-gray-700',
  failed: 'text-red-700',
};

export function CallDetailPage() {
  const [call, setCall] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const queryParams = new URLSearchParams(window.location.search);
  const callId = queryParams.get('id');

  React.useEffect(() => {
    async function fetchCall() {
      try {
        setLoading(true);
        const data = await getCallDetail(callId);
        setCall(data);
      } catch (err) {
        console.error('Error fetching call:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (callId) {
      fetchCall();
    }
  }, [callId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Calls', '/calls']]} />
        <main className="container-mobile">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading call details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header items={[['Yeb', '/'], ['Calls', '/calls']]} />
        <main className="container-mobile">
          <Card className="text-center py-12">
            <p className="text-gray-600">Call not found</p>
            <button
              onClick={() => (window.location.href = '/calls')}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Back to Calls
            </button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Calls', '/calls'], [call.phone_number || 'Call', `/calls/detail?id=${callId}`]]} />

      <main className="container-mobile space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Call Header */}
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600">Phone Number</p>
              <h1 className="text-3xl font-bold text-gray-900">{call.phone_number || 'Unknown'}</h1>
              <p className="mt-1 text-sm text-gray-600">Call ID: {call.id}</p>
            </div>
            <span className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${statusColors[call.status] || 'bg-gray-100 text-gray-800'}`}>
              {call.status}
            </span>
          </div>

          {/* Prospect Info */}
          {call.prospect && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700">Prospect</p>
              <a
                href={`/people/detail?id=${call.prospect.id}`}
                className="mt-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                {call.prospect.full_name}
              </a>
              {call.prospect.email && <p className="text-sm text-gray-600">{call.prospect.email}</p>}
            </div>
          )}
        </Card>

        {/* Call Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {call.duration_seconds ? `${call.duration_seconds}s` : '—'}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Attempts</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{(call.retry_count || 0) + 1}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Campaign</p>
            <p className="mt-2 text-sm font-semibold text-blue-600">
              {call.campaign ? (
                <a href={`/campaigns/detail?id=${call.campaign.id}`} className="hover:text-blue-700">
                  {call.campaign.name}
                </a>
              ) : (
                '—'
              )}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Dialed At</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {call.dialed_at ? new Date(call.dialed_at).toLocaleString() : '—'}
            </p>
          </Card>
        </div>

        {/* Call Outcome */}
        {call.outcome && (
          <Card className="space-y-3">
            <h2 className="font-semibold text-gray-900">Call Outcome</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Disposition:</span>
                <span className={`font-medium ${dispositionColors[call.outcome.disposition] || 'text-gray-700'}`}>
                  {call.outcome.disposition}
                </span>
              </div>
              {call.outcome.spoken_opt_out_flag && (
                <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                  <p className="font-medium text-red-900">🚫 Spoken Opt-Out Detected</p>
                  {call.outcome.opt_out_keywords && (
                    <p className="text-sm text-red-800 mt-1">
                      Keywords: {call.outcome.opt_out_keywords.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Session & Recording */}
        {call.session && (
          <Card className="space-y-3">
            <h2 className="font-semibold text-gray-900">Call Session</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Provider ID:</span>
                <span className="font-mono text-gray-900">{call.session.provider_id || '—'}</span>
              </div>
              {call.session.recording_url && (
                <div className="pt-2 border-t">
                  <p className="text-gray-600 mb-2">Recording:</p>
                  <audio controls className="w-full">
                    <source src={call.session.recording_url} type="audio/wav" />
                    Your browser does not support audio.
                  </audio>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Transcript */}
        {call.transcript && (
          <Card className="space-y-3">
            <h2 className="font-semibold text-gray-900">Transcript</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Confidence Score</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          call.transcript.confidence_score >= 70
                            ? 'bg-green-600'
                            : 'bg-yellow-600'
                        }`}
                        style={{ width: `${call.transcript.confidence_score}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold text-gray-900">{call.transcript.confidence_score}%</span>
                  </div>
                </div>
              </div>

              {call.transcript.flagged_for_review && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="font-medium text-yellow-900">⚠️ Flagged for Manual Review</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    {call.transcript.confidence_score < 70
                      ? 'Low confidence score'
                      : 'Potential opt-out keywords detected'}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Transcript Text:</p>
                <p className="text-gray-900 leading-relaxed">
                  {call.transcript.raw_text || <span className="italic text-gray-500">No transcript available</span>}
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  Status:{' '}
                  <span className={`font-medium ${
                    call.transcript.status === 'approved'
                      ? 'text-green-700'
                      : call.transcript.status === 'rejected'
                      ? 'text-red-700'
                      : 'text-yellow-700'
                  }`}>
                    {call.transcript.status}
                  </span>
                </p>
                {call.transcript.reviewed_by && (
                  <p className="mt-1">
                    Reviewed by: <span className="font-medium text-gray-900">{call.transcript.reviewed_by}</span>
                  </p>
                )}
              </div>
            </div>

            {call.transcript.status === 'pending' && (
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600 mb-3">This transcript is pending review:</p>
                <div className="flex gap-2">
                  <a
                    href={`/transcripts/detail?id=${call.transcript.id}`}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center font-medium text-white hover:bg-blue-700 text-sm"
                  >
                    Review Transcript
                  </a>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Timeline */}
        {call.timeline && call.timeline.length > 0 && (
          <Card className="space-y-4">
            <h2 className="font-semibold text-gray-900">Timeline</h2>
            <div className="space-y-3">
              {call.timeline.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1"></div>
                    {idx < call.timeline.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-200 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-medium text-gray-900">{event.type}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.details && (
                      <p className="text-sm text-gray-700 mt-1">{event.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Retry Attempts */}
        {call.retry_log && call.retry_log.length > 0 && (
          <Card className="space-y-3">
            <h2 className="font-semibold text-gray-900">Retry History</h2>
            <div className="space-y-2 text-sm">
              {call.retry_log.map((log, idx) => (
                <div key={idx} className="border-l-2 border-yellow-400 pl-3 py-1">
                  <p className="font-medium text-gray-900">Attempt {log.attempt_number}</p>
                  <p className="text-gray-600">{log.error_message}</p>
                  {log.next_retry_at && (
                    <p className="text-gray-500 text-xs mt-1">
                      Retry scheduled: {new Date(log.next_retry_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Back Button */}
        <button
          onClick={() => window.location.href = '/calls'}
          className="w-full rounded-lg bg-slate-200 px-4 py-3 font-medium text-slate-800 hover:bg-slate-300"
        >
          Back to Calls
        </button>
      </main>
    </div>
  );
}
