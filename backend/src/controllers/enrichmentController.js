import { db } from '../db/index.js';

function normalizeCnpj(input) {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 14) return null;
  return digits;
}

export async function enrichPhone(req, res) {
  const phoneId = req.params.id;
  const { cnpj } = req.body || {};

  const normalized = normalizeCnpj(cnpj);
  if (!normalized) {
    return res.status(400).json({ error: 'Invalid CNPJ format. Expect 14 digits.' });
  }

  // Verify phone exists
  const phoneResult = await db.query('SELECT id FROM phones WHERE id = $1', [phoneId]);
  if (phoneResult.rowCount === 0) {
    return res.status(404).json({ error: 'Phone not found' });
  }

  // Create job and job item atomically
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const jobRes = await client.query(
      `INSERT INTO enrichment_jobs(type, status, total_items, processed_items, failed_items)
       VALUES($1, $2, $3, $4, $5) RETURNING id`,
      ['single', 'pending', 1, 0, 0]
    );

    const jobId = jobRes.rows[0].id;

    await client.query(
      `INSERT INTO enrichment_job_items(job_id, phone_id, cnpj, status)
       VALUES($1, $2, $3, $4)`,
      [jobId, phoneId, normalized, 'pending']
    );

    await client.query('COMMIT');

    return res.status(202).json({ job_id: jobId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create enrichment job:', err.message);
    return res.status(500).json({ error: 'Failed to create enrichment job' });
  } finally {
    client.release();
  }
}
