import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { DiaryEntry } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ease = [0.16, 1, 0.3, 1] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarDiaryProps = {
  entries: DiaryEntry[];
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => void;
};

export function CalendarDiary({ entries, onEdit, onDelete }: CalendarDiaryProps) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const entry of entries) {
      const key = entry.read_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [entries]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startPad = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    const isPadding = i < startPad || dayNum > daysInMonth;
    const dateStr = isPadding
      ? ""
      : `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const dayEntries = dateStr ? entriesByDate.get(dateStr) || [] : [];
    const isToday = dateStr === today;
    const isExpanded = dateStr === expandedDate;

    cells.push(
      <button
        key={i}
        onClick={() => {
          if (!isPadding && dayEntries.length > 0) {
            setExpandedDate(isExpanded ? null : dateStr);
          }
        }}
        disabled={isPadding || dayEntries.length === 0}
        className={`
          relative flex flex-col items-start gap-0.5 p-1.5 rounded-[var(--radius-sm)]
          min-h-[80px] md:min-h-[100px] text-left transition-all duration-150
          ${isPadding ? "opacity-20 cursor-default" : "cursor-pointer hover:bg-[rgba(255,255,255,0.04)]"}
          ${isToday ? "ring-1 ring-[var(--color-accent)]" : "border border-[var(--color-line)]"}
          ${isExpanded ? "bg-[rgba(0,196,106,0.08)] ring-1 ring-[var(--color-accent)]" : "bg-[rgba(255,255,255,0.015)]"}
        `}
      >
        <span className={`text-[0.65rem] font-semibold leading-tight ${isToday ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}`}>
          {isPadding ? "" : dayNum}
        </span>
        <div className="flex flex-col gap-0.5 w-full">
          {dayEntries.slice(0, 3).map((entry) => (
            <div key={entry.id} className="flex items-center gap-1 w-full overflow-hidden">
              <img
                src={entry.book.thumbnail_url || entry.book.cover_url}
                alt={entry.book.title}
                className="w-[22px] h-[33px] md:w-[26px] md:h-[39px] rounded-[3px] object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {entry.rating && (
                <span className="text-[0.55rem] text-[var(--color-gold)] flex-shrink-0">{entry.rating}</span>
              )}
            </div>
          ))}
          {dayEntries.length > 3 && (
            <span className="text-[0.55rem] text-[var(--color-muted)] font-medium">
              +{dayEntries.length - 3} more
            </span>
          )}
        </div>
      </button>
    );
  }

  const expandedEntries = expandedDate ? entriesByDate.get(expandedDate) || [] : [];

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] transition-all text-[var(--color-muted-strong)]"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2 className="m-0 text-base md:text-lg font-bold">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] transition-all text-[var(--color-muted-strong)]"
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => (
          <div key={d} className="text-[0.65rem] font-semibold text-[var(--color-muted)] uppercase tracking-wider text-center py-1">
            {d}
          </div>
        ))}
        {cells}
      </div>

      <AnimatePresence>
        {expandedDate && expandedEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25, ease }}
            className="grid gap-3 overflow-hidden"
          >
            <div className="text-xs text-[var(--color-muted)] font-medium">
              {new Date(expandedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            {expandedEntries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease }}
                className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)]"
              >
                <Link to={`/books/${entry.book.slug}`} className="flex-shrink-0">
                  <BookCover book={entry.book} size="small" />
                </Link>
                <div className="grid gap-1.5 min-w-0 flex-1">
                  <Link to={`/books/${entry.book.slug}`} className="text-sm font-semibold hover:text-[var(--color-accent)] transition-colors truncate">
                    {entry.book.title}
                  </Link>
                  <div className="flex items-center gap-2">
                    {entry.rating && <Badge variant="gold">{entry.rating} ★</Badge>}
                    {entry.is_reread && <Badge>Re-read</Badge>}
                  </div>
                  {entry.review_text && (
                    <p className="text-xs text-[var(--color-muted-strong)] m-0 line-clamp-2">{entry.review_text}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(entry.id)}>Delete</Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
