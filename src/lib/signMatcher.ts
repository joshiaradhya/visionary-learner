/**
 * signMatcher — nearest-neighbour landmark sequence comparison.
 *
 * No trained model: we normalise MediaPipe hand landmarks (translation +
 * scale invariant), resample every sequence to a fixed frame count with
 * linear interpolation, then score by average per-frame Euclidean distance.
 */

export type Landmark = { x: number; y: number; z: number };
/** One frame = the 21 landmarks of the dominant hand. */
export type LandmarkFrame = Landmark[];
export type LandmarkSequence = LandmarkFrame[];

export const RESAMPLE_FRAMES = 24;
const WRIST = 0;
const FINGERTIPS = [4, 8, 12, 16, 20];
const PALM = [0, 1, 5, 9, 13, 17];

/** Translate to wrist origin and scale by mean distance from the wrist. */
export function normalizeFrame(frame: LandmarkFrame): LandmarkFrame {
  if (!frame.length) return frame;
  const wrist = frame[WRIST];
  const centered = frame.map((p) => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
    z: (p.z ?? 0) - (wrist.z ?? 0),
  }));
  const scale =
    centered.reduce((sum, p) => sum + Math.hypot(p.x, p.y, p.z), 0) / (centered.length || 1) || 1e-6;
  return centered.map((p) => ({ x: p.x / scale, y: p.y / scale, z: p.z / scale }));
}

/** Linear-interpolate a sequence to exactly `count` frames. */
export function resampleSequence(seq: LandmarkSequence, count = RESAMPLE_FRAMES): LandmarkSequence {
  const frames = seq.filter((f) => f && f.length >= 21);
  if (frames.length === 0) return [];
  if (frames.length === 1) return Array.from({ length: count }, () => frames[0]);

  const out: LandmarkSequence = [];
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * (frames.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, frames.length - 1);
    const w = t - lo;
    out.push(
      frames[lo].map((p, idx) => {
        const q = frames[hi][idx];
        return {
          x: p.x + (q.x - p.x) * w,
          y: p.y + (q.y - p.y) * w,
          z: (p.z ?? 0) + ((q.z ?? 0) - (p.z ?? 0)) * w,
        };
      }),
    );
  }
  return out;
}

export function prepareSequence(seq: LandmarkSequence): LandmarkSequence {
  return resampleSequence(seq).map(normalizeFrame);
}

function regionDistance(a: LandmarkSequence, b: LandmarkSequence, indices: number[]): number {
  let total = 0;
  let n = 0;
  for (let f = 0; f < Math.min(a.length, b.length); f++) {
    for (const i of indices) {
      const p = a[f][i];
      const q = b[f][i];
      if (!p || !q) continue;
      total += Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      n++;
    }
  }
  return n ? total / n : Number.POSITIVE_INFINITY;
}

/** Movement = how much the trajectory (frame-to-frame delta) differs. */
function movementDistance(a: LandmarkSequence, b: LandmarkSequence): number {
  let total = 0;
  let n = 0;
  for (let f = 1; f < Math.min(a.length, b.length); f++) {
    for (let i = 0; i < 21; i++) {
      const da = { x: a[f][i].x - a[f - 1][i].x, y: a[f][i].y - a[f - 1][i].y };
      const db = { x: b[f][i].x - b[f - 1][i].x, y: b[f][i].y - b[f - 1][i].y };
      total += Math.hypot(da.x - db.x, da.y - db.y);
      n++;
    }
  }
  return n ? total / n : Number.POSITIVE_INFINITY;
}

export type ReferenceEntry = { signId: string; gloss?: string; sequence: LandmarkSequence };

export type MatchResult = {
  signId: string;
  gloss?: string;
  /** 0-100 */
  confidence: number;
  distance: number;
  regions: { handShape: number; palm: number; movement: number };
  feedback: string;
  runnerUp?: { signId: string; gloss?: string; confidence: number };
};

/** Distance -> 0-100 confidence. 0.15 avg distance ≈ excellent, 1.0 ≈ unrelated. */
function toConfidence(distance: number): number {
  const c = 100 * Math.exp(-2.6 * Math.max(0, distance - 0.12));
  return Math.round(Math.max(0, Math.min(100, c)));
}

export function buildFeedback(
  confidence: number,
  regions: { handShape: number; palm: number; movement: number },
): string {
  if (confidence >= 85) return "Great form — hand shape, position and movement all line up with the reference.";
  const worst = (["handShape", "palm", "movement"] as const).reduce((a, b) =>
    regions[a] >= regions[b] ? a : b,
  );
  if (confidence < 45) {
    return "That didn't read as a clear sign. Keep your whole hand inside the frame and try a slower, more deliberate motion.";
  }
  if (worst === "handShape") {
    return "Close. Your fingertip configuration is drifting — check the hand shape against the reference clip before you move.";
  }
  if (worst === "palm") {
    return "Close. Your palm orientation and hand placement are off — watch where the reference starts and ends.";
  }
  return "Close. The path of the movement needs practice — make it a single, clear motion instead of several small ones.";
}

export function matchSign(attempt: LandmarkSequence, references: ReferenceEntry[]): MatchResult | null {
  const a = prepareSequence(attempt);
  if (a.length === 0 || references.length === 0) return null;

  const scored = references
    .map((ref) => {
      const b = prepareSequence(ref.sequence);
      if (b.length === 0) return null;
      const handShape = regionDistance(a, b, FINGERTIPS);
      const palm = regionDistance(a, b, PALM);
      const movement = movementDistance(a, b);
      const distance = 0.5 * handShape + 0.2 * palm + 0.3 * movement * 4;
      return { ref, handShape, palm, movement, distance };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((x, y) => x.distance - y.distance);

  if (!scored.length) return null;
  const best = scored[0];
  const regions = { handShape: best.handShape, palm: best.palm, movement: best.movement };
  const confidence = toConfidence(best.distance);

  return {
    signId: best.ref.signId,
    gloss: best.ref.gloss,
    confidence,
    distance: best.distance,
    regions,
    feedback: buildFeedback(confidence, regions),
    runnerUp: scored[1]
      ? {
          signId: scored[1].ref.signId,
          gloss: scored[1].ref.gloss,
          confidence: toConfidence(scored[1].distance),
        }
      : undefined,
  };
}
