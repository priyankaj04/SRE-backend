# SRE Platform — Frontend API Reference

Base URL: `/api/v1`
All protected routes require: `Authorization: Bearer <accessToken>`

> **Token notes:**
> - `accessToken` — short-lived JWT (15 min). Store in memory only.
> - `refreshToken` — long-lived (7 days). Sent/received as an `httpOnly` cookie named `refresh_token`. Never appears in response body.
> - On every 401: call `POST /auth/refresh` → update stored token → retry original request.
> - On logout: call `POST /auth/logout` to revoke server-side, then clear memory.

---

## Auth

### Register
`POST /auth/register`

**Body:**
```json
{
  "email": "jane@example.com",
  "password": "secret123",
  "fullName": "Jane Doe",
  "orgName": "Acme Corp"
}
```

**Response 201:**
```json
{
  "status": 1,
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "fullName": "Jane Doe"
    },
    "org": {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp"
    }
  }
}
```
> `refreshToken` is set as an `httpOnly` cookie `refresh_token` — not in the body.

---

### Login
`POST /auth/login`

Rate limited: 10 requests / 15 min per IP.

**Body:**
```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "fullName": "Jane Doe"
    },
    "org": {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp"
    },
    "role": "owner"
  }
}
```

---

### Refresh Token
`POST /auth/refresh`

**Body:** _(empty — reads `refresh_token` cookie automatically)_

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "accessToken": "<new-jwt>"
  }
}
```
> A new `refresh_token` cookie is also set. Call this on any 401 and retry the original request.

---

### Logout
`POST /auth/logout`

**Body:** _(empty — reads `refresh_token` cookie automatically)_

**Response 200:**
```json
{
  "status": 1,
  "message": "Logged out."
}
```

---

### Logout All Sessions
`POST /auth/logout-all`
**Auth required**

**Body:** _(empty)_

**Response 200:**
```json
{
  "status": 1,
  "message": "All sessions revoked."
}
```

---

## Users

### Get Current User
`GET /users/me`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "email": "jane@example.com",
    "fullName": "Jane Doe",
    "isVerified": true,
    "lastLoginAt": "2026-03-15T10:00:00Z",
    "createdAt": "2026-03-01T00:00:00Z",
    "org": {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp"
    },
    "role": "owner"
  }
}
```

---

### Update Profile
`PATCH /users/me`
**Auth required**

**Body:**
```json
{
  "fullName": "Jane Smith"
}
```

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "email": "jane@example.com",
    "fullName": "Jane Smith",
    "isVerified": true,
    "updatedAt": "2026-03-15T10:00:00Z"
  }
}
```

---

## Orgs

### My Orgs
`GET /orgs/me`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "plan": "free",
      "role": "owner",
      "joinedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```
> Use for org switcher. `role` is the current user's role in each org.

---

### List Members
`GET /orgs/:orgId/members?page=1&limit=20`
**Auth required | Min role: viewer**

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "email": "jane@example.com",
      "full_name": "Jane Doe",
      "role": "admin",
      "joined_at": "2026-03-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### Change Member Role
`PATCH /orgs/:orgId/members/:userId/role`
**Auth required | Min role: owner**

**Body:**
```json
{
  "role": "viewer"
}
```
Valid values: `viewer` | `member` | `admin` | `owner`

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "userId": "uuid",
    "role": "viewer"
  }
}
```

---

### Remove Member
`DELETE /orgs/:orgId/members/:userId`
**Auth required | Min role: admin**

**Response 200:**
```json
{
  "status": 1,
  "message": "Member removed."
}
```

---

### List Org Incidents
`GET /orgs/:orgId/incidents?limit=20&offset=0`
**Auth required | Min role: viewer**

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "metric_name": "CPUUtilization",
      "threshold_value": 80,
      "state": "ALARM",
      "started_at": "2026-03-15T10:00:00Z",
      "resolved_at": null,
      "created_at": "2026-03-15T10:00:00Z",
      "resource_id": "uuid",
      "resource_name": "web-server-1",
      "resource_service": "ec2",
      "resource_region": "us-east-1",
      "cloud_account_id": "uuid",
      "account_name": "Production AWS"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```
