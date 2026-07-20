import { useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/auth-shell";

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";

  return <AuthShell initialMode={mode} />;
}
