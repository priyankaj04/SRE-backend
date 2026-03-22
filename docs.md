

**SRE PLATFORM**

*Complete Product & Technical Documentation*

| Version | v1.0.0 |
| :---- | :---- |
| **Status** | Pre-Build / Active Development |
| **Type** | Personal Learning Project |
| **Author** | Priyanka |
| **Focus** | DevOps & SRE Engineering |
| **Stack** | Node.js · PostgreSQL · React · AWS |

*"Build it to understand it. Understand it to master it."*

**TABLE OF CONTENTS**

**1\.**   Project Overview & Learning Goals

**2\.**   Problem Statement & Value Proposition

**3\.**   Scope & MVP Boundaries

**4\.**   System Architecture

**5\.**   Technology Stack & Rationale

**6\.**   Database Schema

**7\.**   Multitenancy Model

**8\.**   RBAC — Roles & Permissions Matrix

**9\.**   Authentication & Token Strategy

**10\.**  API Design & Endpoint Reference

**11\.**  Feature Specifications

**12\.**  Observability Integrations (Sentry \+ New Relic)

**13\.**  Security & OWASP Compliance

**14\.**  Rate Limiting Strategy

**15\.**  Data Retention & Privacy Policy

**16\.**  Non-Functional Requirements

**17\.**  3-Day Build Execution Plan

**18\.**  Directory Structure

**19\.**  Environment Variables Reference

**20\.**  Glossary of Terms

# **1\. Project Overview & Learning Goals**

This SRE Platform is a personal project built to develop hands-on, in-depth knowledge of Site Reliability Engineering. Every architectural decision — security model, observability stack, data design — is intentional and documented here.

## **Learning Objectives**

### **1\. Cloud Provider Deep Dive**

* Understand AWS resource taxonomy: EC2, RDS, S3, Lambda, ELB, EKS

* Learn IAM, access key flows, and credential security best practices

* Understand CloudWatch metrics APIs and what operational signals matter

### **2\. Observability Engineering (MELT)**

* Build a Metrics, Events, Logs, Traces pipeline from scratch

* Integrate production-grade tools: New Relic (APM) and Sentry (errors)

* Understand distributed tracing across API, workers, and cloud APIs

### **3\. Prompt Engineering & AI Context Building**

* Design structured prompts for AI healing recommendations

* Learn how to inject operational context (resource type, provider, metric trend, severity) to get actionable, specific AI responses

* Build feedback loops to measure recommendation quality over time

### **4\. Security Engineering**

* Apply OWASP Top 10 mitigations throughout the system

* Implement encrypted credential storage for cloud access keys

* Build RBAC from scratch and understand authorization middleware design

### **5\. DevOps Systems Design**

* Understand alert fatigue and deduplication strategies

* Design daemon processes for safe automated remediation

* Build background job queues with retry and failure handling

## **Expected Outcomes**

* A working in-house SRE tool usable for personal or org infrastructure

* Tracks system performance and benchmarks over time

* Complete observability stack for monitored infrastructure

* Reduces MTTR (Mean Time To Resolution) from hours to minutes

* Provides AI-generated runbooks when systems degrade

# **2\. Problem Statement & Value Proposition**

## **The Problem**

When infrastructure incidents occur, engineers spend the majority of their time on three expensive activities:

* DETECTION — finding out something is wrong (often discovered by end-users first)

* DIAGNOSIS — determining which resource is the root cause

* REMEDIATION — knowing what action to take and executing it safely

Existing commercial tools (Datadog, PagerDuty, etc.) solve this but are expensive, complex, and opaque. Building it yourself reveals exactly how they work — and builds the intuition to use them effectively.

## **Value Proposition**

| Phase | How the Platform Addresses It |
| :---- | :---- |
| **Detection** | Continuous monitoring with configurable per-resource thresholds |
| **Diagnosis** | Unified resource view with MELT data, metric timeseries, and context |
| **Remediation** | AI-generated, step-by-step healing recommendations via Claude API |
| **Prevention** | Statistical anomaly detection fires warnings before thresholds breach |
| **Automation** | Whitelisted auto-healing daemon executes approved fixes automatically |

| *Primary Goal: Reduce MTTR (Mean Time To Resolution) from hours to minutes for infrastructure incidents.* |
| :---- |

# **3\. Scope & MVP Boundaries**

## **In Scope — MVP (3 Days)**

* Authentication: register, login, JWT access \+ refresh tokens

* Multi-tenant org and user management with RBAC

* AWS cloud account onboarding (access key or IAM role ARN)

* AWS resource discovery: EC2, RDS, S3, Lambda, ELB

* CloudWatch metric polling for all discovered resources

* Per-resource, per-metric threshold configuration

* Alert evaluation engine with deduplication

* Alert notifications: Email (Nodemailer) \+ Slack (Incoming Webhooks)

* AI healing recommendations via Anthropic Claude API

* Statistical anomaly detection using rolling Z-score baseline

* Auto-healing daemon with whitelisted command execution

* Full MELT pipeline to New Relic and Sentry

* Unified observability dashboard (React \+ ShadCN)

## **Out of Scope — Post-MVP**

* GCP and Azure cloud providers

* Horizontal scaling or microservices architecture

* SSO / SAML / OAuth social login

* Mobile application

* Billing or subscription management

* Agent-based custom metric ingestion

* ML-based anomaly detection (upgrade path post-MVP)

## **AWS Resource Scope**

| Resource | Metrics Monitored |
| :---- | :---- |
| **EC2** | CPUUtilization, NetworkIn, NetworkOut, DiskReadOps, StatusCheckFailed |
| **RDS** | CPUUtilization, DatabaseConnections, FreeStorageSpace, ReadLatency |
| **Lambda** | Duration, Errors, Throttles, ConcurrentExecutions |
| **ELB** | RequestCount, TargetResponseTime, HTTPCode\_ELB\_5XX\_Count |
| **S3** | BucketSizeBytes, NumberOfObjects (daily granularity) |

# **4\. System Architecture**

## **Component Overview**

The platform is composed of three runtime layers: the React frontend served via Vite, the Express API server, and a set of background Bull workers sharing a Redis-backed job queue. All layers share a single PostgreSQL database with row-level tenant isolation.

