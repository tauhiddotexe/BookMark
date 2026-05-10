import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { BookCover } from "@/components/book-cover";
import { BookLogPanel } from "@/components/book-log-panel";
import { ReviewCard } from "@/components/review-card";
import { ReviewComposer } from "@/components/review-composer";
import { Loading } from "@/components/loading";
import { getBook } from "@/lib/api";
import { formatStars } from "@/lib/format";
import { BookDetail } from "@/lib/types";

export function BookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "reviews";
  const activeTab = tab === "details" ? "details" : "reviews";

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    setLoading(true);
    setError("");
    getBook(slug)
      .then((data) => {
        if (cancelled) return;
        setBook(data);
        document.title = `${data.title} — Bookmark`;
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load book.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <Loading />;
  if (error || !book) return <p className="muted">{error || "Book not found."}</p>;

  return (
    <div className="page-columns">
      <section className="stack">
        <section className="panel hero-panel">
          <div className="book-hero">
            <div className="card book-cover-frame">
              <BookCover title={book.title} author={book.author} googleBooksId={book.google_books_id} coverUrl={book.cover_url} thumbnailUrl={book.thumbnail_url} loading="eager" />
            </div>

            <div className="book-hero-copy">
              <span className="pill">{book.categories || "Book"}</span>
              <h1 className="book-title">{book.title}</h1>
              <div className="book-hero-meta">by {book.author}</div>
              <div className="review-meta">
                <span className="stars">{formatStars(book.average_rating)}</span>
                <span className="chip">{book.ratings_count} ratings</span>
                {book.published_date ? <span className="chip">{book.published_date}</span> : null}
                {book.page_count ? <span className="chip">{book.page_count} pages</span> : null}
              </div>
              <p className="book-description">{book.description}</p>
            </div>
          </div>
        </section>

        <div className="tab-row">
          <Link to={`/books/${book.slug}?tab=reviews`} className={activeTab === "reviews" ? "tab-link is-active" : "tab-link"}>
            Reviews
          </Link>
          <Link to={`/books/${book.slug}?tab=details`} className={activeTab === "details" ? "tab-link is-active" : "tab-link"}>
            Details
          </Link>
        </div>

        {activeTab === "reviews" ? (
          <>
            <ReviewComposer bookId={book.id} />
            <section className="feed">
              {book.reviews.length ? book.reviews.map((review) => <ReviewCard key={review.id} review={review} />) : <p className="muted">No reviews yet. Be the first to rate and review this book.</p>}
            </section>
          </>
        ) : (
          <section className="card tab-panel">
            <div className="section-head">
              <h2>Book Details</h2>
            </div>
            <div className="book-meta-list">
              <div>
                <strong>Author</strong>
                <div className="muted">{book.author}</div>
              </div>
              <div>
                <strong>Published</strong>
                <div className="muted">{book.published_date || "Unknown"}</div>
              </div>
              <div>
                <strong>Category</strong>
                <div className="muted">{book.categories || "Uncategorized"}</div>
              </div>
              <div>
                <strong>Pages</strong>
                <div className="muted">{book.page_count || "Unknown"}</div>
              </div>
              <div>
                <strong>Community Rating</strong>
                <div className="muted">
                  {book.average_rating} average from {book.ratings_count} ratings
                </div>
              </div>
            </div>
          </section>
        )}
      </section>

      <aside className="book-actions-rail">
        <a href="#write-review" className="action-link sticky-review-button">
          Add review
        </a>
        <BookLogPanel slug={book.slug} />
      </aside>
    </div>
  );
}
