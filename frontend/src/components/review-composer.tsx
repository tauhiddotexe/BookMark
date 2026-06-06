import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StarPicker } from "@/components/star-picker";
import { createReview } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/toast-provider";

export function ReviewComposer({ bookId }: { bookId: string }) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { getToken } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [rating, setRating] = useState("4.5");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const access = await getToken();
    if (!access) {
      setError("Log in first to post a review.");
      pushToast("Log in first to post a review.", "error");
      navigate("/auth?mode=login");
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
      await createReview(access, { ...payload, text: payload.review_text });
      pushToast("Review posted.");
      window.location.reload();
    } catch (err) {
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
