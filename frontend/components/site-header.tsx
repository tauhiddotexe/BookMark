"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { HomeIcon, ListIcon, SearchIcon, UserIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/api";
import { clearSession, getAccessToken, getStoredUsername } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/lists", label: "Lists", icon: ListIcon }
];

const BROWSE_ITEMS = [
  { href: "/search?q=bestsellers", label: "Popular" },
  { href: "/search?q=award%20winners", label: "Rating" },
  { href: "/search?q=fantasy", label: "Genre" },
  { href: "/search?q=2025", label: "Year" }
];

function readStoredAccessToken() {
  return getAccessToken();
}

export function SiteHeader() {
  const pathname = usePathname();
  const [activeSearch, setActiveSearch] = useState("");
  const [username, setUsername] = useState("ria");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const currentSearch = new URLSearchParams(window.location.search).get("q") || "";
    setActiveSearch(currentSearch);

    const cachedUser = getStoredUsername();
    if (cachedUser) setUsername(cachedUser);

    const access = readStoredAccessToken();
    if (!access) {
      setIsAuthenticated(false);
      return;
    }

    setIsAuthenticated(true);
    getCurrentUser(access)
      .then((payload) => {
        if (!payload.username) return;
        setUsername(payload.username);
        setIsAuthenticated(true);
        window.localStorage.setItem("bookmark_user", payload.username);
      })
      .catch(() => {
        clearSession();
        setIsAuthenticated(false);
      });
  }, [pathname]);

  const profileHref = `/profile/${username}`;

  function handleLogout() {
    clearSession();
    setIsAuthenticated(false);
    setUsername("ria");
    window.location.assign("/login");
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <Link href="/" className="brand" aria-label="Bookmark home">
            <span className="brand-mark">B</span>
            <span className="brand-word">
              Book<span>mark</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Primary navigation">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={pathname === href ? "nav-link is-active" : "nav-link"}>
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link href={profileHref} className={pathname.startsWith("/profile") ? "nav-link is-active" : "nav-link"}>
                  <UserIcon />
                  <span>Profile</span>
                </Link>
                <button type="button" className="chip" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <Link href="/auth?mode=login" className={pathname.startsWith("/auth") || pathname.startsWith("/login") ? "nav-link is-active" : "nav-link"}>
                <UserIcon />
                <span>Log In</span>
              </Link>
            )}
          </nav>

          <form className="nav-search" action="/search">
            <SearchIcon />
            <input key={activeSearch} name="q" defaultValue={activeSearch} placeholder="Search books, authors, or ISBN" aria-label="Search books" />
            <button type="submit" className="search-submit">
              Search
            </button>
          </form>
        </div>

        <div className="shell browse-bar" aria-label="Browse by">
          <span className="browse-label">Browse by</span>
          {BROWSE_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} className="chip browse-chip">
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/" className={pathname === "/" ? "mobile-nav-link is-active" : "mobile-nav-link"}>
          <HomeIcon />
          <span>Home</span>
        </Link>
        <Link href="/search" className={pathname.startsWith("/search") ? "mobile-nav-link is-active" : "mobile-nav-link"}>
          <SearchIcon />
          <span>Search</span>
        </Link>
        <Link href="/lists" className={pathname.startsWith("/lists") ? "mobile-nav-link is-active" : "mobile-nav-link"}>
          <ListIcon />
          <span>Lists</span>
        </Link>
        <Link href={isAuthenticated ? profileHref : "/auth?mode=login"} className={pathname.startsWith("/profile") || pathname.startsWith("/auth") || pathname.startsWith("/login") ? "mobile-nav-link is-active" : "mobile-nav-link"}>
          <UserIcon />
          <span>{isAuthenticated ? "Profile" : "Log In"}</span>
        </Link>
      </nav>
    </>
  );
}
