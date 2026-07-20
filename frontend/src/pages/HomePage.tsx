import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "@/context/auth-context";
import {
  getMyProfile, getMyStats, getDiaryEntries, getReadlist, getCurrentlyReading,
} from "@/lib/api";
import { MeDetail, DiaryEntry, ReadlistEntry, UserStats } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { Loading } from "@/components/loading";
import { FadeIn, StaggerContainer, StaggerItem, ScaleOnHover } from "@/components/motion/page-transition";
import { HeroParallax } from "@/components/gsap/hero-parallax";
import { SectionReveal } from "@/components/gsap/section-reveal";
import { ReadingIllustration, BookshelfIllustration, EmptyStateIllustration } from "@/components/illustrations";

export function HomePage() {
  const { localUser } = useAuth();
  const [profile, setProfile] = useState<MeDetail | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentDiary, setRecentDiary] = useState<DiaryEntry[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<ReadlistEntry[]>([]);
  const [readlist, setReadlist] = useState<ReadlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyProfile(),
      getMyStats(),
      getDiaryEntries({ page: 1, page_size: 5 }),
      getReadlist(),
      getCurrentlyReading(),
    ]).then(([p, s, d, r, cr]) => {
      setProfile(p);
      setStats(s);
      setRecentDiary(d.results || []);
      setReadlist(r.results || []);
      setCurrentlyReading(cr.results || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const displayName = profile?.profile?.display_name || localUser?.username || "";

  return (
    <div className="grid gap-7">
      <HeroParallax>
        <section className="grid gap-6">
          <div className="flex items-start justify-between gap-6">
              <div className="grid gap-3 md:gap-4">
              <motion.h1
                className="m-0 text-[clamp(1.7rem,4vw,3.3rem)] leading-[0.95] tracking-[-0.05em]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                Welcome back, {displayName}
              </motion.h1>
              {stats && <p className="m-0 text-xs md:text-sm text-[var(--color-muted)]">You've read <strong className="text-[var(--color-text)]">{stats.total_books_read}</strong> books so far.</p>}
            </div>
            <ReadingIllustration className="w-28 h-20 text-[rgba(0,196,106,0.25)] flex-shrink-0 hidden sm:block" />
          </div>
          {stats && (
            <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {([
                { value: stats.total_books_read, label: "Books Read" },
                { value: stats.books_read_this_year, label: "This Year" },
                { value: stats.average_rating, label: "Avg Rating" },
                { value: stats.total_reviews, label: "Reviews" },
              ] as const).map((stat) => (
                <StaggerItem key={stat.label}>
            <div className="grid gap-1.5 md:gap-2 p-4 md:p-5 rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.045)] border border-[rgba(255,255,255,0.05)] shadow-[var(--shadow-md)]">
                  <strong className="text-[1.5rem] md:text-[1.9rem] leading-none">{stat.value}</strong>
                  <span className="text-[var(--color-muted)] text-xs md:text-sm">{stat.label}</span>
                </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>
      </HeroParallax>

      {currentlyReading.length > 0 && (
        <SectionReveal>
          <section className="grid gap-4">
            <h2 className="m-0 text-[0.8rem] tracking-[0.18em] uppercase text-[var(--color-accent)]">Currently Reading</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentlyReading.map((entry) => (
                <ScaleOnHover key={entry.id}>
                  <Link to={`/books/${entry.book.slug}`} className="grid gap-2">
                    <BookCover book={entry.book} size="medium" />
                    <span className="text-xs text-center leading-tight line-clamp-2 text-[var(--color-text)]">{entry.book.title}</span>
                  </Link>
                </ScaleOnHover>
              ))}
            </div>
          </section>
        </SectionReveal>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.82fr] gap-5">
        <SectionReveal>
          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-[0.8rem] tracking-[0.18em] uppercase text-[var(--color-muted)]">Recent Diary Entries</h2>
              <Link to="/diary" className="text-[var(--color-muted)] text-sm hover:text-[var(--color-text)] transition-colors">View all</Link>
            </div>
            <div className="grid gap-3">
              {recentDiary.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <EmptyStateIllustration className="w-24 h-18 text-[var(--color-muted)]" />
                  <p className="text-[var(--color-muted)]">No entries yet. Search for a book to get started.</p>
                </div>
              )}
              {recentDiary.map((entry) => (
                <ScaleOnHover key={entry.id}>
                  <Link to={`/books/${entry.book.slug}`} className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.14)] transition-colors">
                    <BookCover book={entry.book} size="small" />
                    <div className="grid gap-1">
                      <strong className="text-sm">{entry.book.title}</strong>
                      <span className="text-xs text-[var(--color-muted)]">
                        {entry.rating && <>{entry.rating} ★ — </>}
                        {entry.is_reread && "Re-read — "}
                        {new Date(entry.read_date).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </ScaleOnHover>
              ))}
            </div>
          </section>
        </SectionReveal>

        <SectionReveal>
          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-[0.8rem] tracking-[0.18em] uppercase text-[var(--color-muted)]">Want to Read</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
              {readlist.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center col-span-3">
                  <BookshelfIllustration className="w-28 h-18 text-[var(--color-muted)]" />
                  <p className="text-[var(--color-muted)]">Your readlist is empty.</p>
                </div>
              )}
              {readlist.slice(0, 6).map((entry) => (
                <ScaleOnHover key={entry.id}>
                  <Link to={`/books/${entry.book.slug}`} className="grid gap-2">
                    <BookCover book={entry.book} size="medium" />
                    <span className="text-xs text-center leading-tight line-clamp-2 text-[var(--color-text)]">{entry.book.title}</span>
                  </Link>
                </ScaleOnHover>
              ))}
            </div>
          </section>
        </SectionReveal>
      </div>
    </div>
  );
}
