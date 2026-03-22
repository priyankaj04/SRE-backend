'use strict';

const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./user'));
router.use('/orgs', require('./org'));
router.use('/cloud-accounts', require('./cloudAccount'));
router.use('/cloud-accounts/:accountId/resources', require('./resource'));
router.use('/cloud-accounts/:accountId/resources/:resourceId/thresholds', require('./threshold'));
router.use('/cloud-accounts/:accountId/resources/:resourceId/incidents', require('./incident'));
router.use('/webhooks', require('./webhook'));

module.exports = router;