State values: `ALARM` | `INSUFFICIENT_DATA`

---

### Get Org Incident
`GET /orgs/:orgId/incidents/:incidentId`
**Auth required | Min role: viewer**

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "metric_name": "CPUUtilization",
    "threshold_value": 80,
    "alarm_arn": "arn:aws:cloudwatch:us-east-1:123456789012:alarm:sre-uuid",
    "state": "ALARM",
    "started_at": "2026-03-15T10:00:00Z",
    "resolved_at": null,
    "raw_payload": {},
    "created_at": "2026-03-15T10:00:00Z",
    "resource_id": "uuid",
    "resource_name": "web-server-1",
    "resource_service": "ec2",
    "resource_region": "us-east-1",
    "cloud_account_id": "uuid",
    "account_name": "Production AWS"
  }
}
```

---

### Add Cloud Account (Org-scoped)
`POST /orgs/:orgId/cloud-accounts`
**Auth required | Min role: admin**

**Body — Access Key:**
```json
{
  "name": "Production AWS",
  "provider": "aws",
  "authType": "access_key",
  "credentials": {
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "regions": ["us-east-1", "ap-south-1"]
}
```

**Body — Role ARN:**
```json
{
  "name": "Prod via Role",
  "provider": "aws",
  "authType": "role_arn",
  "credentials": {
    "roleArn": "arn:aws:iam::123456789012:role/SREMonitorRole",
    "externalId": "optional-string"
  },
  "regions": ["us-east-1"]
}
```

**Response 201:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Production AWS",
    "provider": "aws",
    "auth_type": "access_key",
    "regions": ["us-east-1", "ap-south-1"],
    "sync_status": "idle",
    "last_synced_at": null,
    "credential_display": "AKIA***MPLE",
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-15T10:00:00Z"
  }
}
```
> Raw credentials are never returned. `credential_display` is masked for UI display only.

---

### List Cloud Accounts (Org-scoped)
`GET /orgs/:orgId/cloud-accounts`
**Auth required | Min role: viewer**

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "name": "Production AWS",
      "provider": "aws",
      "auth_type": "access_key",
      "regions": ["us-east-1"],
      "sync_status": "idle",
      "last_synced_at": null,
      "credential_display": "AKIA***MPLE",
      "created_at": "2026-03-15T10:00:00Z",
      "updated_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

---

### Delete Cloud Account (Org-scoped)
`DELETE /orgs/:orgId/cloud-accounts/:accountId`
**Auth required | Min role: admin**

**Response 200:**
```json
{
  "status": 1,
  "message": "Cloud account deleted."
}
```
> Hard delete — credentials are permanently removed.

---

## Cloud Accounts

### List Cloud Accounts
`GET /cloud-accounts`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "name": "Production AWS",
      "provider": "aws",
      "auth_type": "access_key",
      "regions": ["us-east-1"],
      "sync_status": "idle",
      "last_synced_at": null,
      "credential_display": "AKIA***MPLE",
      "created_at": "2026-03-15T10:00:00Z",
      "updated_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

---

### Add Cloud Account
`POST /cloud-accounts`
**Auth required**

Same body as `POST /orgs/:orgId/cloud-accounts`.

**Response 201:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Production AWS",
    "provider": "aws",
    "auth_type": "access_key",
    "regions": ["us-east-1"],
    "sync_status": "idle",
    "last_synced_at": null,
    "credential_display": "AKIA***MPLE",
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-15T10:00:00Z"
  }
}
```

---

### Get Cloud Account
`GET /cloud-accounts/:id`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Production AWS",
    "provider": "aws",
    "auth_type": "access_key",
    "regions": ["us-east-1"],
    "sync_status": "idle",
    "last_synced_at": null,
    "credential_display": "AKIA***MPLE",
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-15T10:00:00Z"
  }
}
```

