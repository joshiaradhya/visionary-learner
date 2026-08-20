import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Sparkles, Target, TrendingUp } from "lucide-react";
import { AppShell, useProfile } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SignBridge" },
      { name: "description", content: "Your XP, streak, weak signs and next lessons on SignBridge." },
      { property: "og:title", content: "Dashboard — SignBridge" },
      { property: "og:description", content: "Track your XP, streak and weakest signs." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const lessons = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, language, description, order_index, signs(id)")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const attempts = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("id, confidence, created_at, sign_id, signs!attempts_sign_id_fkey(gloss)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const weak = (() => {
    const rows = attempts.data ?? [];
    const byGloss = new Map<string, { total: number; n: number }>();
    for (const a of rows) {
      const gloss = (a as any).signs?.gloss;
      if (!gloss || a.confidence == null) continue;
      const cur = byGloss.get(gloss) ?? { total: 0, n: 0 };
      byGloss.set(gloss, { total: cur.total + a.confidence, n: cur.n + 1 });
    }
    return [...byGloss.entries()]
      .map(([gloss, v]) => ({ gloss, avg: Math.round(v.total / v.n), n: v.n }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 4);
  })();

  const stats = [
    { label: "Total XP", value: profile?.xp ?? 0, Icon: Sparkles, tone: "bg-butter" },
    { label: "Day streak", value: profile?.streak ?? 0, Icon: Flame, tone: "bg-peach" },
    { label: "Attempts logged", value: attempts.data?.length ?? 0, Icon: Target, tone: "bg-sky" },
    { label: "Level", value: profile?.level ?? 1, Icon: TrendingUp, tone: "bg-mint" },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-4xl font-extrabold uppercase">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Pick up where you left off, or drill a weak sign.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, Icon, tone }) => (
            <div key={label} className="panel px-5 py-5">
              <div className={`flex h-10 w-10 items-center justify-center border-2 border-ink ${tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold">{value}</p>
              <p className="label-caps mt-1 text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="font-display text-xl font-extrabold uppercase">Your lessons</h2>
            <div className="mt-4 space-y-4">
              {lessons.data?.map((lesson) => (
                <Link
                  key={lesson.id}
                  to="/learn/$lessonId"
                  params={{ lessonId: lesson.id }}
                  className="panel flex items-center justify-between gap-4 px-6 py-5 transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
                >
                  <div className="min-w-0">
                    <span className="label-caps border-2 border-ink bg-mint px-2 py-0.5">{lesson.language}</span>
                    <h3 className="mt-3 font-display text-xl font-extrabold uppercase">{lesson.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
                  </div>
                  <span className="label-caps shrink-0 border-2 border-ink bg-accent px-3 py-2">
                    {(lesson as any).signs?.length ?? 0} signs
                  </span>
                </Link>
              ))}
              {lessons.isLoading && <p className="text-sm text-muted-foreground">Loading lessons…</p>}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-extrabold uppercase">Weak signs</h2>
            <div className="panel mt-4 divide-y-2 divide-ink">
              {weak.length === 0 && (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  No practice attempts yet. Head to Practice and record one — weak signs show up here.
                </p>
              )}
              {weak.map((w) => (
                <div key={w.gloss} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-display text-sm font-bold uppercase">{w.gloss}</p>
                    <p className="text-xs text-muted-foreground">{w.n} attempt(s)</p>
                  </div>
                  <span
                    className={`label-caps border-2 border-ink px-2 py-1 ${
                      w.avg >= 80 ? "bg-mint" : w.avg >= 55 ? "bg-butter" : "bg-peach"
                    }`}
                  >
                    {w.avg}%
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/practice"
              className="mt-4 block border-2 border-ink bg-accent px-5 py-3.5 text-center font-display text-sm font-bold uppercase tracking-widest shadow-brutal-sm"
            >
              Start a practice session
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
