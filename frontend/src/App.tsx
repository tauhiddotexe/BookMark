import { Routes, Route, Navigate } from "react-router-dom";

import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";
import { HomePage } from "@/pages/HomePage";
import { BookPage } from "@/pages/BookPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SearchPage } from "@/pages/SearchPage";
import { ListsPage } from "@/pages/ListsPage";
import { AuthPage } from "@/pages/AuthPage";

export function App() {
  return (
    <ToastProvider>
      <SiteHeader />
      <main className="shell app-shell">
        <div className="page">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/books/:slug" element={<BookPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth?mode=login" replace />} />
            <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
          </Routes>
        </div>
      </main>
    </ToastProvider>
  );
}
