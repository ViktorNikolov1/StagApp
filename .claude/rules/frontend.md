# Frontend Rules (Expo / React Native)

## Component Organization
- One component per file.
- Colocate styles with components (StyleSheet at bottom of file or dedicated `.styles.ts`).
- UI primitives in `src/components/ui/` (Button, Input, Card, Avatar).
- Feature components in `src/components/{feature}/`.
- Screen components in `app/` (Expo Router file-based routing).

## Accessibility
- All interactive elements must have accessible labels (`accessibilityLabel`).
- Use semantic roles (`accessibilityRole`).
- Support dynamic font scaling.
- Ensure sufficient color contrast.
- Test with screen reader (VoiceOver / TalkBack).

## State Management
- Server state: TanStack Query (caching, revalidation, optimistic updates).
- Client state: Zustand (auth state, UI preferences, draft content).
- No global state for data that should be server state.
- Avoid prop drilling beyond 2 levels — use context or state store.

## API Access
- All API calls through the typed `src/api/` layer.
- No raw `fetch()` in components.
- Use TanStack Query hooks (`useQuery`, `useMutation`) for API calls.
- Handle loading, error, and empty states in every data-fetching screen.
- Show skeleton loaders, not spinners, for initial content loads.

## Validation
- Client-side validation for UX feedback only.
- Server is the source of truth for all validation.
- Use the same validation rules as the server where practical (shared types).

## Security
- Never store tokens in AsyncStorage. Use Expo SecureStore.
- Never embed API keys or secrets in the client bundle.
- Authorization checks in UI are for UX only — the server enforces access.
- Do not log sensitive data on the client.

## Error and Loading States
- Every screen handles: loading, error, empty, and success states.
- Use error boundaries for unexpected crashes.
- Show user-friendly error messages, not raw API errors.
- Implement pull-to-refresh on lists.
- Implement retry buttons on error states.

## Navigation
- Use Expo Router for all navigation.
- Deep linking support for posts, events, and profiles.
- Authenticated routes wrapped in auth layout.
- Type-safe route parameters.

## Performance
- Use `FlatList` or `FlashList` for long lists (never `ScrollView` with map).
- Memoize expensive computations with `useMemo`.
- Memoize callbacks with `useCallback` when passed as props.
- Optimize images: use thumbnails in lists, full size in detail views.
- Lazy load screens with Expo Router dynamic imports.
