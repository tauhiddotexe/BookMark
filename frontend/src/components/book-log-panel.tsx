import { useEffect, useState } from "react";

import { getBookState, setBookShelf } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { useToast } from "@/components/toast-provider";

const OPTIONS = [
  { value: "want_to_read", label: "Want to Read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" }
];

export function BookLogPanel({ slug }: { slug: string }) {
  const { pushToast } = useToast();
  const [selected, setSelected] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) return;
    getBookState(slug, access)
      .then((state) => {
        setSelected(state.shelves[0] || "");
        setReviewed(Boolean(state.review));
      })
      .catch(() => undefined);
  }, [slug]);

  async function saveShelf(nextShelf: string) {
    const access = getAccessToken();
    if (!access) {
      setError("Log in to track books.");
      pushToast("Log in to track books.", "error");
      return;
    }
    setPending(true);
    setError("");
    try {
      const state = await setBookShelf(slug, access, nextShelf);
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

      <div className="helper-text">
        {selected ? `Currently shelved as ${OPTIONS.find((item) => item.value === selected)?.label || selected}.` : "This book is not on any shelf yet."}
      </div>
      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
    </section>
  );
}
