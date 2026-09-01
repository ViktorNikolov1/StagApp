# StagApp API Conventions

> Defines API design standards, patterns, and representative endpoints.
> This is not an exhaustive API reference — it defines conventions that all endpoints must follow.

---

## API Style Decision

**REST with JSON.** Not GraphQL.

### Rationale
- Simpler to implement, test, debug, and cache
- Better tooling ecosystem (Swagger/OpenAPI, Postman, curl)
- Sufficient for this application's data access patterns
- GraphQL adds complexity without proportional benefit for this use case
- Small team benefits from simplicity

---

## Base URL

```
/api/v1
```

All endpoints are prefixed with `/api/v1/`. Version bumps create `/api/v2/` with a deprecation period for v1.

---

## Authentication

All endpoints except those marked `[public]` require a valid JWT in the Authorization header:

```
Authorization: Bearer <access_token>
```

Endpoints marked `[active]` additionally require the user's status to be ACTIVE (not PENDING or SUSPENDED).

---

## Standard Response Format

### Success Response

```json
{
  "data": { ... }
}
```

### Success Response (List)

```json
{
  "data": [ ... ],
  "pagination": {
    "next_cursor": "abc123",
    "has_more": true
  }
}
```

### Error Response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Must be a valid email address" }
  ],
  "requestId": "req_abc123"
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE |
| 400 | Validation error |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found (or not accessible) |
| 409 | Conflict (duplicate resource) |
| 422 | Unprocessable entity |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

**Important:** Return 404 (not 403) when a user lacks access to a resource that exists. This prevents information leakage about resource existence.

---

## Pagination

### Cursor-Based (Feeds)

Used for feeds and time-ordered lists (posts, notifications, comments).

**Request:**
```
GET /api/v1/posts?cursor=abc123&limit=20
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "def456",
    "has_more": true
  }
}
```

- Default limit: 20
- Maximum limit: 50
- Cursor is an opaque string (encoded timestamp + ID)

### Offset-Based (Directories)

Used for searchable/filterable lists (member directory).

**Request:**
```
GET /api/v1/users?page=2&limit=20&role=player
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 87,
    "total_pages": 5
  }
}
```

---

## Filtering and Sorting

**Filtering:**
```
GET /api/v1/users?role=player&graduation_year=2026
GET /api/v1/events?type=game&after=2026-09-01
```

Only allow filtering on indexed, predefined fields. Never allow arbitrary field filtering.

**Sorting:**
```
GET /api/v1/events?sort=start_time&order=asc
```

Default sort is `created_at DESC` for most resources.

---

## Validation

- All request bodies validated via class-validator DTOs
- Validation errors return 400 with field-level error details
- Query parameters validated (type, range, allowed values)
- Path parameters validated (UUID format)
- File uploads validated (size, type)

---

## API Versioning

- URL-based versioning: `/api/v1/`, `/api/v2/`
- Breaking changes require a version bump
- Non-breaking additions (new fields, new endpoints) do not require a version bump
- Old versions deprecated with minimum 6-month notice

---

## Idempotency

- `POST` requests that create resources should include an `Idempotency-Key` header for critical operations (future: payments)
- `PUT` and `DELETE` are naturally idempotent
- For MVP, idempotency keys are recommended but not enforced (enforce when payments are added)

---

## File Uploads

File uploads use a two-step process:

### Step 1: Request Upload URL
```
POST /api/v1/media/upload-url
Content-Type: application/json

{
  "filename": "photo.jpg",
  "content_type": "image/jpeg",
  "file_size": 2048576
}
```

Response:
```json
{
  "data": {
    "upload_url": "https://storage.example.com/...",
    "media_id": "clx...",
    "expires_in": 3600
  }
}
```

### Step 2: Confirm Upload
```
POST /api/v1/media/{media_id}/confirm
```

The server validates the uploaded file in a background job.

---

## Rate Limiting

