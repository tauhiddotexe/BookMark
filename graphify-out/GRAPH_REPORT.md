# Graph Report - C:\Users\admin\Desktop\BookMark  (2026-05-10)

## Corpus Check
- Large corpus: 3529 files · ~3,902,725 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 247 nodes · 866 edges · 23 communities detected
- Extraction: 38% EXTRACTED · 62% INFERRED · 0% AMBIGUOUS · INFERRED: 539 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Views & Google Books Service|API Views & Google Books Service]]
- [[_COMMUNITY_Core Models & Serializers|Core Models & Serializers]]
- [[_COMMUNITY_Django Admin & Supporting Models|Django Admin & Supporting Models]]
- [[_COMMUNITY_Frontend Auth & Layout|Frontend Auth & Layout]]
- [[_COMMUNITY_API Permissions & Pagination|API Permissions & Pagination]]
- [[_COMMUNITY_Frontend API Clients & Hero|Frontend API Clients & Hero]]
- [[_COMMUNITY_Frontend Book & Review Cards|Frontend Book & Review Cards]]
- [[_COMMUNITY_Frontend Session & Header|Frontend Session & Header]]
- [[_COMMUNITY_User Follows & Registration|User Follows & Registration]]
- [[_COMMUNITY_Book Covers & Processing|Book Covers & Processing]]
- [[_COMMUNITY_Notifications & Mini Serializers|Notifications & Mini Serializers]]
- [[_COMMUNITY_Review UI & Creation|Review UI & Creation]]
- [[_COMMUNITY_Review Validation & Lists|Review Validation & Lists]]
- [[_COMMUNITY_Django App Config|Django App Config]]
- [[_COMMUNITY_Project Entry (manage.py)|Project Entry (manage.py)]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `Book` - 40 edges
2. `Follow` - 38 edges
3. `Review` - 38 edges
4. `Comment` - 38 edges
5. `BookList` - 38 edges
6. `Notification` - 37 edges
7. `ShelfEntry` - 37 edges
8. `ReviewViewSet` - 31 edges
9. `BookViewSet` - 29 edges
10. `CommentViewSet` - 28 edges

## Surprising Connections (you probably didn't know these)
- `ProfileAdmin` --uses--> `Book`  [INFERRED]
  backend\api\admin.py → backend\api\models.py
- `ProfileAdmin` --uses--> `Comment`  [INFERRED]
  backend\api\admin.py → backend\api\models.py
- `ProfileAdmin` --uses--> `Follow`  [INFERRED]
  backend\api\admin.py → backend\api\models.py
- `ProfileAdmin` --uses--> `Notification`  [INFERRED]
  backend\api\admin.py → backend\api\models.py
- `ProfileAdmin` --uses--> `Review`  [INFERRED]
  backend\api\admin.py → backend\api\models.py

## Communities

### Community 0 - "API Views & Google Books Service"
Cohesion: 0.1
Nodes (23): base_review_queryset(), create_notification(), discover(), import_google(), latest_comments_prefetch(), like(), my_state(), reviews() (+15 more)

### Community 1 - "Core Models & Serializers"
Cohesion: 0.3
Nodes (21): Book, Comment, Review, BookDetailSerializer, BookListSerializer, BookSearchResultSerializer, BookSerializer, CommentSerializer (+13 more)

### Community 2 - "Django Admin & Supporting Models"
Cohesion: 0.28
Nodes (17): BookAdmin, CommentAdmin, FollowAdmin, NotificationAdmin, ProfileAdmin, ReviewAdmin, BookList, BookListItem (+9 more)

### Community 3 - "Frontend Auth & Layout"
Cohesion: 0.14
Nodes (8): AuthForm(), AuthShell(), BookActionButton(), importBook(), ToastProvider(), useToast(), importGoogleBook(), saveSession()

### Community 4 - "API Permissions & Pagination"
Cohesion: 0.18
Nodes (7): CommentPagination, NotificationPagination, StandardResultsSetPagination, IsOwnerOrReadOnly, ReviewViewSet, ShelfEntryViewSet, PageNumberPagination

### Community 5 - "Frontend API Clients & Hero"
Cohesion: 0.23
Nodes (12): Hero(), discoverBooks(), formatApiError(), getBook(), getBookState(), getLists(), getProfile(), getStats() (+4 more)

### Community 6 - "Frontend Book & Review Cards"
Cohesion: 0.19
Nodes (9): BookCard(), BookCover(), readLikedReviewIds(), toggleLike(), writeLikedReviewIds(), toggleReviewLike(), formatCompactNumber(), formatDate() (+1 more)

### Community 7 - "Frontend Session & Header"
Cohesion: 0.22
Nodes (9): loadMore(), HomeIcon(), handleLogout(), readStoredAccessToken(), getFeed(), clearSession(), getAccessToken(), getStoredTokens() (+1 more)

### Community 8 - "User Follows & Registration"
Cohesion: 0.33
Nodes (3): Follow, RegisterSerializer, BookViewSet

### Community 9 - "Book Covers & Processing"
Cohesion: 0.48
Nodes (5): buildGoogleBooksCover(), escapeXml(), getBookCoverCandidates(), getBookCoverPlaceholder(), normalizeGoogleImageUrl()

### Community 10 - "Notifications & Mini Serializers"
Cohesion: 0.53
Nodes (5): Notification, BookListItemSerializer, Meta, NotificationSerializer, ProfileMiniSerializer

### Community 11 - "Review UI & Creation"
Cohesion: 0.47
Nodes (4): onSubmit(), StarPicker(), createReview(), getCurrentUser()

### Community 12 - "Review Validation & Lists"
Cohesion: 0.4
Nodes (2): ReviewCreateSerializer, BookListViewSet

### Community 13 - "Django App Config"
Cohesion: 0.5
Nodes (2): ApiConfig, AppConfig

### Community 14 - "Project Entry (manage.py)"
Cohesion: 0.67
Nodes (2): main(), Run administrative tasks.

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (1): UserSerializer

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (1): latest_comments_prefetch()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): saveShelf(), setBookShelf()

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): Migration

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): Migration

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Migration

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): ASGI config for config project.  It exposes the ASGI callable as a module-leve

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): WSGI config for config project.  It exposes the WSGI callable as a module-leve

