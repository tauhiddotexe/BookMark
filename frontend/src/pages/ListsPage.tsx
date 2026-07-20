import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "@/context/auth-context";
import { getLists, createList, deleteList } from "@/lib/api";
import { BookList } from "@/lib/types";
import { Loading } from "@/components/loading";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/page-transition";
import { SectionReveal } from "@/components/gsap/section-reveal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyStateIllustration } from "@/components/illustrations";

const ease = [0.16, 1, 0.3, 1] as const;

export function ListsPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<BookList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadLists = useCallback(() => {
    setLoading(true);
    getLists()
      .then((data) => setLists(data.results || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLists(); }, [loadLists]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const token = await getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await createList(token, { name: newName.trim(), description: newDesc.trim() });
      setNewName("");
      setNewDesc("");
      setDialogOpen(false);
      loadLists();
    } catch { /* handled */ }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await deleteList(id, token);
      loadLists();
    } catch { /* handled */ }
  };

  if (loading) return <Loading />;

  return (
    <FadeIn>
      <div className="grid gap-7">
        <SectionReveal>
          <div className="flex items-center justify-between">
            <h1 className="m-0 text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[0.95] tracking-[-0.04em]">Lists</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">New List</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create List</DialogTitle>
                  <DialogDescription>A named collection of books you want to organize.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 pt-2">
                  <Input
                    placeholder="List name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={submitting}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    disabled={submitting}
                  />
                  <Button onClick={handleCreate} disabled={!newName.trim() || submitting}>
                    {submitting ? "Creating..." : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </SectionReveal>

        {lists.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <EmptyStateIllustration />
            <p className="text-[var(--color-muted)] m-0">No lists yet. Create your first list to start organizing books.</p>
          </div>
        ) : (
          <StaggerContainer>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lists.map((list) => (
                <StaggerItem key={list.id}>
                  <motion.div
                    className="rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.03)] p-5 grid gap-2 cursor-pointer hover:bg-[rgba(255,255,255,0.06)] transition-all"
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/lists/${list.id}`)}
                  >
                    <h3 className="m-0 text-base font-bold">{list.name}</h3>
                    {list.description && (
                      <p className="m-0 text-sm text-[var(--color-muted)] line-clamp-2">{list.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[var(--color-muted)]">
                        {list.item_count} {list.item_count === 1 ? "book" : "books"}
                      </span>
                      {list.is_ranked && (
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Ranked</span>
                      )}
                      <button
                        className="text-xs text-[var(--color-danger)] hover:underline bg-transparent border-0 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }}
                      >
                        Delete
                      </button>
                    </div>
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
