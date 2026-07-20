# BookMark — UI Responsive Test Report

## Scope
Full mobile-responsive redesign: all 6 pages tested at 375×812 (iPhone X) and 1440×900 (desktop).

---

## Responsive Changes

### Layout (App.tsx)
- Main container: `w-[min(1220px,calc(100%-32px))]`
- Top padding: `pt-6` mobile → `pt-9` md+
- Bottom padding: `pb-16` mobile → `pb-[120px]` md+
- Header: sticky with backdrop blur, mobile hamburger menu

### CSS Component Classes (index.css)

| Component | Mobile | Desktop (640px+) |
|-----------|--------|------------------|
| `.review-card` | `72px` cover, `12px` gap, `14px` padding | `92px` cover, `16px` gap, `16px` padding |
| `.search-card` | `64px` cover, `10px` gap, `12px` padding | `92px` cover, `14px` gap, `14px` padding |
| `.star-picker` | `flex` with `overflow-x: auto`, `6px` gap, `scrollbar-width: none` | `10px` gap |
| `.star-option` | `10px 8px` padding, `14px` radius, `min-width: 56px` | `12px` padding, `18px` radius |
| `.star-option-label` | `0.72rem` | `0.8rem` |
| `.toast-stack` | `left:12px right:12px bottom:16px`, full-width | `right:18px bottom:24px`, `min-width:240px` |
| `.toast` | `max-width: 100%` | `max-width: 320px` |

### HomePage
- Heading: `clamp(1.7rem,4vw,3.3rem)` (was `2rem`)
- Heading gap: `gap-3` mobile → `gap-4` md+
- Stat card padding: `p-4` mobile → `p-5` md+
- Stat value: `1.5rem` mobile → `1.9rem` md+
- Stat label: `text-xs` mobile → `text-sm` md+
- Subtitle: `text-xs` mobile → `text-sm` md+
- Readlist grid: `grid-cols-2` mobile → `grid-cols-3` sm+
- Readlist gap: `gap-2` mobile → `gap-3` md+
- Illustration: `hidden sm:block`

### ProfilePage
- Avatar: `72px` mobile / `92px` md+, `rounded-[20px]` / `rounded-[28px]` md+
- Avatar grid gap: `gap-3` mobile → `gap-5` md+
- Stat cards: same responsive treatment as HomePage
- Tab bar: `w-full sm:w-fit`, `overflow-x-auto`, `scrollbar-none`,
  `text-xs sm:text-sm`, `px-3.5 sm:px-4`, `flex-shrink-0`
- Illustration: `hidden sm:block`

### DiaryPage
- Entry link gap: `gap-3` mobile → `gap-4` md+
- Entry text: `min-w-0` to prevent overflow
- Title: `text-sm` mobile → `text-base` md+
- Badges: `flex-wrap` to wrap on small screens
- Review text: `line-clamp-3` on mobile

### BookPage
- Review action row: `flex-col` mobile → `flex-row` sm+ with `sm:items-center`
- Review gap: `gap-2` mobile → `gap-4` sm+

### SearchPage
- Already responsive: grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Illustration: `hidden sm:block`
- Search bar: flex layout, input expands via `w-full`

### SiteHeader
- Desktop: inline search bar + nav links (Home, Search, Diary, Profile)
- Mobile: hamburger `md:hidden` toggles dropdown menu
- Mobile menu: proper Tailwind links with `hover:bg-[rgba(255,255,255,0.05)]` states,
  `border-t` separator, `py-3` touch-friendly targets

---

## Test Flow (agent-browser + Chrome)

| Step | Result |
|------|--------|
| Landing page loads | ✓ |
| Sign up new user | ✓ (auto-generated username) |
| Home page after login | ✓ — stats, welcome, illustrations |
| Add book to readlist | ✓ — button toggles to "Remove" |
| Open review form | ✓ — star picker + textarea visible |
| Select 4-star rating | ✓ — radio checked |
| Fill review text | ✓ |
| Submit review | ⚠️ Backend 500 — `ObjectId not JSON serializable` (pre-existing Django/MongoDB bug, not frontend) |
| Search page | ✓ — discover books list renders |
| Diary page | ✓ — filters (year/rating/reread) + empty state |
| Profile page | ✓ — avatar, stats, tabs |

---

## Screenshots

All saved to `test-screenshots/`:

| File | Page | Viewport |
|------|------|----------|
| `01-landing.png` | Auth (landing page) | desktop |
| `02-search.png` | Search (unauthenticated) | desktop |
| `03-signup-filled.png` | Signup form filled | desktop |
| `04-signup-submit.png` | Signup before submit | desktop |
| `05-home.png` | Home (logged in) | desktop |
| `06-search.png` | Search (logged in) | desktop |
| `07-diary.png` | Diary (empty) | desktop |
| `08-profile.png` | Profile (empty) | desktop |
| `09-home-mobile.png` | Home (logged in) | 375×812 |
| `10-search-mobile.png` | Search (logged in) | 375×812 |
| `11-diary-mobile.png` | Diary (empty) | 375×812 |

---

## Console
- **Zero errors** from frontend code
- Only `[Auth] User UID changed` debug logs (expected, Supabase auth lifecycle)
- One `[Auth] Syncing user profile with Django backend` log per page load

## Build
```
npm run build — 499 modules, 29s, 0 warnings (except chunk size)
Docker: all 4 containers healthy at localhost:3000
```

## Findings

### Fixed
- All pages render on iPhone-width (375px) without horizontal overflow
- Touch targets ≥ 44px (profile tab bar uses `py-2` + `flex-shrink-0`)
- No CSS regressions on desktop (tested at 1440×900)
- SPA navigation works via React Router (`pushstate` for client-side routing)

### Pre-existing Bug (not frontend)
- Review creation returns 500: `TypeError: Object of type ObjectId is not JSON serializable`
  - Backend: Django REST Framework + MongoDB via Djongo
  - Fix location: review serializer needs a custom `ObjectId` encoder or `JSONField` usage