## Knowledge Gaps
- **9 isolated node(s):** `Run administrative tasks.`, `Meta`, `Type`, `Shelf`, `Migration` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Review Validation & Lists`** (5 nodes): `ReviewCreateSerializer`, `.validate()`, `BookListViewSet`, `.get_queryset()`, `.perform_create()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Django App Config`** (4 nodes): `ApiConfig`, `.ready()`, `AppConfig`, `apps.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Entry (manage.py)`** (3 nodes): `main()`, `manage.py`, `Run administrative tasks.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (3 nodes): `UserSerializer`, `.get_followers_count()`, `.get_following_count()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (3 nodes): `.get_reviews()`, `latest_comments_prefetch()`, `.get_reviews()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (3 nodes): `saveShelf()`, `book-log-panel.tsx`, `setBookShelf()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `0001_initial.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `0002_comment_follow_notification_and_more.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `0003_alter_book_cover_url_alter_book_thumbnail_url_and_more.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `asgi.py`, `ASGI config for config project.  It exposes the ASGI callable as a module-leve`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `wsgi.py`, `WSGI config for config project.  It exposes the WSGI callable as a module-leve`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAccessToken()` connect `Frontend Session & Header` to `Review UI & Creation`, `Community 17`, `Frontend Auth & Layout`, `Frontend Book & Review Cards`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `BookCover()` connect `Frontend Book & Review Cards` to `Book Covers & Processing`, `Frontend Auth & Layout`, `Frontend API Clients & Hero`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `ReviewViewSet` connect `API Permissions & Pagination` to `API Views & Google Books Service`, `Core Models & Serializers`, `Django Admin & Supporting Models`, `User Follows & Registration`, `Notifications & Mini Serializers`, `Review Validation & Lists`, `Community 15`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 35 inferred relationships involving `Book` (e.g. with `ProfileAdmin` and `BookAdmin`) actually correct?**
  _`Book` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `Follow` (e.g. with `ProfileAdmin` and `BookAdmin`) actually correct?**
  _`Follow` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `Review` (e.g. with `ProfileAdmin` and `BookAdmin`) actually correct?**
  _`Review` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `Comment` (e.g. with `ProfileAdmin` and `BookAdmin`) actually correct?**
  _`Comment` has 35 INFERRED edges - model-reasoned connections that need verification._