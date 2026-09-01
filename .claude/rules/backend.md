# Backend Rules (NestJS)

## Service Organization
- One module per domain entity (auth, users, posts, comments, events, etc.).
- Module contains: controller, service, DTOs, tests.
- Shared code in `src/common/` (guards, decorators, filters, pipes, interceptors).
- Configuration in `src/config/` module.

## Controllers
- Controllers handle HTTP concerns ONLY: parse input, call service, return response.
- No business logic in controllers.
- Decorate with `@ApiTags`, `@ApiOperation` for Swagger docs.
- Use NestJS decorators: `@UseGuards`, `@Roles`, `@CurrentUser`.
- Return DTOs/response objects, not raw Prisma entities.

## Validation
- Every request body has a DTO class with class-validator decorators.
- Use `ValidationPipe` globally with `whitelist: true` and `forbidNonWhitelisted: true`.
- Path params validated with `ParseUUIDPipe` or equivalent.
- Query params validated with DTO classes.

## Authorization
- `AuthGuard` on all protected routes (via global guard with `@Public()` exceptions).
- `RolesGuard` + `@Roles(Role.ADMIN)` for role-restricted routes.
- `ActiveGuard` to ensure user status is ACTIVE (not PENDING/SUSPENDED).
- Object-level authorization in service methods, not controllers.
- Pattern: `if (resource.authorId !== currentUser.id && currentUser.role !== Role.ADMIN) throw new NotFoundException();`

## Persistence (Prisma)
- Access database through Prisma service (injected via DI).
- Select only needed fields in queries (no `select *` patterns).
- Always filter soft-deleted records: `where: { deletedAt: null }`.
- Use transactions for multi-table writes.
- Index foreign keys and frequently queried columns.

## Error Handling
- Use NestJS built-in exceptions.
- Global exception filter catches unhandled errors, logs them, returns safe response.
- Never expose stack traces, SQL errors, or internal details in responses.
- Log errors with structured context (request ID, user ID, operation).

## Logging
- Use Pino logger (NestJS integration).
- Structured JSON format.
- Include: request ID, user ID, module, action, duration.
- Never log: passwords, tokens, full request bodies with PII.
- Log levels: error (failures), warn (concerning), log (operations), debug (development).

## Background Jobs
- Use BullMQ for async work.
- Jobs must be idempotent (safe to retry).
- Set reasonable retry limits (max 3) with exponential backoff.
- Dead letter queue for failed jobs.
- Monitor job queue health.

## Testing
- Unit tests for services (mock Prisma, mock external services).
- Integration tests for controllers (Supertest against running app with test database).
- Test authorization: unauthenticated, wrong role, non-owner.
- Test validation: missing fields, invalid formats, boundary values.
- Name test files `*.spec.ts` adjacent to source files.
