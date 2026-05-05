import { AuthShell } from "@/components/auth-shell";

export default function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  return searchParams.then(({ mode }) => <AuthShell initialMode={mode === "signup" ? "signup" : "login"} />);
}
