import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BookCover } from "@/components/book-cover";
import { BookCard } from "@/components/book-card";
import { BookSearchCard } from "@/components/book-search-card";
import { FeedSection } from "@/components/feed-section";
import { Hero } from "@/components/hero";
import { Loading } from "@/components/loading";
import { getFeed, getLists, getStats, discoverBooks } from "@/lib/api";
import { FeedResponse, BookList, SearchBookResult } from "@/lib/types";

type Stats = { users: number; books: number; reviews: number; lists: number };

export function HomePage() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [stats, setStats] = useState<Stats>({ users: 0, books: 0, reviews: 0, lists: 0 });
  const [lists, setLists] = useState<BookList[]>([]);
  const [discovered, setDiscovered] = useState<SearchBookResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);

  useEffect(() => {
    document.title = "Bookmark — Your life in books";
    let cancelled = false;

    Promise.allSettled([getFeed(), getStats(), getLists(), discoverBooks()])
      .then(([feedRes, statsRes, listsRes, discoverRes]) => {
        if (cancelled) return;
        if (feedRes.status === "fulfilled") setFeed(feedRes.value);
        else setFeedError(true);
        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (listsRes.status === "fulfilled") setLists(listsRes.value.results);
        if (discoverRes.status === "fulfilled") setDiscovered(discoverRes.value.results);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <Loading />;

  const feedData: FeedResponse = feed || { count: 0, next: null, previous: null, results: [] };
  const featuredBooks = feedData.results.length ? feedData.results.slice(0, 3).map((r) => r.book) : [];
  const discoveredBooks = discovered.slice(0, 3);
  const latestLists = lists.slice(0, 3);

  return (
    <>
      <Hero stats={stats} />

      <div className="content-grid">
        <section className="stack">
          <div className="section-head">
            <h2>Recent Reviews</h2>
            <Link to="/search" className="section-link">
              Find something to review
            </Link>
          </div>
          {feedError ? <p className="muted">The feed is temporarily unavailable. Try refreshing after the backend reconnects.</p> : null}
          <FeedSection initialFeed={feedData} />
        </section>

        <aside className="stack">
          <section className="card rail-card">
            <div className="section-head">
              <h2>Reviewed Books</h2>
            </div>
            <div className="stack">{featuredBooks.length ? featuredBooks.map((book) => <BookCard key={book.id} book={book} />) : <p className="muted">No reviewed books yet. Post a review to populate this rail.</p>}</div>
          </section>

          <section className="card rail-card">
            <div className="section-head">
              <h2>Discover Next</h2>
              <Link to="/search" className="section-link">
                Open search
              </Link>
            </div>
            <div className="stack">{discoveredBooks.length ? discoveredBooks.map((book) => <BookSearchCard key={book.google_books_id} book={book} />) : <p className="muted">Discovery is taking a breather. Try search instead.</p>}</div>
          </section>

          <section className="card rail-card">
            <div className="section-head">
              <h2>Latest Lists</h2>
              <Link to="/lists" className="section-link">
                See all
              </Link>
            </div>
            <div className="list-stack">
              {latestLists.length ? latestLists.map((list) => (
                <article key={list.id} className="card list-card">
                  <span className="pill">{list.items.length} books</span>
                  <h3 style={{ marginTop: 12 }}>{list.name}</h3>
                  <p className="muted">{list.description}</p>
                  <div className="list-cover-strip">
                    {list.items.slice(0, 4).map((item) => (
                      <BookCover
                        key={item.id}
                        className="cover"
                        title={item.book.title}
                        author={item.book.author}
                        googleBooksId={item.book.google_books_id}
                        coverUrl={item.book.cover_url}
                        thumbnailUrl={item.book.thumbnail_url}
                      />
                    ))}
                  </div>
                </article>
              )) : <p className="muted">No public lists yet.</p>}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
