import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { ProfileBooks } from "@/components/profile-books";
import { ReviewCard } from "@/components/review-card";
import { formatCompactNumber } from "@/lib/format";
import { getProfile } from "@/lib/api";

const labels: Record<string, string> = { read: "Read", reading: "Reading", want_to_read: "Want to Read" };

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  const coverWall = Object.values(profile.shelves).flat().slice(0, 12);
  const booksRead = profile.shelves.read?.length || 0;
  const averageRating =
    profile.reviews.length > 0
      ? (profile.reviews.reduce((total, review) => total + Number(review.rating), 0) / profile.reviews.length).toFixed(1)
      : "0.0";
  const avatar = profile.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=16231c&color=f7f7f2&size=240`;

  return (
    <div className="stack">
      <section className="panel hero-panel profile-summary">
        <div className="profile-hero">
          <img className="profile-avatar" src={avatar} alt={profile.username} />
          <div className="profile-column">
            <div className="profile-meta">
              <span className="pill">@{profile.username}</span>
              <span className="chip">{formatCompactNumber(profile.followers_count)} followers</span>
              <span className="chip">{formatCompactNumber(profile.following_count)} following</span>
            </div>
            <h1 className="profile-name">{profile.profile.display_name || profile.username}</h1>
            <p className="lede">{profile.profile.bio || "Building a public reading life, one review at a time."}</p>
          </div>
        </div>
      </section>

      <section className="profile-stats">
        <article className="card profile-stat-card">
          <strong>{booksRead}</strong>
          <span className="muted">Books read</span>
        </article>
        <article className="card profile-stat-card">
          <strong>{averageRating}</strong>
          <span className="muted">Average rating</span>
        </article>
        <article className="card profile-stat-card">
          <strong>{profile.reviews.length}</strong>
          <span className="muted">Reviews written</span>
        </article>
        <article className="card profile-stat-card">
          <strong>{profile.lists.length}</strong>
          <span className="muted">Public lists</span>
        </article>
      </section>

      {coverWall.length ? (
        <section className="card rail-card">
          <div className="section-head">
            <h2>Cover Wall</h2>
          </div>
          <div className="cover-grid">
            {coverWall.map((book) => (
              <Link key={`${book.id}-${book.slug}`} href={`/books/${book.slug}`}>
                <BookCover title={book.title} author={book.author} googleBooksId={book.google_books_id} coverUrl={book.cover_url} thumbnailUrl={book.thumbnail_url} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <ProfileBooks shelves={profile.shelves} labels={labels} />

      <div className="section-head">
        <h2>Recent Reviews</h2>
      </div>
      <section className="feed">
        {profile.reviews.length ? profile.reviews.map((review) => <ReviewCard key={review.id} review={review} />) : <p className="muted">No reviews yet. Search for a book and post the first one.</p>}
      </section>
    </div>
  );
}