| Layer | Responsibility |
| :---- | :---- |
| **React Frontend** | Unified observability UI. Auth pages, dashboard, resource explorer, alert detail, healing panel. Connects via REST API with Axios \+ TanStack Query. |
| **Express API Server** | All HTTP request handling. JWT auth, RBAC, tenant scoping, Joi validation, rate limiting. Enqueues background jobs. Never directly executes cloud calls synchronously. |
| **Bull Workers** | All async heavy lifting: resource sync, metric polling, alert evaluation, healing generation, anomaly detection, auto-heal execution, notification dispatch. |
| **PostgreSQL** | Primary data store for all application state. Row-level tenant isolation via org\_id. Encrypted credential storage with pgcrypto. |
| **Redis** | Bull job queues, refresh token store, rate-limit state, alert dedup cache, account lockout counters. |
| **New Relic** | APM agent on API \+ workers. Browser agent on frontend. Custom events, metrics, and dashboards. Synthetics uptime canary. |
| **Sentry** | Error tracking on frontend (React ErrorBoundary) and backend (Express error handler). Session replay on errors. User context enrichment. |
| **Anthropic Claude API** | AI healing recommendation generation. Called from HealingWorker with structured prompt context. |
| **AWS APIs** | CloudWatch (metrics), EC2/RDS/S3/Lambda/ELB describe APIs (resource discovery). Called from workers only. |

## **Alert Lifecycle Data Flow**

Understanding this flow is the core of how the platform works end-to-end:

1. ResourceSyncWorker polls AWS APIs every 15 minutes → upserts discovered resources to database

2. MonitoringWorker polls CloudWatch every 60 seconds → stores metric snapshots

3. AlertWorker evaluates metric against all thresholds → checks Redis dedup cache

4. If new breach: creates alert record → enqueues notification job \+ healing generation job

5. HealingWorker calls Anthropic API with structured context → stores recommendation

6. AnomalyWorker runs rolling Z-score on 24h history → fires early-warning if Z \> 2.5σ

7. AutoHealWorker (if approved) validates \+ executes whitelisted command → logs to audit trail

# **5\. Technology Stack & Rationale**

## **Backend**

| Technology | Package | Why This Choice |
| :---- | :---- | :---- |
| **Runtime** | Node.js 20 LTS | Non-blocking I/O ideal for high-concurrency metric polling and queue processing |
| **Framework** | Express 4.x | Mature, transparent middleware composition. Better learning value than abstracted frameworks |
| **ORM** | Knex.js | Query builder (not full ORM) — forces understanding of SQL being generated. Explicit migrations |
| **Database** | PostgreSQL 15 | ACID compliance, row-level security, excellent JSON support for metadata, pgcrypto for encryption |
| **Queue** | Bull \+ Redis 7 | Reliable job queues with retry, delay, concurrency control. Industry standard for Node.js workers |
| **Logging** | Winston | Structured JSON logs with request ID correlation, forwarded to New Relic log pipeline |
| **Validation** | Joi | Declarative schema validation for all request bodies and query parameters |
| **Security** | Helmet \+ bcrypt \+ crypto | Security headers, password hashing (cost 12), AES-256-GCM for credential encryption |

## **Frontend**

| Technology | Package | Why This Choice |
| :---- | :---- | :---- |
| **Framework** | React 18 \+ Vite | Vite for fast HMR dev iteration. React for component-based dashboard architecture |
| **UI** | ShadCN \+ Tailwind CSS | Accessible, customizable primitives. Full control over styling without fighting component opinions |
| **Data Layer** | TanStack Query | Server state management, automatic background refetch, optimistic updates for real-time feel |
| **Routing** | React Router v6 | File-based route structure, nested layouts for dashboard shell |
| **Charts** | Recharts | Composable React chart library — metric timeseries with threshold reference lines |
| **HTTP** | Axios | Interceptors for automatic token refresh on 401 responses |

## **External Services**

| Service | Usage |
| :---- | :---- |
| **Anthropic Claude** | claude-sonnet-4-20250514 — AI healing recommendation generation with structured prompts |
| **AWS SDK v3** | @aws-sdk/client-ec2, rds, s3, lambda, elasticloadbalancing, cloudwatch |
| **New Relic** | APM agent (backend), Browser agent (frontend), Custom Events API, Metric API, Synthetics |
| **Sentry** | @sentry/node (backend), @sentry/react (frontend), ErrorBoundary, Session Replay |
| **Nodemailer** | Email alert dispatch via SMTP — HTML templated notifications |
| **Slack Webhooks** | Incoming Webhook API — Block Kit formatted alert messages |

# **6\. Database Schema**

All tables use UUID primary keys (gen\_random\_uuid()), snake\_case naming, and timestamptz for all timestamps. User-facing entities use soft deletes (deleted\_at). Every table in the multi-tenant scope carries an org\_id column enforced at the query layer.

| Table | Purpose | Key Columns |
| :---- | :---- | :---- |
| **orgs** | Root tenant entity. All data belongs to an org. | id, name, slug, plan, settings (jsonb), created\_at, deleted\_at |
| **users** | Individual user accounts across all orgs. | id, email, password\_hash, full\_name, is\_verified, last\_login\_at |
| **org\_members** | Junction: user ↔ org with role assignment. | id, org\_id, user\_id, role (owner|admin|member|viewer), invited\_by |
| **invitations** | Pending email invitations with expiry tokens. | id, org\_id, email, role, token (unique), expires\_at, accepted\_at |
| **refresh\_tokens** | Hashed refresh tokens for JWT rotation. | id, user\_id, token\_hash, expires\_at, revoked\_at, ip\_address |
| **cloud\_accounts** | Connected AWS accounts with encrypted credentials. | id, org\_id, provider, auth\_type, encrypted\_creds, regions (jsonb), sync\_status |
| **resources** | Normalized cloud resource records (EC2, RDS, etc.). | id, org\_id, cloud\_account\_id, resource\_type, provider\_id, region, status, metadata (jsonb) |
| **thresholds** | Per-resource alerting rules. | id, org\_id, resource\_id, metric\_name, operator, threshold\_value, severity, notify\_channels (jsonb) |
| **metric\_snapshots** | Time-series metric values from CloudWatch. | id, resource\_id, org\_id, metric\_name, value, unit, collected\_at |
| **alerts** | Fired alert instances with lifecycle state. | id, org\_id, resource\_id, threshold\_id, metric\_value, severity, status, fired\_at, resolved\_at |
| **healing\_recommendations** | AI-generated remediation plans linked to alerts. | id, alert\_id, prompt\_context (jsonb), root\_cause, steps (jsonb), cli\_commands (jsonb), feedback\_helpful |
| **anomaly\_events** | Statistical anomaly detections before threshold breach. | id, resource\_id, metric\_name, z\_score, baseline\_mean, baseline\_stddev, direction, detected\_at |
| **auto\_heal\_commands** | Whitelisted command templates for automated remediation. | id, org\_id, name, command\_template, requires\_approval, approved\_by, is\_active |
| **auto\_heal\_executions** | Immutable audit log of every auto-heal execution. | id, command\_id, alert\_id, executed\_command, exit\_code, stdout, stderr, status |
| **audit\_logs** | OWASP security log of all sensitive actions. | id, org\_id, user\_id, action, entity\_type, entity\_id, old\_value, new\_value, ip\_address |
| **notification\_channels** | Configured email, Slack, and webhook destinations. | id, org\_id, type, name, config (jsonb encrypted), is\_active |