---

### Delete Cloud Account
`DELETE /cloud-accounts/:id`
**Auth required**

**Response 200:**
```json
{
  "status": 1
}
```

---

### Validate Cloud Account
`POST /cloud-accounts/:id/validate`
**Auth required**

**Body:** _(empty)_

**Response 200 — valid:**
```json
{
  "status": 1,
  "data": {
    "valid": true,
    "accountId": "123456789012",
    "arn": "arn:aws:iam::123456789012:user/sre-bot",
    "userId": "AIDAIOSFODNN7EXAMPLE"
  }
}
```

**Response 200 — invalid:**
```json
{
  "status": 1,
  "data": {
    "valid": false,
    "error": "The security token included in the request is invalid."
  }
}
```
> Always returns HTTP 200. Check the `valid` boolean to determine success.

---

### Trigger Sync
`POST /cloud-accounts/:id/sync`
**Auth required**

**Body:** _(empty)_

**Response 202:**
```json
{
  "status": 1,
  "data": {
    "jobId": "123",
    "status": "queued",
    "accountId": "uuid"
  }
}
```
> Use `jobId` to poll sync-status below.

---

### Get Sync Status
`GET /cloud-accounts/:id/sync-status`
`GET /cloud-accounts/:id/sync-status?jobId=123`
**Auth required**

**Response 200 — no jobId (account-level status):**
```json
{
  "status": 1,
  "data": {
    "syncStatus": "idle"
  }
}
```
Possible values: `idle` | `syncing` | `error`

**Response 200 — with jobId (job-level status):**
```json
{
  "status": 1,
  "data": {
    "jobId": "123",
    "status": "completed",
    "progress": 100
  }
}
```
Job status values: `waiting` | `active` | `completed` | `failed`

**Response 200 — failed job:**
```json
{
  "status": 1,
  "data": {
    "jobId": "123",
    "status": "failed",
    "progress": 0,
    "failReason": "Access denied to region us-west-2"
  }
}
```

---

## Resources

### List Resources
`GET /cloud-accounts/:accountId/resources`
`GET /cloud-accounts/:accountId/resources?limit=20&offset=0&service=ec2&region=us-east-1&status=running&search=web`
**Auth required**

**Query params (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max results per page (default 20, max 100) |
| `offset` | number | Skip N results (default 0) |
| `service` | string | Filter by service: `ec2` \| `rds` \| `s3` \| `lambda` \| `elb` |
| `region` | string | Filter by AWS region (e.g. `us-east-1`) |
| `status` | string | Filter by resource status |
| `search` | string | Partial match on name or external ID |

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "service": "ec2",
      "external_id": "i-1234567890abcdef0",
      "name": "web-server-1",
      "region": "us-east-1",
      "status": "running",
      "metadata": {},
      "last_seen_at": "2026-03-15T10:00:00Z",
      "created_at": "2026-03-15T10:00:00Z",
      "updated_at": "2026-03-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Get Resource
`GET /cloud-accounts/:accountId/resources/:resourceId`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "service": "ec2",
    "external_id": "i-1234567890abcdef0",
    "name": "web-server-1",
    "region": "us-east-1",
    "status": "running",
    "metadata": {},
    "last_seen_at": "2026-03-15T10:00:00Z",
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-15T10:00:00Z"
  }
}
```

---

## Thresholds

### List Thresholds
`GET /cloud-accounts/:accountId/resources/:resourceId/thresholds`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "metric_name": "CPUUtilization",
      "operator": "GreaterThanThreshold",
      "threshold_value": 80,
      "evaluation_periods": 2,
      "period": 300,
      "alarm_name": "sre-uuid",
      "sns_topic_arn": "arn:aws:sns:us-east-1:123456789012:sre-alerts",
      "is_default": true,
      "created_at": "2026-03-15T10:00:00Z",
      "updated_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```
