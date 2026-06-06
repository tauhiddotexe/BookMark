import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBookState, setBookShelf } from "@/lib/api";
import { BookState, DiaryEntry } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/toast-provider";
import { DiaryLogModal } from "./diary-log-modal";
import { EditDiaryModal } from "./edit-diary-modal";
import { CalendarIcon, StarIcon, BookIcon, EditIcon } from "./icons";
import { formatStars } from "@/lib/format";

const SHELF_OPTIONS = [
  { value: "want_to_read", label: "Want to Read" },
  { value: "reading", label: "Reading" },
  { value: "re_reading", label: "Re-reading" },
  { value: "read", label: "Read" },
  { value: "dropped", label: "Dropped" }
];

export function UserBookStatusPanel({ slug, bookId, bookTitle }: { slug: string; bookId: string; bookTitle: string }) {
  const { pushToast } = useToast();
  const { getToken, localUser } = useAuth();
  
  const [state, setState] = useState<BookState | null>(null);
  const [loading, setLoading] = useState(true);
  const [shelfPending, setShelfPending] = useState(false);
  
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingDiaryEntry, setEditingDiaryEntry] = useState<DiaryEntry | null>(null);

  const fetchState = async (signal?: AbortSignal) => {
    if (!localUser) return;
    const token = await getToken();
    if (!token) return;
    try {
      const data = await getBookState(slug, token, { signal });
      setState(data);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to load user book state", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchState(controller.signal);
    return () => controller.abort();
  }, [slug, localUser, getToken]);

  async function handleShelfChange(nextShelf: string) {
    const token = await getToken();
    if (!token) {
      pushToast("Log in to track books.", "error");
      return;
    }
    setShelfPending(true);
    try {
      const updatedState = await setBookShelf(slug, token, nextShelf);
      setState(updatedState);
      pushToast(nextShelf ? "Shelf updated." : "Shelf cleared.");
    } catch {
      pushToast("Could not update your shelf.", "error");
    } finally {
      setShelfPending(false);
    }
  }

  if (!localUser) {
    return null; // Don't show panel to logged out users
  }

  if (loading) {
    return (
      <section className="panel log-panel skeleton" style={{ minHeight: "200px" }}>
        <div className="section-head"><h2>Your Status</h2></div>
        <div className="spinner-container" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      </section>
    );
  }

  const currentShelf = state?.shelves?.[0] || "";
  const review = state?.review;
  const diaryEntries = state?.diary_entries || [];
  
  // Computed stats
  const latestEntry = diaryEntries[0];
  const readCount = diaryEntries.length;
  const rereadCount = diaryEntries.filter(e => e.is_reread).length;
  const highestRating = diaryEntries.reduce((max, entry) => Math.max(max, Number(entry.rating || 0)), 0);
  const displayRating = review?.rating ? Number(review.rating) : (highestRating > 0 ? highestRating : null);

  return (
    <section className="panel status-panel">
      <div className="status-header">
        <h2>Your Status</h2>
        {displayRating && (
          <div className="status-rating" title="Your rating">
            <span className="stars">{formatStars(Number(displayRating))}</span>
          </div>
        )}
      </div>

      <div className="status-section">
        <label className="section-label">Shelf</label>
        <div className="chip-row">
          {SHELF_OPTIONS.map((option) => (
            <button 
              key={option.value} 
              type="button" 
              disabled={shelfPending} 
              onClick={() => handleShelfChange(option.value)} 
              className={currentShelf === option.value ? "chip chip-solid" : "chip"}
            >
              {option.label}
            </button>
          ))}
          <button 
            type="button" 
            disabled={shelfPending} 
            onClick={() => handleShelfChange("")} 
            className={!currentShelf ? "chip chip-solid" : "chip"}
          >
            Clear
          </button>
        </div>
      </div>

      {diaryEntries.length > 0 && (
        <div className="status-section">
          <div className="section-header-row">
            <label className="section-label">Reading History</label>
            <span className="muted text-sm">{readCount} {readCount === 1 ? 'entry' : 'entries'} {rereadCount > 0 && `(${rereadCount} rereads)`}</span>
          </div>
          
          <div className="latest-entry-card panel-sub">
            <div className="entry-meta">
              <CalendarIcon size={14} /> 
              <span>Read on {new Date(latestEntry.read_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {latestEntry.is_reread && <span className="meta-badge sm">Reread</span>}
            </div>
            {latestEntry.review_text && (
              <p className="entry-preview">
                {latestEntry.contains_spoilers ? <span className="spoiler-warning">Spoilers</span> : null}
                {latestEntry.review_text.length > 80 ? `${latestEntry.review_text.substring(0, 80)}...` : latestEntry.review_text}
              </p>
            )}
            <div className="entry-actions">
              <button className="text-action" onClick={() => setEditingDiaryEntry(latestEntry)}>
                <EditIcon size={14} /> Edit latest log
              </button>
              <Link to="/diary" className="text-action">View all in Diary</Link>
            </div>
          </div>
        </div>
      )}

      <div className="status-section">
        <label className="section-label">Review</label>
        {review ? (
          <div className="review-preview-card panel-sub">
            {review.review_text && (
              <p className="entry-preview">
                {review.review_text.length > 100 ? `${review.review_text.substring(0, 100)}...` : review.review_text}
              </p>
            )}
            <a href="#write-review" className="text-action mt-2">
              <EditIcon size={14} /> Edit Review
            </a>
          </div>
        ) : (
          <div className="no-review-cta">
            <p className="muted text-sm">You haven't written a review yet.</p>
            <a href="#write-review" className="action-link outline small-btn">Write a Review</a>
          </div>
        )}
      </div>

      <div className="status-footer">
        <button className="action-link full-width" onClick={() => setShowLogModal(true)}>
          <CalendarIcon size={16} /> Log another read
        </button>
      </div>

      {showLogModal && (
        <DiaryLogModal 
          bookId={bookId}
          bookTitle={bookTitle}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            pushToast("Log entry saved.");
            fetchState(); // Refresh data
          }}
        />
      )}

      {editingDiaryEntry && (
        <EditDiaryModal 
          entry={{ ...editingDiaryEntry, book: { title: bookTitle, slug, id: bookId, cover_url: "", thumbnail_url: "", author: "" } } as DiaryEntry}
          onClose={() => setEditingDiaryEntry(null)}
          onSuccess={() => {
            pushToast("Log entry updated.");
            fetchState(); // Refresh data
          }}
        />
      )}

      <style>{`
        .status-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
        }
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .status-header h2 {
          margin: 0;
          font-size: 1.3rem;
        }
        .status-rating {
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .status-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .section-label {
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
        }
        .panel-sub {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .entry-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text);
          font-weight: 500;
        }
        .entry-preview {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--muted-strong);
        }
        .text-sm {
          font-size: 0.85rem;
        }
        .mt-2 {
          margin-top: 8px;
        }
        .text-action {
          background: none;
          border: none;
          padding: 0;
          color: var(--accent);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
        }
        .text-action:hover {
          color: var(--accent-hover);
          text-decoration: underline;
        }
        .entry-actions {
          display: flex;
          gap: 16px;
          margin-top: 4px;
          padding-top: 12px;
          border-top: 1px dashed var(--line);
        }
        .no-review-cta {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px dashed var(--line);
        }
        .small-btn {
          padding: 6px 12px;
          font-size: 0.9rem;
        }
        .full-width {
          width: 100%;
          justify-content: center;
        }
        .status-footer {
          margin-top: 8px;
        }
        .meta-badge.sm {
          padding: 2px 6px;
          font-size: 0.7rem;
        }
        .spinner-container {
          display: flex;
          justify-content: center;
          padding: 2rem;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--text);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      `}</style>
    </section>
  );
}
