import { BookCover } from "@/components/book-cover";
import { getLists } from "@/lib/api";

export default async function ListsPage() {
  const lists = await getLists();

  return (
    <div className="stack">
      <section className="panel hero-panel">
        <span className="pill">Custom Lists</span>
        <h1 className="page-title">Collect books around moods, obsessions, and rabbit holes.</h1>
        <p className="lede">Public lists work like curated shelves for themes, authors, eras, reading challenges, and the very specific reading moods you want to revisit later.</p>
      </section>

      <section className="book-grid">
        {lists.results.map((list) => (
          <article key={list.id} className="card list-card">
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
        ))}
      </section>
    </div>
  );
}
