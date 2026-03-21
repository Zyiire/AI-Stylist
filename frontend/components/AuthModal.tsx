"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = "signin" | "signup";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setEmail(""); setPassword(""); setError(null);
      setSuccess(false); setSubmitting(false); setMode("signin");
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    setError(null);

    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password);
      if (error) { setError(error); setSubmitting(false); }
      else handleClose();
    } else {
      const { error } = await signUp(email.trim(), password);
      if (error) { setError(error); setSubmitting(false); }
      else { setSuccess(true); setSubmitting(false); }
    }
  };

  const switchMode = (m: Mode) => { setMode(m); setError(null); setSuccess(false); };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-card bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-8 pt-8 pb-6">
          <div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">
              {mode === "signin" ? "Welcome back" : "Join Mira"}
            </h2>
            <p className="text-on-surface-variant font-body text-sm mt-1">
              {mode === "signin" ? "Sign in to your atelier." : "Create your personal fashion archive."}
            </p>
          </div>
          <button onClick={handleClose} className="text-outline hover:text-primary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex mx-8 mb-6 bg-surface-container-low rounded-xl p-1">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-[10px] text-xs font-bold font-label tracking-widest uppercase transition-all duration-200 ${
                mode === m ? "bg-primary text-on-primary shadow-sm" : "text-outline hover:text-primary"
              }`}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Success state */}
        {success ? (
          <div className="px-8 pb-10 text-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-4 block">mark_email_read</span>
            <h3 className="font-headline text-xl font-bold text-primary mb-2">Check your inbox</h3>
            <p className="text-on-surface-variant font-body text-sm max-w-xs mx-auto mb-8">
              We sent a confirmation link to{" "}
              <span className="font-semibold text-primary">{email}</span>.
              Click it to activate your account.
            </p>
            <button
              onClick={handleClose}
              className="bg-primary text-on-primary px-8 py-3 rounded-xl text-sm font-bold font-label tracking-widest uppercase hover:bg-primary-container transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-label uppercase tracking-[0.2em] font-bold text-outline">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={submitting}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-body text-on-surface text-sm placeholder:text-outline/40 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-label uppercase tracking-[0.2em] font-bold text-outline">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                disabled={submitting}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 font-body text-on-surface text-sm placeholder:text-outline/40 disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="text-sm text-error bg-error-container rounded-xl px-4 py-3 font-body">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !email.trim() || !password.trim()}
                className="w-full bg-primary text-on-primary font-headline font-bold py-4 rounded-xl text-base hover:bg-primary-container transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{mode === "signin" ? "Signing in…" : "Creating account…"}</>
                ) : (
                  mode === "signin" ? "Sign In" : "Create Account"
                )}
              </button>
            </div>

            <p className="text-center text-xs text-on-surface-variant font-body pt-1">
              {mode === "signin" ? "No account yet? " : "Already a member? "}
              <button
                type="button"
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                className="text-primary font-semibold hover:underline"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
