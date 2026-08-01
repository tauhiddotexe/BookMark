import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, appleProvider } from "@/lib/firebase";
import { updateMyProfile } from "@/lib/api";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;

    try {
      let user;
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        try {
          const token = await userCredential.user.getIdToken(true);
          await updateMyProfile(token, { username, profile: { display_name: username } });
        } catch (e) {
          console.warn("[Signup] Failed to push username to backend", e);
        }
        user = userCredential.user;
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      pushToast(mode === "login" ? "Welcome back to Bookmark." : "Welcome to Bookmark.");
      navigate("/");
    } catch (err: any) {
      const message = err.code ? `Auth Error: ${err.code}` : err.message;
      pushToast(message, "error");
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function handleSocialLogin(provider: any) {
    setPending(true);
    setError("");
    try {
      await signInWithPopup(auth, provider);
      pushToast("Signed in successfully.");
      navigate("/");
    } catch (err: any) {
      pushToast(err.message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <form className="grid gap-3.5" onSubmit={onSubmit}>
        {mode === "signup" && (
          <Input name="username" placeholder="Username" required />
        )}
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="password" type="password" placeholder="Password" required />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Please wait..." : mode === "login" ? "Log In" : "Get Started"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[0.75rem] uppercase tracking-[0.05em] text-[var(--color-muted)] before:flex-1 before:border-b before:border-[var(--color-line)] after:flex-1 after:border-b after:border-[var(--color-line)]">
        <span>or continue with</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleSocialLogin(googleProvider)}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.03)] text-[0.875rem] font-medium transition-all hover:bg-[rgba(255,255,255,0.08)] hover:border-[var(--color-muted)] hover:-translate-y-px disabled:opacity-75 disabled:cursor-wait"
          disabled={pending}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-[18px] h-[18px]" />
          Google
        </button>
        <button
          onClick={() => handleSocialLogin(appleProvider)}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[rgba(255,255,255,0.03)] text-[0.875rem] font-medium transition-all hover:bg-[rgba(255,255,255,0.08)] hover:border-[var(--color-muted)] hover:-translate-y-px disabled:opacity-75 disabled:cursor-wait"
          disabled={pending}
        >
          <img src="https://www.gstatic.com/images/icons/material/system/2x/apple_black_24dp.png" alt="" className="w-[18px] h-[18px]" style={{ filter: "invert(1)" }} />
          Apple
        </button>
      </div>

      {error && <p className="text-[#ff4d4d] text-[0.8125rem] text-center m-0 bg-[rgba(255,77,77,0.1)] px-3 py-3 rounded-[var(--radius-sm)]">{error}</p>}
    </div>
  );
}
