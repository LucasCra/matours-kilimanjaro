import { Map, Marker, setWorkerUrl, type RasterDEMSourceSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Waypoint } from './content';

const ESRI =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community';

// Fallbacks for when a free tile server is down (PLAN §3, §10). Flip and reload.
const USE_EOX_IMAGERY = false;
const EOX = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';
const EOX_ATTRIBUTION = 'Sentinel-2 cloudless by EOX IT Services GmbH';

const USE_AWS_TERRAIN = false;
const MAPTERHORN_DEM: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  url: 'https://tiles.mapterhorn.com/tilejson.json',
  // The TileJSON declares no maxzoom; over Kilimanjaro tiles stop at z12 and z13+ return 404.
  maxzoom: 12,
};
const AWS_DEM: RasterDEMSourceSpecification = {
  type: 'raster-dem',
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
};

// MapLibre resolves its worker next to its own module, which Vite's bundling moves; point at it explicitly.
setWorkerUrl(workerUrl);

export const EXAGGERATION = 1.15;

const EMPTY = { type: 'FeatureCollection', features: [] } as FeatureCollection;

export function createMap(): Map {
  return new Map({
    container: 'map',
    interactive: false, // scroll is the only input
    center: [25, 8],
    zoom: 1.6,
    pitch: 0,
    bearing: 0,
    maxPitch: 85,
    maxZoom: 17,
    attributionControl: { compact: false },
    style: {
      version: 8,
      projection: { type: 'globe' },
      sources: {
        sat: {
          type: 'raster',
          tiles: [USE_EOX_IMAGERY ? EOX : ESRI],
          tileSize: 256,
          maxzoom: 18,
          attribution: USE_EOX_IMAGERY ? EOX_ATTRIBUTION : ESRI_ATTRIBUTION,
        },
        dem: USE_AWS_TERRAIN ? AWS_DEM : MAPTERHORN_DEM,
        route: { type: 'geojson', data: EMPTY, attribution: '© OpenStreetMap contributors' },
        side: { type: 'geojson', data: EMPTY },
      },
      layers: [
        { id: 'sat', type: 'raster', source: 'sat' },
        {
          id: 'route-glow',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#8bc34a', 'line-width': 14, 'line-blur': 10, 'line-opacity': 0.45 },
        },
        {
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#9ccc65', 'line-width': 5 },
        },
        {
          id: 'side',
          type: 'line',
          source: 'side',
          paint: { 'line-color': '#9ccc65', 'line-width': 3, 'line-dasharray': [1.5, 2] },
        },
      ],
      terrain: { source: 'dem', exaggeration: EXAGGERATION },
      sky: {
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
        'sky-color': '#88b7ff',
        'horizon-color': '#dfe9ff',
        'fog-color': '#dfe9ff',
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.4,
        'fog-ground-blend': 0.6,
      },
    },
  });
}

export function lineData(coords: [number, number][]): FeatureCollection {
  return coords.length > 1
    ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] }
    : EMPTY;
}

export const formatMetres = (m: number) =>
  `${Math.round(m).toLocaleString('en-US').replace(/,/g, ' ')} m`;

export function createHikerMarker(map: Map, at: [number, number]): Marker {
  const el = document.createElement('div');
  el.className = 'hiker';
  return new Marker({ element: el }).setLngLat(at).addTo(map);
}

export function createHutMarker(map: Map, w: Waypoint): Marker {
  const el = document.createElement('div');
  el.className = 'hut';
  el.innerHTML = '<span class="hut-dot"></span><span class="hut-name"></span><span class="hut-ele"></span>';
  el.querySelector('.hut-name')!.textContent = w.name;
  el.querySelector('.hut-ele')!.textContent = formatMetres(w.ele);
  return new Marker({ element: el, anchor: 'left', offset: [10, 0] }).setLngLat([w.lon, w.lat]).addTo(map);
}
