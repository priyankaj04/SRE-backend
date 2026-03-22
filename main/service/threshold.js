'use strict';

const db = require('../db');
const { DEFAULT_THRESHOLDS } = require('../lib/aws/defaultThresholds');

/**
 * Seed default thresholds for newly synced resources.
 * Uses onConflict ignore so user-modified thresholds are never overwritten on re-sync.
 *
 * @param {Array<{ id: string, service: string }>} resources
 */
async function seedDefaultThresholds(resources) {
  if (!resources || resources.length === 0) return;

  const now = new Date().toISOString();
  const rows = [];

  for (const resource of resources) {
    const defaults = DEFAULT_THRESHOLDS[resource.service];
    if (!defaults) continue; // S3 has no defaults

    for (const tpl of defaults) {
      rows.push({
        resource_id:        resource.id,
        metric_name:        tpl.metric_name,
        operator:           tpl.operator,
        threshold_value:    tpl.threshold_value,
        evaluation_periods: tpl.evaluation_periods,
        period:             tpl.period,
        is_default:         true,
        created_at:         now,
        updated_at:         now,
      });
    }
  }

  if (rows.length === 0) return;

  await db('alert_thresholds')
    .insert(rows)
    .onConflict(['resource_id', 'metric_name'])
    .ignore(); // never overwrite user-modified thresholds

  console.log(`[thresholds] seeded ${rows.length} defaults for ${resources.length} resources`);
}

/**
 * List all active thresholds for a resource.
 * Includes ownership check via org_id.
 *
 * @param {string} resourceId
 * @param {string} orgId
 */
async function listThresholds(resourceId, orgId) {
  const resource = await db('resources')
    .where({ id: resourceId, org_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!resource) {
    const err = new Error('Resource not found.');
    err.status = 404;
    throw err;
  }

  return db('alert_thresholds')
    .where({ resource_id: resourceId })
    .whereNull('deleted_at')
    .orderBy('metric_name', 'asc')
    .select('id', 'metric_name', 'operator', 'threshold_value', 'evaluation_periods',
            'period', 'alarm_name', 'sns_topic_arn', 'is_default', 'created_at', 'updated_at');
}

/**
 * Update a threshold with user-supplied values. Marks it as no longer a default.
 * Returns the full resource row (for alarm creation) and the updated threshold row.
 *
 * @param {string} thresholdId
 * @param {string} resourceId
 * @param {string} orgId
 * @param {{ threshold_value?, operator?, evaluation_periods?, period? }} updates
 * @param {string} userId
 */
async function updateThreshold(thresholdId, resourceId, orgId, updates, userId) {
  const resource = await db('resources')
    .where({ id: resourceId, org_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!resource) {
    const err = new Error('Resource not found.');
    err.status = 404;
    throw err;
  }

  const threshold = await db('alert_thresholds')
    .where({ id: thresholdId, resource_id: resourceId })
    .whereNull('deleted_at')
    .first();

  if (!threshold) {
    const err = new Error('Threshold not found.');
    err.status = 404;
    throw err;
  }

  // Only allow updating these fields
  const allowed = {};
  if (updates.threshold_value   !== undefined) allowed.threshold_value   = updates.threshold_value;
  if (updates.operator          !== undefined) allowed.operator          = updates.operator;
  if (updates.evaluation_periods !== undefined) allowed.evaluation_periods = updates.evaluation_periods;
  if (updates.period            !== undefined) allowed.period            = updates.period;

  const [updated] = await db('alert_thresholds')
    .where({ id: thresholdId })
    .update({ ...allowed, is_default: false, created_by: userId, updated_at: db.fn.now() })
    .returning('*');

  return { resource, threshold: updated };
}

/**
 * Soft-delete a threshold.
 * Returns resource and threshold rows (caller needs them to delete the CloudWatch alarm).
 *
 * @param {string} thresholdId
 * @param {string} resourceId
 * @param {string} orgId
 */
async function deleteThreshold(thresholdId, resourceId, orgId) {
  const resource = await db('resources')
    .where({ id: resourceId, org_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!resource) {
    const err = new Error('Resource not found.');
    err.status = 404;
    throw err;
  }

  const threshold = await db('alert_thresholds')
    .where({ id: thresholdId, resource_id: resourceId })
    .whereNull('deleted_at')
    .first();

  if (!threshold) {
    const err = new Error('Threshold not found.');
    err.status = 404;
    throw err;
  }

  await db('alert_thresholds')
    .where({ id: thresholdId })
    .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });

  return { resource, threshold };
}

/**
 * Store the CloudWatch alarm name + SNS topic ARN on a threshold record
 * after the alarm has been successfully created in AWS.
 *
 * @param {string} thresholdId
 * @param {string} alarmName
 * @param {string} snsTopicArn
 */
async function setAlarmInfo(thresholdId, alarmName, snsTopicArn) {
  await db('alert_thresholds')
    .where({ id: thresholdId })
    .update({ alarm_name: alarmName, sns_topic_arn: snsTopicArn, updated_at: db.fn.now() });
}

module.exports = { seedDefaultThresholds, listThresholds, updateThreshold, deleteThreshold, setAlarmInfo };
