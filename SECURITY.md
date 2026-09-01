# StagApp Security Requirements

> Security design document for StagApp.
> Security is a first-class architectural requirement, not an afterthought.
> All implementation must comply with this document.

---

## Security Objectives

1. **Protect member privacy.** Content is visible only to verified community members.
2. **Prevent unauthorized access.** Only approved members can access the platform.
3. **Protect user data.** Personal information, messages, and media are secured.
4. **Maintain trust.** The platform must be trustworthy for families and minors.
5. **Comply with app store requirements.** Apple and Google privacy/security policies.
6. **Minimize attack surface.** Only expose what is necessary.

---

## Authentication Requirements

### Password Policy
- Minimum 10 characters
- No maximum length (up to 128 characters)
- Check against breached password lists (HaveIBeenPwned k-anonymity API or local top-100k list)
- No arbitrary complexity rules (no "must contain uppercase + symbol")
- Bcrypt hashing with cost factor 12

### Login
- Email + password
- Rate limit: 5 failed attempts per 15 minutes per email, then temporary lockout
- Do not reveal whether email exists on failed login ("Invalid email or password")
- Log all authentication events to audit log

### Token Management
- **Access token:** JWT, 15-minute expiry, signed with RS256 or EdDSA
- **Refresh token:** Opaque token, 30-day expiry, stored hashed in database
- **Refresh token rotation:** Issue new refresh token on each use, invalidate the old one
- **Token revocation:** Invalidate all refresh tokens on password change or security event
- Store access token in secure memory on mobile (not AsyncStorage)
- Store refresh token in secure storage (Expo SecureStore)

### Email Verification
- Required before account activation
- Verification token: cryptographically random, 24-hour expiry, single use
- Rate limit verification email resend: 1 per 2 minutes

---

## MFA Considerations

MFA is not required for MVP but the architecture must support it:
- TOTP-based MFA (Google Authenticator, Authy)
- Add `mfa_enabled`, `mfa_secret` (encrypted) to user table
- Enforce MFA for admin accounts when implemented
- Recovery codes: 10 single-use codes, generated at MFA enrollment

---

## Session Management

- Access tokens are stateless (JWT) — no server-side session store needed
- Refresh tokens are stateful — tracked in database for revocation
- On logout: invalidate the current refresh token
- On password change: invalidate ALL refresh tokens for that user
- On suspicious activity: admin can invalidate all tokens for a user
- Maximum 5 concurrent refresh tokens per user (oldest auto-revoked)

---

## Authorization Model

### RBAC Roles

| Role | Capabilities |
|------|-------------|
| **Pending** | View own profile, complete verification, no community access |
| **Player** | Full community access, manage own content |
| **Alumni** | Full community access, manage own content |
| **Coach** | Full community access, manage own content, manage team events, pin announcements |
| **Parent/Family** | Full community access, manage own content |
| **Admin** | All capabilities, user management, content moderation, system configuration |

### Authorization Enforcement

```
1. JWT Guard          → Is the token valid? (every protected route)
2. Role Guard         → Does the user have a permitted role? (route-level decorator)
3. Status Guard       → Is the user's membership status ACTIVE? (not pending/suspended)
4. Ownership Check    → Does the user own this resource? (service-level logic)
```

### Critical Rules
- **Server-side only.** Client role checks are cosmetic.
- **Deny by default.** Routes are protected unless explicitly marked public.
- **Object-level authorization on every data access.** Never assume that because a user can list resources, they can access any specific resource.
- **Fail closed.** If authorization state is ambiguous, deny access.

---

## Member Verification

### Verification Flow
1. User registers with email and password
2. User verifies email address
3. User completes profile (name, role claim, connection to program)
4. Admin reviews and approves/denies membership
5. On approval, user's status changes from `PENDING` to `ACTIVE`

### Verification Safeguards
- Admin sees verification request with claimed role and connection details
- Admin can request additional information before approval
- Invitation codes can bypass some verification (still requires admin approval for elevated roles)
- Coaches and Admins require manual verification — never auto-approved
- Suspended users cannot access community content

---

## Input Validation

### Principles
- **Validate on the server.** Client validation is for UX only.
- **Whitelist, don't blacklist.** Define what IS allowed, not what isn't.
- **Validate early.** DTOs validated at controller level via class-validator.
- **Sanitize output.** HTML-encode user content before rendering.

