# CLAUDE.md — SRE Backend Conventions

This file is the single source of truth for how code is written in this project.
Every new file, route, service, and function must follow these rules.

---

## 1. Response Shape

Every API response must follow this exact shape — no exceptions:

```js
// Success
res.status(200).json({ status: 1, data: { ... } });
res.status(201).json({ status: 1, data: { ... } });
res.status(200).json({ status: 1, message: 'Done.' });

// Failure
res.status(400).json({ status: 0, error: 'Validation failed.' });
res.status(404).json({ status: 0, error: 'Resource not found.' });
```

- `status: 1` = success, `status: 0` = failure
- Use `data` for returned objects/arrays, `message` for confirmations, `error` for failures
- Never return bare objects — always wrap in `{ status, data }`

---

## 2. Error Property in Services

Service layer always throws errors with `.status` (not `.statusCode`):

```js
const err = new Error('Resource not found.');
err.status = 404;
throw err;
```

The global error handler reads `err.status || err.statusCode || 500`.

---

## 3. asyncHandler

Never define `asyncHandler` inline in a route file. Always import:

```js
const asyncHandler = require('../lib/asyncHandler');
```

---

## 4. Comments & Documentation

Every route file must have a doc block at the top listing all endpoints:
```js
/**
 * Purpose: one-line description of this router's role.
 *
 * GET  /path   Input: ...   Response: { status, data }
 * POST /path   Input: ...   Response: { status, data }
 */
```

Every function (service or lib) must have a 1-liner comment above it:
```js
// Returns masked cloud account safe for API responses
function maskCredentials(account) { ... }
```

For complex logic inside a function, add inline comment above the block:
```js
// Deduplicate S3 buckets that appear in every region scan before upsert
const seen = new Map();
```

---

## 5. Sentry

Capture unexpected errors in:
- Route handlers: `Sentry.captureException(err)` on unexpected failures
- AWS lib functions: wrap in try/catch, capture + rethrow
- Workers: capture job failure and per-region errors

Do NOT capture expected errors (404 not found, 401 invalid token, 400 validation).

---

## 6. Validation

Every `POST` and `PATCH` route must validate the request body with Joi:

```js
const schema = Joi.object({
  name: Joi.string().trim().max(255).required(),
});

const { error, value } = schema.validate(req.body, { abortEarly: false });
if (error) {
  return res.status(400).json({ status: 0, error: error.details.map((d) => d.message) });
}
```

Comment which fields are required above the validation call:
```js
// name, authType, credentials — required
const { error, value } = schema.validate(req.body, { abortEarly: false });
```

---

## 7. DB Patterns

Always filter soft-deleted rows:
```js
.whereNull('deleted_at')
```

Always use `.returning('*')` on insert/update when you need the row back:
```js
const [row] = await db('table').insert({...}).returning('*');
```

Always pass radix to `parseInt`:
```js
const limit = parseInt(req.query.limit, 10) || 20;
```

---

## 8. Logging

- Never use `console.log` in production code paths
- Use `console.error` only for unexpected failures (not 404s, not validation errors)
- Structured logs go through the `logger` instance in `index.js`
- Workers use `console.log` only for job start/complete lines

---

## 9. Roles

Never define `roleLevel` inline. Always import:

```js
const roleLevel = require('../lib/roles');
```

---

## 10. AWS Credentials

Never define `buildAwsCredentials` inline. Always import:

```js
const { buildAwsCredentials } = require('../lib/aws/credentials');
```

---

## 11. Logic Layer (service/)

Use a service file only when:
- DB interaction is complex (joins, transactions, multiple tables)
- Logic needs to be reused across routes

Simple single-table queries can live directly in the route handler.

---

## 12. Code Review Checklist (before every PR)

- [ ] Response shape: `{ status: 1/0, data/message/error }`
- [ ] Service errors use `.status`, not `.statusCode`
- [ ] `asyncHandler` imported from `lib/asyncHandler.js`
- [ ] Route file has API doc block at top
- [ ] Every function has 1-liner comment above it
- [ ] POST/PATCH routes have Joi validation with required fields commented
- [ ] No `console.log` in production paths
- [ ] Sentry called on unexpected errors
- [ ] `whereNull('deleted_at')` on every DB query
- [ ] `parseInt` always has radix 10
- [ ] `roleLevel` imported from `lib/roles.js`
- [ ] `buildAwsCredentials` imported from `lib/aws/credentials.js`
- [ ] No duplicate utility functions — always extract to shared lib

---

## 13. Coding Partnership Rules

- Always explain the plan first, get approval, then code
- Ask questions before making any decision
- Do not add features, refactor, or "improve" beyond what was asked
- Do not decide on logic — user defines all logic and decisions
- Keep code as simple as possible — no over-engineering
- Verify every code change before considering it done
- Update this file whenever a new convention is established
