# Auth Cascade & Profile Routing Fix Plan

## Root Cause Analysis

### Bug 1: `book-log-panel.tsx` & `diary-log-modal.tsx` & `review-composer.tsx` use DEAD `session.ts` for tokens
- `getAccessToken()` from `@/lib/session` always returns `""` (empty string)
- Empty string is truthy in JS → passes `if (!access)` check
- Sends API requests with `Authorization: Bearer ` (empty token)
- Backend returns 403 → triggers auth retry → token refresh → retry still 403 (backend sees empty bearer) → **FORCED SIGNOUT**
- **This is THE primary cause of users getting logged out when logging books/reviews**

### Bug 2: `api.ts` line 287 treats ALL 403s as auth failures
- `(response.status === 401 || response.status === 403)` triggers token refresh + retry
- After retry with fresh token, if still 403 → `auth.signOut()` (line 334)
- But 403 can mean "permission denied on this resource" (not auth failure)
- Profile 404s returning 403, resource permission errors, malformed slugs → all cascade to signout

### Bug 3: Profile links in `activity-feed.tsx` use `/profiles/` (wrong route)
- Line 38: `to={/profiles/${activity.user_name}}`
- Line 56: `to={/profiles/${activity.target_user_name}}`  
- App routes use `/profile/:username` (singular) not `/profiles/`
- These dead links cause 404 routing failures

### Bug 4: `site-header.tsx` profile link uses potentially invalid username
- Line 14: `const username = localUser?.username || user?.displayName || ""`
- `user?.displayName` can be anything (e.g. "Android Studio", full name, etc.)
- If `localUser` hasn't loaded yet, `displayName` becomes the profile slug
- Navigates to `/profile/Android Studio` → API call to `/profiles/Android Studio/` → 404/403 → cascade

### Bug 5: No profile slug validation anywhere
- `ProfilePage.tsx` passes raw `useParams().username` directly to API
- No validation that slug is valid (alphanumeric, no spaces, no special chars)
- Invalid slugs hit backend → errors → can trigger auth cascade

## Fix Plan

- [x] **Fix 1**: Replace all `import { getAccessToken } from "@/lib/session"` with Firebase auth token via `useAuth().getToken()`
- [x] **Fix 2**: Refactor `api.ts` 401/403 handling — only 401 triggers token refresh. 403 = permission error, never triggers signout
- [x] **Fix 3**: Fix `/profiles/` → `/profile/` in activity-feed.tsx  
- [x] **Fix 4**: Add defensive username validation in site-header.tsx — never use displayName as profile slug
- [x] **Fix 5**: Add slug validation in ProfilePage.tsx before API call
- [x] **Fix 6**: Add structured auth logging for invalidation decisions
- [x] **Fix 7**: Remove dead `session.ts` file
- [ ] **Verify**: Build passes, test login/logout/book-log/profile flows
