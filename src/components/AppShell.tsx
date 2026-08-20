import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, LayoutGrid, LogOut, Medal, Users } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { to: "/dictionary", label: "Dictionary", Icon: BookOpen },
  { to: "/practice", label: "Practice", Icon: Medal },
  { to: "/friends", label: "Friends", Icon: Users },
] as const;

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, xp, streak, level")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-ink bg-sidebar px-6 py-8 lg:flex">
        <Link to="/" className="font-display text-3xl font-extrabold tracking-tight">
          SignBridge
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-sky font-display font-bold">
            {(profile?.display_name ?? "S").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">
              {profile?.display_name ?? "Welcome back"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Level {profile?.level ?? 1} · {profile?.xp ?? 0} XP
            </p>
          </div>
        </div>

        <nav className="mt-10 space-y-1">
          {nav.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "border-2 border-ink bg-sidebar-primary shadow-brutal-sm" }}
              inactiveProps={{ className: "border-2 border-transparent hover:bg-secondary" }}
              className="flex items-center gap-3 px-3 py-2.5 font-display text-sm font-bold"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 border-2 border-ink bg-card px-3 py-2.5 font-display text-sm font-bold shadow-brutal-sm"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b-2 border-ink bg-card px-5 py-3 lg:hidden">
          <Link to="/dashboard" className="font-display text-xl font-extrabold">
            SignBridge
          </Link>
          <nav className="flex gap-3">
            {nav.map(({ to, label, Icon }) => (
              <Link key={to} to={to} aria-label={label} className="p-1.5">
                <Icon className="h-5 w-5" />
              </Link>
            ))}
          </nav>
        </header>
        <main className="grid-paper-light min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
