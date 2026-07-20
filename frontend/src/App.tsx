import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";

import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";
import { PageTransition } from "@/components/motion/page-transition";
import { HomePage } from "@/pages/HomePage";
import { BookPage } from "@/pages/BookPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SearchPage } from "@/pages/SearchPage";
import { DiaryPage } from "@/pages/DiaryPage";
import { ListsPage } from "@/pages/ListsPage";
import { ListDetailPage } from "@/pages/ListDetailPage";
import { AuthPage } from "@/pages/AuthPage";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="/books/:slug" element={<PageTransition><BookPage /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
          <Route path="/diary" element={<PageTransition><DiaryPage /></PageTransition>} />
          <Route path="/lists" element={<PageTransition><ListsPage /></PageTransition>} />
          <Route path="/lists/:id" element={<PageTransition><ListDetailPage /></PageTransition>} />
        </Route>
        <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
        <Route path="/login" element={<Navigate to="/auth?mode=login" replace />} />
        <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0b1611]">
        <div className="w-10 h-10 border-3 border-[rgba(255,255,255,0.1)] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <SiteHeader />
      <main className="w-[min(1220px,calc(100%-32px))] mx-auto pt-6 md:pt-9 pb-16 md:pb-[120px]">
        <div className="grid gap-7">
          <AnimatedRoutes />
        </div>
      </main>
    </ToastProvider>
  );
}
