import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { BookSearchCard } from "@/components/book-search-card";
import { Loading } from "@/components/loading";
import { discoverBooks, searchBooks } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import { SearchBookResult } from "@/lib/types";

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchBookResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(q);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    document.title = debouncedQuery ? `Search: ${debouncedQuery} — Bookmark` : "Discover — Bookmark";
    const controller = new AbortController();

    setLoading(true);
    const fetcher = debouncedQuery 
      ? searchBooks(debouncedQuery, { signal: controller.signal }) 
      : discoverBooks({ signal: controller.signal });
      
    fetcher
      .then((data) => { setResults(data.results); })
      .catch((err) => { 
        if (err.name !== "AbortError") setResults([]); 
      })
      .finally(() => { setLoading(false); });

    return () => controller.abort();
  }, [debouncedQuery]);

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="stack">
      <section className="panel hero-panel search-hero">
        <span className="pill">Discovery</span>
        <h1 className="page-title">Search books through Google Books and pull them straight into Bookmark.</h1>
        <p className="search-description">Search by title, author, or a broad prompt like &quot;literary thrillers&quot; or &quot;best nonfiction 2024&quot;.</p>
        <form className="inline-search" onSubmit={onSearch}>
          <input name="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for a title, author, or ISBN" />
          <button type="submit">Search</button>
        </form>
      </section>

      <div className="section-head">
        <h2>{q ? `Results for ${q}` : "Fresh Discovery"}</h2>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <section className="book-grid">
          {results.length ? results.map((book) => <BookSearchCard key={book.google_books_id} book={book} />) : <p className="muted">No books found. Try another title, author, or broader keyword.</p>}
        </section>
      )}
    </div>
  );
}
