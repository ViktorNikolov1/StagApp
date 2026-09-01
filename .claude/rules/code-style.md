# Code Style Rules

## TypeScript
- Strict mode enabled. No implicit `any`.
- Use `unknown` instead of `any` when type is genuinely unknown.
- Prefer `interface` for object shapes, `type` for unions and intersections.
- Use `const` by default. `let` only when reassignment is needed. Never `var`.
- Use optional chaining (`?.`) and nullish coalescing (`??`) over manual checks.
- Use `readonly` for properties that should not be mutated.

## Naming
- **Files:** `kebab-case.ts` (e.g., `user.service.ts`, `create-post.dto.ts`)
- **Classes:** `PascalCase` (e.g., `UserService`, `CreatePostDto`)
- **Functions/methods:** `camelCase` (e.g., `findById`, `createPost`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_POST_LENGTH`, `DEFAULT_PAGE_SIZE`)
- **Interfaces:** `PascalCase`, no `I` prefix (e.g., `UserProfile`, not `IUserProfile`)
- **Enums:** `PascalCase` name, `UPPER_SNAKE_CASE` values
- **Boolean variables:** Use `is`, `has`, `can`, `should` prefix (e.g., `isActive`, `hasPermission`)

## Module Size
- Files should generally be under 300 lines.
- If a file exceeds 300 lines, consider splitting by responsibility.
- One class per file for services, controllers, and DTOs.

## Error Handling
- Use NestJS built-in exceptions (`NotFoundException`, `ForbiddenException`, etc.).
- Never swallow errors silently.
- Log errors with context (request ID, user ID, operation).
- Throw specific errors; catch specific errors. Avoid catch-all where possible.

## Async Code
- Always use `async/await`, never raw `.then()/.catch()` chains.
- Handle promise rejections. No unhandled promises.
- Use `Promise.all` for independent async operations.

## Comments
- Write self-documenting code. Minimize comments.
- Comments explain WHY, not WHAT.
- Remove commented-out code. Use git history instead.
- TODO comments must include a ticket/issue reference.

## Dependencies
- Prefer standard library and framework-provided solutions.
- Before adding a dependency: check maintenance status, bundle size, security history.
- No dependencies for trivial operations (string manipulation, simple date formatting).
- Pin major versions in package.json.

## Imports
- Group imports: external packages, then internal modules, then relative imports.
- Use path aliases (`@/` or configured aliases) for deep imports.
- No circular dependencies.
