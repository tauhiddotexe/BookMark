import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import { getDiaryEntries, deleteDiaryEntry } from "@/lib/api";
import { DiaryEntry } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { StarIcon, TrashIcon, EditIcon } from "@/components/icons";
import { useToast } from "@/components/toast-provider";
import { EditDiaryModal } from "@/components/edit-diary-modal";

export function DiaryPage() {
  const { localUser, loading: authLoading, getToken } = useAuth();
  const { pushToast } = useToast();
  
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  
  // Filters
  const [yearFilter, setYearFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [rereadFilter, setRereadFilter] = useState(false);
  const [shelfFilter, setShelfFilter] = useState("");

  const loadEntries = useCallback(async (page: number, append = false) => {
    if (!localUser?.username) return;
    
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const params: Record<string, string | number | boolean> = {
        username: localUser.username,
        page,
      };
      if (yearFilter) params.year = yearFilter;
      if (ratingFilter) params.rating = ratingFilter;
      if (rereadFilter) params.is_reread = true;
      if (shelfFilter) params.shelf = shelfFilter;

      const data = await getDiaryEntries(params);
      
      setEntries(prev => append ? [...prev, ...data.results] : data.results);
      
      if (data.next) {
        const url = new URL(data.next);
        const nextPg = url.searchParams.get("page");
        setNextPage(nextPg ? parseInt(nextPg, 10) : null);
      } else {
        setNextPage(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load diary entries");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [localUser?.username, yearFilter, ratingFilter, rereadFilter, shelfFilter]);

  useEffect(() => {
    if (!authLoading && localUser) {
      loadEntries(1);
    }
  }, [authLoading, localUser, loadEntries]);

  const handleEditSuccess = (updatedEntry: DiaryEntry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  };

  const handleDelete = async (entryId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this diary entry? This action cannot be undone.")) {
      return;
    }
    
    const token = await getToken();
    if (!token) return;
    
    try {
      await deleteDiaryEntry(entryId, token);
      pushToast("Entry deleted successfully.");
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err: any) {
      pushToast(err.message || "Failed to delete entry.", "error");
    }
  };

  // Group by Year and Month
  const groupedEntries = useMemo(() => {
    const groups: { year: string; month: string; entries: DiaryEntry[] }[] = [];
    
    const sorted = [...entries].sort((a, b) => new Date(b.read_date).getTime() - new Date(a.read_date).getTime());
    
    sorted.forEach(entry => {
      const date = new Date(entry.read_date);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString('default', { month: 'long' });
      
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.year === year && lastGroup.month === month) {
        lastGroup.entries.push(entry);
      } else {
        groups.push({ year, month, entries: [entry] });
      }
    });
    
    return groups;
  }, [entries]);

  if (authLoading || (loading && entries.length === 0 && !error)) {
    return (
      <div className="shell page-loading">
        <div className="spinner"></div>
        <style>{`
          .page-loading { display: flex; justify-content: center; padding: 4rem; }
          .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--text); border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="shell diary-page">
      <div className="diary-header">
        <h1 className="page-title">Reading Diary</h1>
        <p className="lede">A chronological record of books you've read.</p>
      </div>

      <div className="diary-filters panel">
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {Array.from({length: 10}, (_, i) => currentYear - i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>

        <select value={shelfFilter} onChange={e => setShelfFilter(e.target.value)}>
          <option value="">All Shelves</option>
          <option value="READ">Read</option>
          <option value="REREADING">Re-reading</option>
          <option value="CURRENTLY_READING">Currently Reading</option>
          <option value="WANT_TO_READ">Want to Read</option>
          <option value="DROPPED">Dropped</option>
        </select>

        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={rereadFilter} 
            onChange={e => setRereadFilter(e.target.checked)} 
          />
          Rereads only
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!loading && entries.length === 0 ? (
        <div className="empty-state panel">
          <h2>No diary entries found.</h2>
          <p className="muted">Log a book to start building your reading history.</p>
          <Link to="/search" className="action-link">Find a Book</Link>
        </div>
      ) : (
        <div className="diary-timeline">
          {groupedEntries.map((group, i) => (
            <div key={`${group.year}-${group.month}-${i}`} className="diary-month-group">
              <h2 className="month-heading">{group.month} <span>{group.year}</span></h2>
              <div className="diary-entries-list">
                {group.entries.map(entry => (
                  <div key={entry.id} className="diary-entry-card panel">
                    <Link to={`/books/${entry.book.slug}`}>
                      <img 
                        src={entry.book.thumbnail_url || entry.book.cover_url} 
                        alt={entry.book.title} 
                        className="diary-book-cover"
                      />
                    </Link>
                    <div className="diary-entry-content">
                      <div className="diary-entry-header">
                        <Link to={`/books/${entry.book.slug}`} className="book-title-link">
                          <h3 className="book-title">{entry.book.title}</h3>
                        </Link>
                        <span className="book-author">by {entry.book.author}</span>
                      </div>
                      
                      <div className="diary-entry-meta">
                        <span className="read-date">
                          Read on {new Date(entry.read_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {entry.is_reread && <span className="meta-badge">Reread</span>}
                        {entry.rating && (
                          <span className="rating">
                            <StarIcon size={14} className="star-filled" /> {entry.rating}
                          </span>
                        )}
                      </div>

                      {entry.review_text && (
                        <p className="review-preview">
                          {entry.contains_spoilers ? (
                            <span className="spoiler-warning">This log contains spoilers.</span>
                          ) : (
                            entry.review_text.length > 250 
                              ? `${entry.review_text.substring(0, 250)}...` 
                              : entry.review_text
                          )}
                        </p>
                      )}
                    </div>
                    <div className="diary-entry-actions">
                      <button 
                        className="icon-action edit-btn" 
                        onClick={() => setEditingEntry(entry)}
                        title="Edit Entry"
                      >
                        <EditIcon size={16} />
                      </button>
                      <button 
                        className="icon-action delete-btn" 
                        onClick={() => handleDelete(entry.id)}
                        title="Delete Entry"
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {nextPage && (
            <button 
              className="load-more-btn chip-solid" 
              onClick={() => loadEntries(nextPage, true)}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      )}

      {editingEntry && (
        <EditDiaryModal 
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSuccess={handleEditSuccess}
        />
      )}
      
      <style>{`
        .diary-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .diary-header {
          margin-bottom: 32px;
        }
        .diary-filters {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-bottom: 40px;
          padding: 16px 20px;
        }
        .diary-filters select {
          width: auto;
          min-width: 140px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--muted);
          font-weight: 500;
        }
        .checkbox-label input {
          width: 18px;
          height: 18px;
        }
        .diary-timeline {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }
        .diary-month-group {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .month-heading {
          font-size: 1.6rem;
          margin: 0;
          color: var(--text);
          border-bottom: 1px solid var(--line);
          padding-bottom: 12px;
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .month-heading span {
          font-size: 1.1rem;
          color: var(--muted);
          font-weight: 500;
        }
        .diary-entries-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .diary-entry-card {
          display: flex;
          gap: 24px;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
          position: relative;
        }
        .diary-entry-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.32);
        }
        .diary-entry-card:hover .diary-entry-actions {
          opacity: 1;
        }
        .diary-book-cover {
          width: 90px;
          height: 135px;
          object-fit: cover;
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
          box-shadow: 0 10px 24px rgba(0,0,0,0.3);
          flex-shrink: 0;
        }
        .diary-entry-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .diary-entry-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .book-title-link {
          text-decoration: none;
          color: inherit;
        }
        .book-title-link:hover {
          text-decoration: underline;
        }
        .book-title {
          font-size: 1.4rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }
        .book-author {
          color: var(--muted);
          font-size: 1rem;
        }
        .diary-entry-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 0.9rem;
          color: var(--muted);
          flex-wrap: wrap;
        }
        .rating {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--gold);
          font-weight: 700;
        }
        .star-filled {
          fill: var(--gold);
        }
        .review-preview {
          margin: 0;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--muted-strong);
        }
        .spoiler-warning {
          font-style: italic;
          color: var(--danger);
          padding: 4px 10px;
          background: rgba(255, 145, 143, 0.1);
          border-radius: 4px;
          font-size: 0.85rem;
        }
        .diary-entry-actions {
          display: flex;
          gap: 8px;
          position: absolute;
          top: 16px;
          right: 16px;
          opacity: 0;
          transition: opacity 180ms ease;
        }
        @media (max-width: 768px) {
          .diary-entry-actions {
            opacity: 1;
            position: relative;
            top: 0;
            right: 0;
            margin-top: 12px;
            justify-content: flex-end;
          }
        }
        .edit-btn, .delete-btn {
          cursor: pointer;
        }
        .delete-btn:hover {
          background: rgba(255, 77, 109, 0.14);
          border-color: rgba(255, 77, 109, 0.28);
          color: #ff7d96;
        }
        .load-more-btn {
          width: 100%;
          margin-top: 16px;
          justify-content: center;
          font-size: 1.1rem;
          padding: 16px;
        }
        .empty-state {
          text-align: center;
          padding: 64px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .empty-state h2 {
          font-size: 1.5rem;
          margin: 0;
        }
        .error-message {
          color: var(--danger);
          padding: 16px;
          background: rgba(255, 145, 143, 0.1);
          border: 1px solid rgba(255, 145, 143, 0.2);
          border-radius: 8px;
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
}