## **Key Design Decisions**

* metric\_snapshots is the highest-volume table — indexed on (resource\_id, metric\_name, collected\_at DESC). Purged after 30 days by cleanup worker.

* encrypted\_creds in cloud\_accounts stores AES-256-GCM ciphertext. The encryption key lives in environment variables only — never in the DB.

* auto\_heal\_executions is append-only (no UPDATEs except status). Preserves exact executed\_command string for forensic audit.

* audit\_logs strips credential values from old\_value/new\_value before insertion (enforced in service layer).

# **7\. Multitenancy Model**

## **Strategy: Row-Level Isolation**

Every user-facing table carries an org\_id column. A scoped Knex query builder is injected into every authenticated request, automatically appending .where("org\_id", req.orgId) to all SELECT, UPDATE, and DELETE queries at the service layer.

## **Enforcement Pattern**

* Auth middleware extracts JWT → sets req.user and req.orgId

* db/scoped.js exports a scopedDb(orgId) factory that returns a Knex proxy with tenant filter pre-applied

* All service functions accept db as a parameter (dependency injection — never call global db directly)

* Before every write, resource ownership is validated: resource.org\_id \=== req.orgId

## **Cross-Tenant Protection Rules**

* No API endpoint reads data from another org under any circumstance

* IDs in URL parameters are re-validated in the service layer — not assumed safe from the URL alone

* Bulk operations include org\_id in the WHERE clause, not just entity IDs

* Background workers always include explicit orgId in Bull job payloads — never query across orgs in one operation

| *The tenant scope enforcer is the most critical security control in the system. Every pull request must verify that new service functions use the scoped DB builder, not the global instance.* |
| :---- |

# **8\. RBAC — Roles & Permissions Matrix**

## **Role Definitions**

| Role | Definition |
| :---- | :---- |
| **Owner** | Full control. One per org (the creator). Cannot be removed by anyone. Can delete org, approve auto-heal commands, transfer ownership. |
| **Admin** | Manage team, cloud accounts, and thresholds. Cannot delete the org. Can invite/remove users up to their own role level. |
| **Member** | Operational access — acknowledge alerts, apply healing recommendations, trigger manual syncs. Cannot change configuration. |
| **Viewer** | Read-only. Can see all data but cannot trigger any writes or configuration changes. |

## **Permissions Matrix**

| Action | Owner | Admin | Member | Viewer |
| :---- | :---- | :---- | :---- | :---- |
| View dashboard, alerts, resources, metrics | **✓** | **✓** | **✓** | **✓** |
| View healing recommendations | **✓** | **✓** | **✓** | **✓** |
| Acknowledge alerts | **✓** | **✓** | **✓** | **—** |
| Apply healing recommendation | **✓** | **✓** | **✓** | **—** |
| Trigger manual resource sync | **✓** | **✓** | **✓** | **—** |
| View audit logs | **✓** | **✓** | **—** | **—** |
| Configure thresholds | **✓** | **✓** | **—** | **—** |
| Connect / disconnect cloud account | **✓** | **✓** | **—** | **—** |
| Manage notification channels | **✓** | **✓** | **—** | **—** |
| Invite users | **✓** | **✓** | **—** | **—** |
| Change user roles (≤ own role) | **✓** | **✓** | **—** | **—** |
| Approve auto-heal commands | **✓** | **—** | **—** | **—** |
| Add to auto-heal whitelist | **✓** | **—** | **—** | **—** |
| Delete org | **✓** | **—** | **—** | **—** |
| Transfer ownership | **✓** | **—** | **—** | **—** |

## **Middleware Implementation**

Role hierarchy uses a numeric map: viewer=1, member=2, admin=3, owner=4. The requireRole(minRole) middleware factory compares the authenticated user's numeric level against the required level.

|  |
| :---- |
| // middleware/requireRole.js |
| const roleLevel \= { viewer: 1, member: 2, admin: 3, owner: 4 }; |
|   |
| function requireRole(minRole) { |
|   return (req, res, next) \=\> { |
|     const userLevel \= roleLevel\[req.user.role\]; |
|     const requiredLevel \= roleLevel\[minRole\]; |
|     if (\!userLevel || userLevel \< requiredLevel) { |
|       return res.status(403).json({ |
|         error: { code: "FORBIDDEN", message: "Insufficient permissions" } |
|       }); |
|     } |
|     next(); |
|   }; |
| } |
|  |

# **9\. Authentication & Token Strategy**

## **Token Architecture**

| Token | Details |
| :---- | :---- |
| **Access Token** | JWT signed with RS256 (asymmetric). Expires in 15 minutes. Stored in application memory — never in localStorage (XSS risk). |
| **Refresh Token** | Opaque 48-byte random hex string. Expires in 7 days. Stored as SHA-256 hash in PostgreSQL refresh\_tokens table. Raw value set as httpOnly, Secure, SameSite=Strict cookie. |

RS256 is chosen over HS256 because it uses a public/private key pair. Only the server holds the private key. The public key can be distributed to any downstream service for token verification without sharing secrets.

## **JWT Payload Structure**

|  |
| :---- |
| { |
|   "sub":  "\<user\_id\>", |
|   "org":  "\<org\_id\>", |
|   "role": "admin", |
|   "iat":  1700000000, |
|   "exp":  1700000900, |
|   "jti":  "\<unique\_token\_id\>" |
| } |
|  |

## **Token Rotation Flow**

8. Client stores access token in memory (React context), refresh token in httpOnly cookie

9. Axios interceptor automatically calls POST /auth/refresh on any 401 response

10. Server validates the refresh token hash against DB and Redis

11. Issues a new access token \+ refresh token pair

12. Old refresh token is immediately invalidated (rotation on every use)

## **Security Rules**

* bcrypt cost factor: 12 — balances security versus login latency (\~200–300ms)

