import type { GeoJSONSource, Marker } from 'maplibre-gl';
import './styles.css';
import { cameraAt, lerp } from './camera';
import { MARKERS, SIDE_TRIPS, SUMMITS, loadWaypoints, type LonLat, type Waypoint } from './content';
import { EXAGGERATION, createHikerMarker, createHutMarker, createMap, lineData, multiLineData } from './map';
import { loadTrack, profileAltitude, trackAt, type Track, type TrackState } from './route';
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
let track: Track | null = null;
let wps: Record<string, Waypoint> = {};
let hiker: Marker | null = null;
let labels: { el: HTMLElement; windows: [number, number][] }[] = [];
let lastLineKey = '';
let lastSideKey = '';
let lastState: TrackState | null = null; // for the altitude refresh on 'idle'

const finite = (...xs: number[]) => xs.every(Number.isFinite);

function setVisible(node: HTMLElement, on: boolean) {
  const v = on ? 'visible' : 'hidden';
  if (node.style.visibility !== v) node.style.visibility = v;
}

function sideTripLine(p: number): LonLat[] {
  for (const s of SIDE_TRIPS) {
    if (p < s.start || p > s.hold) continue;
    const a = wps[s.from];
    const b = wps[s.to];
    if (!a || !b) return [];
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

  const st = track ? trackAt(track, p) : null;
  const tip = st?.tip ?? null;

  const cam = cameraAt(p, tip);
  if (cam.center && finite(cam.center[0], cam.center[1], cam.zoom, cam.pitch, cam.bearing)) {
    map.jumpTo({ center: cam.center, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing });
  }

  if (styleReady && st) {
    const lineKey = `${st.step}:${st.f}`;
    if (lineKey !== lastLineKey) {
      lastLineKey = lineKey;
      map.getSource<GeoJSONSource>('route')?.setData(multiLineData(st.trails));
      map.getSource<GeoJSONSource>('drive')?.setData(multiLineData(st.drives));
    }
    const side = sideTripLine(p);
    const sideKey = side.flat().join(',');
    if (sideKey !== lastSideKey) {
      lastSideKey = sideKey;
      map.getSource<GeoJSONSource>('side')?.setData(lineData(side));
    }
  }

  if (hiker) {
    if (tip) hiker.setLngLat(tip); // after jumpTo, in the same frame, so the dot never lags the line
    setVisible(hiker.getElement(), tip != null);
  }
  // Labels step aside while a summit headline covers the tip.
  const summitShowing = SUMMITS.some((s) => p > s.fadeIn[0] && p < s.fadeOut[1]);
  for (const l of labels) setVisible(l.el, !summitShowing && l.windows.some(([a, b]) => p >= a && p < b));

  lastState = st;
  updateAltitude();
}

// Altitude shows on foot only: terrain under the tip, or the waypoint profile until tiles arrive.
function updateAltitude() {
  const st = lastState;
  if (!st?.tip || st.leg?.kind !== 'trail') return ui.setAltitude(null);
  const raw = map.queryTerrainElevation(st.tip);
  ui.setAltitude(raw != null && Number.isFinite(raw) ? raw / EXAGGERATION : profileAltitude(st.leg, st.f, wps));
}

const loop = startScrollLoop(frame);

map.once('load', () => {
  styleReady = true;
  loop.redraw();
});
// Terrain tiles arrive asynchronously; refresh the altitude readout once they do.
map.on('idle', updateAltitude);

Promise.all([loadTrack(), loadWaypoints()])
  .then(([t, waypoints]) => {
    track = t;
    wps = Object.fromEntries(waypoints.map((w) => [w.id, w]));
    console.info('track legs', t.legs.map((l) => `${l.id} (${l.kind})`).join(' · '));
    hiker = createHikerMarker(map, t.legs[0].coords[0]);
    labels = MARKERS.filter(([id]) => wps[id]).map(([id, windows]) => ({ el: createHutMarker(map, wps[id]).getElement(), windows }));
    lastLineKey = '';
    lastSideKey = '';
    loop.redraw();
  })
  .catch((err) => console.error('data load failed:', err));