### Specific Rules
| Field | Validation |
|-------|-----------|
| Email | RFC 5322 format, max 254 characters, lowercase normalized |
| Password | 10-128 characters, breached password check |
| Display name | 1-50 characters, alphanumeric + spaces + hyphens |
| Post body | 1-5000 characters, no raw HTML |
| Comment body | 1-2000 characters, no raw HTML |
| Bio | 0-500 characters |
| URLs | Must match allowed URL schemes (https only) |
| File names | Regenerated server-side (never use client-provided names) |
| IDs | UUID format validation |
| Pagination | Positive integers, max page size 50 |

---

## API Security

### Transport
- HTTPS only (TLS 1.2+)
- HSTS header on all responses
- No HTTP fallback

### Request Security
- All requests must include valid JWT in Authorization header (except public routes)
- Request body size limit: 1 MB (excluding file uploads)
- Request ID header for tracing (`X-Request-ID`)
- CORS: Restrict to known origins (mobile app, admin dashboard)

### Response Security
- Never return sensitive fields (password hash, MFA secrets, internal IDs where UUIDs are used)
- Consistent error format — never leak stack traces in production
- Remove `X-Powered-By` header
- Set `Content-Type` explicitly on all responses

---

## Object-Level Authorization (IDOR/BOLA Prevention)

This is the #1 API vulnerability (OWASP API Security Top 10).

### Rules
1. **Every data-access operation must verify the requesting user has permission to access that specific object.**
2. Never rely on obscurity of IDs (even UUIDs) as an access control mechanism.
3. Implement authorization checks in the service layer, not just at the route level.
4. Test IDOR explicitly: "Can User A access User B's private resources?"

### High-Risk Endpoints
| Endpoint Pattern | Risk | Mitigation |
|-----------------|------|------------|
| `GET /users/:id` | Viewing other users' private data | Return public profile only; private fields only for own profile |
| `PUT /users/:id` | Modifying another user's profile | Verify `request.user.id === params.id` |
| `DELETE /posts/:id` | Deleting another user's post | Verify ownership or admin role |
| `GET /media/:id` | Accessing private media | Verify membership status; use signed URLs |
| `GET /notifications` | Viewing another user's notifications | Scope query to `request.user.id` |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 requests | 15 minutes (per email) |
| `POST /auth/register` | 3 requests | 1 hour (per IP) |
| `POST /auth/forgot-password` | 3 requests | 1 hour (per email) |
| `POST /auth/verify-email/resend` | 1 request | 2 minutes (per user) |
| General API (authenticated) | 100 requests | 1 minute (per user) |
| File upload | 10 requests | 1 hour (per user) |
| Post creation | 20 requests | 1 hour (per user) |

Implement via Redis-backed rate limiter (e.g., `@nestjs/throttler` with Redis store).

---

## Abuse Protection

- **Spam:** Rate limit post/comment creation; admin content moderation tools
- **Report system:** Users can flag posts, comments, and other users
- **Account suspension:** Admins can suspend accounts (revokes all tokens)
- **Content review queue:** Flagged content enters admin review queue
- **Invite abuse:** Rate limit invitation sends; track invitation chains

---

## Account Enumeration Protection

- Login failure: "Invalid email or password" (never "email not found" vs "wrong password")
- Registration: If email exists, send "you already have an account" email instead of showing an error
- Password reset: Always show "If an account exists, we sent a reset email" regardless
- Timing: Ensure login response time is consistent whether email exists or not (bcrypt dummy hash on miss)

---

## Password / Account Recovery

- **Forgot password:** User submits email, receives reset link with cryptographically random token
- **Reset token:** 1-hour expiry, single use, hashed in database
- **After reset:** Invalidate all existing refresh tokens
- **Account deletion:** User can request deletion from settings. 30-day soft delete grace period. Then hard delete all user data, anonymize audit logs.

---

## File Upload Security

### Upload Flow
1. Client requests pre-signed upload URL from API
2. API validates: user is authenticated, within rate limit, file type allowed
3. API generates pre-signed URL with size and content-type restrictions
4. Client uploads directly to storage
5. Client notifies API of completed upload
6. **Background job validates the uploaded file:**
   - Verify MIME type by reading file magic bytes (not trusting Content-Type header)
   - Verify file size
   - Strip EXIF/metadata from images
   - Generate random filename (never use original)
   - Resize images to standard sizes
   - If file fails validation, delete it and mark media record as rejected