* Rate limit on /auth/login: 10 requests per 15 minutes per IP

* Account lockout: 5 consecutive failed logins → 15 minute lockout (tracked in Redis)

* POST /auth/logout-all revokes every active refresh token for the user

* All auth actions written to audit\_log with IP address and user agent

# **10\. API Design & Endpoint Reference**

Base URL: /api/v1 — versioned from day one. All requests use JSON bodies. Auth via Authorization: Bearer \<access\_token\> header. Standard error shape: { "error": { "code": "...", "message": "..." } }.

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| **AUTH** |  |  |
| **POST** | /auth/register | Create account \+ default org. First user becomes owner. |
| **POST** | /auth/login | Returns access token in body, refresh token in httpOnly cookie. |
| **POST** | /auth/refresh | Rotate refresh token. Returns new access token. |
| **POST** | /auth/logout | Revoke current refresh token. |
| **POST** | /auth/logout-all | Revoke all refresh tokens for the authenticated user. |
| **ORGS & USERS** |  |  |
| **GET** | /orgs/me | List all orgs the current user belongs to. |
| **PATCH** | /orgs/:orgId | Update org settings. Requires admin+. |
| **DELETE** | /orgs/:orgId | Delete org and all data. Requires owner. |
| **GET** | /orgs/:orgId/members | List all members with roles. |
| **PATCH** | /orgs/:orgId/members/:userId/role | Change a member's role. Owner only. |
| **DELETE** | /orgs/:orgId/members/:userId | Remove member from org. Admin+. |
| **POST** | /orgs/:orgId/invitations | Send invite email. Admin+. |
| **POST** | /invitations/:token/accept | Accept an invitation. Public (authenticated). |
| **CLOUD ACCOUNTS** |  |  |
| **POST** | /orgs/:orgId/cloud-accounts | Connect a cloud account. Admin+. |
| **GET** | /orgs/:orgId/cloud-accounts | List all connected accounts. |
| **POST** | /cloud-accounts/:id/validate | Test credentials (STS GetCallerIdentity). |
| **POST** | /cloud-accounts/:id/sync | Trigger resource discovery. Member+. |
| **GET** | /cloud-accounts/:id/sync-status | Poll job status for ongoing sync. |
| **DELETE** | /orgs/:orgId/cloud-accounts/:id | Disconnect account. Admin+. |
| **RESOURCES** |  |  |
| **GET** | /orgs/:orgId/resources | List resources. Filter: provider, type, region, status. |
| **GET** | /orgs/:orgId/resources/:id | Resource details with metadata. |
| **GET** | /orgs/:orgId/resources/:id/metrics | Metric timeseries. Params: metric, from, to, interval. |
| **GET** | /orgs/:orgId/resources/:id/alerts | Alert history for a specific resource. |
| **THRESHOLDS** |  |  |
| **POST** | /orgs/:orgId/resources/:id/thresholds | Create threshold for a resource. Admin+. |
| **PATCH** | /thresholds/:id | Update threshold. Admin+. |
| **DELETE** | /thresholds/:id | Delete threshold. Admin+. |
| **POST** | /orgs/:orgId/threshold-templates/apply | Apply a preset template to all resources of a type. |
| **ALERTS** |  |  |
| **GET** | /orgs/:orgId/alerts | List alerts. Filter: status, severity, resource\_type. |
| **POST** | /alerts/:id/acknowledge | Acknowledge a firing alert. Member+. |
| **POST** | /alerts/:id/resolve | Manually resolve an alert. Member+. |
| **GET** | /alerts/:id/healing | Get AI healing recommendation for this alert. |
| **HEALING & ANOMALIES** |  |  |
| **POST** | /healing/:id/feedback | Submit helpful/applied feedback for a recommendation. |
| **POST** | /alerts/:id/healing/regenerate | Force-regenerate a healing recommendation. |
| **GET** | /orgs/:orgId/anomalies | List all anomaly events. Filter: resource\_id, metric. |
| **AUTO-HEALING** |  |  |
| **GET** | /orgs/:orgId/auto-heal/commands | List whitelisted commands. |
| **POST** | /orgs/:orgId/auto-heal/commands | Add command to whitelist. Owner only. |
| **PATCH** | /auto-heal/commands/:id/approve | Approve a command for execution. Owner only. |
| **GET** | /orgs/:orgId/auto-heal/executions | View execution history and audit log. |
| **SYSTEM** |  |  |
| **GET** | /health | Basic health check. No auth required. Used by load balancers. |
| **GET** | /health/deep | DB \+ Redis \+ queue connectivity check. No auth required. |

# **11\. Feature Specifications**

## **11.1 Authentication System**

See Section 9 for the full token strategy. Registration creates both the user and a default org, setting the user as owner. Login is bcrypt.compare (timing-safe) with Redis-backed account lockout after 5 failures.

## **11.2 Cloud Provider Onboarding (AWS)**

### **Auth Methods**

* Access Key Pair — access\_key\_id \+ secret\_access\_key. Simpler but less secure.

* IAM Role ARN — role\_arn \+ optional external\_id. Recommended for production. Platform assumes the role via STS AssumeRole.

### **Minimum IAM Permissions Required**

|  |
| :---- |
| { |
|   "Statement": \[{ |
|     "Effect": "Allow", |
|     "Action": \[ |
|       "ec2:DescribeInstances", |
|       "rds:DescribeDBInstances", |
|       "s3:ListBuckets", |
|       "lambda:ListFunctions", |
|       "elasticloadbalancing:DescribeLoadBalancers", |
|       "cloudwatch:GetMetricData", |
|       "cloudwatch:ListMetrics", |
|       "sts:GetCallerIdentity" |
|     \], |
|     "Resource": "\*" |
|   }\] |
| } |
|  |

### **Credential Security**

* Encrypted with AES-256-GCM before storage. Key from environment variable only.

* Never logged, never returned in API responses (only masked: "AKIA\*\*\*XXXX").

* Stripped from all Sentry events via beforeSend hook.

* Hard-deleted from database when cloud account is removed.

## **11.3 Resource Fetching Engine**

Runs as a Bull job triggered manually or on a 15-minute schedule. Fetches resources per AWS service per configured region, normalizes them to a unified schema, and upserts to the resources table.

### **Unified Resource Schema**

