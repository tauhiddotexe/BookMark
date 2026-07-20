import { useState } from "react";
import { AuthForm } from "@/components/auth-form";

export function AuthShell({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  return (
    <div className="min-h-[calc(100vh-var(--header-height,136px)-140px)] grid place-items-center">
      <section className="card auth-card max-w-[520px] w-full p-7">
        <div className="flex gap-3 p-2 rounded-full bg-[rgba(255,255,255,0.04)] border border-[var(--color-line)] w-fit mb-4">
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-sm font-bold transition-all ${
              mode === "login"
                ? "bg-gradient-to-r from-[#00c46a] to-[#4ff1a8] text-[#04130b]"
                : "text-[var(--color-muted-strong)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.05)]"
            }`}
            onClick={() => setMode("login")}
          >
            Log In
          </button>
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-sm font-bold transition-all ${
              mode === "signup"
                ? "bg-gradient-to-r from-[#00c46a] to-[#4ff1a8] text-[#04130b]"
                : "text-[var(--color-muted-strong)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.05)]"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]">
          {mode === "login" ? "Welcome back" : "Create account"}
        </span>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-[0.95] tracking-[-0.05em] mt-2 mb-0">
          {mode === "login" ? "Your personal reading journal" : "Join BookMark"}
        </h1>
        <p className="text-[var(--color-muted-strong)] leading-relaxed max-w-[62ch]">
          {mode === "login"
            ? "Pick up your diary, reviews, and reading list right where you left them."
            : "Track your reading journey, log reviews, and build a history worth revisiting."}
        </p>
        <AuthForm mode={mode} />
      </section>
    </div>
  );
}
