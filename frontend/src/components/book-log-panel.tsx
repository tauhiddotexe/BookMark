import { useEffect, useState } from "react";
import { getBookState, setBookShelf } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/toast-provider";
import { DiaryLogModal } from "./diary-log-modal";
import { BookIcon, CalendarIcon } from "./icons";

const OPTIONS = [
  { value: "want_to_read", label: "Want to Read" },
  { value: "reading", label: "Reading" },
  { value: "re_reading", label: "Re-reading" },
  { value: "read", label: "Read" },
  { value: "dropped", label: "Dropped" }
];

export function BookLogPanel({ slug, bookId, bookTitle }: { slug: string; bookId: number; bookTitle: string }) {
  const { pushToast } = useToast();
  const { getToken, user } = useAuth();
  const [selected, setSelected] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    
    let cancelled = false;
    getToken().then((token) => {
      if (cancelled || !token) return;
      getBookState(slug, token, { signal: controller.signal })
        .then((state) => {
          setSelected(state.shelves[0] || "");
          setReviewed(Boolean(state.review));
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error("[BookLogPanel] Failed to load book state:", err);
        });
    });
      
    return () => { cancelled = true; controller.abort(); };
  }, [slug, user, getToken]);

  async function saveShelf(nextShelf: string) {
    const token = await getToken();
    if (!token) {
      setError("Log in to track books.");
      pushToast("Log in to track books.", "error");
      return;
    }
    setPending(true);
    setError("");
    try {
      const state = await setBookShelf(slug, token, nextShelf);
      setSelected(state.shelves[0] || "");
      pushToast(nextShelf ? "Shelf updated." : "Shelf cleared.");
    } catch {
      pushToast("Could not update your shelf.", "error");
      setError("Could not update your shelf.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel log-panel">
      <div className="log-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="pill">Track this book</span>
          <h3 style={{ margin: 0 }}>Slide it onto the right shelf before you review it.</h3>
        </div>
        {reviewed ? <span className="chip chip-solid">Reviewed</span> : null}
      </div>

      <div className="chip-row">
        {OPTIONS.map((option) => (
          <button key={option.value} type="button" disabled={pending} onClick={() => saveShelf(option.value)} className={selected === option.value ? "chip chip-solid" : "chip"}>
            {option.label}
          </button>
        ))}
        <button type="button" disabled={pending} onClick={() => saveShelf("")} className={!selected ? "chip chip-solid" : "chip"}>
          Clear
        </button>
      </div>

      <div className="log-footer stack" style={{ gap: 12, marginTop: 8 }}>
        <button 
          type="button" 
          className="action-link" 
          style={{ width: "100%" }}
          onClick={() => setShowLogModal(true)}
        >
          <CalendarIcon size={18} /> Log this book...
        </button>
        <div className="helper-text">
          {selected ? `Currently shelved as ${OPTIONS.find((item) => item.value === selected)?.label || selected}.` : "This book is not on any shelf yet."}
        </div>
      </div>

      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}

      {showLogModal && (
        <DiaryLogModal 
          bookId={bookId}
          bookTitle={bookTitle}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            pushToast("Log entry saved.");
            // Refresh state if needed
          }}
        />
      )}
    </section>
  );
}
