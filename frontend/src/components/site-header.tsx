import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, localUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  if (!user) {
    return (
      <header className="sticky top-0 z-50 backdrop-blur-[22px] bg-[rgba(6,10,8,0.78)] border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between gap-6 max-w-[1220px] mx-auto px-4 py-4">
          <Link to="/auth" className="inline-flex items-center gap-3 font-black tracking-[0.12em] uppercase text-[var(--color-text)] text-lg">
            BookMark
          </Link>
          <Link to="/auth">
            <Button size="sm">Sign In</Button>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-[22px] bg-[rgba(6,10,8,0.78)] border-b border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-6 max-w-[1220px] mx-auto px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-3 font-black tracking-[0.12em] uppercase text-[var(--color-text)] text-lg">
          BookMark
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2.5 min-w-[min(320px,30vw)] px-3 py-1.5 rounded-full border border-[var(--color-line)] bg-[rgba(255,255,255,0.045)] ml-auto">
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent px-2.5 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none w-full"
          />
        </form>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all">Home</Link>
          <Link to="/search" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all">Search</Link>
          <Link to="/diary" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all">Diary</Link>
          <Link to="/lists" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all">Lists</Link>
          <Link to="/profile" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all">
            {localUser?.profile?.avatar_url ? (
              <img src={localUser.profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="w-7 h-7 rounded-full grid place-items-center bg-[rgba(255,255,255,0.08)] text-xs font-bold text-[var(--color-muted)]">
                {localUser?.username?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
        </nav>

        <button className="md:hidden ml-auto grid place-items-center w-10 h-10 rounded-full bg-transparent text-[var(--color-muted)] cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Icons.menu />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="grid gap-1 px-4 pb-5 pt-1 md:hidden border-t border-[var(--color-line)] mt-2">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all">Home</Link>
          <Link to="/search" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all">Search</Link>
          <Link to="/diary" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all">Diary</Link>
          <Link to="/lists" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all">Lists</Link>
          <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all">Profile</Link>
          <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[rgba(255,255,255,0.05)] transition-all text-left">Logout</button>
        </div>
      )}
    </header>
  );
}
