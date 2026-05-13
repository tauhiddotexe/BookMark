import { Routes, Route, Navigate } from "react-router-dom";

import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";
import { HomePage } from "@/pages/HomePage";
import { BookPage } from "@/pages/BookPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SearchPage } from "@/pages/SearchPage";
import { ListsPage } from "@/pages/ListsPage";
import { AuthPage } from "@/pages/AuthPage";
import { useAuth } from "@/context/auth-context";

export function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner"></div>
        <style>{`
          .auth-loading-screen {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
