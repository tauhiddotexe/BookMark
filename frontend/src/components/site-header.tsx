import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { BookIcon, HomeIcon, ListIcon, SearchIcon, UserIcon } from "@/components/icons";
import { getStoredUsername } from "@/lib/session";

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [query, setQuery] = useState("");

  const username = getStoredUsername();

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
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
            {username ? (
              <Link to={`/profile/${username}`} className={pathname.startsWith("/profile") ? "nav-link is-active" : "nav-link"}>
                <UserIcon />
                Profile
              </Link>
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
        {username ? (
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
    </>
  );
}
