import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Alert, Button, Card, Loading } from '../components/common';
import { getReviewQueue } from '../services/api';

export function ReviewQueuePage() {
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [filters, page]);

  async function fetchReviews() {
    setLoading(true);
    setError('');
    try {
      const result = await getReviewQueue({
        page,
        page_size: 10,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
      });
      setReviews(result.data || []);
      setMeta(result.meta || null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Review Queue', '/reviews']]} />

      <main className="container-mobile">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <Card className="mb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            >
              <option value="">All Priority</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </div>
        </Card>

        {loading ? (
          <Loading />
        ) : reviews.length === 0 ? (
          <Card className="text-center py-8 text-slate-500">No review items found</Card>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:shadow-md transition">
                <a href={`/reviews/detail?id=${review.id}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{review.reason_code}</p>
                      <p className="text-lg font-semibold text-slate-900">{review.entity_type}</p>
                      <p className="text-xs text-slate-400">{review.cnpj || review.entity_id}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">{review.priority}</span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{review.status}</span>
                    </div>
                  </div>
                </a>
              </Card>
            ))}
          </div>
        )}

        {meta && meta.total_pages > 1 && (
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              variant="secondary"
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-center text-sm text-slate-600">
              Page {meta.page} of {meta.total_pages}
            </span>
            <Button
              onClick={() => setPage(Math.min(meta.total_pages, page + 1))}
              disabled={page === meta.total_pages}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
