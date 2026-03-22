# SRE Platform — Frontend API Reference

Base URL: `/api/v1`
All protected routes require: `Authorization: Bearer <token>`

---

## Auth

### Register
`POST /auth/register`

**Body:**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "orgName": "Acme Corp"
}
```
**Response 201:**
```json
{
  "user": { "id": "uuid", "email": "jane@example.com", "fullName": "Jane Doe" },
  "org": { "id": "uuid", "name": "Acme Corp", "slug": "acme-corp" },
  "token": "<jwt>",
  "refreshToken": "<token>"
}
```

---

### Login
`POST /auth/login`

**Body:**
```json
{ "email": "jane@example.com", "password": "secret123" }
```
**Response 200:**
```json
{
  "token": "<jwt>",
  "refreshToken": "<token>",
  "user": { "id": "uuid", "email": "jane@example.com", "fullName": "Jane Doe" },
  "org": { "id": "uuid", "name": "Acme Corp" }
}
```

---

### Refresh Token
`POST /auth/refresh`

**Body:**
```json
{ "refreshToken": "<token>" }
```
**Response 200:**
```json
{ "token": "<new-jwt>", "refreshToken": "<new-token>" }
```
> Call this when any request returns 401. Retry the original request with the new token.

---

### Logout
`POST /auth/logout`
**Auth required**

**Body:**
```json
{ "refreshToken": "<token>" }
```
**Response 200:**
```json
{ "message": "Logged out." }
```

---

## User

### Get Current User
`GET /users/me`
**Auth required**

**Response 200:**
```json
{ "id": "uuid", "email": "jane@example.com", "fullName": "Jane Doe", "createdAt": "..." }
```

---

### Update Profile
`PATCH /users/me`
**Auth required**

**Body** _(all fields optional)_:
```json
{ "fullName": "Jane Smith", "email": "new@example.com", "password": "newpass" }
```
**Response 200:** Updated user object.

---

## Org

### My Orgs
`GET /orgs/me`
**Auth required**

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "name": "Acme Corp", "slug": "acme-corp", "role": "admin" }
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
  "data": [
    { "userId": "uuid", "fullName": "Jane Doe", "email": "jane@example.com", "role": "admin" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### Change Member Role
`PATCH /orgs/:orgId/members/:userId/role`
**Auth required | Min role: owner**

**Body:**
```json
{ "role": "viewer" }
```
Valid values: `viewer` | `member` | `admin` | `owner`

**Response 200:**
```json
{ "userId": "uuid", "role": "viewer" }
```

---

### Remove Member
`DELETE /orgs/:orgId/members/:userId`
**Auth required | Min role: admin**

**Response 200:**
```json
{ "message": "Member removed." }
```

---

## Cloud Accounts

### Add Cloud Account
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
  "data": {
    "id": "uuid",
    "name": "Production AWS",
    "provider": "aws",
    "auth_type": "access_key",
    "regions": ["us-east-1"],
    "sync_status": "idle",
    "credential_display": "AKIA***MPLE",
    "created_at": "2026-03-15T10:00:00Z"
  }
}
```
> Raw credentials are never returned. `credential_display` is a masked version for UI display only.

---

### List Cloud Accounts
`GET /orgs/:orgId/cloud-accounts`
**Auth required | Min role: viewer**

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Production AWS",
      "provider": "aws",
      "auth_type": "access_key",
      "regions": ["us-east-1"],
      "sync_status": "idle",
      "last_synced_at": null,
      "credential_display": "AKIA***MPLE",
      "created_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

---

### Delete Cloud Account
`DELETE /orgs/:orgId/cloud-accounts/:accountId`
**Auth required | Min role: admin**

**Response 200:**
```json
{ "message": "Cloud account deleted." }
```
> This is a hard delete — credentials are permanently removed.

---

### Validate Cloud Account
`POST /cloud-accounts/:id/validate`
**Auth required**

**Body:** _(empty)_

**Response 200 — valid:**
```json
{
  "valid": true,
  "accountId": "123456789012",
  "arn": "arn:aws:iam::123456789012:user/sre-bot",
  "userId": "AIDAIOSFODNN7EXAMPLE"
}
```

**Response 200 — invalid:**
```json
{
  "valid": false,
  "error": "The security token included in the request is invalid."
}
```
> Always returns HTTP 200. Check the `valid` boolean. Use as a "Test Connection" action after adding an account.

---

### Trigger Sync
`POST /cloud-accounts/:id/sync`
**Auth required**

**Response 200:**
```json
{ "jobId": null, "status": "queued" }
```
> Stub — real background worker coming in next module.

---

### Get Sync Status
`GET /cloud-accounts/:id/sync-status`
**Auth required**

**Response 200:**
```json
{ "status": "idle" }
```
Possible values: `idle` | `syncing` | `error`
> Stub — poll this after triggering sync to update the UI indicator.

---

## Error Responses

All errors follow this shape:

```json
{ "error": { "message": "Human-readable message.", "details": ["field-level info"] } }
```

| Status | Meaning | Frontend action |
|--------|---------|-----------------|
| 400 | Validation failed | Show `error.details` inline on form fields |
| 401 | Missing / expired token | Call `/auth/refresh`, retry. If refresh fails → redirect to login |
| 403 | Insufficient role | Show permission denied message, don't retry |
| 404 | Not found or not in your org | Show not found state |
| 429 | Rate limited | Back off and retry after `X-RateLimit-Reset` header time |
| 500 | Server error | Show generic error, report to Sentry |

---

## Role Hierarchy

| Role | Level | Can do |
|------|-------|--------|
| viewer | 1 | Read-only access |
| member | 2 | Basic actions |
| admin | 3 | Manage accounts, remove members |
| owner | 4 | All actions including role changes |

---

## Token Handling

- `token` — short-lived JWT, store in memory (not localStorage)
- `refreshToken` — long-lived, store in `httpOnly` cookie or secure storage
- On every 401: call `POST /auth/refresh` → update stored token → retry original request
- On logout: call `POST /auth/logout` to revoke server-side, then clear local storage
