import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SignBridge" },
      { name: "description", content: "Sign in or create your SignBridge account and continue your ASL journey." },
      { property: "og:title", content: "Sign in — SignBridge" },
      { property: "og:description", content: "Continue your ASL journey with SignBridge." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed. Try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function handleReset() {
    if (!email) return toast.error("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b-2 border-ink bg-card px-6 py-5">
        <Link to="/" className="font-display text-3xl font-extrabold tracking-tight">
          SignBridge
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-lilac/40 px-4 py-14">
        <div
          className="pointer-events-none absolute h-[520px] w-[520px] rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--peach), var(--sky) 60%, transparent 70%)" }}
          aria-hidden
        />

        <div className="panel-lg relative w-full max-w-md px-7 py-10 sm:px-10">
          <h1 className="text-center font-display text-4xl font-extrabold uppercase leading-none text-[oklch(0.55_0.13_45)]">
            {mode === "signin" ? (
              <>
                Welcome
                <br />
                Back
              </>
            ) : (
              <>
                Join
                <br />
                SignBridge
              </>
            )}
          </h1>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Continue your ASL journey." : "Start learning sign language today."}
          </p>

          {sentConfirmation ? (
            <div className="panel mt-8 bg-mint px-5 py-6 text-center text-sm font-medium">
              Confirmation email sent to <strong>{email}</strong>. Click the link to activate your account.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {mode === "signup" && (
                <div>
                  <label htmlFor="name" className="text-sm font-bold">
                    Display name
                  </label>
                  <input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex"
                    className="mt-2 w-full border-2 border-ink bg-card px-4 py-3 text-sm outline-none focus:shadow-brutal-sm"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="text-sm font-bold">
                  Email
                </label>
                <div className="mt-2 flex items-center gap-3 border-2 border-ink bg-card px-4 focus-within:shadow-brutal-sm">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@signbridge.app"
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-bold">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-sm font-bold text-[oklch(0.5_0.09_180)] underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 border-2 border-ink bg-card px-4 focus-within:shadow-brutal-sm">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full border-2 border-ink bg-peach py-3.5 font-display text-sm font-bold uppercase tracking-widest shadow-brutal-sm disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink/25" />
            <span className="border-2 border-ink bg-card px-3 py-0.5 text-xs font-bold">or</span>
            <span className="h-px flex-1 bg-ink/25" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 border-2 border-ink bg-card py-3.5 text-sm font-bold shadow-brutal-sm disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
              <path
                fill="#EA4335"
                d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 4.75 12 4.75Z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to SignBridge?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setSentConfirmation(false);
              }}
              className="font-bold text-foreground underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
