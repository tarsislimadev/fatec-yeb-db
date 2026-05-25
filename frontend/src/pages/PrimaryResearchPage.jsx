import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Alert, Button, Card, Loading } from '../components/common';
import { createPrimaryResearchTask, listPrimaryResearchTasks, scanPrimaryResearchTasks } from '../services/api';

export function PrimaryResearchPage() {
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState({ cnpj: '', business_id: '', priority: 'P2', reason_code: 'manual' });

  useEffect(() => {
    fetchTasks();
  }, [filters, page]);

  async function fetchTasks() {
    setLoading(true);
    setError('');
    try {
      const result = await listPrimaryResearchTasks({
        page,
        page_size: 10,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
      });
      setTasks(result.data || []);
      setMeta(result.meta || null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setError('');
    try {
      await scanPrimaryResearchTasks();
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to scan tasks');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await createPrimaryResearchTask({
        cnpj: manual.cnpj || undefined,
        business_id: manual.business_id || undefined,
        priority: manual.priority,
        reason_code: manual.reason_code,
      });
      setManual({ cnpj: '', business_id: '', priority: 'P2', reason_code: 'manual' });
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create task');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Primary Research', '/primary-research']]} />

      <main className="container-mobile">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="escalated">Escalated</option>
                <option value="completed">Completed</option>
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
            <Button onClick={handleScan} variant="secondary">
              Run Scan
            </Button>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Manual Task</h2>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <input
              value={manual.cnpj}
              onChange={(e) => setManual({ ...manual, cnpj: e.target.value })}
              placeholder="CNPJ"
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            />
            <input
              value={manual.business_id}
              onChange={(e) => setManual({ ...manual, business_id: e.target.value })}
              placeholder="Business ID (optional)"
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            />
            <select
              value={manual.priority}
              onChange={(e) => setManual({ ...manual, priority: e.target.value })}
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
            <select
              value={manual.reason_code}
              onChange={(e) => setManual({ ...manual, reason_code: e.target.value })}
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            >
              <option value="manual">Manual</option>
              <option value="missing_contact">Missing Contact</option>
              <option value="missing_role">Missing Role</option>
              <option value="stale_data">Stale Data</option>
              <option value="conflict">Conflict</option>
              <option value="invalid_contact">Invalid Contact</option>
              <option value="low_confidence">Low Confidence</option>
            </select>
            <Button type="submit" className="sm:col-span-2">
              Create Task
            </Button>
          </form>
        </Card>

        {loading ? (
          <Loading />
        ) : tasks.length === 0 ? (
          <Card className="text-center py-8 text-slate-500">No tasks found</Card>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition">
                <a href={`/primary-research/detail?id=${task.id}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{task.reason_code}</p>
                      <p className="text-lg font-semibold text-slate-900">{task.cnpj || task.business_id}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">{task.priority}</span>
                      <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{task.status}</span>
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