> `alarm_name` and `sns_topic_arn` are `null` until the threshold is saved and a CloudWatch alarm is created.

---

### Update Threshold
`PATCH /cloud-accounts/:accountId/resources/:resourceId/thresholds/:thresholdId`
**Auth required**

**Body:**
```json
{
  "threshold_value": 90,
  "operator": "GreaterThanThreshold",
  "evaluation_periods": 3,
  "period": 300
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `threshold_value` | **Yes** | Numeric value that triggers the alarm |
| `operator` | No | `GreaterThanThreshold` \| `LessThanThreshold` \| `GreaterThanOrEqualToThreshold` \| `LessThanOrEqualToThreshold` |
| `evaluation_periods` | No | Consecutive periods before alarm fires |
| `period` | No | Sampling interval in seconds (e.g. `300`) |

**Response 200:**
```json
{
  "status": 1,
  "data": {
    "id": "uuid",
    "metric_name": "CPUUtilization",
    "operator": "GreaterThanThreshold",
    "threshold_value": 90,
    "evaluation_periods": 3,
    "period": 300,
    "alarm_name": "sre-uuid",
    "sns_topic_arn": "arn:aws:sns:us-east-1:123456789012:sre-alerts",
    "is_default": false,
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-15T10:00:00Z"
  }
}
```
> Saving a threshold creates or updates a live CloudWatch Alarm in AWS.

---

### Delete Threshold
`DELETE /cloud-accounts/:accountId/resources/:resourceId/thresholds/:thresholdId`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "message": "Threshold deleted."
}
```
> Also deletes the corresponding CloudWatch Alarm from AWS if one exists.

---

## Incidents (Resource-scoped)

### List Resource Incidents
`GET /cloud-accounts/:accountId/resources/:resourceId/incidents`
**Auth required**

**Response 200:**
```json
{
  "status": 1,
  "data": [
    {
      "id": "uuid",
      "metric_name": "CPUUtilization",
      "threshold_value": 80,
      "alarm_arn": "arn:aws:cloudwatch:us-east-1:123456789012:alarm:sre-uuid",
      "state": "ALARM",
      "started_at": "2026-03-15T10:00:00Z",
      "resolved_at": null,
      "created_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```
State values: `ALARM` | `INSUFFICIENT_DATA`

---

## Webhooks

### CloudWatch SNS Webhook
`POST /webhooks/cloudwatch`

**No auth required** — called by AWS SNS directly.

This endpoint handles two SNS message types automatically:

**SNS Subscription Confirmation (first call):**

**Response 200:**
```json
{
  "status": 1,
  "message": "Subscription confirmed."
}
```

**SNS Alarm Notification:**

**Response 200:**
```json
{
  "status": 1
}
```
> You do not call this endpoint from the frontend. It is only called by AWS SNS.

---

## Error Responses

All errors follow this shape:

```json
{ "status": 0, "error": "Human-readable message." }
```

Validation errors return an array:
```json
{ "status": 0, "error": ["\"email\" must be a valid email", "\"password\" is required"] }
```

| Status | Meaning | Frontend action |
|--------|---------|-----------------|
| 400 | Validation failed | Show `error` array inline on form fields |
| 401 | Missing / expired token | Call `POST /auth/refresh`, retry. If refresh fails → redirect to login |
| 403 | Insufficient role | Show permission denied message, don't retry |
| 404 | Not found or not in your org | Show not found state |
| 409 | Conflict (e.g. email already registered) | Show inline error |
| 429 | Rate limited | Back off and retry after `X-RateLimit-Reset` header time |
| 500 | Server error | Show generic error |

---

## Role Hierarchy

| Role | Level | Can do |
|------|-------|--------|
| viewer | 1 | Read-only access |
| member | 2 | Basic actions |
| admin | 3 | Manage cloud accounts, remove members |
| owner | 4 | All actions including role changes |
