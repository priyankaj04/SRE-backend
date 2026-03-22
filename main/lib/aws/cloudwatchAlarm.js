'use strict';

const {
  CloudWatchClient,
  PutMetricAlarmCommand,
  DeleteAlarmsCommand,
} = require('@aws-sdk/client-cloudwatch');

const {
  SNSClient,
  CreateTopicCommand,
  SubscribeCommand,
} = require('@aws-sdk/client-sns');

const Sentry         = require('@sentry/node');
const { buildClient } = require('./clientFactory');

// CloudWatch namespace + dimension resolver per AWS service type
const ALARM_CONFIGS = {
  ec2: (resource) => ({
    namespace:  'AWS/EC2',
    dimensions: [{ Name: 'InstanceId', Value: resource.external_id }],
  }),
  rds: (resource) => ({
    namespace:  'AWS/RDS',
    dimensions: [{ Name: 'DBInstanceIdentifier', Value: resource.external_id }],
  }),
  lambda: (resource) => ({
    namespace:  'AWS/Lambda',
    // Lambda alarms use FunctionName, not ARN
    dimensions: [{ Name: 'FunctionName', Value: resource.name }],
  }),
  elb: (resource) => ({
    namespace:  'AWS/ApplicationELB',
    // CloudWatch requires ARN suffix — e.g. app/my-alb/1234567890abcdef
    dimensions: [{ Name: 'LoadBalancer', Value: resource.external_id.split(':loadbalancer/')[1] }],
  }),
};

/**
 * Ensures an SNS topic exists for a cloud account.
 * CreateTopic is idempotent — returns the existing ARN if the topic already exists.
 * Returns the topic ARN.
 */
async function ensureSnsTopic(awsCreds, cloudAccountId) {
  try {
    const config = await buildClient(awsCreds);
    const client = new SNSClient(config);

    const topicName    = `sre-${cloudAccountId}`;
    const { TopicArn } = await client.send(new CreateTopicCommand({ Name: topicName }));

    return TopicArn;
  } catch (err) {
    Sentry.captureException(err);
    throw err;
  }
}

/**
 * Subscribes the webhook URL to the SNS topic.
 * SNS will POST a SubscriptionConfirmation — the webhook auto-confirms it.
 * Safe to call multiple times; confirmed subscriptions return the existing ARN.
 */
async function ensureSnsSubscription(awsCreds, topicArn, webhookUrl) {
  try {
    const config = await buildClient(awsCreds);
    const client = new SNSClient(config);

    await client.send(new SubscribeCommand({
      TopicArn:              topicArn,
      Protocol:              'https',
      Endpoint:              webhookUrl,
      ReturnSubscriptionArn: true,
    }));
  } catch (err) {
    Sentry.captureException(err);
    throw err;
  }
}

/**
 * Creates or updates a CloudWatch Alarm for a threshold.
 * PutMetricAlarm is idempotent — updating an existing alarm by the same name overwrites it.
 * Alarm name format: sre-{thresholdId} — used to identify the threshold in the SNS webhook.
 * Returns the alarm name.
 */
async function putCloudWatchAlarm(awsCreds, resource, threshold, snsTopicArn) {
  const alarmConfig = ALARM_CONFIGS[resource.service];
  if (!alarmConfig) {
    throw new Error(`No alarm config for service: ${resource.service}`);
  }

  const { namespace, dimensions } = alarmConfig(resource);
  const alarmName = `sre-${threshold.id}`;

  try {
    const config = await buildClient(awsCreds);
    const client = new CloudWatchClient(config);

    await client.send(new PutMetricAlarmCommand({
      AlarmName:          alarmName,
      Namespace:          namespace,
      MetricName:         threshold.metric_name,
      Dimensions:         dimensions,
      Statistic:          'Average',
      Period:             threshold.period,
      EvaluationPeriods:  threshold.evaluation_periods,
      Threshold:          threshold.threshold_value,
      ComparisonOperator: threshold.operator,
      AlarmActions:       [snsTopicArn],
      OKActions:          [snsTopicArn],
      TreatMissingData:   'notBreaching',
    }));

    return alarmName;
  } catch (err) {
    Sentry.captureException(err);
    throw err;
  }
}

/**
 * Deletes a CloudWatch Alarm by name.
 * Called when a threshold is deleted by the user.
 */
async function deleteCloudWatchAlarm(awsCreds, alarmName) {
  try {
    const config = await buildClient(awsCreds);
    const client = new CloudWatchClient(config);
    await client.send(new DeleteAlarmsCommand({ AlarmNames: [alarmName] }));
  } catch (err) {
    Sentry.captureException(err);
    throw err;
  }
}

module.exports = { ensureSnsTopic, ensureSnsSubscription, putCloudWatchAlarm, deleteCloudWatchAlarm };
