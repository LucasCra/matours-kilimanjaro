import { KEYFRAMES, type LonLat } from './content';

export { KEYFRAMES };

export interface Camera {
  center: LonLat | null; // null only when a keyframe asks for the tip and there is none yet
  zoom: number;
  pitch: number;
  bearing: number;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Interpolates angles in degrees along the shortest arc.
export function lerpAngle(a: number, b: number, t: number): number {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
}

// `tip` is the tip of the drawn line; keyframes whose centre is 'tip' resolve to it, so between
// two 'tip' keyframes the camera stays exactly on the tip, and next to a fixed centre it blends.
export function cameraAt(p: number, tip: LonLat | null): Camera {
  let i = 0;
  while (i < KEYFRAMES.length - 2 && p > KEYFRAMES[i + 1][0]) i++;
  const [p0, k0, z0, pt0, b0] = KEYFRAMES[i];
  const [p1, k1, z1, pt1, b1] = KEYFRAMES[i + 1];
  const t = clamp01((p - p0) / (p1 - p0));
  const e = t * t * (3 - 2 * t);
  const c0 = k0 === 'tip' ? tip : k0;
  const c1 = k1 === 'tip' ? tip : k1;
  const a = c0 ?? c1;
  const b = c1 ?? c0;
  return {
    center: a && b ? [lerp(a[0], b[0], e), lerp(a[1], b[1], e)] : null,
    zoom: lerp(z0, z1, e),
    pitch: lerp(pt0, pt1, e),
    bearing: lerpAngle(b0, b1, e),
  };
}
