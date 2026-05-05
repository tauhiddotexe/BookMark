import Link from "next/link";

type Stats = {
  users: number;
  books: number;
  reviews: number;
  lists: number;
};

export function Hero({ stats }: { stats: Stats }) {
  return (
    <section className="page-hero hero">
      <div className="hero-panel hero-copy">
        <span className="pill">Your life in books</span>
        <h1>Track every page-turner. Review with taste. Follow sharp readers.</h1>
        <p>
          Bookmark keeps the Letterboxd rhythm but for books: search new titles, log your shelves, rate with half-stars, and keep up with the reviews everyone else is talking about.
        </p>
        <div className="hero-actions">
          <Link href="/search" className="action-link">
            Discover books
          </Link>
          <Link href="/signup" className="ghost-link">
            Create an account
          </Link>
        </div>
      </div>

      <div className="hero-grid">
        <article className="metric panel">
          <strong>{stats.users}</strong>
          <span className="metric-label">Readers logging books</span>
        </article>
        <article className="metric panel">
          <strong>{stats.books}</strong>
          <span className="metric-label">Books saved to Bookmark</span>
        </article>
        <article className="metric panel">
          <strong>{stats.reviews}</strong>
          <span className="metric-label">Reviews in the social feed</span>
        </article>
        <article className="metric panel">
          <strong>{stats.lists}</strong>
          <span className="metric-label">Curated community lists</span>
        </article>
      </div>
    </section>
  );
}
