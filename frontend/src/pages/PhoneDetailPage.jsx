import { useState, useEffect } from 'react';
import {
  getPhoneDetail,
  addPhoneOwner,
  removePhoneOwner,
  getPeople,
  updatePhone,
  updatePhoneConsent,
  createContactAttempt,
  getPhoneTimeline,
  getOutreachReport,
} from '../services/api';
import { Button, Card, Loading, Alert, Input } from '../components/common';
import { Header } from '../components/Header';
import { getQueryParam } from '../services/window';

const DEFAULT_CONSENT_FORM = {
  marketing_consent: 'unknown',
  transactional_consent: 'unknown',
  suppression_status: 'none',
  suppression_reason: '',
};

const DEFAULT_ATTEMPT_FORM = {
  channel_type: 'call',
  outcome: 'no_answer',
  attempted_at: '',
  notes: '',
};

export function PhoneDetailPage() {
  const id = getQueryParam('id');
  const [phone, setPhone] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState('');
  const [timelineError, setTimelineError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [newOwner, setNewOwner] = useState({
    owner_type: 'person',
    owner_id: '',
    relation_label: '',
    confidence_score: 100,
  });
  const [consentForm, setConsentForm] = useState(DEFAULT_CONSENT_FORM);
  const [attemptForm, setAttemptForm] = useState(DEFAULT_ATTEMPT_FORM);
  const [ownerError, setOwnerError] = useState('');
  const [consentError, setConsentError] = useState('');
  const [attemptError, setAttemptError] = useState('');

  useEffect(() => {
    fetchPeople();
  }, []);

  async function fetchPeople() {
    try {
      const result = await getPeople(1, 10000);
      setPeople(result.data?.people || []);
    } catch (err) {
      console.error('Failed to load people:', err);
    }
  }

  async function fetchPhone() {
    setLoading(true);
    try {
      const data = await getPhoneDetail(id);
      setPhone(data);
      setConsentForm({
        marketing_consent: data.marketing_consent || 'unknown',
        transactional_consent: data.transactional_consent || 'unknown',
        suppression_status: data.suppression_status || 'none',
        suppression_reason: data.suppression_reason || '',
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load phone');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimeline() {
    if (!id) {
      return;
    }

    setTimelineLoading(true);
    setTimelineError('');
    try {
      const data = await getPhoneTimeline(id);
      setTimeline(data.items || []);
    } catch (err) {
      setTimelineError(err.response?.data?.error?.message || 'Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    if (!id) {
      setError('Phone ID is required');
      setLoading(false);
      return;
    }

    fetchPhone();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'timeline' && id) {
      fetchTimeline();
    }
  }, [activeTab, id]);

  async function handleAddOwner(e) {
    e.preventDefault();
    setOwnerError('');

    if (!newOwner.owner_id) {
      setOwnerError('Please select a person');
      return;
    }

    setOwnerLoading(true);
    try {
      await addPhoneOwner(id, newOwner);
      setNewOwner({
        owner_type: 'person',
        owner_id: '',
        relation_label: '',
        confidence_score: 100,
      });
      setShowOwnerForm(false);
      setSuccess('Owner added successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchPhone();
    } catch (err) {
      setOwnerError(err.response?.data?.error?.message || 'Failed to add owner');
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleRemoveOwner(ownerRelationId) {
    if (!confirm('Are you sure you want to remove this owner?')) {
      return;
    }

    try {
      await removePhoneOwner(id, ownerRelationId);
      setSuccess('Owner removed successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchPhone();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to remove owner');
    }
  }

  async function handleTogglePhoneStatus() {
    const nextStatus = phone.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'active' ? 'enable' : 'disable';

    if (!confirm(`Are you sure you want to ${actionLabel} this phone?`)) {
      return;
    }

    try {
      await updatePhone(id, { status: nextStatus });
      setSuccess(`Phone ${nextStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
      await fetchPhone();
    } catch (err) {
      setError(err.response?.data?.error?.message || `Failed to ${actionLabel} phone`);
    }
  }

  async function handleConsentSubmit(e) {
    e.preventDefault();
    setConsentError('');
    setConsentLoading(true);

    try {
      await updatePhoneConsent(id, consentForm);
      setSuccess('Consent updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchPhone();
      await fetchTimeline();
    } catch (err) {
      setConsentError(err.response?.data?.error?.message || 'Failed to update consent');
    } finally {
      setConsentLoading(false);
    }
  }

  async function handleAttemptSubmit(e) {
    e.preventDefault();
    setAttemptError('');
    setAttemptLoading(true);

    try {
      await createContactAttempt(id, {
        ...attemptForm,
        attempted_at: attemptForm.attempted_at || undefined,
      });
      setSuccess('Contact attempt saved successfully');
      setTimeout(() => setSuccess(''), 3000);
      setAttemptForm(DEFAULT_ATTEMPT_FORM);
      await fetchPhone();
      await fetchTimeline();
    } catch (err) {
      setAttemptError(err.response?.data?.error?.message || 'Failed to save contact attempt');
    } finally {
      setAttemptLoading(false);
    }
  }

  async function handleDownloadReport() {
    setReportLoading(true);
    try {
      const csv = await getOutreachReport({ phone_id: id, format: 'csv' });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `outreach-report-${phone.e164_number.replace(/\+/g, '')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Report downloaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to download report');
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) return <Loading />;
  if (!phone) return <Alert type="error" message={error} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Phones', '/phones'], [phone.e164_number, `/phones/detail?id=${phone.id}`]]} />

      <main className="container-mobile">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{phone.e164_number}</h1>
            <p className="text-sm text-slate-600">
              Consent: {phone.marketing_consent || 'unknown'} · Suppression: {phone.suppression_status || 'none'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleTogglePhoneStatus}
              variant={phone.status === 'active' ? 'danger' : 'primary'}
              className="w-full sm:w-auto"
            >
              {phone.status === 'active' ? 'Disable Phone' : 'Enable Phone'}
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
          {['details', 'owners', 'timeline'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              className={`touch-target rounded-t-md px-4 text-sm font-medium capitalize transition ${activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'details' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-gray-600">E.164 Number</p>
                  <p className="mt-2 font-mono text-lg font-bold">{phone.e164_number}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="mt-2 font-semibold capitalize">{phone.type}</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="mt-2 font-semibold capitalize">{phone.status}</p>
                </div>
                <div className="rounded-lg bg-orange-50 p-4">
                  <p className="text-sm text-gray-600">Country Code</p>
                  <p className="mt-2 font-semibold">{phone.country_code}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="mt-2 text-sm">{new Date(phone.created_at).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="mt-2 text-sm">{new Date(phone.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <div className="grid gap-6">
              <Card>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">Consent & Suppression</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Phase 3
                  </span>
                </div>
                {consentError && <Alert type="error" message={consentError} onClose={() => setConsentError('')} />}

                {phone.suppression_status && phone.suppression_status !== 'none' && (
                  <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                    Suppression is active: {phone.suppression_status}
                    {phone.suppression_reason ? ` - ${phone.suppression_reason}` : ''}
                  </div>
                )}

                <form onSubmit={handleConsentSubmit} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Marketing consent</span>
                      <select
                        value={consentForm.marketing_consent}
                        onChange={(e) => setConsentForm({ ...consentForm, marketing_consent: e.target.value })}
                        className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="unknown">Unknown</option>
                        <option value="granted">Granted</option>
                        <option value="revoked">Revoked</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Transactional consent</span>
                      <select
                        value={consentForm.transactional_consent}
                        onChange={(e) => setConsentForm({ ...consentForm, transactional_consent: e.target.value })}
                        className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="unknown">Unknown</option>
                        <option value="granted">Granted</option>
                        <option value="revoked">Revoked</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Suppression status</span>
                      <select
                        value={consentForm.suppression_status}
                        onChange={(e) => setConsentForm({ ...consentForm, suppression_status: e.target.value })}
                        className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">None</option>
                        <option value="manual">Manual</option>
                        <option value="consent_revoked">Consent revoked</option>
                        <option value="opted_out">Opted out</option>
                      </select>
                    </label>
                    <Input
                      label="Suppression reason"
                      value={consentForm.suppression_reason}
                      onChange={(val) => setConsentForm({ ...consentForm, suppression_reason: val })}
                      placeholder="Optional reason for suppression"
                    />
                  </div>

                  <Button disabled={consentLoading} className="w-full">
                    {consentLoading ? 'Saving...' : 'Save Consent'}
                  </Button>
                </form>
              </Card>

              <Card>
                <h2 className="mb-4 text-xl font-bold">Log Contact Attempt</h2>
                {attemptError && <Alert type="error" message={attemptError} onClose={() => setAttemptError('')} />}
                <form onSubmit={handleAttemptSubmit} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Channel</span>
                      <select
                        value={attemptForm.channel_type}
                        onChange={(e) => setAttemptForm({ ...attemptForm, channel_type: e.target.value })}
                        className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="call">Call</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telegram">Telegram</option>
                        <option value="sms">SMS</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Outcome</span>
                      <select
                        value={attemptForm.outcome}
                        onChange={(e) => setAttemptForm({ ...attemptForm, outcome: e.target.value })}
                        className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="no_answer">No answer</option>
                        <option value="answered">Answered</option>
                        <option value="wrong_number">Wrong number</option>
                        <option value="failed">Failed</option>
                        <option value="opted_out">Opted out</option>
                      </select>
                    </label>
                  </div>

                  <Input
                    label="Attempted at"
                    type="datetime-local"
                    value={attemptForm.attempted_at}
                    onChange={(val) => setAttemptForm({ ...attemptForm, attempted_at: val })}
                  />

                  <Input
                    label="Notes"
                    value={attemptForm.notes}
                    onChange={(val) => setAttemptForm({ ...attemptForm, notes: val })}
                    placeholder="Optional context for this attempt"
                  />

                  <Button disabled={attemptLoading} className="w-full">
                    {attemptLoading ? 'Saving...' : 'Save Attempt'}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Timeline</h2>
                <p className="text-sm text-slate-600">Contact attempts, consent changes, and audit events</p>
              </div>
              <Button onClick={handleDownloadReport} disabled={reportLoading} variant="secondary" className="w-full sm:w-auto">
                {reportLoading ? 'Preparing report...' : 'Download CSV'}
              </Button>
            </div>

            {timelineError && <Alert type="error" message={timelineError} onClose={() => setTimelineError('')} />}

            {timelineLoading ? (
              <Loading />
            ) : timeline.length === 0 ? (
              <div className="rounded-lg bg-slate-50 px-4 py-8 text-center text-slate-600">
                No timeline events yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {timeline.map((item) => (
                  <div key={`${item.event_type}-${item.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          {item.event_type === 'contact_attempt' ? 'contact attempt' : 'audit event'}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.event_type === 'contact_attempt'
                            ? `${item.channel_type} · ${item.outcome}`
                            : item.action}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(item.event_at).toLocaleString()}</p>
                    </div>
                    {item.notes && <p className="mt-3 text-sm text-slate-600">{item.notes}</p>}
                    {item.details && <pre className="mt-3 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(item.details, null, 2)}</pre>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'owners' && (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Owners & Relations</h2>
              <Button
                onClick={() => setShowOwnerForm(!showOwnerForm)}
                className={`w-full sm:w-auto text-white ${showOwnerForm
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
              >
                {showOwnerForm ? 'Cancel' : 'Add Owner'}
              </Button>
            </div>

            {showOwnerForm && (
              <Card className="mb-4 border-2 border-blue-200">
                {ownerError && <Alert type="error" message={ownerError} onClose={() => setOwnerError('')} />}
                <form onSubmit={handleAddOwner}>
                  <div className="mb-3">
                    <label className="mb-2 block text-sm font-medium">Person</label>
                    <select
                      value={newOwner.owner_id}
                      onChange={(e) => setNewOwner({ ...newOwner, owner_type: 'person', owner_id: e.target.value })}
                      className="w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a person...</option>
                      {(people || []).map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name || person.name || 'Unnamed'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Relation Label (optional)"
                    value={newOwner.relation_label}
                    onChange={(val) => setNewOwner({ ...newOwner, relation_label: val })}
                    placeholder="e.g., personal, work, reception"
                  />

                  <Input
                    label="Confidence Score (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={newOwner.confidence_score}
                    onChange={(val) => setNewOwner({ ...newOwner, confidence_score: Math.min(100, Math.max(0, parseInt(val, 10) || 0)) })}
                  />

                  <Button disabled={ownerLoading} className="w-full">
                    {ownerLoading ? 'Adding...' : 'Add Owner'}
                  </Button>
                </form>
              </Card>
            )}

            {phone.owners && phone.owners.length > 0 ? (
              <div className="grid gap-3">
                {phone.owners.map((owner) => (
                  <Card key={owner.id} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Type: </span>
                        <span className="capitalize text-blue-600">{owner.owner_type}</span>
                      </p>
                      <p className="mt-2 break-all font-mono text-sm text-gray-600">{owner.owner_id}</p>
                      {owner.relation_label && (
                        <p className="mt-2 text-sm">
                          <span className="font-semibold text-gray-700">Label: </span>
                          <span className="text-gray-600">{owner.relation_label}</span>
                        </p>
                      )}
                      <p className="mt-2 text-sm">
                        <span className="font-semibold text-gray-700">Confidence: </span>
                        <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                          {owner.confidence_score}%
                        </span>
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveOwner(owner.id)}
                      variant="danger"
                      className="w-full text-sm sm:w-auto"
                    >
                      Remove
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-blue-50 py-12 text-center">
                <p className="text-lg text-gray-600">No owners assigned yet</p>
                <p className="mt-1 text-sm text-gray-500">Click "Add Owner" to assign a person to this phone number</p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}