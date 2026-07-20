import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { getMyProfile } from "@/lib/api";
import { MeDetail } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { Loading } from "@/components/loading";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import { HeroParallax } from "@/components/gsap/hero-parallax";
import { SectionReveal } from "@/components/gsap/section-reveal";
import { BookshelfIllustration } from "@/components/illustrations";

export function ProfilePage() {
  const [profile, setProfile] = useState<MeDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"diary" | "reviews" | "readlist" | "favorites">("diary");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!profile) return <p className="text-[var(--color-muted)]">Could not load profile.</p>;

  const { stats } = profile;

  const tabs = ["diary", "reviews", "readlist", "favorites"] as const;

  return (
    <div className="grid gap-7">
      <HeroParallax>
        <motion.div
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 md:gap-5 items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-[72px] h-[72px] md:w-[92px] md:h-[92px] rounded-[20px] md:rounded-[28px] overflow-hidden bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] shadow-[0_18px_36px_rgba(0,0,0,0.26)] flex-shrink-0">
            {profile.profile?.avatar_url ? (
              <img src={profile.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center font-bold text-[var(--color-muted)] text-2xl">
                {profile.username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <h1 className="m-0 text-[clamp(2rem,4vw,3.3rem)] tracking-[-0.05em]">{profile.profile?.display_name || profile.username}</h1>
            {profile.profile?.bio && <p className="m-0 text-[var(--color-muted)]">{profile.profile.bio}</p>}
          </div>
          <BookshelfIllustration className="w-28 h-18 text-[rgba(0,196,106,0.2)] flex-shrink-0 hidden sm:block" />
        </motion.div>
      </HeroParallax>

      {stats && (
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { value: stats.total_books_read, label: "Total Read" },
            { value: stats.books_read_this_year, label: "This Year" },
            { value: stats.average_rating, label: "Avg Rating" },
            { value: stats.total_reviews, label: "Reviews" },
          ] as const).map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="grid gap-1.5 md:gap-2 p-4 md:p-5 rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.045)] border border-[rgba(255,255,255,0.05)] shadow-[var(--shadow-md)]">
                <strong className="text-[1.3rem] md:text-[1.55rem]">{stat.value}</strong>
                <span className="text-[var(--color-muted)] text-xs md:text-sm">{stat.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {stats?.favorite_genres && stats.favorite_genres.length > 0 && (
        <SectionReveal>
          <div className="flex flex-wrap gap-2">
            {stats.favorite_genres.map((g) => (
              <Badge key={g}>{g}</Badge>
            ))}
          </div>
        </SectionReveal>
      )}

      <motion.div
        className="flex gap-1 p-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[var(--color-line)] w-full sm:w-fit overflow-x-auto scrollbar-none"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-180 ${
              activeTab === tab
                ? "bg-gradient-to-r from-[#00c46a] to-[#4ff1a8] text-[#04130b]"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </motion.div>

      <SectionReveal>
      <div className="grid gap-4">
        {activeTab === "diary" && (
          <StaggerContainer className="grid gap-3">
            {profile.diary_entries.length === 0 && <p className="text-[var(--color-muted)]">No diary entries yet.</p>}
            {profile.diary_entries.map((entry) => (
              <StaggerItem key={entry.id}>
                <Link to={`/books/${entry.book.slug}`} className="flex items-start gap-4 p-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] transition-all hover:border-[rgba(255,255,255,0.14)]">
                  <BookCover book={entry.book} size="small" />
                  <div className="grid gap-1.5">
                    <strong>{entry.book.title}</strong>
                    <span className="text-xs text-[var(--color-muted)]">
                      {entry.rating && <>{entry.rating} ★</>}
                      {entry.is_reread && " — Re-read"}
                      {" — "}{new Date(entry.read_date).toLocaleDateString()}
                    </span>
                    {entry.review_text && <p className="text-sm text-[var(--color-muted-strong)] m-0">{entry.review_text.slice(0, 140)}</p>}
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {activeTab === "reviews" && (
          <StaggerContainer className="grid gap-3">
            {profile.reviews.length === 0 && <p className="text-[var(--color-muted)]">No reviews yet.</p>}
            {profile.reviews.map((review) => (
              <StaggerItem key={review.id}>
                <Link to={`/books/${review.book.slug}`} className="flex items-start gap-4 p-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] transition-all hover:border-[rgba(255,255,255,0.14)]">
                  <BookCover book={review.book} size="small" />
                  <div className="grid gap-1.5">
                    <strong>{review.book.title}</strong>
                    <span className="text-xs text-[var(--color-muted)]">{review.rating} ★ — {new Date(review.created_at).toLocaleDateString()}</span>
                    {review.review_text && <p className="text-sm text-[var(--color-muted-strong)] m-0">{review.review_text.slice(0, 200)}</p>}
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {activeTab === "readlist" && (
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {profile.readlist.length === 0 && <p className="text-[var(--color-muted)] col-span-full">Your readlist is empty.</p>}
            {profile.readlist.map((entry) => (
              <StaggerItem key={entry.id}>
                <Link to={`/books/${entry.book.slug}`} className="grid gap-2">
                  <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <BookCover book={entry.book} size="medium" />
                  </motion.div>
                  <span className="text-xs text-center leading-tight line-clamp-2">{entry.book.title}</span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {activeTab === "favorites" && (
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {profile.favorite_books.length === 0 && <p className="text-[var(--color-muted)] col-span-full">No favorites yet.</p>}
            {profile.favorite_books.map((fav) => (
              <StaggerItem key={fav.id}>
                <Link to={`/books/${fav.book.slug}`} className="grid gap-2">
                  <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <BookCover book={fav.book} size="medium" />
                  </motion.div>
                  <span className="text-xs text-center leading-tight line-clamp-2">{fav.book.title}</span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
      </SectionReveal>
    </div>
  );
}
