import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, GraduationCap, Globe, Dumbbell, MessageSquare, MessageSquareWarning, Search, Video, Users, Waypoints } from "lucide-react";
import heroType from "@/assets/hero-type.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SignBridge — Learn it. Practise it. Use it." },
      {
        name: "description",
        content:
          "A social learning network for sign language. Guided ASL and ISL lessons, webcam practice scored with live hand tracking, and 1:1 conversation rooms.",
      },
      { property: "og:title", content: "SignBridge — Learn it. Practise it. Use it." },
      {
        property: "og:description",
        content: "A human-first, video-centric way to master sign language — learn, practise on camera, then use it with people.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { label: "Learn", Icon: GraduationCap, tone: "bg-peach" },
  { label: "Practice", Icon: Dumbbell, tone: "bg-sky" },
  { label: "Connect", Icon: MessageSquare, tone: "bg-mint" },
  { label: "Feedback", Icon: MessageSquareWarning, tone: "bg-muted" },
];

const pillars = [
  {
    title: "Learn",
    Icon: Waypoints,
    tone: "bg-butter",
    body: "Structured paths that respect the visual and spatial nature of the language. No shortcuts, just clear motion.",
  },
  {
    title: "SignLab",
    Icon: Video,
    tone: "bg-sky",
    body: "A video-first practice environment with mirror mode and gesture tracking to refine your articulation.",
  },
  {
    title: "SignConnect",
    Icon: Users,
    tone: "bg-mint",
    body: "Peer feedback and community interaction. Language lives between people, not just on a screen.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-stretch justify-between border-b-2 border-ink bg-card">
        <div className="flex items-center px-6 py-4">
          <span className="font-display text-2xl font-extrabold uppercase tracking-tight">SignBridge</span>
        </div>
        <nav className="flex items-stretch">
          {[Globe, Search, Bell].map((Icon, i) => (
            <span
              key={i}
              className="flex w-16 items-center justify-center border-l-2 border-ink text-foreground"
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>
          ))}
          <Link
            to="/auth"
            className="flex items-center border-l-2 border-ink bg-accent px-6 font-display text-sm font-bold uppercase tracking-wider text-accent-foreground"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="grid-paper px-4 py-16 sm:px-8">
        <div className="panel-lg mx-auto max-w-3xl rounded-2xl px-5 py-8 sm:px-10 sm:py-12">
          <img
            src={heroType}
            alt="Learn it. Practice it. Use it."
            width={1280}
            height={720}
            className="w-full border-2 border-ink"
          />
          <div className="panel mt-8 px-6 py-5">
            <p className="text-center text-sm font-medium leading-relaxed sm:text-base">
              SignBridge is a social learning network for sign language — not another translator. Experience a
              human-first, video-centric approach to mastering motion.
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              to="/auth"
              className="border-2 border-ink bg-accent px-10 py-4 font-display text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-brutal transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm"
            >
              Start learning.
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-ink bg-card px-4 py-14 sm:px-8">
        <h2 className="sr-only">How SignBridge works</h2>
        <ol className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-y-8">
          {steps.map(({ label, Icon, tone }, i) => (
            <li key={label} className="flex flex-1 items-center gap-4">
              <div className="panel w-24 shrink-0 p-2 text-center">
                <div className={`mx-auto flex h-12 w-12 items-center justify-center border-2 border-ink ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="label-caps mt-2 block">{label}</span>
              </div>
              {i < steps.length - 1 && <span className="hidden h-0.5 flex-1 bg-ink sm:block" />}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid-paper-light px-4 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {pillars.map(({ title, body, Icon, tone }) => (
            <article key={title} className="panel px-7 py-8">
              <div className={`flex h-12 w-12 items-center justify-center border-2 border-ink ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-extrabold uppercase">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t-2 border-ink bg-card px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs uppercase tracking-wider sm:flex-row sm:justify-between">
          <p>© 2026 SignBridge. All rights reserved.</p>
          <p className="text-muted-foreground">
            Data &amp; credits: reference clips from ASLLVD (ASL) and INCLUDE (CC BY 4.0, ISL).
          </p>
        </div>
      </footer>
    </div>
  );
}
