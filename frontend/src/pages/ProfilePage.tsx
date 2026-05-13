import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { BookCover } from "@/components/book-cover";
import { ProfileBooks } from "@/components/profile-books";
import { ReviewCard } from "@/components/review-card";
import { ProfileStats } from "@/components/profile-stats";
import { Loading } from "@/components/loading";
import { formatCompactNumber } from "@/lib/format";
import { getProfile, followUser, unfollowUser, getAccessToken } from "@/lib/api";
import { ProfileDetail } from "@/lib/types";
import { useToast } from "@/components/toast-provider";

const labels: Record<string, string> = { read: "Read", reading: "Reading", want_to_read: "Want to Read" };

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const { addToast } = useToast();
  const token = getAccessToken();

  useEffect(() => {
    if (!username) return;
    let cancelled = false;

    setLoading(true);
    setError("");
    getProfile(username, token || undefined)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setFollowing(data.is_following);
        document.title = `@${data.username} — Bookmark`;
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load profile.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [username]);

  if (loading) return <Loading />;
  if (error || !profile) return <p className="muted">{error || "Profile not found."}</p>;

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
              <span className="chip">{formatCompactNumber(profile.followers_count + (following && !profile.is_following ? 1 : (!following && profile.is_following ? -1 : 0)))} followers</span>
              <span className="chip">{formatCompactNumber(profile.following_count)} following</span>
              {token && profile.username !== localStorage.getItem("bookmark_username") && (
                <button 
                  className={`btn ${following ? "btn-secondary" : "btn-primary"} btn-sm`}
                  onClick={async () => {
                    if (!token) return;
                    setFollowLoading(true);
                    try {
                      if (following) {
                        await unfollowUser(profile.username, token);
                        setFollowing(false);
                        addToast("Unfollowed user", "info");
                      } else {
                        await followUser(profile.username, token);
                        setFollowing(true);
                        addToast("Following user", "success");
                      }
                    } catch (err) {
                      addToast("Failed to update follow status", "error");
                    } finally {
                      setFollowLoading(false);
                    }
                  }}
                  disabled={followLoading}
                >
                  {following ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>
            <h1 className="profile-name">
              {profile.profile.display_name || profile.username}
              {profile.is_following && <span className="follows-you-badge">Follows you</span>}
            </h1>
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

      <ProfileStats reviews={profile.reviews} />

      {coverWall.length ? (
        <section className="card rail-card">
          <div className="section-head">
            <h2>Cover Wall</h2>
          </div>
          <div className="cover-grid">
            {coverWall.map((book) => (
              <Link key={`${book.id}-${book.slug}`} to={`/books/${book.slug}`}>
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
