import { BookSearchCard } from "@/components/book-search-card";
import { discoverBooks, searchBooks } from "@/lib/api";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const data = q ? await searchBooks(q) : await discoverBooks();

  return (
    <div className="stack">
      <section className="panel hero-panel search-hero">
        <span className="pill">Discovery</span>
        <h1 className="page-title">Search books through Google Books and pull them straight into Bookmark.</h1>
        <p className="search-description">Search by title, author, or a broad prompt like "literary thrillers" or "best nonfiction 2024".</p>
        <form className="inline-search" action="/search">
          <input name="q" defaultValue={q} placeholder="Search for a title, author, or ISBN" />
          <button type="submit">Search</button>
        </form>
      </section>

      <div className="section-head">
        <h2>{q ? `Results for ${q}` : "Fresh Discovery"}</h2>
      </div>
      <section className="book-grid">
        {data.results.length ? data.results.map((book) => <BookSearchCard key={book.google_books_id} book={book} />) : <p className="muted">No books found. Try another title, author, or broader keyword.</p>}
      </section>
    </div>
  );
}