|  |
| :---- |
| { |
|   org\_id, cloud\_account\_id, |
|   provider: "aws", |
|   resource\_type: "ec2", |
|   provider\_id: "i-0abc123def456", |
|   name: "prod-web-server-1", |
|   region: "us-east-1", |
|   status: "running", |
|   metadata: { |
|     instance\_type: "t3.medium", |
|     tags: { Name: "prod-web-server-1", Env: "production" }, |
|     vpc\_id: "vpc-xxx" |
|   } |
| } |
|  |

## **11.4 Monitoring Engine**

A Bull repeatable job per cloud account. Runs every 60 seconds (configurable, minimum 30s). Uses CloudWatch GetMetricData (preferred over GetMetricStatistics — supports batching up to 500 metrics per API call).

* Fetches all enabled thresholds for monitored resources

* Stores metric values in metric\_snapshots

* Evaluates each value against thresholds — checks Redis dedup cache before firing

* Redis key pattern: alert:{resource\_id}:{metric\_name} with 30-minute TTL

* Auto-resolve: when metric returns to normal, alert is marked resolved

## **11.5 Alert System**

### **Email Notification**

Via Nodemailer \+ SMTP. HTML template includes: resource name/type/region, metric \+ current value \+ threshold, severity color badge, link to alert detail, and AI healing recommendation summary if available.

### **Slack Notification**

Via Slack Incoming Webhooks with Block Kit formatting. Color sidebar: red=critical, yellow=warning, blue=info. Includes "View Alert" action button linking to dashboard.

### **Deduplication & Escalation**

* Same resource \+ metric: re-notify only after 30 minutes of silence

* When alert resolves: single "RESOLVED" notification is sent

* Escalation: if alert unacknowledged for 30 minutes, re-send notification

## **11.6 AI Healing Recommendations**

When an alert fires, a background job calls the Anthropic Claude API with a structured prompt containing full operational context. The response is parsed and stored linked to the alert.

### **Prompt Architecture**

|  |
| :---- |
| // System Prompt (constant) |
| "You are an expert SRE with deep knowledge of AWS infrastructure. |
|  Provide a structured JSON response with keys: |
|  root\_cause, immediate\_steps (array), cli\_commands (array with |
|  command \+ description \+ safe\_to\_automate: bool), |
|  long\_term\_fix, estimated\_resolution\_time." |
|   |
| // User Prompt (dynamic per alert) |
| { |
|   "alert": { |
|     "resource\_type": "ec2", |
|     "metric": "CPUUtilization", |
|     "current\_value": 94.2, |
|     "threshold": 85, |
|     "severity": "critical", |
|     "duration\_firing\_minutes": 8 |
|   }, |
|   "resource\_context": { |
|     "instance\_type": "t3.medium", |
|     "tags": { "Env": "production" } |
|   }, |
|   "recent\_trend": \[ |
|     { "timestamp": "...", "value": 72.1 }, |
|     { "timestamp": "...", "value": 81.3 }, |
|     { "timestamp": "...", "value": 94.2 } |
|   \] |
| } |
|  |

## **11.7 Anomaly Detection**

Statistical Z-score detection using a rolling 24-hour baseline. Runs every 5 minutes per resource. Requires minimum 60 data points (1 hour of polling) before firing to avoid false positives on new resources.

### **Algorithm**

13. Fetch last 24h of metric\_snapshots for resource \+ metric

14. Calculate rolling mean (μ) and standard deviation (σ)

15. Compute Z-score \= (current\_value − μ) / σ

16. If |Z-score| \> 2.5: anomaly detected. Direction: Z \> 2.5 \= high, Z \< −2.5 \= low

17. Dedup: skip if anomaly already open for same resource \+ metric pair

18. Auto-resolve: when Z-score returns within ±2.0

Anomaly notifications are lower urgency than threshold alerts — labeled "⚠️ Anomaly Warning" with the message: "We detected an unusual pattern before it becomes critical. Current value: X. Normal range: μ±2σ \= \[A, B\]."

## **11.8 Auto-Healing Daemon**

| *Security-critical feature. Read the full security design before implementing.* |
| :---- |

### **Security Design**

* Commands must be manually added to the whitelist by an org Owner

* Each command requires explicit Owner approval before it can be activated

* Commands are stored as templates with {{resource\_id}} style variables

* Variable substitution validated against an allowlist before execution

* Executed via child\_process.execFile (args array) — never exec (shell string)

* All executions logged immutably in auto\_heal\_executions with stdout/stderr

* 30-second execution timeout enforced

### **Execution Flow**

19. Alert fires for resource R with metric M

20. AutoHealWorker finds approved whitelist entry for (resource\_type, metric)

21. Substitutes template variables from resource record

22. Validates final command against strict regex — no shell metacharacters allowed

23. Creates auto\_heal\_executions record (status=pending)

24. Executes: child\_process.execFile with args array, 30s timeout

25. Captures exit code, stdout, stderr → updates execution record

26. Writes to audit\_log: { action: "auto\_heal.executed", ... }

## **11.9 MELT Observability System**

| Pillar | Tool | What We Collect |
| :---- | :---- | :---- |
| **Metrics** | New Relic Metric API | ResourceSync duration, MetricPoll duration, HealingGen latency, Active alert counts, Anomaly detection counts |
| **Events** | New Relic Event API | CloudResourceAlert, HealingGenerated, AnomalyDetected, AutoHealExecuted, UserAction — all with provider/resource\_type context |
| **Logs** | Winston → NR Forwarder | Structured JSON with requestId, orgId (hashed), userId (hashed), traceId, spanId on every line |
| **Traces** | New Relic APM | Distributed traces: Express routes auto-instrumented. Workers wrapped as background transactions. Claude API as external span. |

# **12\. Observability Integrations**

## **12.1 Sentry**

Sentry handles error tracking and session replay on both frontend and backend. It must be initialized before any other require/import in the entry file.

### **Backend Initialization**

|  |
| :---- |
| // api/src/index.js — FIRST LINE |
| import \* as Sentry from '@sentry/node'; |
|   |
| Sentry.init({ |
|   dsn: process.env.SENTRY\_DSN, |
|   environment: process.env.NODE\_ENV, |
|   tracesSampleRate: 0.1, |
|   integrations: \[ |
|     Sentry.expressIntegration(), |
|     Sentry.postgresIntegration(), |
|   \], |
|   beforeSend(event) { |
|     // Strip cloud credentials before sending to Sentry |
|     delete event?.request?.data?.access\_key\_id; |
|     delete event?.request?.data?.secret\_access\_key; |
|     return event; |
|   } |
| }); |
|  |

### **Context Enrichment (Auth Middleware)**

