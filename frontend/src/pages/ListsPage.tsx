import { useEffect, useState } from "react";

import { Loading } from "@/components/loading";
import { getLists } from "@/lib/api";
import { BookList } from "@/lib/types";
import { ListCard } from "@/components/list-card";

export function ListsPage() {
  const [lists, setLists] = useState<BookList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Lists — Bookmark";
    const controller = new AbortController();

    getLists(undefined, { signal: controller.signal })
      .then((data) => { setLists(data.results); })
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      })
      .finally(() => { setLoading(false); });

    return () => controller.abort();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="stack">
      <section className="panel hero-panel">
        <span className="pill">Custom Lists</span>
        <h1 className="page-title">Collect books around moods, obsessions, and rabbit holes.</h1>
        <p className="lede">Public lists work like curated shelves for themes, authors, eras, reading challenges, and the very specific reading moods you want to revisit later.</p>
      </section>

      <section className="book-grid">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </section>
    </div>
  );
}
