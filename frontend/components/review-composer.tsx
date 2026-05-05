"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { StarPicker } from "@/components/star-picker";
import { createReview, getCurrentUser } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { useToast } from "@/components/toast-provider";

export function ReviewComposer({ bookId }: { bookId: number }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [rating, setRating] = useState("4.5");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const access = getAccessToken();
    if (!access) {
      setError("Log in first to post a review.");
      pushToast("Log in first to post a review.", "error");
      router.push("/auth?mode=login");
      setPending(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      book_id: bookId,
      rating: Number(rating),
      review_text: formData.get("review_text"),
      contains_spoilers: formData.get("contains_spoilers") === "on"
    };

    try {
      const me = await getCurrentUser(access);
      console.debug("[Bookmark] Review request", {
        endpoint: "/api/reviews/",
        method: "POST",
        hasAuthHeader: Boolean(access),
        userId: me.id,
        bookId: bookId,
        rating: Number(rating),
      });
      await createReview(access, { ...payload, user_id: me.id, text: payload.review_text });
      console.debug("[Bookmark] Review response", { status: "ok", bookId: bookId });
      pushToast("Review posted.");
      router.refresh();
      event.currentTarget.reset();
      setRating("4.5");
    } catch (err) {
      console.debug("[Bookmark] Review response", { status: "error", message: err instanceof Error ? err.message : "Could not save review." });
      pushToast(err instanceof Error ? err.message : "Could not save review.", "error");
      setError(err instanceof Error ? err.message : "Could not save review.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card composer-card" id="write-review">
      <div className="composer-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="pill">Add your review</span>
          <h3 style={{ margin: 0 }}>Log the rating, jot the reaction, and leave it on the feed.</h3>
        </div>
      </div>
      <form className="form-grid" onSubmit={onSubmit}>
        <StarPicker value={rating} onChange={setRating} />
        <textarea name="review_text" rows={5} placeholder="What stayed with you after the last page?" required />
        <label className="muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input name="contains_spoilers" type="checkbox" style={{ width: 18 }} />
          Contains spoilers
        </label>
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "Posting..." : "Post review"}
        </button>
      </form>
    </section>
  );
}
