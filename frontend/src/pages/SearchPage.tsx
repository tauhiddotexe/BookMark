import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useDebounce } from "@/lib/hooks";
import { searchBooks, discoverBooks } from "@/lib/api";
import { SearchBookResult } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { FadeIn } from "@/components/motion/page-transition";
import { SearchIllustration, EmptyStateIllustration } from "@/components/illustrations";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchBookResult[]>([]);
  const [discoverResults, setDiscoverResults] = useState<SearchBookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  const doSearch = useCallback(async (q: string) => {
    if (!q) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchBooks(q);
      setResults(data.results || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    doSearch(debouncedQuery);
  }, [debouncedQuery, doSearch]);

  useEffect(() => {
    discoverBooks()
      .then((data) => setDiscoverResults(data.results || []))
      .catch(() => {});
  }, []);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="grid gap-8">
      <motion.div
        className="grid gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-4">
          <SearchIllustration className="w-7 h-7 text-[var(--color-accent)]/30 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search books..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-5 py-3 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none transition-all duration-180 focus:border-[var(--color-accent)]/40 focus:shadow-[0_0_0_4px_var(--color-accent-soft)] placeholder:text-[var(--color-muted)] text-sm"
            autoFocus
          />
        </div>
      </motion.div>

      {loading && (
        <motion.p
          className="text-[var(--color-muted)] text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Searching...
        </motion.p>
      )}

      {!loading && !hasQuery && (
        <FadeIn>
          <section className="grid gap-5">
            <h2 className="m-0 text-xs tracking-[0.18em] uppercase text-[var(--color-muted)] font-semibold">
              Discover
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {discoverResults.map((book) => (
                <BookSearchCard key={book.google_books_id} book={book} />
              ))}
            </div>
          </section>
        </FadeIn>
      )}

      {!loading && hasQuery && (
        <FadeIn>
          <section className="grid gap-5">
            <h2 className="m-0 text-xs tracking-[0.18em] uppercase text-[var(--color-muted)] font-semibold">
              Results
            </h2>
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <EmptyStateIllustration className="w-24 h-18 text-[var(--color-muted)]" />
                <p className="text-[var(--color-muted)] text-sm">No books found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {results.map((book) => (
                  <BookSearchCard key={book.google_books_id} book={book} />
                ))}
              </div>
            )}
          </section>
        </FadeIn>
      )}
    </div>
  );
}

function BookSearchCard({ book }: { book: SearchBookResult }) {
  const targetSlug = book.existing_slug || `import-${book.google_books_id}`;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/books/${targetSlug}`} state={{ searchResult: book }} className="grid gap-2.5 no-underline group">
        <BookCover book={book} size="medium" />
        <div className="grid gap-0.5">
          <span className="text-xs leading-tight line-clamp-2 text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors font-medium">
            {book.title}
          </span>
          <span className="text-[11px] text-[var(--color-muted)] truncate">
            {book.author}
          </span>
          {book.published_date && (
            <span className="text-[11px] text-[var(--color-muted)]">
              {book.published_date.slice(0, 4)}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