|  |
| :---- |
| // After JWT verification: |
| Sentry.setUser({ id: hashedUserId }); |
| Sentry.setContext('organization', { id: req.orgId, slug: req.org.slug }); |
| Sentry.setTag('cloud.provider', 'aws'); |
|  |

### **Frontend Initialization**

|  |
| :---- |
| // web/src/main.jsx — before ReactDOM.render |
| import \* as Sentry from '@sentry/react'; |
|   |
| Sentry.init({ |
|   dsn: import.meta.env.VITE\_SENTRY\_DSN, |
|   integrations: \[ |
|     Sentry.browserTracingIntegration(), |
|     Sentry.replayIntegration({ |
|       maskAllText: true, |
|       blockAllMedia: false, |
|     }), |
|   \], |
|   tracesSampleRate: 0.1, |
|   replaysSessionSampleRate: 0.05, |
|   replaysOnErrorSampleRate: 1.0, |
| }); |
|  |

## **12.2 New Relic**

New Relic provides APM, browser monitoring, custom events, distributed tracing, and uptime synthetics. The newrelic package must be the very first require in the API entry file.

### **Backend Setup**

|  |
| :---- |
| // api/index.js — ABSOLUTE FIRST LINE |
| require('newrelic'); |
|   |
| // api/newrelic.js |
| exports.config \= { |
|   app\_name: \['SRE Platform API'\], |
|   license\_key: process.env.NEW\_RELIC\_LICENSE\_KEY, |
|   distributed\_tracing: { enabled: true }, |
|   transaction\_tracer: { |
|     enabled: true, |
|     record\_sql: 'obfuscated', |
|   }, |
| }; |
|  |

### **Custom Event Examples**

|  |
| :---- |
| // In AlertWorker — record every fired alert as NR event |
| newrelic.recordCustomEvent('CloudResourceAlert', { |
|   provider: resource.provider, |
|   resource\_type: resource.resource\_type, |
|   region: resource.region, |
|   severity: alert.severity, |
|   metric\_name: alert.metric\_name, |
|   metric\_value: alert.metric\_value, |
|   org\_id: hashId(orgId),  // hashed — no raw PII to NR |
| }); |
|  |

### **Custom Dashboard Widgets**

* Active Alerts by Severity — pie chart, NRQL: SELECT count(\*) FROM CloudResourceAlert FACET severity

* Alert Volume Over Time — line chart, 24h timeseries

* Top Firing Resources — table, ordered by alert count

* Healing Recommendation Latency — histogram of generation\_ms percentiles

### **Synthetics Canary**

* Simple browser check on GET /health

* Frequency: every 5 minutes

* Alert: if check fails 2 consecutive times

* Notification: email to org owner

# **13\. Security & OWASP Compliance**

| OWASP Category | Mitigations Implemented |
| :---- | :---- |
| **A01 — Broken Access Control** | RBAC middleware on every route; tenant scope enforced in service layer; resource ownership validated before every write; no IDOR via org\_id validation. |
| **A02 — Cryptographic Failures** | Passwords via bcrypt cost 12; cloud credentials AES-256-GCM encrypted at rest; refresh tokens stored as SHA-256 hash; HTTPS enforced via HSTS; secrets in env only. |
| **A03 — Injection** | Knex parameterized queries throughout; no raw SQL; Joi validates all inputs; execFile with args array for auto-heal (no shell injection). |
| **A04 — Insecure Design** | Threat modeled at design phase (this document); defense in depth at route, service, and DB layers; auto-heal requires Owner approval. |
| **A05 — Security Misconfiguration** | Helmet.js for security headers (CSP, HSTS, X-Frame-Options); explicit CORS origin allowlist; stack traces suppressed in production responses. |
| **A06 — Vulnerable Components** | npm audit in CI pipeline; Dependabot alerts on; major versions pinned. |
| **A07 — Authentication Failures** | Account lockout (5 failures → 15min, Redis); rate limiting on auth endpoints; refresh token rotation on every use; logout-all support. |
| **A08 — Data Integrity** | CI validates build before deploy; no deserialization of untrusted data; auto-heal command regex validation before execution. |
| **A09 — Security Logging** | audit\_logs table for all sensitive actions; failed logins logged with IP; auto-heal executions fully audited; Sentry real-time error alerting. |
| **A10 — SSRF** | Cloud API calls only via AWS SDK (no user-controlled URLs); Slack webhook URLs validated as webhook.slack.com before storage. |

# **14\. Rate Limiting Strategy**

Library: express-rate-limit with Redis store (rate-limit-redis). The Redis store ensures limits work correctly across multiple Node.js processes. On limit exceeded: HTTP 429 with Retry-After header.

| Endpoint Pattern | Limit | Window | Scope |
| :---- | :---- | :---- | :---- |
| POST /auth/login | **10 requests** | 15 min | per IP |
| POST /auth/register | **5 requests** | 1 hour | per IP |
| POST /auth/refresh | **30 requests** | 15 min | per IP |
| POST /cloud-accounts/\*/sync | **5 requests** | 1 min | per org |
| POST /healing/\*/regenerate | **10 requests** | 1 hour | per org |
| POST /channels/\*/test | **5 requests** | 10 min | per org |
| All authenticated endpoints | **300 requests** | 1 min | per user |
| All unauthenticated endpoints | **60 requests** | 1 min | per IP |

# **15\. Data Retention & Privacy Policy**

## **Retention Windows**

| Data Type | Retention | Notes |
| :---- | :---- | :---- |
| **Raw metric snapshots** | **30 days** | Deleted by daily cleanup worker (2am UTC) |
| **Resolved alerts** | **90 days** | Deleted by daily cleanup worker |
| **Firing/acknowledged alerts** | **Indefinite** | Until resolved, then 90-day clock starts |
| **Healing recommendations** | **1 year** | Retained for feedback analysis |
| **Anomaly events** | **90 days** | Deleted by daily cleanup worker |
| **Audit logs** | **2 years** | Compliance requirement |
| **Auto-heal executions** | **2 years** | Forensic audit requirement |
| **Refresh tokens (expired)** | **7 days** | Auto-expired by TTL, purged by cleanup worker |

## **PII in Observability Tools**

* New Relic: user\_id and org\_id are SHA-256 hashed before sending — no raw identifiers

* Sentry: user context uses internal ID only, never email addresses

* Log files: email addresses never written to any log output

* All PII is confined to the PostgreSQL database only

## **Credential Security**

* Cloud credentials: AES-256-GCM encrypted at rest, key in environment variable only

* Never logged in any system — Winston, Sentry, New Relic, or stdout