### File Security Rules
| Rule | Implementation |
|------|---------------|
| Allowed types | JPEG, PNG, WebP, HEIC, MP4, MOV only |
| Size limits | Images: 10 MB, Videos: 100 MB, Avatars: 5 MB |
| MIME validation | Server-side magic byte verification |
| Filename | Generated UUID + extension; never use client filename |
| EXIF stripping | Remove all metadata from images (privacy: GPS, device info) |
| Storage access | Pre-signed URLs with 1-hour expiry |
| Malware | Consider ClamAV scanning for uploads (post-MVP) |
| Path traversal | Filenames are generated; no client path input reaches storage |

---

## Media Privacy

- **No public URLs.** All media accessed via time-limited signed URLs.
- **No hotlinking.** Signed URLs expire; cannot be shared externally for long-term access.
- **No media scraping.** Rate limit media URL generation; require authentication.
- **EXIF removal.** Strip GPS coordinates and device information from photos.
- **Minor protection.** Photos of current players (who may be minors) must not be publicly accessible.
- **Download prevention.** Not technically enforceable but reduce ease: disable long-press save in app, watermark consideration (future).

---

## Secure Direct Messaging (Future)

When implemented:
- Messages stored encrypted at rest in database
- Only conversation participants can access messages
- Message delivery via WebSocket (authenticated connection)
- No message content in push notification previews
- Message retention policy (configurable by admin)
- Abuse reporting for messages
- Consider end-to-end encryption for sensitive conversations (significant complexity)

---

## Secrets Management

- **All secrets in environment variables.** Never in source code.
- **`.env` files in `.gitignore`.** Provide `.env.example` with dummy values.
- **Production secrets:** Managed via deployment platform's secret management (Railway encrypted env, AWS SSM, etc.)
- **JWT signing keys:** RSA or Ed25519 key pairs, rotated annually
- **Database credentials:** Unique per environment
- **API keys:** Scoped to minimum required permissions
- **Secret scanning:** Enabled in CI (GitHub secret scanning, gitleaks)

---

## Encryption

| Data | At Rest | In Transit |
|------|---------|-----------|
| Passwords | Bcrypt hash (cost 12) | TLS 1.2+ |
| Refresh tokens | SHA-256 hash in database | TLS 1.2+ |
| User data | Database-level encryption (managed PostgreSQL) | TLS 1.2+ |
| Media files | Storage-level encryption (S3 SSE) | TLS 1.2+ |
| MFA secrets | AES-256 application-level encryption | TLS 1.2+ |
| Future messages | Application-level encryption (AES-256-GCM) | TLS 1.2+ / WSS |

---

## Logging

### What to Log
- Authentication events (login, logout, failed login, password reset)
- Authorization failures (403 responses)
- Input validation failures (400 responses)
- Server errors (500 responses)
- Admin actions (user approval, suspension, content removal)
- Resource creation and deletion
- File uploads

### What NOT to Log
- Passwords or password hashes
- Full JWT tokens
- Credit card numbers or PII beyond user ID
- Request bodies containing sensitive data
- File contents

### Log Format
- Structured JSON via Pino
- Include: timestamp, request ID, user ID, action, resource, outcome, IP (hashed)
- Ship to centralized logging (future: ELK, Datadog, or similar)

---

## Audit Logging

Separate from application logs. Audit logs are an immutable record of security-relevant actions.

### Audited Events
| Event | Data Captured |
|-------|--------------|
| User registered | user_id, email, IP, timestamp |
| Email verified | user_id, timestamp |
| Login success | user_id, IP, device, timestamp |
| Login failure | email (not user_id), IP, timestamp |
| Password changed | user_id, timestamp |
| Password reset requested | email, IP, timestamp |
| Membership approved | user_id, approved_by, role, timestamp |
| Membership suspended | user_id, suspended_by, reason, timestamp |
| Role changed | user_id, old_role, new_role, changed_by, timestamp |
| Content removed by admin | content_type, content_id, removed_by, reason, timestamp |
| Account deleted | user_id, deleted_by (self or admin), timestamp |

### Storage
- Audit logs stored in separate database table
- Append-only (no updates or deletes via application)
- Retention: 2 years minimum
- Future: ship to immutable log storage

---

## Error Handling

- **Never expose stack traces** in production responses
- **Never expose internal identifiers** (database auto-increment IDs, internal error codes)
- **Use generic error messages** for security-sensitive operations
- **Log detailed errors server-side** with request ID for debugging
- **Return consistent error format:**

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

---

## Dependency Security

- **Lock file committed.** `package-lock.json` or equivalent always committed.
- **Audit regularly.** Run `npm audit` in CI pipeline.
- **Dependabot/Renovate.** Automated dependency update PRs.
- **Minimal dependencies.** Prefer standard library over micro-packages.
- **Review new dependencies.** Check maintenance status, download count, known issues before adding.
- **No install scripts from untrusted packages.**

