import { useMemo, useState } from "react";
import { getBookCoverCandidates, getBookCoverPlaceholder } from "@/lib/covers";

type BookLike = { title: string; author?: string; google_books_id?: string; cover_url?: string; thumbnail_url?: string };

type BookCoverProps = {
  book: BookLike;
  size?: "small" | "medium" | "large";
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
};

const sizeMap = {
  small: "max-w-[70px]",
  medium: "max-w-[120px]",
  large: "max-w-[240px]",
};

export function BookCover({
  book,
  size = "medium",
  className = "",
  alt,
  loading = "lazy",
}: BookCoverProps) {
  const sources = useMemo(
    () =>
      getBookCoverCandidates({
        title: book.title,
        author: book.author,
        google_books_id: book.google_books_id,
        cover_url: book.cover_url,
        thumbnail_url: book.thumbnail_url,
      }),
    [book]
  );
  const placeholder = useMemo(() => getBookCoverPlaceholder(book.title, book.author), [book]);
  const [index, setIndex] = useState(0);
  const src = sources[index] || placeholder;

  return (
    <img
      className={`book-cover ${sizeMap[size]} ${className}`}
      src={src}
      alt={alt || book.title}
      loading={loading}
      decoding="async"
      onError={() => {
        if (index < sources.length - 1) setIndex((current) => current + 1);
        else if (src !== placeholder) setIndex(sources.length);
      }}
    />
  );
}
