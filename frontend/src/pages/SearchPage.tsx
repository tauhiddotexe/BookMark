import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useDebounce } from "@/lib/hooks";
import { searchBooks, discoverBooks } from "@/lib/api";
import { SearchBookResult } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/page-transition";
import { SearchIllustration, EmptyStateIllustration } from "@/components/illustrations";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [isbn, setIsbn] = useState("");
  const [results, setResults] = useState<SearchBookResult[]>([]);
  const [discoverResults, setDiscoverResults] = useState<SearchBookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  const doSearch = useCallback(async (q: string, cat: string, ib: string) => {
    if (!q && !ib) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchBooks(q, cat || undefined, ib || undefined);
      setResults(data.results || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isbn) return;
    doSearch(debouncedQuery, category, "");
  }, [debouncedQuery, category, isbn, doSearch]);

  const handleIsbnSearch = () => {
    if (!isbn.trim()) return;
    doSearch("", "", isbn.trim());
  };

  useEffect(() => {
    discoverBooks()
      .then((data) => setDiscoverResults(data.results || []))
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6">
      <motion.div
        className="flex items-center gap-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <SearchIllustration className="w-20 h-16 text-[rgba(0,196,106,0.2)] flex-shrink-0 hidden sm:block" />
        <input
          type="text"
          placeholder="Search for a book..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-5 py-4 rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all duration-180 focus:border-[rgba(0,196,106,0.45)] focus:shadow-[0_0_0_4px_rgba(0,196,106,0.12)] placeholder:text-[var(--color-muted)]"
          autoFocus
        />
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] text-sm outline-none transition-all focus:border-[rgba(0,196,106,0.45)] placeholder:text-[var(--color-muted)] max-w-[140px]"
          />
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="ISBN"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIsbnSearch()}
              className="px-4 py-2 rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] text-sm outline-none transition-all focus:border-[rgba(0,196,106,0.45)] placeholder:text-[var(--color-muted)] max-w-[120px]"
            />
          </div>
        </div>
      </motion.div>

      {loading && (
        <motion.p
          className="text-[var(--color-muted)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Searching...
        </motion.p>
      )}

      {!query && (
        <FadeIn>
          <section className="grid gap-4">
            <h2 className="m-0 text-[0.8rem] tracking-[0.18em] uppercase text-[var(--color-muted)]">Discover</h2>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoverResults.map((book) => (
                <StaggerItem key={book.google_books_id}>
                  <BookSearchCard book={book} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </FadeIn>
      )}

      {query && !loading && (
        <FadeIn>
          <section className="grid gap-4">
            <h2 className="m-0 text-[0.8rem] tracking-[0.18em] uppercase text-[var(--color-muted)]">Results</h2>
            <StaggerContainer className="grid gap-3">
              {results.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <EmptyStateIllustration className="w-24 h-18 text-[var(--color-muted)]" />
                  <p className="text-[var(--color-muted)]">No books found.</p>
                </div>
              )}
              {results.map((book) => (
                <StaggerItem key={book.google_books_id}>
                  <BookSearchCard book={book} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </FadeIn>
      )}
    </div>
  );
}

function BookSearchCard({ book }: { book: SearchBookResult }) {
  const targetSlug = book.existing_slug || `import-${book.google_books_id}`;

  return (
    <Link to={`/books/${targetSlug}`} state={{ searchResult: book }} className="search-card">
      <BookCover book={book} size="small" />
      <div className="grid gap-1.5">
        <strong className="text-sm">{book.title}</strong>
        <span className="text-xs text-[var(--color-muted)]">{book.author}</span>
        {book.published_date && <span className="text-xs text-[var(--color-muted)]">{book.published_date.slice(0, 4)}</span>}
      </div>
    </Link>
  );
}
