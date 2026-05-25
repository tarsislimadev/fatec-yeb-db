import { db } from '../db/index.js';
import { successResponse, sendError } from '../utils/response.js';

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildAlerts(metrics) {
  const alerts = [];

  if (metrics.business_completeness_rate !== null && metrics.business_completeness_rate < 0.95) {
    alerts.push({
      code: 'business_completeness',
      severity: 'warning',
      message: 'Business completeness below 95%',
      value: metrics.business_completeness_rate,
      threshold: 0.95,
    });
  }

  if (metrics.contact_completeness_rate !== null && metrics.contact_completeness_rate < 0.85) {
    alerts.push({
      code: 'contact_completeness',
      severity: 'warning',
      message: 'Contact completeness below 85%',
      value: metrics.contact_completeness_rate,
      threshold: 0.85,
    });
  }

  if (metrics.reliability_score !== null && metrics.reliability_score < 0.8) {
    alerts.push({
      code: 'source_reliability',
      severity: 'warning',
      message: 'Source reliability below 0.80',
      value: metrics.reliability_score,
      threshold: 0.8,
    });
  }

  if (metrics.conflict_free_rate !== null && metrics.conflict_free_rate < 0.98) {
    alerts.push({
      code: 'conflict_rate',
      severity: 'warning',
      message: 'Conflict-free rate below 98%',
      value: metrics.conflict_free_rate,
      threshold: 0.98,
    });
  }

  if (metrics.expired_rate !== null && metrics.expired_rate > 0.1) {
    alerts.push({
      code: 'expired_records',
      severity: 'warning',
      message: 'Expired validation rate above 10%',
      value: metrics.expired_rate,
      threshold: 0.1,
    });
  }

  if (metrics.phone_valid_rate !== null && metrics.phone_valid_rate < 0.9) {
    alerts.push({
      code: 'phone_validity',
      severity: 'warning',
      message: 'Valid phone rate below 90%',
      value: metrics.phone_valid_rate,
      threshold: 0.9,
    });
  }

  return alerts;
}

async function computeQualityMetrics() {
  const businessCompleteness = await db.query(
      `SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN legal_name IS NOT NULL
          AND trade_name IS NOT NULL
          AND status_cnpj IS NOT NULL
          AND last_validated_at IS NOT NULL
        THEN 1 ELSE 0 END)::int AS complete
       FROM businesses
       WHERE deleted_at IS NULL`
    );

  const contactCompleteness = await db.query(
      `SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN (
          (
            EXISTS (
              SELECT 1 FROM phone_owners po
              JOIN phones p ON p.id = po.phone_id
              WHERE po.owner_type = 'business'
                AND po.owner_id = b.id
                AND po.end_date IS NULL
                AND p.status = 'active'
            )
            OR EXISTS (
              SELECT 1 FROM people_businesses pb
              JOIN people pe ON pe.id = pb.person_id
              WHERE pb.business_id = b.id
                AND pb.deleted_at IS NULL
                AND pe.email IS NOT NULL
            )
          )
          AND EXISTS (
            SELECT 1 FROM people_businesses pb
            JOIN people pe ON pe.id = pb.person_id
            WHERE pb.business_id = b.id
              AND pb.deleted_at IS NULL
              AND pe.role_title IS NOT NULL
          )
        ) THEN 1 ELSE 0 END)::int AS complete
       FROM businesses b
       WHERE b.deleted_at IS NULL`
    );

  const reliabilityScore = await db.query(
      `WITH latest AS (
        SELECT DISTINCT ON (cnpj) cnpj, provider, created_at
        FROM enrichment_results
        ORDER BY cnpj, created_at DESC
       )
       SELECT AVG(CASE provider
        WHEN 'brasilapi' THEN 1.0
        WHEN 'cnpja_open' THEN 0.9
        ELSE 0.7
       END) AS score
       FROM latest`
    );

  const conflictStats = await db.query(
      `WITH conflicts AS (
        SELECT cnpj,
          CASE WHEN COUNT(DISTINCT COALESCE(legal_name, '')) > 1
            OR COUNT(DISTINCT COALESCE(trade_name, '')) > 1
            OR COUNT(DISTINCT COALESCE(status, '')) > 1
          THEN 1 ELSE 0 END AS has_conflict
        FROM enrichment_results
        GROUP BY cnpj
      )
      SELECT COUNT(*)::int AS total,
             SUM(has_conflict)::int AS conflicts
      FROM conflicts`
    );

  const freshnessStats = await db.query(
      `SELECT
        AVG(EXTRACT(EPOCH FROM (NOW() - last_validated_at)) / 86400.0) AS avg_age_days,
        SUM(CASE WHEN last_validated_at IS NULL
          OR last_validated_at < NOW() - INTERVAL '180 days'
        THEN 1 ELSE 0 END)::int AS expired,
        COUNT(*)::int AS total
      FROM businesses
      WHERE deleted_at IS NULL`
    );

  const phoneValidity = await db.query(
      `SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::int AS valid
       FROM phones
       WHERE deleted_at IS NULL`
    );

  const outreachStats = await db.query(
      `SELECT
        channel_type,
        COUNT(*)::int AS total,
        SUM(CASE WHEN outcome = 'answered' THEN 1 ELSE 0 END)::int AS answered
       FROM contact_attempts
       GROUP BY channel_type`
    );

  const businessTotal = businessCompleteness.rows[0]?.total || 0;
  const businessComplete = businessCompleteness.rows[0]?.complete || 0;
  const contactTotal = contactCompleteness.rows[0]?.total || 0;
  const contactComplete = contactCompleteness.rows[0]?.complete || 0;

  const conflictTotal = conflictStats.rows[0]?.total || 0;
  const conflictCount = conflictStats.rows[0]?.conflicts || 0;

  const freshnessTotal = freshnessStats.rows[0]?.total || 0;
  const freshnessExpired = freshnessStats.rows[0]?.expired || 0;

  const phoneTotal = phoneValidity.rows[0]?.total || 0;
  const phoneValid = phoneValidity.rows[0]?.valid || 0;

  return {
    business_completeness_rate: businessTotal ? businessComplete / businessTotal : null,
    contact_completeness_rate: contactTotal ? contactComplete / contactTotal : null,
    reliability_score: toNumber(reliabilityScore.rows[0]?.score),
    conflict_free_rate: conflictTotal ? (conflictTotal - conflictCount) / conflictTotal : null,
    avg_validation_age_days: toNumber(freshnessStats.rows[0]?.avg_age_days),
    expired_rate: freshnessTotal ? freshnessExpired / freshnessTotal : null,
    phone_valid_rate: phoneTotal ? phoneValid / phoneTotal : null,
    outreach_by_channel: outreachStats.rows,
  };
}

export async function getQualityMetrics(req, res) {
  try {
    const metrics = await computeQualityMetrics();
    return successResponse(res, metrics);
  } catch (error) {
    console.error('Quality metrics error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load quality metrics', {}, 500);
  }
}

export async function getQualityAlerts(req, res) {
  try {
    const metrics = await computeQualityMetrics();
    const alerts = buildAlerts(metrics);
    return successResponse(res, { alerts, generated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Quality alerts error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load quality alerts', {}, 500);
  }
}
