import { Link } from "react-router-dom";

import { BookCover } from "@/components/book-cover";
import { StarIcon } from "@/components/icons";
import { formatStars } from "@/lib/format";
import { Book } from "@/lib/types";

export function BookCard({ book }: { book: Book }) {
  return (
    <Link to={`/books/${book.slug}`} className="card book-card">
      <BookCover title={book.title} author={book.author} googleBooksId={book.google_books_id} coverUrl={book.cover_url} thumbnailUrl={book.thumbnail_url} />
      <div className="book-card-body">
        <div className="book-card-meta">
          <span className="pill">{book.categories || "Book"}</span>
          {book.published_date ? <span className="muted">{book.published_date}</span> : null}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <h3>{book.title}</h3>
          <div className="muted">{book.author}</div>
        </div>
        <div className="review-meta">
          <span className="stars">{formatStars(book.average_rating || 0)}</span>
          <span className="chip">
            <StarIcon />
            {book.ratings_count} ratings
          </span>
        </div>
      </div>
    </Link>
  );
}
