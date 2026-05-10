import { useState } from "react";

import { AuthForm } from "@/components/auth-form";

export function AuthShell({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  return (
    <div className="auth-shell">
      <section className="card auth-card">
        <div className="tab-row auth-switch">
          <button type="button" className={mode === "login" ? "tab-link is-active" : "tab-link"} onClick={() => setMode("login")}>
            Log In
          </button>
          <button type="button" className={mode === "signup" ? "tab-link is-active" : "tab-link"} onClick={() => setMode("signup")}>
            Sign Up
          </button>
        </div>
        <span className="pill">{mode === "login" ? "Welcome back" : "Create account"}</span>
        <h1>{mode === "login" ? "Access your reading feed" : "Join Bookmark"}</h1>
        <p className="muted">
          {mode === "login"
            ? "Pick up your shelves, reviews, and lists right where you left them."
            : "Create your profile, start logging books, and build a reading history that actually feels worth revisiting."}
        </p>
        <AuthForm mode={mode} />
      </section>
    </div>
  );
}
