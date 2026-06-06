import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { BookCover } from "@/components/book-cover";
import { CommentIcon, HeartIcon } from "@/components/icons";
import { toggleReviewLike } from "@/lib/api";
import { formatCompactNumber, formatDate, formatStars } from "@/lib/format";
import { useAuth } from "@/context/auth-context";
import { Review } from "@/lib/types";

const LIKED_STORAGE_KEY = "bookmark_liked_reviews";

function readLikedReviewIds() {
  const raw = window.localStorage.getItem(LIKED_STORAGE_KEY);
  if (!raw) return new Set<number>();
  try {
    return new Set<number>(JSON.parse(raw));
  } catch {
    return new Set<number>();
  }
}

function writeLikedReviewIds(ids: Set<number>) {
  window.localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...ids]));
}

export function ReviewCard({ review, compact = false }: { review: Review; compact?: boolean }) {
  const avatar = review.user.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.username)}&background=16231c&color=f7f7f2`;
  const { getToken } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(review.likes_count);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const likedIds = readLikedReviewIds();
    setLiked(likedIds.has(review.id));
    setLikesCount(review.likes_count);
  }, [review.id, review.likes_count]);

  const reviewExcerpt = useMemo(() => review.review_text.trim(), [review.review_text]);

  async function toggleLike() {
    if (pending) return;
    const access = await getToken();
    if (!access) {
      setFeedback("Log in to like reviews.");
      return;
    }

    const nextLiked = !liked;
    setFeedback("");
    setPending(true);
    setLiked(nextLiked);
    setLikesCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    try {
      const payload = await toggleReviewLike(review.id, access, liked);
      setLikesCount(payload.likes_count ?? review.likes_count);
      const likedIds = readLikedReviewIds();
      if (nextLiked) likedIds.add(review.id);
      else likedIds.delete(review.id);
      writeLikedReviewIds(likedIds);
    } catch (error) {
      setLiked(!nextLiked);
      setLikesCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
      setFeedback(error instanceof Error ? error.message : "Could not update like.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className={compact ? "card review-card review-card-compact" : "card review-card"}>
      <Link to={`/books/${review.book.slug}`}>
        <BookCover
          title={review.book.title}
          author={review.book.author}
          googleBooksId={review.book.google_books_id}
          coverUrl={review.book.cover_url}
          thumbnailUrl={review.book.thumbnail_url}
          loading={compact ? "lazy" : "eager"}
        />
      </Link>

      <div className="review-main">
        <div className="review-head">
          <div className="review-byline">
            <div className="user-row">
              <img className="avatar" src={avatar} alt={review.user.username} />
              <div className="stack" style={{ gap: 2 }}>
                <div>
                  <Link to={`/profile/${review.user.username}`} className="username-link">
                    @{review.user.username}
                  </Link>{" "}
                  <span className="muted">reviewed</span>{" "}
                  <Link to={`/books/${review.book.slug}`} className="book-title-link">
                    {review.book.title}
                  </Link>
                </div>
                <div className="muted">{review.book.author}</div>
              </div>
            </div>

            <div className="review-meta">
              <span className="stars">{formatStars(review.rating)}</span>
              {review.contains_spoilers ? <span className="chip">Spoilers</span> : null}
            </div>
          </div>

          <span className="muted">{formatDate(review.created_at)}</span>
        </div>

        <p className="review-text">{reviewExcerpt}</p>

        {!compact && review.latest_comments?.length ? (
          <div className="comment-preview">
            {review.latest_comments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="comment-preview-item">
                <div className="muted">
                  <strong>@{comment.user.username}</strong> commented
                </div>
                <div>{comment.body}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="review-actions">
          <div className="review-action-group">
            <button type="button" className={liked ? "icon-action is-active" : "icon-action"} onClick={toggleLike} disabled={pending}>
              <HeartIcon />
              <span>{formatCompactNumber(likesCount)}</span>
            </button>
            <Link to={`/books/${review.book.slug}?tab=reviews#write-review`} className="icon-action">
              <CommentIcon />
              <span>{formatCompactNumber(review.comments_count || 0)}</span>
            </Link>
          </div>

          {feedback ? <span style={{ color: "var(--danger)" }}>{feedback}</span> : null}
        </div>
      </div>
    </article>
  );
}
