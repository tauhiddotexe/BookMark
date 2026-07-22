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

function formatStars(value: number | string | null) {
  const rating = value ? Number(value) : 0;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
}

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
  const [logRating, setLogRating] = useState<number>(0);
  const [logNotes, setLogNotes] = useState("");
  const [logging, setLogging] = useState(false);

  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [readlistEntries, setReadlistEntries] = useState<ReadlistEntry[]>([]);
  const [favoriteEntries, setFavoriteEntries] = useState<FavoriteBook[]>([]);

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [userLists, setUserLists] = useState<BookList[]>([]);
  const [addingToList, setAddingToList] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug) return;
    if (needsImport) {
      if (searchResult) {
        setBook({
          id: "", google_books_id: searchResult.google_books_id, title: searchResult.title, slug,
          author: searchResult.author, description: searchResult.description,
          published_date: searchResult.published_date, page_count: searchResult.page_count,
          categories: searchResult.categories, cover_url: searchResult.cover_url,
          thumbnail_url: searchResult.thumbnail_url, average_rating: "0", ratings_count: 0,
          openlibrary_id: searchResult.openlibrary_id, isbn_13: searchResult.isbn_13, isbn_10: searchResult.isbn_10,
        });
      } else {
        const gid = slug.replace("import-", "");
        setBook({
          id: "", google_books_id: gid, title: gid, slug, author: "", description: "",
          published_date: "", page_count: 0, categories: "", cover_url: "", thumbnail_url: "",
          average_rating: "0", ratings_count: 0,
        });
      }
      setLoading(false); return;
    }
    const token = await getToken();
    const [b, r, d, rl, f] = await Promise.all([
      getBook(slug), getReviews(slug), getDiaryEntries({ book: slug }),
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

  const myLatestDiary = diaryEntries.length > 0 ? diaryEntries[0] : null;
  const currentReadlistEntry = readlistEntries.find((e) => e.book.slug === slug);
  const isInReadlist = !!currentReadlistEntry;
  const isCurrentlyReading = currentReadlistEntry?.status === "currently_reading";
  const isFavorited = favoriteEntries.some((e) => e.book.slug === slug);

  const handleImport = async () => {
    if (!book || !slug) return;
    const token = await getToken(); if (!token) return;
    try {
      const result = await importGoogleBook(book.google_books_id, token);
      navigate(`/books/${result.slug}`, { replace: true });
    } catch (e) { console.error(e); }
  };

  const handleLogRead = async () => {
    if (!book) return;
    const token = await getToken(); if (!token) return;
    setLogging(true);
    try {
      await createDiaryEntry(token, {
        book_id: book.id, read_date: logDate,
        rating: logRating || undefined, review_text: logNotes,
        tags: [],
      });
      setShowLogForm(false);
      setLogRating(0); setLogNotes(""); setLogDate(new Date().toISOString().split("T")[0]);
      refresh();
    } catch (e) { console.error(e); }
    setLogging(false);
  };

  const openLogForm = () => {
    setLogRating(myLatestDiary?.rating ? parseFloat(myLatestDiary.rating) : 0);
    setLogNotes("");
    setLogDate(new Date().toISOString().split("T")[0]);
    setShowLogForm(true);
  };

  const handleToggleReadlist = async () => {
    const token = await getToken(); if (!token || !book) return;
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
    const token = await getToken(); if (!token) return;
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
    const token = await getToken(); if (!token || !book) return;
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
    try { const data = await getLists(); setUserLists(data.results || []); } catch { }
  };

  const handleAddToList = async (listId: string) => {
    if (!book || !book.id) return;
    const token = await getToken(); if (!token) return;
    setAddingToList(true);
    try { await addBookToList(listId, token, book.id); setListDialogOpen(false); } catch (e) { console.error(e); }
    setAddingToList(false);
  };

  const handleSubmitReview = async () => {
    if (!book || reviewRating === 0) return;
    const token = await getToken(); if (!token) return;
    setSubmitting(true);
    try {
      if (editingReview) {
        await updateReview(editingReview, token, { rating: reviewRating, review_text: reviewText });
      } else {
        await createReview(token, { book_id: book.id, rating: reviewRating, review_text: reviewText });
      }
      setShowReviewForm(false); setEditingReview(null);
      setReviewRating(0); setReviewText("");
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
    const token = await getToken(); if (!token) return;
    await deleteReview(id, token);
    refresh();
  };

  const openReviewForm = () => {
    setReviewRating(0); setReviewText(""); setEditingReview(null);
    setShowReviewForm(true);
  };

  if (loading) return <Loading />;
  if (!book) return <p className="text-[var(--color-muted)]">Book not found.</p>;

  const avgRating = parseFloat(book.average_rating || "0");

  return (
    <div className="grid gap-8">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6 md:gap-8 items-start"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <div className="md:max-w-[220px] mx-auto md:mx-0">
          <BookCover book={book} size="large" />
        </div>

        <div className="grid gap-4">
          <h1 className="m-0 text-[clamp(1.8rem,3.6vw,3.2rem)] leading-[1] tracking-[-0.04em]">{book.title}</h1>
          <p className="m-0 text-base text-[var(--color-muted)]">{book.author}</p>

          {avgRating > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-lg tracking-[0.05em]" style={{ color: "var(--color-accent)" }}>{formatStars(book.average_rating)}</span>
              <span className="text-sm text-[var(--color-muted)]">{book.average_rating} ({book.ratings_count})</span>
            </div>
          )}

          {myLatestDiary && myLatestDiary.rating && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-strong)]">
              <span className="text-[var(--color-muted)]">Your rating:</span>
              <span className="text-base tracking-[0.05em]" style={{ color: "var(--color-accent)" }}>{formatStars(myLatestDiary.rating)}</span>
              <span className="text-[var(--color-muted)]">{myLatestDiary.rating}</span>
            </div>
          )}

          <p className="m-0 text-sm text-[var(--color-muted)]">
            {book.published_date && <span>{book.published_date.slice(0, 4)}</span>}
            {book.page_count > 0 && <span> · {book.page_count} pages</span>}
          </p>

          {book.description && <p className="text-[var(--color-muted-strong)] leading-relaxed m-0 text-sm">{book.description}</p>}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {needsImport ? (
              <Button size="sm" onClick={handleImport}>Import Book</Button>
            ) : (
              <>
                <Button size="sm" onClick={openLogForm}>
                  {myLatestDiary ? "Log again" : "Log"}
                </Button>

                {myLatestDiary?.rating && (
                  <span className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-[rgba(0,196,106,0.1)] text-sm" style={{ color: "var(--color-accent)" }}>
                    {Array.from({ length: 5 }, (_, i) => {
                      const r = parseFloat(myLatestDiary.rating || "0");
                      const fill = Math.min(1, Math.max(0, r - i));
                      return (
                        <span key={i} style={{ opacity: fill > 0 ? 1 : 0.2 }}>★</span>
                      );
                    })}
                  </span>
                )}

                <Button size="sm" variant="secondary" onClick={handleStartReading}>
                  {isCurrentlyReading ? "◉ Reading" : isInReadlist ? "In Readlist" : "Want to Read"}
                </Button>

                <button
                  onClick={handleToggleFavorite}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer border ${
                    isFavorited ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[rgba(0,196,106,0.08)]" : "border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-text)] bg-transparent"
                  }`}
                >
                  {isFavorited ? "★ Favorited" : "☆ Favorite"}
                </button>

                <button
                  onClick={openListDialog}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-text)] bg-transparent"
                >
                  + List
                </button>

                <button
                  onClick={openReviewForm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-text)] bg-transparent"
                >
                  {reviews.length > 0 ? "✏️ Review" : "✏️ Review"}
                </button>
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
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">No lists yet.</p>
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

          <AnimatePresence>
            {showLogForm && !needsImport && (
              <motion.div
                className="rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-gradient-to-b from-[rgba(26,42,33,0.82)] to-[rgba(8,12,10,0.96)] p-5 grid gap-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease }}
              >
                <h3 className="m-0 text-base font-bold">Log {book.title}</h3>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">When did you read it?</label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all focus:border-[rgba(0,196,106,0.45)]"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Rating</label>
                    <StarPicker value={logRating} onChange={(v) => setLogRating(parseFloat(v))} />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Review (optional)</label>
                    <textarea
                      placeholder="How was it?"
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all focus:border-[rgba(0,196,106,0.45)] resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowLogForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleLogRead} disabled={logging}>
                    {logging ? "Saving..." : "Save"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {!needsImport && (
        <>
          <AnimatePresence>
            {showReviewForm && (
              <motion.div
                className="rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-gradient-to-b from-[rgba(26,42,33,0.82)] to-[rgba(8,12,10,0.96)] p-6 grid gap-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease }}
              >
                <h3 className="m-0 text-lg font-bold">
                  {editingReview ? "Edit Review" : reviews.length > 0 ? "Review Again" : "Write a Review"}
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
                  className="w-full px-4 py-3 rounded-lg border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all focus:border-[rgba(0,196,106,0.45)] resize-none"
                />
                <div className="flex items-center gap-4 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSubmitReview} disabled={reviewRating === 0 || submitting}>
                    {submitting ? "Saving..." : editingReview ? "Update" : "Save"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
            <FadeIn>
              <section className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="m-0 text-xs tracking-[0.18em] uppercase text-[var(--color-muted)] font-semibold">Reviews ({reviews.length})</h2>
                  {reviews.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={openReviewForm}>Write Review</Button>
                  )}
                </div>
                {reviews.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)]">
                    <EmptyStateIllustration className="w-20 h-14 text-[var(--color-muted)]" />
                    <p className="text-sm text-[var(--color-muted)]">No reviews yet.</p>
                    <Button size="sm" onClick={openReviewForm}>Write a Review</Button>
                  </div>
                )}
                <StaggerContainer className="grid gap-3">
                  {reviews.map((review) => (
                    <StaggerItem key={review.id}>
                      <div className="p-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] grid gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm tracking-[0.05em]" style={{ color: "var(--color-accent)" }}>{formatStars(review.rating)}</span>
                            <span className="text-xs text-[var(--color-muted)]">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEditReview(review)} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer bg-none border-0">Edit</button>
                            <button onClick={() => handleDeleteReview(review.id)} className="text-xs text-[var(--color-muted)] hover:text-red-400 transition-colors cursor-pointer bg-none border-0">Delete</button>
                          </div>
                        </div>
                        {review.review_text && <p className="text-sm text-[var(--color-muted-strong)] leading-relaxed m-0">{review.review_text}</p>}
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </section>
            </FadeIn>

            <FadeIn delay={0.1}>
              <section className="grid gap-4">
                <h2 className="m-0 text-xs tracking-[0.18em] uppercase text-[var(--color-muted)] font-semibold">Reading History ({diaryEntries.length})</h2>
                {diaryEntries.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)]">
                    <BookshelfIllustration className="w-24 h-16 text-[var(--color-muted)]" />
                    <p className="text-sm text-[var(--color-muted)]">No diary entries.</p>
                  </div>
                )}
                <div className="grid gap-2">
                  {diaryEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)]">
                      <div className="grid gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[var(--color-muted-strong)]">{new Date(entry.read_date).toLocaleDateString()}</span>
                          {entry.rating && (
                            <span className="text-sm tracking-[0.05em]" style={{ color: "var(--color-accent)" }}>{formatStars(entry.rating)}</span>
                          )}
                          {entry.is_reread && <Badge>Re-read</Badge>}
                        </div>
                        {entry.review_text && <p className="text-sm text-[var(--color-muted-strong)] m-0 mt-1">{entry.review_text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>
          </div>
        </>
      )}
    </div>
  );
}
