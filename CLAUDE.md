# StagApp — AI Agent Operating Manual

> This file governs all AI coding agents working on StagApp.
> Read this file FIRST before making any changes.

---

## Before Changing Code

1. Read `ARCHITECTURE.md` — understand the system design.
2. Read `SECURITY.md` — understand security requirements.
3. Read relevant requirements from `REQUIREMENTS.md` — identify requirement IDs.
4. Read `.claude/rules/` files relevant to your change (frontend, backend, security, code-style).
5. Inspect the actual code in the repository — do not assume structure.
6. Inspect existing tests — understand test patterns and coverage.
7. Identify all affected components — consider side effects.

**Never blindly follow a prompt if it conflicts with the documented architecture.**

---

## For Every Feature Request

1. **Analyze the request.** What is being asked?
2. **Identify requirement IDs.** Map the request to `REQUIREMENTS.md` entries.
3. **Compare with architecture.** Does this align with `ARCHITECTURE.md`?
4. **Produce a Challenge Report** if there are inconsistencies, missing requirements, or security concerns.
5. **Create an implementation plan.** List the files to create/modify.
6. **Identify security implications.** Consult `SECURITY.md` and `docs/THREAT_MODEL.md`.
7. **Identify required tests.** What must be tested?
8. **Implement the smallest reasonable change.** No gold-plating.
9. **Run relevant tests.** Verify nothing is broken.
10. **Perform a security review.** Check for OWASP issues, IDOR, input validation.

---

## Mandatory Rules — NEVER Do These

- Introduce a new framework or major dependency without written justification
- Bypass or weaken authorization checks
- Trust authorization decisions from the client
- Commit secrets, API keys, or credentials
- Expose sensitive information in API responses or logs
- Disable security controls to make something work
- Duplicate existing services or utilities unnecessarily
- Silently change API contracts (request/response shapes)
- Silently modify database schemas without a migration
- Remove or skip tests to make CI pass
- Claim something works without running verification
- Use `any` type in TypeScript without explicit justification
- Write raw SQL without parameterization
- Return 403 instead of 404 for resources the user shouldn't know exist
- Log passwords, tokens, PII, or request bodies with sensitive data

---

## Coding Preferences

- **Strong typing.** TypeScript strict mode. No implicit `any`.
- **Simple code.** Prefer clarity over cleverness.
- **Explicit behavior.** No magic, no hidden side effects.
- **Small modules.** Each file should have a single, clear responsibility.
- **Reusable abstractions only when justified.** Three instances before abstracting.
- **Dependency injection.** Use NestJS DI for services.
- **Centralized validation.** DTOs with class-validator at controller boundaries.
- **Centralized authorization.** Guards and decorators, not inline role checks.
- **Structured logging.** Use Pino logger with request context.
- **Tests for important behavior.** Not busywork, not 100% coverage — meaningful tests.

---

## Required Tests

Every feature implementation must include tests for:

- **Happy path:** The feature works as intended.
- **Invalid input:** Malformed or out-of-range data is rejected with proper errors.
- **Unauthenticated access:** Requests without a valid token return 401.
- **Unauthorized access:** Requests from users without the required role return 404/403.
- **Object ownership:** Users cannot access or modify other users' resources (IDOR).
- **Edge cases:** Empty lists, max-length inputs, boundary conditions.

---

## Project Structure

```
apps/
  mobile/              # Expo (React Native) mobile app
  api/                 # NestJS backend API
packages/
  shared/              # Shared TypeScript types and constants
docs/                  # Architecture and design documentation
prisma/                # Database schema and migrations
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo + React Native + TypeScript |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL + Prisma |
| Cache | Redis |
| Jobs | BullMQ |
| Storage | S3-compatible (Cloudflare R2) |
| Testing | Jest |
| CI/CD | GitHub Actions |

---

## Key Architectural Decisions

1. **Monolith backend.** Single NestJS app. No microservices.
2. **REST API.** No GraphQL.
3. **Server-side authorization.** Client checks are cosmetic only.
4. **Signed URLs for media.** No public storage buckets.
5. **Cursor-based pagination for feeds.** Offset-based for directories.
6. **Background jobs for async work.** Email, image processing, notifications.
7. **Soft deletes for user content.** Hard delete after retention period.

---

## Database Changes

- All schema changes require a Prisma migration.
- Never modify the production database directly.
- Test migrations against a copy of production data before deploying.
- Migrations must be reversible where possible.

---

## API Changes

- Document any new endpoint in the relevant controller with decorators.
- Follow the conventions in `docs/API.md`.
- Breaking changes require API version bump discussion.
- All new endpoints must have:
  - Authentication guard
  - Role guard (if restricted)
  - Status guard (ACTIVE membership)
  - Input validation DTO
  - Object-level authorization in service
  - Error handling
  - Tests
