import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider, appleProvider } from "@/lib/firebase";
import { useToast } from "@/components/toast-provider";
import { syncUser } from "@/lib/api";

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
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set the username in Firebase profile
        await updateProfile(userCredential.user, { displayName: username });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      // Sync with backend to ensure user exists in MongoDB
      await syncUser();
      
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
      await syncUser();
      pushToast("Signed in successfully.");
      navigate("/");
    } catch (err: any) {
      pushToast(err.message, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-form-container">
      <form className="form-grid" onSubmit={onSubmit}>
        {mode === "signup" && (
          <input name="username" placeholder="Username" required />
        )}
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        
        <button type="submit" className="button-primary" disabled={pending}>
          {pending ? "Please wait..." : mode === "login" ? "Log In" : "Get Started"}
        </button>
      </form>

      <div className="auth-divider">
        <span>or continue with</span>
      </div>

      <div className="social-auth-grid">
        <button 
          onClick={() => handleSocialLogin(googleProvider)} 
          className="button-social google"
          disabled={pending}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
          Google
        </button>
        <button 
          onClick={() => handleSocialLogin(appleProvider)} 
          className="button-social apple"
          disabled={pending}
        >
          <img src="https://www.gstatic.com/images/icons/material/system/2x/apple_black_24dp.png" alt="Apple" style={{ filter: 'invert(1)' }} />
          Apple
        </button>
      </div>

      {error && <p className="auth-error-text">{error}</p>}

      <style>{`
        .auth-form-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }
        .auth-divider:not(:empty)::before {
          margin-right: .5em;
        }
        .auth-divider:not(:empty)::after {
          margin-left: .5em;
        }
        .social-auth-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .button-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .button-social:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--text-muted);
          transform: translateY(-1px);
        }
        .button-social img {
          width: 18px;
          height: 18px;
        }
        .auth-error-text {
          color: #ff4d4d;
          font-size: 0.8125rem;
          text-align: center;
          margin: 0;
          background: rgba(255, 77, 77, 0.1);
          padding: 0.75rem;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
