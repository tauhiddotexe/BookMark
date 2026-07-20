import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/auth-context";
import {
  getBook, getReviews, getDiaryEntries, importGoogleBook,
  createDiaryEntry, createReview, updateReview, deleteReview,
  addToReadlist, updateReadlistEntry, removeFromReadlist, getReadlist,
  addFavorite, removeFavorite, getFavorites,
  getLists, addBookToList,
} from "@/lib/api";
import { Book, BookList, SearchBookResult, Review, DiaryEntry, ReadlistEntry, FavoriteBook } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { StarPicker } from "@/components/star-picker";
import { Loading } from "@/components/loading";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyStateIllustration, BookshelfIllustration } from "@/components/illustrations";

const ease = [0.16, 1, 0.3, 1] as const;

export function BookPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const searchResult = (location.state as { searchResult?: SearchBookResult })?.searchResult;
  const needsImport = slug?.startsWith("import-") ?? false;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logRating, setLogRating] = useState(0);
  const [logNotes, setLogNotes] = useState("");
  const [logTags, setLogTags] = useState("");
  const [logging, setLogging] = useState(false);

  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [readlistEntries, setReadlistEntries] = useState<ReadlistEntry[]>([]);
  const [favoriteEntries, setFavoriteEntries] = useState<FavoriteBook[]>([]);

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [userLists, setUserLists] = useState<BookList[]>([]);
  const [addingToList, setAddingToList] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug) return;

    // Import placeholder slug — build pseudo-book from location state instead of hitting API
    if (needsImport) {
      if (searchResult) {
        setBook({
          id: "",
          google_books_id: searchResult.google_books_id,
          title: searchResult.title,
          slug,
          author: searchResult.author,
          description: searchResult.description,
          published_date: searchResult.published_date,
          page_count: searchResult.page_count,
          categories: searchResult.categories,
          cover_url: searchResult.cover_url,
          thumbnail_url: searchResult.thumbnail_url,
          average_rating: "0",
          ratings_count: 0,
          openlibrary_id: searchResult.openlibrary_id,
          isbn_13: searchResult.isbn_13,
          isbn_10: searchResult.isbn_10,
        });
      } else {
        // Direct nav to import URL — skeleton with google_books_id
        const googleBooksId = slug.replace("import-", "");
        setBook({
          id: "",
          google_books_id: googleBooksId,
          title: googleBooksId,
          slug,
          author: "",
          description: "",
          published_date: "",
          page_count: 0,
          categories: "",
          cover_url: "",
          thumbnail_url: "",
          average_rating: "0",
          ratings_count: 0,
        });
      }
      setLoading(false);
      return;
    }

    const token = await getToken();
    const [b, r, d, rl, f] = await Promise.all([
      getBook(slug),
      getReviews(slug),
      getDiaryEntries({ book: slug }),
      token ? getReadlist() : Promise.resolve({ count: 0, results: [] }),
      token ? getFavorites() : Promise.resolve({ count: 0, results: [] }),
    ]);
    setBook(b as unknown as Book);
    setReviews(r.results || []);
    setDiaryEntries(d.results || []);
    setReadlistEntries(rl.results || []);
    setFavoriteEntries(f.results || []);
    setLoading(false);
  }, [slug, getToken, needsImport, searchResult]);

  useEffect(() => { refresh(); }, [refresh]);

  const currentReadlistEntry = readlistEntries.find((e) => e.book.slug === slug);
  const isInReadlist = !!currentReadlistEntry;
  const isCurrentlyReading = currentReadlistEntry?.status === "currently_reading";
  const isFavorited = favoriteEntries.some((e) => e.book.slug === slug);

  const handleImport = async () => {
    if (!book || !slug) return;
    const token = await getToken();
    if (!token) return;
    try {
      const result = await importGoogleBook(book.google_books_id, token);
      navigate(`/books/${result.slug}`, { replace: true });
    } catch (e) { console.error(e); }
  };

  const handleLogRead = async () => {
    if (!book) return;
    const token = await getToken();
    if (!token) return;
    setLogging(true);
    try {
      await createDiaryEntry(token, {
        book_id: book.id,
        read_date: logDate,
        rating: logRating || undefined,
        review_text: logNotes,
        tags: logTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setShowLogForm(false);
      setLogRating(0);
      setLogNotes("");
      setLogTags("");
      refresh();
    } catch (e) { console.error(e); }
    setLogging(false);
  };

  const handleMarkAsRead = async () => {
    if (!book) return;
    const token = await getToken();
    if (!token) return;
    try {
      await createDiaryEntry(token, {
        book_id: book.id,
        read_date: new Date().toISOString().split("T")[0],
      });
      refresh();
    } catch (e) { console.error(e); }
  };

  const handleToggleReadlist = async () => {
    const token = await getToken();
    if (!token || !book) return;
    if (isInReadlist) {
      const entry = readlistEntries.find((e) => e.book.slug === slug);
      if (entry) await removeFromReadlist(entry.id, token);
    } else {
      await addToReadlist(book.id, token);
    }
    refresh();
  };

  const handleStartReading = async () => {
    if (!book) return;
    const token = await getToken();
    if (!token) return;
    try {
      if (currentReadlistEntry) {
        await updateReadlistEntry(currentReadlistEntry.id, token, { status: "currently_reading" });
      } else {
        await addToReadlist(book.id, token, "currently_reading");
      }
      refresh();
    } catch (e) { console.error(e); }
  };

  const handleToggleFavorite = async () => {
    const token = await getToken();
    if (!token || !book) return;
    if (isFavorited) {
      const entry = favoriteEntries.find((e) => e.book.slug === slug);
      if (entry) await removeFavorite(entry.id, token);
    } else {
      await addFavorite(book.id, token);
    }
    refresh();
  };

  const openListDialog = async () => {
    setListDialogOpen(true);
    try {
      const data = await getLists();
      setUserLists(data.results || []);
    } catch { /* handled */ }
  };

  const handleAddToList = async (listId: string) => {
    if (!book || !book.id) return;
    const token = await getToken();
    if (!token) return;
    setAddingToList(true);
    try {
      await addBookToList(listId, token, book.id);
      setListDialogOpen(false);
    } catch (e) { console.error(e); }
    setAddingToList(false);
  };

  const handleSubmitReview = async () => {
    if (!book || reviewRating === 0) return;
    const token = await getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      if (editingReview) {
        await updateReview(editingReview, token, {
          rating: reviewRating, review_text: reviewText,
        });
      } else {
        await createReview(token, {
          book_id: book.id, rating: reviewRating, review_text: reviewText,
        });
      }
      setShowReviewForm(false);
      setEditingReview(null);
      setReviewRating(0);
      setReviewText("");
      refresh();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleEditReview = (review: Review) => {
    setReviewRating(parseFloat(review.rating));
    setReviewText(review.review_text);
    setEditingReview(review.id);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    await deleteReview(id, token);
    refresh();
  };

  const openReviewForm = () => {
    setReviewRating(0);
    setReviewText("");
    setEditingReview(null);
    setShowReviewForm(true);
  };

  if (loading) return <Loading />;
  if (!book) return <p className="text-[var(--color-muted)]">Book not found.</p>;

  return (
    <div className="grid gap-7">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <motion.div
          className="md:max-w-[240px]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease, delay: 0.1 }}
        >
          <BookCover book={book} size="large" />
        </motion.div>
        <div className="grid gap-4">
          <h1 className="m-0 text-[clamp(2rem,4.4vw,4.1rem)] leading-[0.95] tracking-[-0.05em]">{book.title}</h1>
          <p className="m-0 text-[var(--color-muted)]">{book.author}</p>
          <p className="m-0 text-sm text-[var(--color-muted)]">
            {book.published_date && <span>{book.published_date}</span>}
            {book.page_count > 0 && <span> · {book.page_count} pages</span>}
          </p>
          {book.description && <p className="text-[var(--color-muted-strong)] leading-relaxed m-0">{book.description}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            {needsImport ? (
              <Button size="sm" onClick={handleImport}>Import Book</Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant={isCurrentlyReading ? "default" : "secondary"}
                  onClick={handleStartReading}
                >
                  {isCurrentlyReading ? "◉ Currently Reading" : "Start Reading"}
                </Button>
                <Button size="sm" variant={isInReadlist ? "danger" : "secondary"} onClick={handleToggleReadlist}>
                  {isInReadlist ? "Remove from Readlist" : "Want to Read"}
                </Button>
                <Button size="sm" variant={isFavorited ? "danger" : "secondary"} onClick={handleToggleFavorite}>
                  {isFavorited ? "Remove Favorite" : "★ Favorite"}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleMarkAsRead}>
                  Mark as Read
                </Button>
                <Button size="sm" onClick={() => setShowLogForm(!showLogForm)}>
                  Log as Read
                </Button>
                <Button size="sm" variant="secondary" onClick={openListDialog}>
                  Add to List
                </Button>
                <Button size="sm" onClick={openReviewForm}>
                  {reviews.length > 0 ? "Review Again" : "Write a Review"}
                </Button>
              </>
            )}
          </div>

          <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to List</DialogTitle>
                <DialogDescription>Choose a list to add this book to.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 pt-2 max-h-[300px] overflow-y-auto">
                {userLists.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">No lists yet. Create one from the Lists page.</p>
                ) : (
                  userLists.map((l) => (
                    <button
                      key={l.id}
                      className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-sm)] text-sm text-left bg-transparent border border-[var(--color-line)] hover:bg-[rgba(255,255,255,0.06)] cursor-pointer transition-all disabled:opacity-50"
                      onClick={() => handleAddToList(l.id)}
                      disabled={addingToList}
                    >
                      <span className="font-medium">{l.name}</span>
                      <span className="text-xs text-[var(--color-muted)]">{l.item_count}</span>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {showLogForm && !needsImport && (
            <motion.div
              className="rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-gradient-to-b from-[rgba(26,42,33,0.82)] to-[rgba(8,12,10,0.96)] p-5 md:p-6 grid gap-4"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              transition={{ duration: 0.3, ease }}
            >
              <h3 className="m-0 text-lg font-bold">Log as Read</h3>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">When did you read it?</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all duration-180 focus:border-[rgba(0,196,106,0.45)] focus:shadow-[0_0_0_4px_rgba(0,196,106,0.12)]"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Rating (optional)</label>
                  <StarPicker value={logRating} onChange={(v) => setLogRating(parseFloat(v))} />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Tags (comma-separated, optional)</label>
                  <input
                    type="text"
                    placeholder="fiction, mystery, favorites"
                    value={logTags}
                    onChange={(e) => setLogTags(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all duration-180 focus:border-[rgba(0,196,106,0.45)] focus:shadow-[0_0_0_4px_rgba(0,196,106,0.12)]"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Notes (optional)</label>
                  <textarea
                    placeholder="How was it?"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all duration-180 focus:border-[rgba(0,196,106,0.45)] focus:shadow-[0_0_0_4px_rgba(0,196,106,0.12)] resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowLogForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleLogRead} disabled={logging}>
                  {logging ? "Saving..." : "Save to Diary"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {!needsImport && (
        <>
          <AnimatePresence>
            {showReviewForm && (
              <motion.div
                className="rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-gradient-to-b from-[rgba(26,42,33,0.82)] to-[rgba(8,12,10,0.96)] p-6 md:p-7 grid gap-4"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3, ease }}
              >
                <h3 className="m-0 text-lg font-bold">
                  {editingReview ? "Edit Review" : (reviews.length > 0 ? "Review Again (re-read)" : "Write a Review")}
                </h3>
                {reviews.length > 0 && !editingReview && (
                  <p className="m-0 text-sm text-[var(--color-muted)]">This will be logged as a re-read.</p>
                )}
                <div className="flex items-center gap-4">
                  <StarPicker value={reviewRating} onChange={(v) => setReviewRating(parseFloat(v))} />
                  {reviewRating > 0 && <Badge variant="gold">{reviewRating}/5</Badge>}
                </div>
                <textarea
                  placeholder="What did you think? (optional)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center gap-4 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSubmitReview} disabled={reviewRating === 0 || submitting}>
                    {submitting ? "Saving..." : (editingReview ? "Update" : "Save")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-[1.45fr_0.82fr] gap-5">
            <FadeIn>
              <section className="grid gap-4">
                <h2 className="m-0 text-[0.8rem] tracking-[0.18em] uppercase text-[var(--color-muted)]">Reviews ({reviews.length})</h2>
                {reviews.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <EmptyStateIllustration className="w-24 h-18 text-[var(--color-muted)]" />
                    <p className="text-[var(--color-muted)]">No reviews yet.</p>
                  </div>
                )}
                <StaggerContainer className="grid gap-3">
                  {reviews.map((review) => (
                    <StaggerItem key={review.id}>
                      <div className="review-card">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="gold">{review.rating} ★</Badge>
                            <span className="text-xs text-[var(--color-muted)]">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditReview(review)}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteReview(review.id)}>Delete</Button>
                          </div>
                        </div>
                        {review.review_text && <p className="text-[var(--color-muted-strong)] leading-relaxed m-0 mt-3">{review.review_text}</p>}
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </section>
            </FadeIn>

            <FadeIn delay={0.1}>
              <section className="grid gap-4">
                <h2 className="m-0 text-[0.8rem] tracking-[0.18em] uppercase text-[var(--color-muted)]">Reading History ({diaryEntries.length})</h2>
                {diaryEntries.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <BookshelfIllustration className="w-28 h-18 text-[var(--color-muted)]" />
                    <p className="text-[var(--color-muted)]">No diary entries.</p>
                  </div>
                )}
                {diaryEntries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    className="flex flex-col gap-2 p-3 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-line)]"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <div className="flex items-center gap-3 text-sm text-[var(--color-muted-strong)]">
                      <span>{new Date(entry.read_date).toLocaleDateString()}</span>
                      {entry.rating && <Badge variant="gold">{entry.rating} ★</Badge>}
                      {entry.is_reread && <Badge>Re-read</Badge>}
                    </div>
                    {entry.review_text && <p className="text-sm text-[var(--color-muted-strong)] m-0">{entry.review_text}</p>}
                  </motion.div>
                ))}
              </section>
            </FadeIn>
          </div>
        </>
      )}
    </div>
  );
}
