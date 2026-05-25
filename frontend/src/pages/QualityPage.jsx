import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Alert, Card, Loading } from '../components/common';
import { getQualityAlerts, getQualityMetrics } from '../services/api';

export function QualityPage() {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    setLoading(true);
    setError('');
    try {
      const [metricsData, alertsData] = await Promise.all([
        getQualityMetrics(),
        getQualityAlerts(),
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData.alerts || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load quality data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Quality', '/quality']]} />

      <main className="container-mobile">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {loading ? (
          <Loading />
        ) : metrics ? (
          <div className="grid gap-6">
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Alerts</h2>
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500">No alerts triggered.</p>
              ) : (
                <div className="grid gap-2">
                  {alerts.map((alert) => (
                    <Alert
                      key={alert.code}
                      type="warning"
                      message={`${alert.message} (value: ${alert.value?.toFixed ? alert.value.toFixed(2) : alert.value})`}
                    />
                  ))}
                </div>
              )}
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="text-sm font-semibold text-slate-700">Business completeness</h3>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {metrics.business_completeness_rate !== null
                    ? `${(metrics.business_completeness_rate * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-700">Contact completeness</h3>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {metrics.contact_completeness_rate !== null
                    ? `${(metrics.contact_completeness_rate * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-700">Reliability score</h3>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {metrics.reliability_score !== null ? metrics.reliability_score.toFixed(2) : 'N/A'}
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-700">Conflict-free rate</h3>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {metrics.conflict_free_rate !== null
                    ? `${(metrics.conflict_free_rate * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-700">Expired validation rate</h3>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {metrics.expired_rate !== null ? `${(metrics.expired_rate * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-slate-700">Valid phone rate</h3>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {metrics.phone_valid_rate !== null ? `${(metrics.phone_valid_rate * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </Card>
            </div>

            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Outreach by channel</h2>
              <div className="grid gap-2 text-sm text-slate-600">
                {(metrics.outreach_by_channel || []).map((row) => (
                  <div key={row.channel_type} className="flex justify-between">
                    <span>{row.channel_type}</span>
                    <span>{row.answered}/{row.total} answered</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <Card className="text-center text-slate-500">No data available</Card>
        )}
      </main>
    </div>
  );
}
