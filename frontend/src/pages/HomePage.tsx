import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BookCover } from "@/components/book-cover";
import { BookCard } from "@/components/book-card";
import { BookSearchCard } from "@/components/book-search-card";
import { FeedSection } from "@/components/feed-section";
import { Hero } from "@/components/hero";
import { Loading } from "@/components/loading";
import { getFeed, getStats, getLists, discoverBooks, getActivities } from "@/lib/api";
import { FeedResponse, BookList, SearchBookResult, ActivityResponse } from "@/lib/types";
import { ActivityFeed } from "@/components/activity-feed";

type Stats = { users: number; books: number; reviews: number; lists: number };

export function HomePage() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [stats, setStats] = useState<Stats>({ users: 0, books: 0, reviews: 0, lists: 0 });
  const [lists, setLists] = useState<BookList[]>([]);
  const [discovered, setDiscovered] = useState<SearchBookResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityResponse | null>(null);
  const [feedMode, setFeedMode] = useState<"global" | "following">("global");
  const [feedError, setFeedError] = useState(false);

  useEffect(() => {
    document.title = "Bookmark — Your life in books";
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setFeedError(false);
    
    Promise.allSettled([
      getActivities(feedMode, 1, { signal }), 
      getStats({ signal }), 
      getLists(undefined, { signal }), 
      discoverBooks({ signal })
    ])
      .then(([actRes, statsRes, listsRes, discoverRes]) => {
        if (actRes.status === "fulfilled") setActivities(actRes.value);
        else setFeedError(true);
        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (listsRes.status === "fulfilled") setLists(listsRes.value.results);
        if (discoverRes.status === "fulfilled") setDiscovered(discoverRes.value.results);
      })
      .finally(() => { setLoading(false); });

    return () => controller.abort();
  }, [feedMode]);

  if (loading) return <Loading />;

  const discoveredBooks = discovered.slice(0, 3);
  const latestLists = lists.slice(0, 3);

  return (
    <>
      <Hero stats={stats} />

      <div className="content-grid">
        <section className="stack">
          <div className="section-head">
            <div className="tabs">
              <button 
                className={`tab-btn ${feedMode === "global" ? "active" : ""}`}
                onClick={() => setFeedMode("global")}
              >
                Global Activity
              </button>
              <button 
                className={`tab-btn ${feedMode === "following" ? "active" : ""}`}
                onClick={() => setFeedMode("following")}
              >
                Friends
              </button>
            </div>
          </div>
          {feedError ? (
            <p className="muted">The feed is temporarily unavailable. Try refreshing after the backend reconnects.</p>
          ) : (
            <ActivityFeed activities={activities?.results || []} />
          )}
        </section>

        <aside className="stack">
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
