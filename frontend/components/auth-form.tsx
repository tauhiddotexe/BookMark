"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser, signupUser } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { useToast } from "@/components/toast-provider";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const signupPayload = Object.fromEntries(
      Object.entries({
        username: payload.username,
        email: payload.email,
        password: payload.password
      }).filter(([, value]) => String(value || "").trim() !== "")
    );

    try {
      if (mode === "signup") {
        await signupUser(signupPayload);
      }

      const tokens = await loginUser(String(payload.username || ""), String(payload.password || ""));
      saveSession(tokens, String(payload.username || ""));
      pushToast(mode === "login" ? "Logged in successfully." : "Account created. Welcome to Bookmark.");
      router.push("/");
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <input name="username" placeholder="Username" required />
      {mode === "signup" ? <input name="email" type="email" placeholder="Email (optional)" /> : null}
      <input name="password" type="password" placeholder="Password" required />
      {error ? <p style={{ color: "#ff8c8c", margin: 0 }}>{error}</p> : null}
      <button type="submit" disabled={pending}>{pending ? "Please wait..." : mode === "login" ? "Log In" : "Create account"}</button>
    </form>
  );
}