* API responses return masked versions only: "AKIA\*\*\*XXXX"

* Hard-deleted immediately when a cloud account is removed

# **16\. Non-Functional Requirements**

## **Performance Targets**

| Operation | Target |
| :---- | :---- |
| API read endpoints (list/get) | **p95 \< 200ms** |
| API write endpoints | **p95 \< 500ms** |
| Cloud sync trigger (async enqueue) | **p95 \< 100ms** |
| Monitoring loop per 100 resources | **\< 30 seconds** |
| Alert firing lag (breach → notification) | **\< 90 seconds** |
| AI healing generation | **\< 15 seconds** |
| Dashboard initial page load (FCP) | **\< 2 seconds** |

## **Reliability**

* Bull job retry policy: 3 retries with exponential backoff on failure

* CloudWatch API failures: logged and skipped — monitoring loop continues for other resources

* Claude API failures: alert remains open without recommendation — does not block alert flow

* Database connection pool: min 2, max 10 connections

* Redis auto-reconnect with exponential backoff

## **Default Monitoring Intervals**

* Resource sync: every 15 minutes

* Metric polling: every 60 seconds

* Anomaly detection: every 5 minutes

* Alert dedup window: 30 minutes

* Escalation re-notify: 30 minutes if unacknowledged

# **17\. 3-Day Build Execution Plan**

## **Day 1 — Foundation (\~14 hours)**

| Time | Task | Details |
| :---- | :---- | :---- |
| **0–2h** | **Project Bootstrap** | Monorepo structure (/api, /web, /shared). Docker Compose: postgres, redis, api, web. ESLint \+ Prettier \+ Husky pre-commit hooks. Winston logger with request ID middleware. Environment variable setup (.env.example). |
| **2–5h** | **Database Schema \+ Migrations** | All tables from Section 6\. Knex migration files. Seed script: demo org \+ 3 users \+ sample data. Tenant-scoping middleware (scopedDb factory). |
| **5–9h** | **Auth System** | JWT RS256 keypair generation. Register, login, refresh, logout endpoints. bcrypt (cost 12\) \+ Redis account lockout. httpOnly cookie for refresh token. Axios interceptors for token refresh. |
| **9–12h** | **Org & User Management** | Org CRUD, member management. RBAC middleware (requireRole factory). Invite flow: create → email → accept endpoint. |
| **12–14h** | **Sentry \+ Frontend Shell** | Backend Sentry init with beforeSend credential strip. React app (Vite \+ ShadCN \+ React Router). Frontend Sentry init with session replay. Login, register, invite accept pages. App shell (sidebar, header, org switcher). |

## **Day 2 — Cloud Layer (\~15 hours)**

| Time | Task | Details |
| :---- | :---- | :---- |
| **0–3h** | **Cloud Account Onboarding** | AES-256-GCM credential encryption. AWS validation via STS GetCallerIdentity. CRUD endpoints for cloud accounts. Masked credentials in API responses. |
| **3–7h** | **Resource Fetching Engine** | AWS SDK v3: EC2, RDS, S3, Lambda, ELB describers. Bull job: ResourceSyncWorker. Normalization to unified schema. Upsert logic \+ stale detection. |
| **7–10h** | **Threshold Configuration** | Threshold CRUD API with Joi validation. Default template definitions (AWS Best Practices set). Bulk apply template endpoint. |
| **10–12h** | **New Relic APM Integration** | newrelic.js config. Background transaction naming for workers. Custom attributes: org\_id (hashed), cloud.provider, resource.type. |
| **12–15h** | **Cloud \+ Resource UI** | Cloud account connect wizard (3-step flow). Resource explorer (filterable table). Resource detail drawer with threshold panel. Threshold config form and template apply modal. New Relic Browser agent. |

## **Day 3 — Intelligence Layer (\~14 hours)**

| Time | Task | Details |
| :---- | :---- | :---- |
| **0–4h** | **Monitoring Engine** | CloudWatch GetMetricData integration (batched). Metric snapshot storage. Threshold evaluation \+ Redis dedup. Auto-resolve logic. |
| **4–6h** | **Alert Notification System** | Nodemailer HTML email templates. Slack Block Kit integration. Notification dispatch worker. Escalation re-notify job. |
| **6–8h** | **AI Healing Recommendations** | Anthropic Claude API integration. Structured prompt builder with resource context. JSON response parser → DB storage. Feedback endpoints. |
| **8–10h** | **Anomaly Detection \+ Auto-Heal** | Z-score worker with 24h rolling baseline. Anomaly notification dispatch. Auto-heal whitelist CRUD (owner only). Auto-heal execution engine (execFile \+ audit log). |
| **10–13h** | **Unified Dashboard \+ MELT** | 6-widget dashboard: alerts ring, resource heatmap, alert feed, cloud coverage, healing panel, alert timeline. Alert detail with metric chart (Recharts \+ threshold line). New Relic custom events \+ metrics. NR dashboard upload via API. |
| **13–14h** | **Production Hardening** | Rate limiting all endpoints. Helmet.js \+ CORS config. /health \+ /health/deep endpoints. NR Synthetics canary. Final Sentry \+ NR verification. README with setup guide. |

# **18\. Directory Structure**

