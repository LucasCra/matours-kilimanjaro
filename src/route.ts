import { clamp01, lerp } from './camera';
import { TIMELINE, type LonLat, type Waypoint } from './content';

export interface Leg {
  id: string;
  kind: 'trail' | 'drive';
  coords: LonLat[];
  cum: number[]; // cumulative distance at each vertex (degrees, equirectangular)
  total: number;
  stops: Record<string, number>; // waypoint id → fraction of this leg, computed by tools/build_track.py
}

export interface Track {
  legs: Leg[];
  byId: Record<string, Leg>;
}

export interface TrackState {
  step: number; // index into TIMELINE, -1 before the trip starts
  leg: Leg | null; // the leg the tip is on
  f: number; // fraction of that leg
  tip: LonLat | null;
  trails: LonLat[][];
  drives: LonLat[][];
}

function dist(a: LonLat, b: LonLat): number {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]);
}

export async function loadTrack(url = '/data/track.geojson'): Promise<Track> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`track: HTTP ${res.status}`);
  const gj = await res.json();
  const legs: Leg[] = gj.features.map((ft: any) => {
    const coords: LonLat[] = ft.geometry.coordinates;
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + dist(coords[i - 1], coords[i]));
    return { id: ft.properties.id, kind: ft.properties.kind, coords, cum, total: cum[cum.length - 1], stops: ft.properties.stops };
  });
  const byId = Object.fromEntries(legs.map((l) => [l.id, l]));
  for (const [, , id, s0, s1] of TIMELINE) {
    const leg = byId[id];
    if (!leg || leg.stops[s0] == null || leg.stops[s1] == null) throw new Error(`timeline: unknown leg/stop ${id} ${s0}→${s1}`);
  }
  return { legs, byId };
}

// The first `f` of the leg by distance; the last point is interpolated so the tip moves continuously.
export function slice(leg: Leg, f: number): LonLat[] {
  const { coords, cum, total } = leg;
  const target = clamp01(f) * total;
  let lo = 0;
  let hi = coords.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= target) lo = mid;
    else hi = mid - 1;
  }
  const out = coords.slice(0, lo + 1);
  if (lo < coords.length - 1 && target > cum[lo]) {
    const t = (target - cum[lo]) / (cum[lo + 1] - cum[lo]);
    const [x1, y1] = coords[lo];
    const [x2, y2] = coords[lo + 1];
    out.push([lerp(x1, x2, t), lerp(y1, y2, t)]);
  }
  return out;
}

// Scroll progress → what is drawn. Legs before the current one are complete; between two steps
// the tip holds where the previous step ended.
export function trackAt(track: Track, p: number): TrackState {
  let step = -1;
  while (step + 1 < TIMELINE.length && TIMELINE[step + 1][0] <= p) step++;
  if (step < 0) return { step, leg: null, f: 0, tip: null, trails: [], drives: [] };

  const [a, b, id, s0, s1] = TIMELINE[step];
  const leg = track.byId[id];
  const f = lerp(leg.stops[s0], leg.stops[s1], clamp01((p - a) / (b - a)));
  const trails: LonLat[][] = [];
  const drives: LonLat[][] = [];
  let tip: LonLat | null = null;
  for (const l of track.legs) {
    const line = l === leg ? slice(l, f) : l.coords;
    (l.kind === 'trail' ? trails : drives).push(line);
    if (l === leg) {
      tip = line[line.length - 1];
      break;
    }
  }
  return { step, leg, f, tip, trails, drives };
}

// Altitude by linear interpolation of known waypoint elevations along the current leg.
export function profileAltitude(leg: Leg, f: number, wps: Record<string, Waypoint>): number | null {
  const pts = Object.entries(leg.stops)
    .map(([id, fr]) => [fr, wps[id]?.ele] as const)
    .filter((x): x is readonly [number, number] => x[1] != null)
    .sort((x, y) => x[0] - y[0]);
  if (!pts.length) return null;
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (f - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0] || 1));
  }
  return pts[pts.length - 1][1];
}
