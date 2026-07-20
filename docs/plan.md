# BookMark → Letterboxd-for-Books: UX Gap Analysis & Execution Plan

## Why This Matters

Letterboxd works because it makes logging and reviewing the default muscle memory. Every film page has "diary" as the primary action. The calendar makes you want to fill in blank days. The half-star rating is tactile and satisfying. The poster grid is visual and browsable.

Our app has the bones (search, import, review, diary, readlist, favorites) but the UX flow is inverted: users have to go through reviews to create diary entries, there's no "I read this" button independent of writing a review, and the diary is a flat list instead of a calendar grid.

## Phase 1 — Core Reading UX

**Goal**: Make logging a book feel as natural as Letterboxd makes logging a film.

### 1.1 Add "Log as Read" button on book pages
- Independent of the review form
- Shows a date picker, optional rating, optional notes
- Creates a DiaryEntry directly (no Review required)
- Auto-opens with today's date pre-selected

Files: `frontend/src/pages/BookPage.tsx`, `backend/api/views.py`, `backend/api/serializers.py`
Backend: DiaryEntry create endpoint already exists (POST /api/diary/) but is not used by frontend

### 1.2 Add date picker to diary logging
- Users choose the read date freely (past or present)
- Calendar-style date input, not just a text field

### 1.3 Add "Currently Reading" shelf
- Third status alongside "Want to Read" and "Read"
- Show progress (% complete or page number)
- Track start date

Backend: New model `ReadingSession` or add status field to `Readlist`
Frontend: New shelf on HomePage and BookPage

### 1.4 Switch diary view to calendar grid
- Letterboxd-style month calendar
- Each day cell shows book cover thumbnails
- Fill patterns visible at a glance
- Navigation by month/year
- Preserve existing list view as an option

Files: `frontend/src/pages/DiaryPage.tsx`, new component `src/components/calendar-diary.tsx`

### 1.5 Mark as Read (backfill) vs Log to Diary distinction
- "Mark as Read" = simple flag (no date needed, for backfilling pre-app books)
- "Log to Diary" = dated entry (appears on the calendar)
- This unblocks the Year in Review feature

## Phase 2 — Discovery & Organization

**Goal**: Give users tools to organize books the way Letterboxd users organize films.

### 2.1 Custom Lists
- Create named lists (e.g., "Best Fantasy Novels", "Books That Changed Me")
- Add/remove/reorder books
- Public or private
- Pinned to profile (like Letterboxd)
- Ranked or unranked ordering
- List detail page with poster grid

Backend: New model `BookList` + `BookListItem`
Frontend: New page `/lists`, `/lists/:id`, new section on ProfilePage

### 2.2 Tags on diary entries
- Freeform text keywords per entry
- Displayed on profile as clickable filters
- Searchable

Backend: Add `tags` field to DiaryEntry model (JSONField or many-to-many)
Frontend: Tag input on diary form, tag badges on entries

### 2.3 Upgrade search
- Filters: genre, year range, page count
- ISBN search
- Toggle between card list and poster grid view

### 2.4 Poster grid view
- Letterboxd's signature visual: dense grid of covers
- Hover shows title, year, rating
- Toggle on search results and lists

New component: `src/components/poster-grid.tsx`

## Phase 3 — Profile & Stats

**Goal**: Make the profile feel like a reading identity, not just a settings page.

### 3.1 Top N books on profile
- User picks N books to feature at the top of their profile
- Displayed as large covers in a row

### 3.2 Expanded stats page
- Rating distribution histogram (how many of each star rating)
- Genre breakdown (pie/bar chart)
- Monthly calendar heatmap
- Reading streak (consecutive days with a log)
- Most-read authors
- Books by decade
- Pages read total (requires page_progress tracking)

Backend: New `/stats/detailed/` endpoint
Frontend: New stats section on ProfilePage

### 3.3 Year in Review
- Annual reading summary
- Books read, pages read, top genres, top ratings
- Best book of the year (highest rated)
- Months with most reading

### 3.4 Reading goals
- Set annual goal (e.g., "Read 52 books this year")
- Progress bar on profile/home
- Tracking by calendar year

## Phase 4 — Social (future)

### 4.1 Public profiles
- Read-only view for non-authenticated users
- Shareable link

### 4.2 Friend/follow system
- Follow other users
- Activity feed of followed users' logs

### 4.3 Public reviews on book pages
- Aggregate community reviews (not just your own)

### 4.4 List discovery
- Browse popular/public lists
- Trending lists section

## Implementation Priority