|  |
| :---- |
| sre-platform/ |
| ├── api/ |
| │   ├── src/ |
| │   │   ├── index.js              \# Entry (newrelic require FIRST) |
| │   │   ├── app.js                \# Express app factory |
| │   │   ├── config/ |
| │   │   │   ├── index.js          \# Env config validated with Joi |
| │   │   │   └── constants.js |
| │   │   ├── db/ |
| │   │   │   ├── knex.js           \# Knex instance |
| │   │   │   ├── scoped.js         \# Tenant-scoped query builder |
| │   │   │   ├── migrations/ |
| │   │   │   └── seeds/ |
| │   │   ├── middleware/ |
| │   │   │   ├── auth.js           \# JWT verify \+ req.user |
| │   │   │   ├── requireRole.js    \# RBAC factory |
| │   │   │   ├── tenantScope.js    \# org\_id enforcement |
| │   │   │   ├── rateLimiter.js    \# Per-endpoint limiters |
| │   │   │   ├── requestId.js      \# UUID request correlation |
| │   │   │   ├── errorHandler.js   \# Global handler (Sentry aware) |
| │   │   │   └── validate.js       \# Joi validation factory |
| │   │   ├── routes/               \# One file per resource domain |
| │   │   ├── services/             \# Business logic (no req/res) |
| │   │   ├── workers/ |
| │   │   │   ├── queue.js          \# Bull queue definitions |
| │   │   │   ├── resourceSync.worker.js |
| │   │   │   ├── monitoring.worker.js |
| │   │   │   ├── alert.worker.js |
| │   │   │   ├── healing.worker.js |
| │   │   │   ├── anomaly.worker.js |
| │   │   │   ├── autoHeal.worker.js |
| │   │   │   └── cleanup.worker.js |
| │   │   ├── cloud/ |
| │   │   │   └── aws/ |
| │   │   │       ├── client.js     \# SDK client factory |
| │   │   │       ├── ec2.js |
| │   │   │       ├── rds.js |
| │   │   │       ├── s3.js |
| │   │   │       ├── lambda.js |
| │   │   │       ├── elb.js |
| │   │   │       └── cloudwatch.js |
| │   │   └── lib/ |
| │   │       ├── crypto.js         \# AES-256-GCM encrypt/decrypt |
| │   │       ├── jwt.js            \# Token issue/verify |
| │   │       ├── newrelic.js       \# NR custom events helpers |
| │   │       ├── mailer.js         \# Nodemailer wrapper |
| │   │       ├── slack.js          \# Slack webhook wrapper |
| │   │       └── logger.js         \# Winston instance |
| │   ├── newrelic.js               \# NR config (root of api/) |
| │   └── Dockerfile |
| ├── web/ |
| │   ├── src/ |
| │   │   ├── main.jsx              \# Sentry.init() here |
| │   │   ├── App.jsx               \# Routes \+ auth context |
| │   │   ├── lib/ |
| │   │   │   ├── api.js            \# Axios \+ interceptors |
| │   │   │   └── queryClient.js    \# TanStack Query client |
| │   │   ├── hooks/ |
| │   │   ├── pages/ |
| │   │   └── components/ |
| │   └── index.html                \# NR Browser agent script here |
| ├── docker-compose.yml |
| ├── docker-compose.prod.yml |
| \-- README.md |
|  |

# **19\. Environment Variables Reference**

Copy .env.example to .env. Never commit .env to version control. In production, inject via environment (not file).

| Variable | Value / Description |
| :---- | :---- |
| **APPLICATION** |  |
| NODE\_ENV | development | production |
| PORT | 3000 |
| API\_BASE\_URL | http://localhost:3000 |
| WEB\_URL | http://localhost:5173 |
| **DATABASE** |  |
| DATABASE\_URL | postgresql://user:pass@localhost:5432/sre\_platform |
| DATABASE\_POOL\_MIN | 2 |
| DATABASE\_POOL\_MAX | 10 |
| **REDIS** |  |
| REDIS\_URL | redis://localhost:6379 |
| **AUTH** |  |
| JWT\_PRIVATE\_KEY | RS256 private key, base64 encoded |
| JWT\_PUBLIC\_KEY | RS256 public key, base64 encoded |
| JWT\_ACCESS\_EXPIRY | 15m |
| REFRESH\_TOKEN\_EXPIRY\_DAYS | 7 |
| COOKIE\_SECRET | Random 64-character string |
| **ENCRYPTION** |  |
| CREDENTIAL\_ENCRYPTION\_KEY | 32-byte hex string for AES-256-GCM |
| **OBSERVABILITY** |  |
| SENTRY\_DSN | From Sentry project settings |
| NEW\_RELIC\_LICENSE\_KEY | From New Relic account |
| NEW\_RELIC\_APP\_NAME | SRE Platform API |
| **AI** |  |
| ANTHROPIC\_API\_KEY | sk-ant-xxxxx |
| **NOTIFICATIONS** |  |
| SMTP\_HOST | smtp.gmail.com |
| SMTP\_PORT | 587 |
| SMTP\_USER | your@email.com |
| SMTP\_PASS | App-specific password |
| SMTP\_FROM | SRE Platform \<alerts@yourdomain.com\> |
| **FRONTEND (VITE)** |  |
| VITE\_API\_URL | http://localhost:3000/api/v1 |
| VITE\_SENTRY\_DSN | From Sentry project settings |
| VITE\_NEW\_RELIC\_ACCOUNT\_ID | From New Relic account |

# **20\. Glossary of Terms**

| Term | Definition |
| :---- | :---- |
| **MELT** | Metrics, Events, Logs, Traces — the four pillars of modern observability. |
| **MTTR** | Mean Time To Resolution — average time from incident detection to full restoration. |
| **SRE** | Site Reliability Engineering — applying software engineering practices to operations problems. |
| **Threshold** | A configured rule: "alert me when metric X crosses value Y for Z seconds on resource R." |
| **Alert** | A fired notification indicating a threshold has been breached on a monitored resource. |
| **Anomaly** | A statistical deviation from normal behavior, detected before a threshold is crossed. |
| **Healing Rec.** | AI-generated step-by-step remediation plan for a specific alert. |
| **Auto-Heal** | Automated execution of a pre-approved, whitelisted command when an alert fires. |
| **Tenant / Org** | An organization in the multi-tenant system. All data is strictly isolated per org. |
| **RBAC** | Role-Based Access Control — permissions granted based on role, not individual identity. |
| **Bull** | Redis-backed job queue library for Node.js. Provides retry, delay, concurrency control. |
| **Knex** | SQL query builder for Node.js. Not a full ORM — generates explicit, readable SQL. |
| **Z-Score** | Statistical measure: how many standard deviations a value is from the mean. |Z| \> 2.5 \= anomaly. |
| **CloudWatch** | AWS monitoring service providing metrics for all AWS resources via API. |
| **IAM Role ARN** | AWS Identity & Access Management Role ARN — secure credential method using assumed roles. |
| **AES-256-GCM** | Advanced Encryption Standard, 256-bit key, Galois/Counter Mode — authenticated encryption. |
| **RS256** | RSA Signature with SHA-256 — JWT signing using asymmetric public/private keypair. |
| **httpOnly Cookie** | Browser cookie inaccessible to JavaScript — protects against XSS token theft. |
| **OWASP** | Open Web Application Security Project — standard web application security guidelines. |
| **Deduplication** | Suppressing repeated alerts for the same resource+metric within a defined time window. |
| **Audit Log** | Immutable record of all sensitive system actions: who did what, when, and from where. |
| **execFile** | Node.js child\_process method that runs a command with an args array (no shell injection risk). |
| **Distributed Trace** | End-to-end trace of a request across multiple services, linked by trace and span IDs. |

*— End of Documentation —*

SRE Platform v1.0.0 · Personal Learning Project