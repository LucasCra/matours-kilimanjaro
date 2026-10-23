import { lerp } from './camera';
import { ROUTE_START, SEGMENTS, type LonLat, type Waypoint } from './content';

export interface Route {
  coords: LonLat[];
  cum: number[]; // cumulative distance at each vertex (degrees, equirectangular)
  total: number;
}

function dist(a: LonLat, b: LonLat): number {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]);
}

export async function loadRoute(url = '/data/route-marangu.geojson'): Promise<Route> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`route: HTTP ${res.status}`);
  const gj = await res.json();
  const coords: LonLat[] = gj.features[0].geometry.coordinates;
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + dist(coords[i - 1], coords[i]));
  return { coords, cum, total: cum[cum.length - 1] };
}

// Fraction of the route at the vertex nearest to `pt`.
function fractionNear(route: Route, pt: LonLat): number {
  let best = 0;
  let bestD = Infinity;
  route.coords.forEach((c, i) => {
    const d = dist(c, pt);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return route.cum[best] / route.total;
}

export function hutFractions(route: Route, waypoints: Waypoint[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of waypoints) out[w.id] = fractionNear(route, [w.lon, w.lat]);
  out.gate = 0;
  out.uhuru = 1;
  return out;
}

// Scroll progress → fraction of the route drawn, piecewise linear per day.
export function routeFraction(p: number, hf: Record<string, number>): number {
  if (p <= ROUTE_START) return 0;
  for (const [a, b, h0, h1] of SEGMENTS) {
    if (p <= b) return lerp(hf[h0], hf[h1], (p - a) / (b - a));
  }
  return 1;
}

// The first `f` of the line by distance; the last point is interpolated so the tip moves continuously.
export function slice(route: Route, f: number): LonLat[] {
  const { coords, cum, total } = route;
  const target = Math.min(1, Math.max(0, f)) * total;
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
