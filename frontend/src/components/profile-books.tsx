import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

import { BookCover } from "@/components/book-cover";
import { Book } from "@/lib/types";

type ProfileBooksProps = {
  shelves: Record<string, Book[]>;
  labels: Record<string, string>;
};

export function ProfileBooks({ shelves, labels }: ProfileBooksProps) {
  const [view, setView] = useState<"grid" | "list">("grid");

  const entries = useMemo(() => Object.entries(shelves), [shelves]);

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Books</h2>
        <div className="tab-row">
          <button type="button" className={view === "grid" ? "tab-link is-active" : "tab-link"} onClick={() => setView("grid")}>
            Grid
          </button>
          <button type="button" className={view === "list" ? "tab-link is-active" : "tab-link"} onClick={() => setView("list")}>
            List
          </button>
        </div>
      </div>

      <section className={view === "grid" ? "shelf-grid" : "stack"}>
        {entries.map(([key, books]) => (
          <article key={key} className="card shelf">
            <div className="section-head">
              <h2>{labels[key] || key}</h2>
              <span className="section-link">{books.length} books</span>
            </div>
            {books.length ? (
              view === "grid" ? (
                <div className="mini-books">
                  {books.slice(0, 6).map((book) => (
                    <Link key={book.id} to={`/books/${book.slug}`}>
                      <BookCover title={book.title} author={book.author} googleBooksId={book.google_books_id} coverUrl={book.cover_url} thumbnailUrl={book.thumbnail_url} className="cover" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="profile-book-list">
                  {books.map((book) => (
                    <Link key={book.id} to={`/books/${book.slug}`} className="profile-book-row">
                      <BookCover title={book.title} author={book.author} googleBooksId={book.google_books_id} coverUrl={book.cover_url} thumbnailUrl={book.thumbnail_url} className="profile-book-thumb" />
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{book.title}</strong>
                        <span className="muted">{book.author}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              <p className="muted">No books here yet.</p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
