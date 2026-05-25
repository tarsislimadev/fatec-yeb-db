import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Alert, Button, Card, Loading } from '../components/common';
import { getReviewDetail, updateReviewItem } from '../services/api';
import { getQueryParam } from '../services/window';

export function ReviewDetailPage() {
  const reviewId = getQueryParam('id');
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    resolution_status: '',
    resolution_notes: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReview();
  }, [reviewId]);

  async function fetchReview() {
    if (!reviewId) return;
    setLoading(true);
    setError('');
    try {
      const result = await getReviewDetail(reviewId);
      setReview(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load review item');
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
      Object.entries(form).forEach(([key, value]) => {
        if (value) payload[key] = value;
      });
      const updated = await updateReviewItem(reviewId, payload);
      setReview(updated);
      setForm({ status: '', priority: '', assigned_to: '', resolution_status: '', resolution_notes: '', note: '' });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update review');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Review Queue', '/reviews'], ['Detail', `/reviews/detail?id=${reviewId}`]]} />

      <main className="container-mobile">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {loading ? (
          <Loading />
        ) : review ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Review Item</h2>
              <div className="grid gap-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-800">Entity:</span> {review.entity_type}</p>
                <p><span className="font-medium text-slate-800">CNPJ:</span> {review.cnpj || '-'}</p>
                <p><span className="font-medium text-slate-800">Reason:</span> {review.reason_code}</p>
                <p><span className="font-medium text-slate-800">Priority:</span> {review.priority}</p>
                <p><span className="font-medium text-slate-800">Status:</span> {review.status}</p>
              </div>

              <h3 className="mt-6 text-base font-semibold text-slate-900">Events</h3>
              <div className="mt-3 grid gap-3">
                {(review.events || []).map((event) => (
                  <div key={event.id} className="rounded-md border border-slate-200 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">{event.event_type}</p>
                    <p>{new Date(event.event_at).toLocaleString()}</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(event.details, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Update</h2>
              <form onSubmit={handleUpdate} className="grid gap-3">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="">Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_review">In Review</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="">Priority</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
                <input
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="Assign to (user UUID)"
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                />
                <select
                  value={form.resolution_status}
                  onChange={(e) => setForm({ ...form, resolution_status: e.target.value })}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
                >
                  <option value="">Resolution</option>
                  <option value="kept">Kept</option>
                  <option value="updated">Updated</option>
                  <option value="discarded">Discarded</option>
                  <option value="escalated">Escalated</option>
                </select>
                <textarea
                  value={form.resolution_notes}
                  onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })}
                  placeholder="Resolution notes"
                  className="min-h-[96px] rounded-md border border-gray-300 px-3 py-3"
                />
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Add internal note"
                  className="min-h-[96px] rounded-md border border-gray-300 px-3 py-3"
                />
                <Button type="submit" disabled={saving}>
                  Save
                </Button>
              </form>
            </Card>
          </div>
        ) : (
          <Card className="text-center text-slate-500">Review item not found</Card>
        )}
      </main>
    </div>
  );
}
