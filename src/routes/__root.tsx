import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="grid-paper-light flex min-h-screen items-center justify-center px-4">
      <div className="panel-lg max-w-md px-8 py-10 text-center">
        <h1 className="font-display text-7xl font-extrabold text-foreground">404</h1>
        <h2 className="mt-4 font-display text-xl font-bold uppercase tracking-wide">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page doesn't exist or has moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border-2 border-ink bg-accent px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-brutal-sm"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="grid-paper-light flex min-h-screen items-center justify-center px-4">
      <div className="panel-lg max-w-md px-8 py-10 text-center">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="border-2 border-ink bg-accent px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-brutal-sm"
          >
            Try again
          </button>
          <a
            href="/"
            className="border-2 border-ink bg-card px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider shadow-brutal-sm"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SignBridge — Learn, practise and use sign language" },
      {
        name: "description",
        content:
          "SignBridge is a sign-language-first learning network: guided ASL and ISL lessons, webcam practice with live hand tracking, and 1:1 conversation rooms.",
      },
      { name: "author", content: "SignBridge" },
      { property: "og:title", content: "SignBridge — Learn, practise and use sign language" },
      {
        property: "og:description",
        content: "Guided ASL and ISL lessons, webcam practice with live hand tracking, and 1:1 conversation rooms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
