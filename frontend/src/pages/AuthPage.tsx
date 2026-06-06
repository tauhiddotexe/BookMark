import { Navigate, useSearchParams } from "react-router-dom";

import { AuthShell } from "@/components/auth-shell";
import { useAuth } from "@/context/auth-context";

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return <AuthShell initialMode={mode} />;
}
