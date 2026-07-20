import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/auth-context";
import { getDiaryEntries, updateDiaryEntry, deleteDiaryEntry } from "@/lib/api";
import { DiaryEntry } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { StarPicker } from "@/components/star-picker";
import { Loading } from "@/components/loading";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/page-transition";
import { SectionReveal } from "@/components/gsap/section-reveal";
import { CalendarDiary } from "@/components/calendar-diary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyStateIllustration } from "@/components/illustrations";

const ease = [0.16, 1, 0.3, 1] as const;

export function DiaryPage() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editReread, setEditReread] = useState(false);
  const [editTags, setEditTags] = useState("");

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const [submitting, setSubmitting] = useState(false);

  const loadEntries = () => {
    setLoading(true);
    getDiaryEntries(filters)
      .then((data) => setEntries(data.results || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEntries(); }, [filters]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const startEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setEditRating(parseFloat(entry.rating || "0"));
    setEditText(entry.review_text);
    setEditDate(entry.read_date);
    setEditReread(entry.is_reread);
    setEditTags((entry.tags || []).join(", "));
    setViewMode("list");
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const token = await getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await updateDiaryEntry(editingId, token, {
        read_date: editDate, rating: editRating || null, review_text: editText,
        is_reread: editReread, tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setEditingId(null);
      loadEntries();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    await deleteDiaryEntry(id, token);
    loadEntries();
  };

  // Clear inline editing when switching to calendar view
  const handleViewChange = (mode: "calendar" | "list") => {
    if (mode === "calendar") setEditingId(null);
    setViewMode(mode);
  };

  const groupedEntries = entries.reduce<Record<string, DiaryEntry[]>>((acc, entry) => {
    const date = new Date(entry.read_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="grid gap-6">
      <motion.div
        className="grid gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <h1 className="m-0 text-[clamp(2rem,4vw,3.3rem)] leading-[0.95] tracking-[-0.05em]">Reading Diary</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filters.year || ""} onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-auto px-4 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all focus:border-[rgba(0,196,106,0.45)]">
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.rating || ""} onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
            className="w-auto px-4 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] outline-none transition-all focus:border-[rgba(0,196,106,0.45)]">
            <option value="">All Ratings</option>
            {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map((r) => (
              <option key={r} value={r}>{r} ★</option>
            ))}
          </select>
          <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={filters.is_reread === "true"}
              onChange={(e) => setFilters({ ...filters, is_reread: e.target.checked ? "true" : "" })}
              className="w-5 h-5 accent-[var(--color-accent)]"
            />
            Re-reads only
          </label>
          <input
            type="text"
            placeholder="Filter by tags (comma-separated)"
            value={filters.tags || ""}
            onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
            className="w-auto min-w-[180px] px-4 py-2.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] text-[var(--color-text)] text-sm outline-none transition-all focus:border-[rgba(0,196,106,0.45)] placeholder:text-[var(--color-muted)]"
          />
        </div>
      </motion.div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleViewChange("calendar")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
            viewMode === "calendar"
              ? "bg-[var(--color-accent)] text-[#07110d]"
              : "bg-[rgba(255,255,255,0.05)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => handleViewChange("list")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
            viewMode === "list"
              ? "bg-[var(--color-accent)] text-[#07110d]"
              : "bg-[rgba(255,255,255,0.05)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          List
        </button>
      </div>

      {loading && <Loading />}

      {!loading && viewMode === "calendar" && (
        entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <EmptyStateIllustration className="w-28 h-20 text-[var(--color-muted)]" />
            <p className="text-[var(--color-muted)]">No diary entries found.</p>
          </div>
        ) : (
          <CalendarDiary
            entries={entries}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        )
      )}

      {!loading && viewMode === "list" && Object.keys(groupedEntries).length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <EmptyStateIllustration className="w-28 h-20 text-[var(--color-muted)]" />
          <p className="text-[var(--color-muted)]">No diary entries found.</p>
        </div>
      )}

      {!loading && viewMode === "list" && Object.entries(groupedEntries).map(([month, monthEntries]) => (
        <SectionReveal key={month}>
          <section className="grid gap-4">
            <motion.h2
              className="m-0 text-lg font-bold"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease }}
            >
              {new Date(month + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
            </motion.h2>
            <StaggerContainer className="grid gap-3">
              {monthEntries.map((entry) => (
                <StaggerItem key={entry.id}>
                  <div className="flex flex-col gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)]">
                    {editingId === entry.id ? (
                      <AnimatePresence>
                        <motion.div
                          className="grid gap-3"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease }}
                        >
                          <StarPicker value={editRating} onChange={(v) => setEditRating(parseFloat(v))} />
                          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] px-4 py-2.5 text-[var(--color-text)]" />
                          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} placeholder="Notes (optional)" />
                          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editReread} onChange={(e) => setEditReread(e.target.checked)} className="accent-[var(--color-accent)]" /> Re-read</label>
                          <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Tags (comma-separated)" className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] px-4 py-2.5 text-[var(--color-text)] text-sm" />
                          <div className="flex items-center gap-3 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" onClick={handleUpdate} disabled={submitting}>
                              {submitting ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <>
                        <Link to={`/books/${entry.book.slug}`} className="flex items-start gap-3 md:gap-4">
                          <BookCover book={entry.book} size="small" />
                          <div className="grid gap-1.5 min-w-0">
                            <strong className="text-sm md:text-base">{entry.book.title}</strong>
                            <span className="text-xs text-[var(--color-muted)]">{new Date(entry.read_date).toLocaleDateString()}</span>
                             <div className="flex items-center flex-wrap gap-2 text-sm text-[var(--color-muted-strong)]">
                              {entry.rating && <Badge variant="gold">{entry.rating} ★</Badge>}
                              {entry.is_reread && <Badge>Re-read</Badge>}
                              {entry.tags?.map((tag: string) => (
                                <Badge key={tag} variant="outline">{tag}</Badge>
                              ))}
                            </div>
                            {entry.review_text && <p className="text-sm text-[var(--color-muted-strong)] m-0 line-clamp-3">{entry.review_text}</p>}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(entry)}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(entry.id)}>Delete</Button>
                        </div>
                      </>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </SectionReveal>
      ))}
    </div>
  );
}
