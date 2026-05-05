import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { BookCard } from "@/components/book-card";
import { BookSearchCard } from "@/components/book-search-card";
import { FeedSection } from "@/components/feed-section";
import { Hero } from "@/components/hero";
import { getFeed, getLists, getStats, discoverBooks } from "@/lib/api";

export default async function HomePage() {
  const [feedResult, statsResult, listsResult, discoveryResult] = await Promise.allSettled([getFeed(), getStats(), getLists(), discoverBooks()]);
  const feed = feedResult.status === "fulfilled" ? feedResult.value : { count: 0, next: null, previous: null, results: [] };
  const stats = statsResult.status === "fulfilled" ? statsResult.value : { users: 0, books: 0, reviews: 0, lists: 0 };
  const lists = listsResult.status === "fulfilled" ? listsResult.value : { count: 0, results: [] };
  const discovery = discoveryResult.status === "fulfilled" ? discoveryResult.value : { results: [] };
  const featuredBooks = feed.results.length ? feed.results.slice(0, 3).map((review) => review.book) : [];
  const discoveredBooks = discovery.results.slice(0, 3);
  const latestLists = lists.results.slice(0, 3);

  return (
    <>
      <Hero stats={stats} />

      <div className="content-grid">
        <section className="stack">
          <div className="section-head">
            <h2>Recent Reviews</h2>
            <Link href="/search" className="section-link">
              Find something to review
            </Link>
          </div>
          {feedResult.status === "rejected" ? <p className="muted">The feed is temporarily unavailable. Try refreshing after the backend reconnects.</p> : null}
          <FeedSection initialFeed={feed} />
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
              <Link href="/search" className="section-link">
                Open search
              </Link>
            </div>
            <div className="stack">{discoveredBooks.length ? discoveredBooks.map((book) => <BookSearchCard key={book.google_books_id} book={book} />) : <p className="muted">Discovery is taking a breather. Try search instead.</p>}</div>
          </section>

          <section className="card rail-card">
            <div className="section-head">
              <h2>Latest Lists</h2>
              <Link href="/lists" className="section-link">
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
