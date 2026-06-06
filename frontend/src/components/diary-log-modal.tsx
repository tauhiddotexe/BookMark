import { useState } from "react";
import { StarPicker } from "./star-picker";
import { logDiaryEntry } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "./toast-provider";
import { CalendarIcon, XIcon, SaveIcon, AlertIcon } from "./icons";

interface DiaryLogModalProps {
  bookId: string;
  bookTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DiaryLogModal({ bookId, bookTitle, onClose, onSuccess }: DiaryLogModalProps) {
  const { pushToast } = useToast();
  const { getToken } = useAuth();
  const [rating, setRating] = useState(0);
  const [readDate, setReadDate] = useState(new Date().toISOString().split("T")[0]);
  const [reviewText, setReviewText] = useState("");
  const [isReread, setIsReread] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = await getToken();
    if (!token) {
      pushToast("Log in to track books.", "error");
      return;
    }

    setPending(true);
    try {
      await logDiaryEntry(token, {
        book_id: bookId,
        read_date: readDate,
        rating: rating || undefined,
        review_text: reviewText,
        is_reread: isReread,
        contains_spoilers: containsSpoilers,
      });
      pushToast("Reading logged successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not log reading.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="stack" style={{ gap: 4 }}>
            <span className="pill">Log Reading</span>
            <h2 className="modal-title">{bookTitle}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body stack" style={{ gap: 24 }}>
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">
                <CalendarIcon size={16} /> Read Date
              </label>
              <input
                type="date"
                value={readDate}
                onChange={(e) => setReadDate(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Rating</label>
              <StarPicker value={rating} onChange={(val) => setRating(Number(val))} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Review / Thoughts (Optional)</label>
            <textarea
              placeholder="What did you think?"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
          </div>

          <div className="checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isReread}
                onChange={(e) => setIsReread(e.target.checked)}
              />
              <span>I've read this book before</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={containsSpoilers}
                onChange={(e) => setContainsSpoilers(e.target.checked)}
              />
              <span className="spoiler-label">
                <AlertIcon size={14} /> Contains spoilers
              </span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="submit-button">
              {pending ? "Saving..." : (
                <>
                  <SaveIcon size={18} /> Save Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