Rate limit headers included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1693500000
```

When exceeded, return 429 with `Retry-After` header.

---

## Representative Endpoints

### Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | [public] | Register new account |
| POST | `/auth/verify-email` | [public] | Verify email with token |
| POST | `/auth/verify-email/resend` | [public] | Resend verification email |
| POST | `/auth/login` | [public] | Login, returns tokens |
| POST | `/auth/refresh` | [public] | Refresh access token |
| POST | `/auth/logout` | Bearer | Revoke refresh token |
| POST | `/auth/forgot-password` | [public] | Request password reset |
| POST | `/auth/reset-password` | [public] | Reset password with token |

### Users (`/api/v1/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Bearer | Get current user profile |
| PUT | `/users/me` | Bearer | Update current user profile |
| GET | `/users` | Bearer [active] | List/search members |
| GET | `/users/:id` | Bearer [active] | Get member public profile |
| DELETE | `/users/me` | Bearer | Request account deletion |

### Posts (`/api/v1/posts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/posts` | Bearer [active] | Get community feed |
| POST | `/posts` | Bearer [active] | Create a post |
| GET | `/posts/:id` | Bearer [active] | Get single post |
| DELETE | `/posts/:id` | Bearer [active] | Delete post (owner/admin) |
| POST | `/posts/:id/pin` | Bearer [active] | Pin post (coach/admin) |
| DELETE | `/posts/:id/pin` | Bearer [active] | Unpin post (coach/admin) |

### Comments (`/api/v1/posts/:postId/comments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/posts/:postId/comments` | Bearer [active] | List comments on post |
| POST | `/posts/:postId/comments` | Bearer [active] | Add comment to post |
| DELETE | `/posts/:postId/comments/:id` | Bearer [active] | Delete comment (owner/admin) |

### Reactions (`/api/v1/posts/:postId/reactions`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/posts/:postId/reactions` | Bearer [active] | Add/change reaction |
| DELETE | `/posts/:postId/reactions` | Bearer [active] | Remove own reaction |

### Media (`/api/v1/media`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/media/upload-url` | Bearer [active] | Request pre-signed upload URL |
| POST | `/media/:id/confirm` | Bearer [active] | Confirm upload complete |
| GET | `/media/:id` | Bearer [active] | Get media details + signed URL |

### Events (`/api/v1/events`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | Bearer [active] | List events |
| POST | `/events` | Bearer [active] | Create event (coach/admin) |
| GET | `/events/:id` | Bearer [active] | Get event details |
| PUT | `/events/:id` | Bearer [active] | Update event (coach/admin) |
| DELETE | `/events/:id` | Bearer [active] | Delete event (coach/admin) |

### Notifications (`/api/v1/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Bearer | List own notifications |
| POST | `/notifications/read` | Bearer | Mark notifications as read |
| POST | `/notifications/read-all` | Bearer | Mark all as read |

### Reports (`/api/v1/reports`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports` | Bearer [active] | Submit a report |

### Invitations (`/api/v1/invitations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/invitations` | Bearer [active] | Create invitation (coach/admin) |
| GET | `/invitations` | Bearer [active] | List own invitations (coach/admin) |
| GET | `/invitations/:code/info` | [public] | Get invitation info (for registration) |

### Admin (`/api/v1/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/members/pending` | Bearer [admin] | List pending members |
| POST | `/admin/members/:id/approve` | Bearer [admin] | Approve member |
| POST | `/admin/members/:id/deny` | Bearer [admin] | Deny member |
| POST | `/admin/members/:id/suspend` | Bearer [admin] | Suspend member |
| POST | `/admin/members/:id/reinstate` | Bearer [admin] | Reinstate member |
| PUT | `/admin/members/:id/role` | Bearer [admin] | Change member role |
| GET | `/admin/reports` | Bearer [admin] | List pending reports |
| POST | `/admin/reports/:id/review` | Bearer [admin] | Review report |
| GET | `/admin/audit-log` | Bearer [admin] | View audit log |

### Health (`/api/v1/health`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | [public] | Basic health check |
| GET | `/health/ready` | [public] | Readiness check (DB, Redis, Storage) |
