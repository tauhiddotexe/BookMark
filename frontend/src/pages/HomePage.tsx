import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  getDiaryEntries, getCurrentlyReading, getMyStats,
  discoverBooks, getNewReleases,
} from "@/lib/api";
import { DiaryEntry, DiaryResponse, ReadlistEntry, UserStats, SearchBookResult } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { Loading } from "@/components/loading";
import { SectionReveal } from "@/components/gsap/section-reveal";
import { Button } from "@/components/ui/button";

const ease = [0.16, 1, 0.3, 1] as const;

function StarRating({ rating, size = "sm" }: { rating: number | string | null; size?: "sm" | "lg" }) {
  if (!rating) return null;
  const r = Math.round(Number(rating));
  return (
    <span className={`tracking-[0.1em] ${size === "lg" ? "text-lg" : "text-xs"} text-[var(--color-accent)]`}>
      {"★".repeat(r)}{"☆".repeat(5 - r)}
    </span>
  );
}

function PosterRow({
  title, books, badge, linkTo,
}: {
  title: string; books: Array<{ slug?: string; title: string; author?: string; cover_url?: string; thumbnail_url?: string; google_books_id?: string }>; badge?: string | number; linkTo?: string;
}) {
  if (!books.length) return null;
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="m-0 text-xs tracking-[0.18em] uppercase text-[var(--color-muted)] font-semibold">
            {title}
          </h2>
          {badge != null && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium">
              {badge}
            </span>
          )}
        </div>
        {linkTo && (
          <Link
            to={linkTo}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors no-underline"
          >
            View all &rarr;
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
        {books.map((book) => {
          const slug = book.slug || book.google_books_id;
          const Wrapper = slug ? Link : "div";
          const wrapperProps = slug ? { to: `/books/${slug}`, className: "grid gap-2 no-underline" } : { className: "grid gap-2" };
          return (
            <motion.div
              key={book.google_books_id || book.title}
              className="snap-start shrink-0 w-[110px]"
              whileHover={{ y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <Wrapper {...(wrapperProps as any)}>
                <BookCover book={book as any} size="medium" />
                <span className="text-xs leading-tight line-clamp-2 text-[var(--color-text)]">
                  {book.title}
                </span>
              </Wrapper>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function ReadingStreak({ entries }: { entries: DiaryEntry[] }) {
  if (!entries.length) return null;
  const dates = entries.map((e) => new Date(e.read_date));
  dates.sort((a, b) => b.getTime() - a.getTime());
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (
    dates[0].getTime() < today.getTime() - 86400000 * 2 ||
    dates[0].getTime() > today.getTime() + 86400000
  ) {
    streak = 0;
  } else {
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.round(
        (dates[i - 1].getTime() - dates[i].getTime()) / 86400000
      );
      if (diff === 1) streak++;
      else break;
    }
  }
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayLabels: { label: string; active: boolean; today: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayLabels.push({
      label: weekDays[d.getDay()][0],
      active: entries.some(
        (e) => new Date(e.read_date).toDateString() === d.toDateString()
      ),
      today: d.toDateString() === today.toDateString(),
    });
  }
  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-line)]">
      <div className="grid gap-0.5">
        <span className="text-xl font-bold leading-none">{streak}</span>
        <span className="text-[11px] text-[var(--color-muted)]">day streak</span>
      </div>
      <div className="flex gap-1">
        {dayLabels.map((d, i) => (
          <div key={i} className="grid gap-0.5 items-center text-center">
            <span className="text-[9px] text-[var(--color-muted)]">{d.label}</span>
            <div
              className={`w-3.5 h-3.5 rounded-sm ${
                d.today
                  ? "bg-[var(--color-accent)]"
                  : d.active
                    ? "bg-[rgba(0,196,106,0.4)]"
                    : "bg-[rgba(255,255,255,0.06)]"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSection({ books }: { books: SearchBookResult[] }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || books.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % books.length);
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, books.length]);

  const goNext = () => setIndex((i) => (i + 1) % books.length);
  const goPrev = () => setIndex((i) => (i - 1 + books.length) % books.length);

  if (!books.length) {
    return (
      <motion.section
        className="relative overflow-hidden rounded-[var(--radius-xl)] min-h-[340px] flex items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative z-10 p-8 md:p-12 grid gap-4">
          <h1 className="m-0 text-[clamp(1.8rem,4vw,3rem)] leading-[0.95] tracking-[-0.04em]">
            Your Reading Diary
          </h1>
          <p className="text-[var(--color-muted)] max-w-md text-sm">
            Track every book you read. Build your library. Discover your next great read.
          </p>
          <div>
            <Button onClick={() => navigate("/search")}>Find your first book</Button>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,196,106,0.08)] to-transparent" />
      </motion.section>
    );
  }

  const book = books[index];
  const backdropUrl = book.cover_url || book.thumbnail_url;
  const slug = book.existing_slug || "";

  return (
    <motion.section
      className="relative overflow-hidden rounded-[var(--radius-xl)] min-h-[360px] md:min-h-[420px] flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={book.google_books_id}
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : undefined }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, var(--color-bg) 0%, color-mix(in srgb, var(--color-bg) 70%, transparent) 50%, transparent 100%)`,
        }}
      />

      <div className="relative z-10 w-full p-6 md:p-10 grid md:flex gap-6 items-end">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={book.google_books_id}
            className="w-[130px] md:w-[160px] shrink-0 shadow-2xl rounded-[var(--radius-md)] overflow-hidden -mb-16 md:-mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease }}
          >
            <BookCover book={book as any} size="medium" />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={book.google_books_id}
            className="grid gap-2 pb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease, delay: 0.1 }}
          >
            <h1 className="m-0 text-xl md:text-3xl font-bold leading-tight tracking-[-0.02em]">
              {book.title}
            </h1>
            <p className="text-sm text-[var(--color-muted)]">{book.author}</p>
            {book.categories && (
              <p className="text-xs text-[var(--color-muted)]">{book.categories}</p>
            )}
            {book.description && (
              <p className="text-sm text-[var(--color-muted)] line-clamp-2 max-w-lg mt-1">
                {book.description}
              </p>
            )}
            <div className="flex gap-3 mt-2">
              <Button
                size="sm"
                onClick={() => navigate(slug ? `/books/${slug}` : `/search?q=${encodeURIComponent(book.title)}`)}
              >
                {slug ? "View Book" : "Find Book"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
        <button
          onClick={goNext}
          className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.16)] backdrop-blur-sm flex items-center justify-center text-sm transition-colors cursor-pointer"
          aria-label="Next book"
        >
          &darr;
        </button>
        <button
          onClick={goPrev}
          className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.16)] backdrop-blur-sm flex items-center justify-center text-sm transition-colors cursor-pointer"
          aria-label="Previous book"
        >
          &uarr;
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {books.slice(0, 10).map((_, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); setPaused(true); }}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              i === index ? "bg-[var(--color-accent)] w-5" : "bg-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.35)]"
            }`}
            aria-label={`Go to book ${i + 1}`}
          />
        ))}
      </div>
    </motion.section>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [hero, setHero] = useState<SearchBookResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchBookResult[]>([]);
  const [recentDiary, setRecentDiary] = useState<DiaryEntry[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<ReadlistEntry[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getNewReleases(),
      discoverBooks(),
      getDiaryEntries({ page: 1, page_size: 20 }),
      getCurrentlyReading(),
      getMyStats(),
    ])
      .then((all) => {
        const nr = all[0] as { results: SearchBookResult[] };
        const disc = all[1] as { results: SearchBookResult[] };
        const d = all[2] as DiaryResponse;
        const cr = all[3] as { results: ReadlistEntry[] };
        const s = all[4] as UserStats;
        setHero(nr.results || []);
        setSuggestions(disc.results || []);
        setRecentDiary(d.results || []);
        setCurrentlyReading(cr.results || []);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const thisMonthCount = recentDiary.filter(
    (e) =>
      new Date(e.read_date).getMonth() === now.getMonth() &&
      new Date(e.read_date).getFullYear() === now.getFullYear()
  ).length;

  return (
    <div className="grid gap-10">
      <HeroSection books={hero} />

      {suggestions.length > 0 && (
        <SectionReveal>
          <PosterRow
            title="Suggestions"
            books={suggestions.map((b) => ({ ...b, slug: b.existing_slug || undefined }))}
            badge={monthName}
          />
        </SectionReveal>
      )}

      {currentlyReading.length > 0 && (
        <SectionReveal>
          <PosterRow
            title="Currently Reading"
            books={currentlyReading.map((e) => ({ slug: e.book.slug, title: e.book.title, author: e.book.author, cover_url: e.book.cover_url, thumbnail_url: e.book.thumbnail_url, google_books_id: e.book.google_books_id }))}
            badge={currentlyReading.length}
          />
        </SectionReveal>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
        <SectionReveal>
          <section className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="m-0 text-xs tracking-[0.18em] uppercase text-[var(--color-muted)] font-semibold">
                  Recent Entries
                </h2>
                {recentDiary.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium">
                    {recentDiary.length} total
                  </span>
                )}
              </div>
              <Link
                to="/diary"
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors no-underline"
              >
                View all &rarr;
              </Link>
            </div>
            {recentDiary.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)]">
                <p className="text-sm text-[var(--color-muted)]">No entries yet.</p>
                <Button size="sm" onClick={() => navigate("/search")}>
                  Find a book
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                {recentDiary.slice(0, 8).map((entry) => (
                  <motion.div
                    key={entry.id}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Link
                      to={`/books/${entry.book.slug}`}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.14)] transition-colors no-underline"
                    >
                      <BookCover book={entry.book} size="small" />
                      <div className="grid gap-0.5 min-w-0 flex-1">
                        <strong className="text-sm text-[var(--color-text)] truncate">
                          {entry.book.title}
                        </strong>
                        <span className="text-xs text-[var(--color-muted)]">
                          {entry.rating && <>{entry.rating} ★ · </>}
                          {new Date(entry.read_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </SectionReveal>

        <SectionReveal>
          <section className="grid gap-5">
            {stats && stats.books_read_this_year > 0 && (
              <div className="grid gap-3 p-5 rounded-[var(--radius-xl)] bg-gradient-to-b from-[rgba(26,42,33,0.5)] to-[rgba(8,12,10,0.7)] border border-[var(--color-line)]">
                <div className="flex items-center justify-between">
                  <h2 className="m-0 text-xs tracking-[0.18em] uppercase text-[var(--color-muted)] font-semibold">
                    {now.getFullYear()} Reading
                  </h2>
                  <span className="text-xs text-[var(--color-muted)]">
                    {stats.books_read_this_year} books
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[rgba(0,196,106,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.books_read_this_year / 52) * 100, 100)}%` }}
                    transition={{ duration: 1, ease }}
                  />
                </div>
                <p className="m-0 text-xs text-[var(--color-muted)]">
                  {stats.books_read_this_year >= 52
                    ? "A book a week! Incredible."
                    : `${52 - stats.books_read_this_year} more to hit one per week.`}
                </p>
              </div>
            )}

            <ReadingStreak entries={recentDiary} />

            {stats && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: stats.total_books_read, label: "Total" },
                  { value: stats.books_read_this_year, label: "This Year" },
                  { value: stats.average_rating || "—", label: "Avg Rating" },
                  { value: thisMonthCount, label: monthName },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-line)]"
                  >
                    <strong className="text-lg leading-none">{stat.value}</strong>
                    <span className="block text-[11px] text-[var(--color-muted)] mt-1">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </SectionReveal>
      </div>
    </div>
  );
}


