import { KEYFRAMES, type LonLat } from './content';

export { KEYFRAMES };

export interface Camera {
  center: LonLat | null; // null from ROUTE_START on: the caller puts the line tip here
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

export function cameraAt(p: number): Camera {
  let i = 0;
  while (i < KEYFRAMES.length - 2 && p > KEYFRAMES[i + 1][0]) i++;
  const [p0, c0, z0, pt0, b0] = KEYFRAMES[i];
  const [p1, c1, z1, pt1, b1] = KEYFRAMES[i + 1];
  const t = clamp01((p - p0) / (p1 - p0));
  const e = t * t * (3 - 2 * t);
  let center: LonLat | null = null;
  if (c0 && c1) center = [lerp(c0[0], c1[0], e), lerp(c0[1], c1[1], e)];
  return {
    center,
    zoom: lerp(z0, z1, e),
    pitch: lerp(pt0, pt1, e),
    bearing: lerpAngle(b0, b1, e),
  };
}
