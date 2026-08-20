import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — SignBridge" },
      { name: "description", content: "Choose a new password for your SignBridge account." },
      { property: "og:title", content: "Reset password — SignBridge" },
      { property: "og:description", content: "Choose a new password for your SignBridge account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid-paper-light flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="panel-lg w-full max-w-md px-8 py-10">
        <h1 className="font-display text-3xl font-extrabold uppercase">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter a new password for your account. You must open this page from the reset email link.
        </p>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="mt-6 w-full border-2 border-ink bg-card px-4 py-3 text-sm outline-none focus:shadow-brutal-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full border-2 border-ink bg-accent py-3.5 font-display text-sm font-bold uppercase tracking-widest shadow-brutal-sm disabled:opacity-60"
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
