import { Link } from "react-router-dom";
import { BookCover } from "@/components/book-cover";
import { StaggerContainer, StaggerItem } from "@/components/motion/page-transition";

type BookLike = {
  id?: string; slug?: string; title: string; author?: string;
  google_books_id?: string; cover_url?: string; thumbnail_url?: string;
};

type PosterGridProps = {
  books: BookLike[];
  size?: "small" | "medium";
  columns?: number;
  getSlug?: (book: BookLike) => string;
};

export function PosterGrid({ books, size = "medium", columns = 5, getSlug }: PosterGridProps) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  }[columns] || "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  return (
    <StaggerContainer>
      <div className={`grid gap-4 ${colClass}`}>
        {books.map((book) => {
          const slug = getSlug ? getSlug(book) : (book as any).slug;
          return (
            <StaggerItem key={book.id || slug || book.title}>
              <Link to={slug ? `/books/${slug}` : "#"} className="no-underline group">
                <BookCover book={book} size={size} />
                <p className="m-0 mt-2 text-sm font-medium leading-tight line-clamp-2 text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                  {book.title}
                </p>
              </Link>
            </StaggerItem>
          );
        })}
      </div>
    </StaggerContainer>
  );
}
