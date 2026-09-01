# Security Rules

These are mandatory. Violations must be fixed before merge.

## Authentication
- All protected routes require JWT validation via `AuthGuard`.
- Access tokens: 15-minute expiry, RS256/EdDSA signed.
- Refresh tokens: hashed in database, rotated on use, revoked on password change.
- Passwords hashed with bcrypt, cost factor 12.
- No password or token logged anywhere.

## Authorization
- Enforce authorization SERVER-SIDE. Client checks are cosmetic.
- Every protected route uses `@Roles()` decorator + `RolesGuard`.
- Every data access verifies the user has access to THAT SPECIFIC resource (IDOR prevention).
- Return 404 (not 403) for resources the user shouldn't know exist.
- Pending and suspended users cannot access community endpoints.
- Admin endpoints on separate route prefix with admin guard.

## Input Validation
- All request bodies validated via class-validator DTOs.
- All path/query params validated for type and format.
- Never trust client-provided file names, MIME types, or content types.
- Sanitize user content before storage. HTML-encode on output.

## Data Exposure
- Never return: password hashes, MFA secrets, internal IDs, refresh tokens.
- API responses must explicitly select fields to return (no `select *` equivalent).
- Error messages must not reveal: stack traces, SQL errors, internal paths, whether an email exists.

## File Uploads
- Validate MIME type by magic bytes, not Content-Type header.
- Generate random filenames. Never use client-provided names in storage paths.
- Strip EXIF metadata from images.
- Serve media via signed URLs with expiration. No public buckets.

## Secrets
- All secrets in environment variables. Never in code.
- `.env` in `.gitignore`.
- No secrets in log output.
- No secrets in error responses.

## Database
- All queries through Prisma (parameterized by default).
- Raw SQL requires security review and explicit parameterization.
- No cascade deletes in database — handle in application code.
- Soft delete user content. Hard delete after retention period.

## Rate Limiting
- Auth endpoints: strict per-email and per-IP limits.
- General API: per-user limits.
- File uploads: per-user limits.
- Return 429 with Retry-After header when exceeded.