```
Phase 1: NOW — Core UX (makes the app actually usable as a diary)
├── 1.1 Log as Read (highest impact, smallest change) ✅ DONE
│   ├── New API function: createDiaryEntry (POST /api/diary/)
│   ├── New button + inline form on BookPage (date, rating, notes)
│   └── Backend auto-detects re-reads on direct diary entry
├── 1.2 Calendar diary (biggest UX change) ✅ DONE
│   ├── New CalendarDiary component (month grid with day cells)
│   ├── Day cells show book covers + ratings, "+N more" for overflow
│   ├── Click day to expand entries below the calendar
│   ├── Month navigation (prev/next arrows)
│   └── Toggle between Calendar / List views
├── 1.3 Currently Reading shelf ✅ DONE
│   ├── Backend: status/current_page/start_date fields on Readlist model
│   ├── Backend: filtering by status, auto-set start_date on reading
│   ├── Frontend: BookPage button (Start Reading / ◉ Currently Reading)
│   ├── Frontend: HomePage Currently Reading section (top, above diary)
│   └── Separate want_to_read vs currently_reading throughout
├── 1.4 Date picker (covered by 1.1 form)
└── 1.5 Mark as Read (backfill) vs Log to Diary (dated) distinction ✅ DONE
    ├── "Mark as Read" — one-click, today's date, no form
    ├── "Log as Read" — full form with date picker, rating, notes
    └── Both create DiaryEntry; difference is speed vs completeness

Phase 2: NEXT — Discovery & Organization
├── 2.1 Custom Lists ✅ DONE
│   ├── BookList + BookListItem models (MongoDB via Django)
│   ├── CRUD API with add_book / remove_book / reorder actions
│   ├── ListsPage (browse, create, delete)
│   ├── ListDetailPage (item grid, edit, delete)
│   ├── BookPage "Add to List" dialog
│   └── "Lists" nav link in header
├── 2.2 Tags on diary entries ✅ DONE
│   ├── JSONField on DiaryEntry model
│   ├── Tag input on Log as Read form
│   ├── Tag display on diary entries
│   ├── Tag filtering on DiaryPage
│   └── Tag editing on diary entries
├── 2.3 Upgrade search with filters + ISBN ✅ DONE
│   ├── category param on search endpoint
│   ├── isbn param for direct ISBN lookup
│   ├── Category filter input on SearchPage
│   └── ISBN search input on SearchPage
└── 2.4 Poster grid view ✅ DONE
    └── Reusable PosterGrid component (grid-cols configurable)

Phase 3: SOON — Identity & Stats
├── 3.1 Top N books on profile
├── 3.2 Expanded stats page
├── 3.3 Year in Review
└── 3.4 Reading goals
```

## Current State: Frontend Endpoints

| Route | Com ponent | Has Data |
|-------|-----------|----------|
| `/` | HomePage | ✅ Stats, diary, readlist |
| `/books/:slug` | BookPage | ✅ Book, reviews, diary, readlist, favorites |
| `/profile` | ProfilePage | ✅ Diary, reviews, readlist, favorites, stats |
| `/search` | SearchPage | ✅ Search results, discover |
| `/diary` | DiaryPage | ✅ Flat list with filters |
| `/lists` | ❌ Missing | No component exists |
| `/lists/:id` | ❌ Missing | No component exists |

## Current State: Backend Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET/POST | `/api/diary/` | ✅ Exists, frontend only uses GET |
| All review CRUD | `/api/reviews/` | ✅ Working |
| Book search/discover/import | `/api/books/*` | ✅ Working |
| Stats | `/api/stats/` | ✅ Basic stats |
| Readlist | `/api/readlist/` | ✅ Working |
| Favorites | `/api/favorites/` | ✅ Working |
| Profile | `/api/me/` | ✅ Working |
| Lists | `/api/lists/` | ❌ Missing |

## Architecture Decisions

- **Lists**: New Django model `BookList` (owner, name, description, is_public, is_ranked) + `BookListItem` (list, book, position, notes)
- **Currently Reading**: Add `status` field to Readlist model (values: want_to_read, currently_reading) or new model
- **Tags**: JSONField on DiaryEntry for flexibility (no schema migration needed)
- **Calendar diary**: Pure frontend component, data from existing diary endpoints with month/year grouping
- **Stats expansion**: New backend endpoint `/stats/detailed/` for heavier computations
- **Poster grid**: Shared component, accepts list of books/search results

## Dependencies

- No new npm packages needed for Phase 1 (date picker from native HTML `<input type="date">`)
- Phase 2: No new packages (drag and drop from HTML5 native or minimal JS)
- Phase 3: Chart rendering (Chart.js or lightweight canvas) for stats visualizations
- All phases work within existing Tailwind v4 + Motion + shadcn/ui stack
