import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "@/context/auth-context";
import { getList, updateList, deleteList, removeBookFromList } from "@/lib/api";
import { BookListDetail } from "@/lib/types";
import { BookCover } from "@/components/book-cover";
import { Loading } from "@/components/loading";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/page-transition";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyStateIllustration } from "@/components/illustrations";

const ease = [0.16, 1, 0.3, 1] as const;

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<BookListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadList = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getList(id)
      .then(setList)
      .catch(() => navigate("/lists"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { loadList(); }, [loadList]);

  const openEdit = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDesc(list.description);
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!id || !editName.trim()) return;
    const token = await getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await updateList(id, token, { name: editName.trim(), description: editDesc.trim() });
      setEditDialogOpen(false);
      loadList();
    } catch { /* handled */ }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    const token = await getToken();
    if (!token) return;
    try {
      await deleteList(id, token);
      navigate("/lists");
    } catch { /* handled */ }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!id) return;
    const token = await getToken();
    if (!token) return;
    try {
      await removeBookFromList(id, token, itemId);
      loadList();
    } catch { /* handled */ }
  };

  if (loading) return <Loading />;
  if (!list) return null;

  return (
    <FadeIn>
      <div className="grid gap-7">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <Link to="/lists" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] no-underline">&larr; Lists</Link>
            <h1 className="m-0 text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[0.95] tracking-[-0.04em]">{list.name}</h1>
            {list.description && (
              <p className="m-0 text-sm text-[var(--color-muted)]">{list.description}</p>
            )}
            <span className="text-xs text-[var(--color-muted)]">
              {list.items.length} {list.items.length === 1 ? "book" : "books"}
              {list.is_ranked && " · Ranked"}
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" onClick={openEdit}>Edit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit List</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 pt-2">
                  <Input
                    placeholder="List name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={submitting}
                  />
                  <Input
                    placeholder="Description"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    disabled={submitting}
                  />
                  <Button onClick={handleUpdate} disabled={!editName.trim() || submitting}>
                    {submitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="danger" onClick={handleDelete}>Delete List</Button>
          </div>
        </div>

        {list.items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <EmptyStateIllustration />
            <p className="text-[var(--color-muted)] m-0">This list is empty. Add books from their detail pages.</p>
          </div>
        ) : (
          <StaggerContainer>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {list.items.map((item) => (
                <StaggerItem key={item.id}>
                  <motion.div className="relative group">
                    <Link to={`/books/${item.book.slug}`} className="no-underline">
                      <BookCover book={item.book} size="medium" />
                      <p className="m-0 mt-2 text-sm font-medium leading-tight line-clamp-2 text-[var(--color-text)]">{item.book.title}</p>
                    </Link>
                    <button
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity border-0 cursor-pointer"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove from list"
                    >
                      &times;
                    </button>
                  </motion.div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        )}
      </div>
    </FadeIn>
  );
}
