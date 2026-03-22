'use strict';

/**
 * Incident routes — view triggered alarm incidents for a resource.
 *
 * Purpose: Read-only list of incidents created when CloudWatch alarms fire via SNS webhook.
 *
 * GET /cloud-accounts/:accountId/resources/:resourceId/incidents
 *     Input: none | Response: { status, data: incident[] }
 */

const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware');
const db = require('../db');
const { listIncidents } = require('../service/incident');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function verifyAccountOwnership(req, res, next) {
  const account = await db('cloud_accounts')
    .where({ id: req.params.accountId })
    .whereNull('deleted_at')
    .first();

  if (!account) return res.status(404).json({ status: 0, error: 'Cloud account not found.' });

  const membership = await db('org_members')
    .where({ org_id: account.org_id, user_id: req.user.id })
    .first();

  if (!membership) return res.status(403).json({ status: 0, error: 'Access denied.' });

  req.cloudAccount = account;
  next();
}

// GET /cloud-accounts/:accountId/resources/:resourceId/incidents
router.get(
  '/',
  authenticate,
  asyncHandler(verifyAccountOwnership),
  asyncHandler(async (req, res) => {
    const { resourceId } = req.params;
    console.log(`[route] GET /incidents  resourceId=${resourceId}`);

    const incidents = await listIncidents(resourceId, req.cloudAccount.org_id);
    res.status(200).json({ status: 1, data: incidents });
  })
);

module.exports = router;
