import { BookCover } from "@/components/book-cover";
import { BookActionButton } from "@/components/book-action-button";
import { BookIcon } from "@/components/icons";
import { SearchBookResult } from "@/lib/types";

export function BookSearchCard({ book }: { book: SearchBookResult }) {
  return (
    <article className="card search-card">
      <BookCover title={book.title} author={book.author} googleBooksId={book.google_books_id} coverUrl={book.cover_url} thumbnailUrl={book.thumbnail_url} />
      <div className="search-card-body">
        <div className="search-card-meta">
          <span className="pill">{book.categories || "Book"}</span>
          {book.published_date ? <span className="muted">{book.published_date}</span> : null}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <h3>{book.title}</h3>
          <div className="muted">{book.author || "Unknown author"}</div>
        </div>
        <p className="muted">{(book.description || "No description available yet.").slice(0, 200)}</p>
        <div className="review-meta">
          <span className="chip">
            <BookIcon />
            Ready to import
          </span>
        </div>
        <BookActionButton volumeId={book.google_books_id} existingSlug={book.existing_slug} />
      </div>
    </article>
  );
}
