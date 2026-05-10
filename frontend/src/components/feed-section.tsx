import { startTransition, useEffect, useState } from "react";

import { ReviewCard } from "@/components/review-card";
import { getFeed } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { FeedResponse, Review } from "@/lib/types";

type FeedSectionProps = {
  initialFeed: FeedResponse;
};

export function FeedSection({ initialFeed }: FeedSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialFeed.results);
  const [nextPage, setNextPage] = useState<number | null>(extractNextPage(initialFeed.next));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const access = getAccessToken();
    if (!access) return;

    startTransition(() => {
      setLoading(true);
      getFeed(1, access)
        .then((feed) => {
          setReviews(feed.results);
          setNextPage(extractNextPage(feed.next));
          setError("");
        })
        .catch((requestError) => {
          setError(requestError instanceof Error ? requestError.message : "Could not refresh your feed.");
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);

  async function loadMore() {
    if (!nextPage || loading) return;
    setLoading(true);
    setError("");
    try {
      const access = getAccessToken();
      const feed = await getFeed(nextPage, access || undefined);
      setReviews((current) => [...current, ...feed.results]);
      setNextPage(extractNextPage(feed.next));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load more reviews.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="feed">
      {reviews.length ? reviews.map((review) => <ReviewCard key={review.id} review={review} compact />) : <p className="muted">No reviews yet. Search for a book, log it, and start the feed.</p>}

      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
      {nextPage ? (
        <button type="button" onClick={loadMore} disabled={loading}>
          {loading ? "Loading..." : "Load more reviews"}
        </button>
      ) : null}
    </section>
  );
}

function extractNextPage(next: string | null) {
  if (!next) return null;
  try {
    const url = new URL(next);
    const value = url.searchParams.get("page");
    return value ? Number(value) : null;
  } catch {
    const match = next.match(/[?&]page=(\d+)/);
    return match ? Number(match[1]) : null;
  }
}