---

## CI/CD Security

- **Branch protection.** `main` requires PR review and passing CI.
- **No secrets in logs.** Mask secrets in CI output.
- **Least privilege.** CI service accounts have minimal permissions.
- **Immutable builds.** Docker images tagged by commit SHA.
- **No `npm install` in production.** Use `npm ci` with locked dependencies.
- **Environment isolation.** CI cannot access production database.

---

## Secret Scanning

- **Pre-commit:** Use `gitleaks` as a pre-commit hook
- **CI:** Run secret scanning on every PR
- **GitHub:** Enable GitHub secret scanning and push protection

---

## SAST (Static Application Security Testing)

- **ESLint security plugins:** `eslint-plugin-security`, `@typescript-eslint`
- **Semgrep:** Run Semgrep with TypeScript security rules in CI
- **CodeQL:** Enable GitHub CodeQL for JavaScript/TypeScript

---

## Dependency Scanning

- **npm audit:** Run on every CI build, fail on high/critical
- **Dependabot:** Enable for automated security update PRs
- **License audit:** Ensure no GPL or restrictive licenses in production dependencies

---

## Security Headers

Set via middleware or reverse proxy:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'none'; (configure per endpoint)
X-XSS-Protection: 0 (deprecated, rely on CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Data Retention

| Data | Retention | Deletion |
|------|-----------|---------|
| User accounts | Until deletion requested | 30-day soft delete, then hard delete |
| Posts / comments | Until deleted by user or admin | Soft delete immediately, hard delete after 90 days |
| Media files | Until associated record deleted | Delete from storage on hard delete |
| Audit logs | 2 years | Archive then delete |
| Refresh tokens | 30 days (auto-expire) | Purge expired tokens weekly |
| Notifications | 90 days | Auto-delete |
| Password reset tokens | 1 hour | Auto-delete expired |

---

## Privacy

- **Minimal data collection.** Only collect what is needed for the platform to function.
- **No analytics tracking** beyond basic usage metrics (no third-party trackers).
- **No data selling.** User data is never shared with third parties.
- **Data export.** Users can request an export of their data.
- **Account deletion.** Users can delete their account and all associated data.
- **Privacy policy.** Required before app store submission.
- **COPPA consideration.** If players may be under 13, additional protections are needed. Assume 18+ for MVP; if younger players are possible, require parental consent.

---

## Administrative Access

- Admin accounts require strong passwords (14+ characters)
- Admin actions are fully audit-logged
- Admin cannot read private messages (if/when implemented)
- Admin sessions have shorter token lifetime (5-minute access token)
- Consider requiring MFA for admin accounts (post-MVP)
- Principle of least privilege: create granular admin roles if needed (moderator vs super-admin)
- Admin API endpoints are on a separate route prefix (`/api/v1/admin/`)

---

## Incident Response Considerations

- **Contact points:** Document who to contact for security incidents
- **Token revocation:** Ability to revoke all tokens for a user or all users
- **Account lockdown:** Ability to suspend any account immediately
- **Audit trail:** All admin actions logged for forensic review
- **Breach notification:** Plan for notifying affected users if a breach occurs
- **Runbook:** Create incident response runbook before production launch

---

## Security Testing Requirements

### Automated (CI)
- Unit tests for authorization logic
- Integration tests for authentication flows
- IDOR tests for every resource endpoint
- Input validation tests for every DTO
- Secret scanning
- Dependency vulnerability scanning
- SAST rules

### Manual (Pre-Launch)
- Authentication flow review
- Authorization matrix testing (can role X access resource Y?)
- File upload testing with malicious files
- Rate limiting verification
- Error message review (no information leakage)
- Token handling review

### High-Risk Features Requiring Extra Review
| Feature | Risk | Required Testing |
|---------|------|-----------------|
| Authentication | Account takeover | Brute force, credential stuffing, token theft |
| Member verification | Unauthorized access | Bypass testing, privilege escalation |
| File uploads | Malware, SSRF | Malicious file testing, MIME bypass |
| Admin panel | Privilege escalation | Role bypass, IDOR on admin endpoints |
| Media access | Privacy breach | Signed URL expiry, direct access attempts |
| User profiles | Data exposure | IDOR, field-level authorization |
| Future: messaging | Privacy breach | Message access control, participant verification |
| Future: payments | Financial fraud | Full payment security audit required |
