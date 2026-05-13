import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { BookIcon, HomeIcon, ListIcon, SearchIcon, UserIcon } from "@/components/icons";
import { useAuth } from "@/context/auth-context";

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [query, setQuery] = useState("");
  const { user, localUser, logout } = useAuth();

  const username = localUser?.username || user?.displayName || "";

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <BookIcon />
            </span>
            <span className="brand-word">
              Book<span>mark</span>
            </span>
          </Link>

          <nav className="nav">
            <Link to="/" className={pathname === "/" ? "nav-link is-active" : "nav-link"}>
              <HomeIcon />
              Home
            </Link>
            <Link to="/search" className={pathname === "/search" ? "nav-link is-active" : "nav-link"}>
              <SearchIcon />
              Discover
            </Link>
            <Link to="/lists" className={pathname === "/lists" ? "nav-link is-active" : "nav-link"}>
              <ListIcon />
              Lists
            </Link>
            {user ? (
              <div className="nav-profile-group">
                <Link to={`/profile/${username}`} className={pathname.startsWith("/profile") ? "nav-link is-active" : "nav-link"}>
                  <UserIcon />
                  {username || "Profile"}
                </Link>
                <button onClick={handleLogout} className="nav-logout-btn">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/auth?mode=login" className="nav-link">
                <UserIcon />
                Log In
              </Link>
            )}
          </nav>

          <form className="nav-search" onSubmit={onSearch}>
            <SearchIcon />
            <input
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books, authors..."
            />
            <button type="submit" className="search-submit">
              Go
            </button>
          </form>
        </div>
      </header>

      <nav className="mobile-nav">
        <Link to="/" className={pathname === "/" ? "mobile-nav-link is-active" : "mobile-nav-link"}>
          <HomeIcon />
          Home
        </Link>
        <Link to="/search" className={pathname === "/search" ? "mobile-nav-link is-active" : "mobile-nav-link"}>
          <SearchIcon />
          Discover
        </Link>
        <Link to="/lists" className={pathname === "/lists" ? "mobile-nav-link is-active" : "mobile-nav-link"}>
          <ListIcon />
          Lists
        </Link>
        {user ? (
          <Link to={`/profile/${username}`} className={pathname.startsWith("/profile") ? "mobile-nav-link is-active" : "mobile-nav-link"}>
            <UserIcon />
            Profile
          </Link>
        ) : (
          <Link to="/auth?mode=login" className="mobile-nav-link">
            <UserIcon />
            Log In
          </Link>
        )}
      </nav>

      <style>{`
        .nav-profile-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .nav-logout-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 0.75rem;
          padding: 0.25rem 0.6rem;
          border-radius: 0.4rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-logout-btn:hover {
          color: var(--text-primary);
          border-color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </>
  );
}
