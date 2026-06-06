import { BookCover } from "@/components/book-cover";
import { BookList } from "@/lib/types";

type ListCardProps = {
  list: BookList;
};

export function ListCard({ list }: ListCardProps) {
  return (
    <article className="card list-card">
      <span className="pill">{list.items.length} books</span>
      <h3 style={{ marginTop: 12 }}>{list.name}</h3>
      <p className="muted">{list.description}</p>
      <div className="list-cover-strip">
        {list.items.slice(0, 4).map((item) => (
          <BookCover
            key={item.id}
            className="cover"
            title={item.book.title}
            author={item.book.author}
            googleBooksId={item.book.google_books_id}
            coverUrl={item.book.cover_url}
            thumbnailUrl={item.book.thumbnail_url}
          />
        ))}
      </div>
    </article>
  );
}
