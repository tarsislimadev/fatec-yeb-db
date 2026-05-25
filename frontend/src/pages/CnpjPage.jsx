import { useState } from 'react';
import { Header } from '../components/Header';
import { Alert, Button, Card, Loading } from '../components/common';
import {
  getCnpjImportJob,
  getCnpjReprocessJob,
  importCnpjs,
  lookupCnpj,
  runCnpjReprocess,
} from '../services/api';

export function CnpjPage() {
  const [lookupCnpjInput, setLookupCnpjInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [loadingLookup, setLoadingLookup] = useState(false);

  const [batchInput, setBatchInput] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [batchError, setBatchError] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);

  const [jobId, setJobId] = useState('');
  const [jobResult, setJobResult] = useState(null);
  const [jobError, setJobError] = useState('');
  const [loadingJob, setLoadingJob] = useState(false);

  const [reprocessPriority, setReprocessPriority] = useState('P2');
  const [reprocessLimit, setReprocessLimit] = useState(50);
  const [reprocessResult, setReprocessResult] = useState(null);
  const [reprocessJobId, setReprocessJobId] = useState('');
  const [reprocessJobResult, setReprocessJobResult] = useState(null);
  const [reprocessError, setReprocessError] = useState('');
  const [loadingReprocess, setLoadingReprocess] = useState(false);

  async function handleLookup(e) {
    e.preventDefault();
    setLookupError('');
    setLookupResult(null);
    setLoadingLookup(true);
    try {
      const result = await lookupCnpj(lookupCnpjInput);
      setLookupResult(result);
    } catch (err) {
      setLookupError(err.response?.data?.error?.message || 'Failed to lookup CNPJ');
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleBatchImport(e) {
    e.preventDefault();
    setBatchError('');
    setBatchResult(null);
    setLoadingBatch(true);
    try {
      const cnpjs = batchInput
        .split(/\s|,|;/)
        .map((value) => value.trim())
        .filter(Boolean);
      if (cnpjs.length === 0) {
        setBatchError('Provide at least one CNPJ');
        setLoadingBatch(false);
        return;
      }
      const result = await importCnpjs(cnpjs);
      setBatchResult(result);
      setJobId(result.job_id);
    } catch (err) {
      setBatchError(err.response?.data?.error?.message || 'Failed to import CNPJs');
    } finally {
      setLoadingBatch(false);
    }
  }

  async function handleFetchJob(e) {
    e.preventDefault();
    setJobError('');
    setJobResult(null);
    setLoadingJob(true);
    try {
      const result = await getCnpjImportJob(jobId);
      setJobResult(result);
    } catch (err) {
      setJobError(err.response?.data?.error?.message || 'Failed to load job');
    } finally {
      setLoadingJob(false);
    }
  }

  async function handleReprocess(e) {
    e.preventDefault();
    setReprocessError('');
    setReprocessResult(null);
    setLoadingReprocess(true);
    try {
      const result = await runCnpjReprocess(reprocessPriority, { limit: reprocessLimit });
      setReprocessResult(result);
      setReprocessJobId(result.job_id);
    } catch (err) {
      setReprocessError(err.response?.data?.error?.message || 'Failed to run reprocess');
    } finally {
      setLoadingReprocess(false);
    }
  }

  async function handleFetchReprocessJob(e) {
    e.preventDefault();
    setReprocessError('');
    setReprocessJobResult(null);
    setLoadingReprocess(true);
    try {
      const result = await getCnpjReprocessJob(reprocessJobId);
      setReprocessJobResult(result);
    } catch (err) {
      setReprocessError(err.response?.data?.error?.message || 'Failed to load reprocess job');
    } finally {
      setLoadingReprocess(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['CNPJ', '/cnpj']]} />

      <main className="container-mobile grid gap-6">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Single CNPJ Lookup</h2>
          {lookupError && <Alert type="error" message={lookupError} onClose={() => setLookupError('')} />}
          <form onSubmit={handleLookup} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={lookupCnpjInput}
              onChange={(e) => setLookupCnpjInput(e.target.value)}
              placeholder="CNPJ (14 digits)"
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            />
            <Button type="submit" disabled={loadingLookup}>
              Lookup
            </Button>
          </form>
          {loadingLookup && <Loading />}
          {lookupResult && (
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(lookupResult, null, 2)}
            </pre>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Batch Import</h2>
          {batchError && <Alert type="error" message={batchError} onClose={() => setBatchError('')} />}
          <form onSubmit={handleBatchImport} className="grid gap-3">
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="Paste CNPJs separated by space, comma, or newline"
              className="min-h-[120px] rounded-md border border-gray-300 px-3 py-3"
            />
            <Button type="submit" disabled={loadingBatch}>
              Import
            </Button>
          </form>
          {loadingBatch && <Loading />}
          {batchResult && (
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(batchResult, null, 2)}
            </pre>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Import Job Status</h2>
          {jobError && <Alert type="error" message={jobError} onClose={() => setJobError('')} />}
          <form onSubmit={handleFetchJob} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Job ID"
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            />
            <Button type="submit" disabled={loadingJob}>
              Fetch
            </Button>
          </form>
          {loadingJob && <Loading />}
          {jobResult && (
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(jobResult, null, 2)}
            </pre>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Incremental Reprocess</h2>
          {reprocessError && <Alert type="error" message={reprocessError} onClose={() => setReprocessError('')} />}
          <form onSubmit={handleReprocess} className="grid gap-3 sm:grid-cols-3">
            <select
              value={reprocessPriority}
              onChange={(e) => setReprocessPriority(e.target.value)}
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            >
              <option value="P1">P1 (daily)</option>
              <option value="P2">P2 (twice/week)</option>
              <option value="P3">P3 (weekly)</option>
            </select>
            <input
              type="number"
              value={reprocessLimit}
              onChange={(e) => setReprocessLimit(e.target.value)}
              placeholder="Limit"
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            />
            <Button type="submit" disabled={loadingReprocess}>
              Run
            </Button>
          </form>
          {loadingReprocess && <Loading />}
          {reprocessResult && (
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(reprocessResult, null, 2)}
            </pre>
          )}

          <form onSubmit={handleFetchReprocessJob} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={reprocessJobId}
              onChange={(e) => setReprocessJobId(e.target.value)}
              placeholder="Reprocess Job ID"
              className="min-h-[44px] rounded-md border border-gray-300 px-3 py-3"
            />
            <Button type="submit" disabled={loadingReprocess}>
              Fetch
            </Button>
          </form>
          {reprocessJobResult && (
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(reprocessJobResult, null, 2)}
            </pre>
          )}
        </Card>
      </main>
    </div>
  );
}
