"use client";

import { useMemo, useState } from "react";

import { getBookCoverCandidates, getBookCoverPlaceholder } from "@/lib/covers";

type BookCoverProps = {
  title: string;
  author?: string;
  googleBooksId?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
};

export function BookCover({
  title,
  author,
  googleBooksId,
  coverUrl,
  thumbnailUrl,
  className = "cover",
  alt,
  loading = "lazy"
}: BookCoverProps) {
  const sources = useMemo(
    () =>
      getBookCoverCandidates({
        title,
        author,
        google_books_id: googleBooksId,
        cover_url: coverUrl,
        thumbnail_url: thumbnailUrl
      }),
    [author, coverUrl, googleBooksId, thumbnailUrl, title]
  );
  const placeholder = useMemo(() => getBookCoverPlaceholder(title, author), [author, title]);
  const [index, setIndex] = useState(0);

  const src = sources[index] || placeholder;

  return (
    <img
      className={className}
      src={src}
      alt={alt || title}
      loading={loading}
      decoding="async"
      onError={() => {
        if (index < sources.length - 1) setIndex((current) => current + 1);
        else if (src !== placeholder) setIndex(sources.length);
      }}
    />
  );
}
