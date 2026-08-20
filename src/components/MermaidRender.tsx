import { useEffect, useRef, useState } from "react";

let idCounter = 0;

export function MermaidRender({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            fontFamily: "DM Sans, sans-serif",
            primaryColor: "#e7f3fb",
            primaryTextColor: "#171923",
            primaryBorderColor: "#171923",
            lineColor: "#171923",
          },
        });
        const { svg } = await mermaid.render(`mindmap-${++idCounter}`, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        console.error(e);
        if (!cancelled) setFailed(true);
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (failed) {
    return <p className="text-sm text-muted-foreground">The mind map could not be rendered.</p>;
  }
  return <div ref={ref} className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />;
}
