import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Alert, Button, Card, Loading } from '../components/common';
import {
  createPrimaryResearchAttempt,
  getPrimaryResearchTask,
  updatePrimaryResearchTask,
} from '../services/api';
import { getQueryParam } from '../services/window';

export function PrimaryResearchDetailPage() {
  const taskId = getQueryParam('id');
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateForm, setUpdateForm] = useState({ status: '', consent_status: '' });
  const [attemptForm, setAttemptForm] = useState({ channel_type: 'call', outcome: 'no_answer', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  async function fetchTask() {
    if (!taskId) return;
    setLoading(true);
    setError('');
    try {
      const result = await getPrimaryResearchTask(taskId);
      setTask(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {};
      if (updateForm.status) payload.status = updateForm.status;
      if (updateForm.consent_status) payload.consent_status = updateForm.consent_status;
      const updated = await updatePrimaryResearchTask(taskId, payload);
      setTask(updated);
      setUpdateForm({ status: '', consent_status: '' });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  }

  async function handleAttempt(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createPrimaryResearchAttempt(taskId, attemptForm);
      setAttemptForm({ channel_type: 'call', outcome: 'no_answer', notes: '' });
      await fetchTask();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record attempt');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Primary Research', '/primary-research'], ['Detail', `/primary-research/detail?id=${taskId}`]]} />

      <main className="container-mobile">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {loading ? (
          <Loading />
        ) : task ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Task</h2>
              <div className="grid gap-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-800">CNPJ:</span> {task.cnpj || '-'}</p>
                <p><span className="font-medium text-slate-800">Priority:</span> {task.priority}</p>
                <p><span className="font-medium text-slate-800">Status:</span> {task.status}</p>
                <p><span className="font-medium text-slate-800">Reason:</span> {task.reason_code}</p>
              </div>

              <h3 className="mt-6 text-base font-semibold text-slate-900">Attempts</h3>
              <div className="mt-3 grid gap-3">
                {(task.attempts || []).map((attempt) => (
                  <div key={attempt.id} className="rounded-md border border-slate-200 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">{attempt.channel_type} · {attempt.outcome}</p>
                    <p>{new Date(attempt.attempted_at).toLocaleString()}</p>
                    {attempt.notes && <p className="mt-1">{attempt.notes}</p>}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Update Task</h2>
              <form onSubmit={handleUpdate} className="grid gap-3">
                <select
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="">Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="paused">Paused</option>
                  <option value="escalated">Escalated</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={updateForm.consent_status}
                  onChange={(e) => setUpdateForm({ ...updateForm, consent_status: e.target.value })}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="">Consent Status</option>
                  <option value="granted">Granted</option>
                  <option value="revoked">Revoked</option>
                  <option value="unknown">Unknown</option>
                </select>
                <Button type="submit" disabled={saving}>
                  Save
                </Button>
              </form>

              <h2 className="mt-6 mb-3 text-lg font-semibold text-slate-900">Record Attempt</h2>
              <form onSubmit={handleAttempt} className="grid gap-3">
                <select
                  value={attemptForm.channel_type}
                  onChange={(e) => setAttemptForm({ ...attemptForm, channel_type: e.target.value })}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
                <select
                  value={attemptForm.outcome}
                  onChange={(e) => setAttemptForm({ ...attemptForm, outcome: e.target.value })}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="answered">Answered</option>
                  <option value="no_answer">No Answer</option>
                  <option value="wrong_number">Wrong Number</option>
                  <option value="opted_out">Opted Out</option>
                  <option value="failed">Failed</option>
                </select>
                <textarea
                  value={attemptForm.notes}
                  onChange={(e) => setAttemptForm({ ...attemptForm, notes: e.target.value })}
                  placeholder="Notes"
                  className="min-h-[96px] rounded-md border border-gray-300 px-3 py-3"
                />
                <Button type="submit" disabled={saving}>
                  Add Attempt
                </Button>
              </form>
            </Card>
          </div>
        ) : (
          <Card className="text-center text-slate-500">Task not found</Card>
        )}
      </main>
    </div>
  );
}
