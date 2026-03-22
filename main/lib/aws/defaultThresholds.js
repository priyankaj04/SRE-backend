'use strict';

// Default alert threshold templates per AWS service.
// These are seeded into alert_thresholds when a resource is first synced.
// Users can modify threshold_value, operator, evaluation_periods, and period.

const DEFAULT_THRESHOLDS = {
  ec2: [
    {
      metric_name: 'CPUUtilization',
      operator: 'GreaterThanThreshold',
      threshold_value: 70,         // percent
      evaluation_periods: 2,
      period: 300,
    },
    {
      metric_name: 'NetworkIn',
      operator: 'GreaterThanThreshold',
      threshold_value: 100000000,  // 100 MB in bytes
      evaluation_periods: 2,
      period: 300,
    },
    {
      metric_name: 'NetworkOut',
      operator: 'GreaterThanThreshold',
      threshold_value: 100000000,  // 100 MB in bytes
      evaluation_periods: 2,
      period: 300,
    },
  ],

  rds: [
    {
      metric_name: 'CPUUtilization',
      operator: 'GreaterThanThreshold',
      threshold_value: 75,         // percent
      evaluation_periods: 2,
      period: 300,
    },
    {
      metric_name: 'FreeStorageSpace',
      operator: 'LessThanThreshold',
      threshold_value: 5368709120, // 5 GB in bytes
      evaluation_periods: 1,
      period: 300,
    },
    {
      metric_name: 'DatabaseConnections',
      operator: 'GreaterThanThreshold',
      threshold_value: 100,
      evaluation_periods: 2,
      period: 300,
    },
  ],

  lambda: [
    {
      metric_name: 'Errors',
      operator: 'GreaterThanThreshold',
      threshold_value: 5,          // error count per period
      evaluation_periods: 1,
      period: 300,
    },
    {
      metric_name: 'Throttles',
      operator: 'GreaterThanThreshold',
      threshold_value: 10,
      evaluation_periods: 1,
      period: 300,
    },
  ],

  elb: [
    {
      metric_name: 'HTTPCode_ELB_5XX_Count',
      operator: 'GreaterThanThreshold',
      threshold_value: 10,         // 5xx responses per period
      evaluation_periods: 1,
      period: 300,
    },
  ],

  // S3 — no applicable real-time CloudWatch alarms
};

module.exports = { DEFAULT_THRESHOLDS };
