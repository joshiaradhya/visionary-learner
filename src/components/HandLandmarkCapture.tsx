import { useCallback, useEffect, useRef, useState } from "react";
import type { LandmarkFrame, LandmarkSequence } from "@/lib/signMatcher";

type Props = {
  mirrored?: boolean;
  captureMs?: number;
  onAttemptComplete: (sequence: LandmarkSequence) => void;
  className?: string;
};

type Status = "idle" | "loading" | "ready" | "recording" | "error";

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export function HandLandmarkCapture({
  mirrored = true,
  captureMs = 2000,
  onAttemptComplete,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<LandmarkSequence>([]);
  const recordingRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const draw = useCallback(
    (frame: LandmarkFrame | null) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      if (!frame) return;

      const px = (p: { x: number; y: number }) => ({ x: p.x * w, y: p.y * h });
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(23,25,35,0.9)";
      for (const [a, b] of HAND_CONNECTIONS) {
        if (!frame[a] || !frame[b]) continue;
        const p = px(frame[a]);
        const q = px(frame[b]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      for (const point of frame) {
        const p = px(point);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#5ec8e5";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#171923";
        ctx.stroke();
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      setStatus("loading");
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
        );
        const landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("ready");

        let lastTs = -1;
        const loop = () => {
          const v = videoRef.current;
          const lm = landmarkerRef.current;
          if (!v || !lm || v.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          const ts = performance.now();
          if (ts !== lastTs) {
            lastTs = ts;
            try {
              const result = lm.detectForVideo(v, ts);
              const frame: LandmarkFrame | null = result?.landmarks?.[0] ?? null;
              setHandDetected(Boolean(frame));
              draw(frame);
              if (recordingRef.current && frame) bufferRef.current.push(frame);
            } catch {
              /* frame dropped */
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access to practise."
            : "Could not start the camera or the hand tracker.",
        );
        setStatus("error");
      }
    }

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [draw]);

  const startAttempt = useCallback(() => {
    if (status !== "ready") return;
    bufferRef.current = [];
    recordingRef.current = true;
    setStatus("recording");
    const seconds = Math.ceil(captureMs / 1000);
    setCountdown(seconds);
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    setTimeout(() => {
      clearInterval(tick);
      recordingRef.current = false;
      setStatus("ready");
      setCountdown(0);
      onAttemptComplete(bufferRef.current.slice());
    }, captureMs);
  }, [captureMs, onAttemptComplete, status]);

  return (
    <div className={className}>
      <div className="relative overflow-hidden border-2 border-ink bg-ink/90">
        <video
          ref={videoRef}
          playsInline
          muted
          className="block w-full"
          style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
        />

        <div className="absolute left-3 top-3 flex items-center gap-2 border-2 border-ink bg-card px-2 py-1">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === "recording" ? "bg-destructive" : handDetected ? "bg-success" : "bg-muted-foreground"
            }`}
          />
          <span className="label-caps">
            {status === "loading"
              ? "Loading tracker"
              : status === "recording"
                ? `Recording ${countdown}`
                : handDetected
                  ? "Hand tracked"
                  : "Show your hand"}
          </span>
        </div>

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/95 p-6 text-center">
            <p className="text-sm font-medium text-foreground">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startAttempt}
          disabled={status !== "ready"}
          className="border-2 border-ink bg-accent px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-brutal-sm transition-transform hover:translate-x-[1px] hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "recording" ? "Recording…" : "Start attempt"}
        </button>
        <p className="text-xs text-muted-foreground">
          {Math.round(captureMs / 1000)}s of hand landmarks are captured. Video never leaves your device — only
          the landmark numbers are scored.
        </p>
      </div>
    </div>
  );
}
