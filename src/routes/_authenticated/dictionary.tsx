import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dictionary")({
  head: () => ({
    meta: [
      { title: "Sign dictionary — SignBridge" },
      { name: "description", content: "Browse every ASL and ISL sign in SignBridge with its description and source dataset." },
      { property: "og:title", content: "Sign dictionary — SignBridge" },
      { property: "og:description", content: "Browse every ASL and ISL sign with description and dataset attribution." },
    ],
  }),
  component: Dictionary,
});

function Dictionary() {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<"all" | "ASL" | "ISL">("all");

  const signs = useQuery({
    queryKey: ["signs-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signs")
        .select("id, gloss, category, description, difficulty, dataset_source, lesson_id, lessons(language, title)")
        .order("gloss");
      if (error) throw error;
      return data;
    },
  });

  const rows = (signs.data ?? []).filter((s) => {
    const language = (s as any).lessons?.language;
    const matchesLang = lang === "all" || language === lang;
    const matchesQ =
      !q ||
      s.gloss.toLowerCase().includes(q.toLowerCase()) ||
      (s.category ?? "").toLowerCase().includes(q.toLowerCase());
    return matchesLang && matchesQ;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-4xl font-extrabold uppercase">Dictionary</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every sign in the library, with the dataset it was sourced from.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="panel flex flex-1 items-center gap-3 px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a gloss or category…"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </div>
          {(["all", "ASL", "ISL"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`label-caps border-2 border-ink px-4 py-3 ${lang === l ? "bg-accent shadow-brutal-sm" : "bg-card"}`}
            >
              {l === "all" ? "All" : l}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <Link
              key={s.id}
              to="/practice/$signId"
              params={{ signId: s.id }}
              className="panel px-5 py-5 transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-extrabold uppercase">{s.gloss}</h2>
                <span className="label-caps border-2 border-ink bg-sky px-2 py-0.5">
                  {(s as any).lessons?.language ?? "—"}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                {s.category} · {s.difficulty}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              <p className="mt-4 text-xs text-muted-foreground">Source: {s.dataset_source}</p>
            </Link>
          ))}
          {signs.isLoading && <p className="text-sm text-muted-foreground">Loading signs…</p>}
          {!signs.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No signs match that search.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
