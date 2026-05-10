import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { AuthShell } from "@/components/auth-shell";

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";

  useEffect(() => {
    document.title = mode === "login" ? "Log In — Bookmark" : "Sign Up — Bookmark";
  }, [mode]);

  return <AuthShell initialMode={mode} />;
}
