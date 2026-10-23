import type { GeoJSONSource, Marker } from 'maplibre-gl';
import './styles.css';
import { cameraAt, lerp } from './camera';
import {
  ALTITUDE_PROFILE,
  GATE,
  MARKED_HUTS,
  ROUTE_START,
  SIDE_TRIPS,
  loadWaypoints,
  type LonLat,
  type Waypoint,
} from './content';
import { EXAGGERATION, createHikerMarker, createHutMarker, createMap, lineData } from './map';
import { hutFractions, loadRoute, routeFraction, slice, type Route } from './route';
import { startScrollLoop } from './scroll';
import { buildUI } from './ui';

// The presentation always starts from the top: Earth from space.
history.scrollRestoration = 'manual';
scrollTo(0, 0);

// Scrolling is the only input: block browser zoom gestures (ctrl/pinch + wheel, Safari gestures).
addEventListener('wheel', (e) => e.ctrlKey && e.preventDefault(), { passive: false });
for (const type of ['gesturestart', 'gesturechange']) addEventListener(type, (e) => e.preventDefault());

const ui = buildUI(document.getElementById('ui')!, document.getElementById('stars')!);
const map = createMap();
map.on('error', (e) => console.error('map error:', e.error?.message ?? e));

let styleReady = false;
let route: Route | null = null;
let hf: Record<string, number> = {};
let wps: Record<string, Waypoint> = {};
let hiker: Marker | null = null;
let huts: { id: string; marker: Marker; el: HTMLElement }[] = [];
let lastRouteF = -1;
let lastSideKey = '';
let lastTip: { tip: LonLat; f: number } | null = null; // for the altitude refresh on 'idle'

const finite = (...xs: number[]) => xs.every(Number.isFinite);

function setVisible(node: HTMLElement, on: boolean) {
  const v = on ? 'visible' : 'hidden';
  if (node.style.visibility !== v) node.style.visibility = v;
}

// Altitude by linear interpolation of the known waypoint elevations along the route.
function profileAltitude(f: number): number {
  for (let i = 1; i < ALTITUDE_PROFILE.length; i++) {
    const a = ALTITUDE_PROFILE[i - 1];
    const b = ALTITUDE_PROFILE[i];
    if (f <= hf[b] || i === ALTITUDE_PROFILE.length - 1) {
      const t = Math.min(1, Math.max(0, (f - hf[a]) / (hf[b] - hf[a] || 1)));
      return lerp(wps[a].ele, wps[b].ele, t);
    }
  }
  return wps.gate.ele;
}

function sideTripLine(p: number): LonLat[] {
  for (const s of SIDE_TRIPS) {
    if (p < s.start || p > s.hold) continue;
    const a = wps[s.from];
    const b = wps[s.to];
    const t = Math.min(1, (p - s.start) / (s.end - s.start));
    return [
      [a.lon, a.lat],
      [lerp(a.lon, b.lon, t), lerp(a.lat, b.lat, t)],
    ];
  }
  return [];
}

function frame(p: number) {
  ui.update(p);

  const onRoute = p >= ROUTE_START;
  const f = route ? routeFraction(p, hf) : 0;
  const line = route ? slice(route, f) : [];
  const tip: LonLat = line.length ? line[line.length - 1] : GATE;

  const cam = cameraAt(p);
  const center = onRoute || !cam.center ? tip : cam.center;
  if (finite(center[0], center[1], cam.zoom, cam.pitch, cam.bearing)) {
    map.jumpTo({ center, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing });
  }

  if (styleReady && route) {
    if (f !== lastRouteF) {
      lastRouteF = f;
      map.getSource<GeoJSONSource>('route')?.setData(lineData(onRoute ? line : []));
    }
    const side = sideTripLine(p);
    const sideKey = side.flat().join(',');
    if (sideKey !== lastSideKey) {
      lastSideKey = sideKey;
      map.getSource<GeoJSONSource>('side')?.setData(lineData(side));
    }
  }

  if (hiker) {
    hiker.setLngLat(tip); // after jumpTo, in the same frame, so the dot never lags the line
    setVisible(hiker.getElement(), onRoute);
  }
  for (const h of huts) setVisible(h.el, onRoute && f >= hf[h.id] - 1e-6);

  lastTip = onRoute && route ? { tip, f } : null;
  updateAltitude();
}

function updateAltitude() {
  if (!lastTip) return;
  const raw = map.queryTerrainElevation(lastTip.tip);
  ui.setAltitude(raw != null && Number.isFinite(raw) ? raw / EXAGGERATION : profileAltitude(lastTip.f));
}

const loop = startScrollLoop(frame);

map.once('load', () => {
  styleReady = true;
  loop.redraw();
});
// Terrain tiles arrive asynchronously; refresh the altitude readout once they do.
map.on('idle', updateAltitude);

Promise.all([loadRoute(), loadWaypoints()])
  .then(([r, waypoints]) => {
    route = r;
    hf = hutFractions(r, waypoints);
    wps = Object.fromEntries(waypoints.map((w) => [w.id, w]));
    console.info(
      'hut fractions',
      ['gate', 'mandara', 'horombo', 'kibo', 'gilmans', 'uhuru'].map((id) => `${id} ${hf[id].toFixed(3)}`).join(' · '),
    );
    hiker = createHikerMarker(map, GATE);
    huts = MARKED_HUTS.map((id) => {
      const marker = createHutMarker(map, wps[id]);
      return { id, marker, el: marker.getElement() };
    });
    lastRouteF = -1;
    lastSideKey = '';
    loop.redraw();
  })
  .catch((err) => console.error('data load failed:', err));
