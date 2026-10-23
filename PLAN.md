> **Update (Oct 2026): content and track replaced.** The page now follows the 19-day Karavaniers
> itinerary "Meru et les 3 sommets du Kilimandjaro": Mount Meru, then Kilimanjaro by the Shira route,
> the Northern Circuit and a night at Crater Camp, then a Serengeti and Ngorongoro safari. The Marangu
> copy, waypoints, chapter windows and keyframes below are historical. The authoritative numbers now
> live in `src/content.ts` (`TIMELINE`, `KEYFRAMES`, `CHAPTERS`, `MARKERS`), the route in
> `public/data/track.geojson` (built by `tools/build_track.py`, see `tools/README.md`), and the scroll
> track is `3600vh`. The core mechanic is unchanged: scroll-scrubbed, map not interactive, camera on
> the line tip along every trail leg. Road legs are dashed and use fixed camera keyframes.

# Matours — Kilimanjaro scroll-driven 3D landing page

**Implementation specification for a coding agent.** This document is the only input: it contains
every decision, all the copy, the camera numbers, the route geometry (Appendix C), the waypoints
(Appendix B) and a working prototype (Appendix A). Nothing else exists yet; no files, no repository,
no accounts. The owner made every product decision below; do not re-open them, do not re-research
the map stack, and do not ask the owner questions that this document answers. Where this document is
silent, choose the simplest option that keeps the behaviour in §1 and §5 intact.

Start by creating a new, empty project folder (suggested name `matours-kilimanjaro`) and follow §2 to
extract the data files from the appendices. Everything else is built from scratch with the stack in §4.

---

## 1. Goal and hard constraints

- One single-page website for the tour brand **Matours**. Adventure tone, English only.
- **Desktop browser only** (Chrome or Safari on a desktop Mac, 1920×1080 or larger).
  No mobile layout, no responsive work, no touch support.
- **Runs locally only** on `localhost` for a screen-share presentation. No hosting, SEO, analytics,
  backend, forms or payments.
- **Zero paid services, zero API keys, zero accounts.** All map data comes from the free public tile
  servers in §3. Internet access is required at runtime (tiles, fonts, placeholder photos).
- **The experience**: the page opens on Earth seen from space with the title "Welcome to your new
  adventure". As the visitor scrolls down, the camera zooms to Africa, then to Kilimanjaro, then tilts
  into a 3D view. From there, a thick green line is drawn along the real Marangu Route day by day
  while the camera stays centred on the tip of that line and gets closer, until the line reaches
  Uhuru Peak. Text cards and example photos appear and disappear in sync with scrolling. The page ends
  with a "Book a climb" button.
- **Scroll is strictly scrubbed.** Camera, line length, card and photo visibility are pure functions
  of scroll progress `p ∈ [0, 1]`. Scrolling up reverses everything exactly. No autoplay, no
  "click to continue", no time-based animation except the tiny smoothing in §5.4.
- **Scrolling is the only input.** The visitor can never pan, rotate, tilt, zoom or click the map.
  The map is created with `interactive: false`; the map container has `pointer-events: none`; there
  are no navigation/globe/terrain controls and no popups. The only clickable element on the whole
  page is the final "Book a climb" button. Arrow keys, space and page-down scroll the page (that is
  scrolling), they must never reach the map.
- **The camera is centred on the tip of the drawn line** during the whole trek (§5.5). The tip must
  never drift off-centre or be left behind.
- Tour facts (prices, dates, group size, inclusions) are **invented placeholders**. Geography and
  nature facts are real. Photos are **placeholders** from `picsum.photos` (§6.3).

## 2. Inputs: this document only

There are no pre-existing files. Two data files must be created from the appendices before coding.
Each appendix is a fenced code block whose opening fence carries the target file name, so they can be
extracted mechanically from this document (`PLAN.md`) with `awk`; run these from the project root:

```bash
mkdir -p public/data
awk '/^```json waypoints.json$/{f=1;next} /^```$/{f=0} f' PLAN.md > public/data/waypoints.json
awk '/^```json route-marangu.geojson$/{f=1;next} /^```$/{f=0} f' PLAN.md > public/data/route-marangu.geojson
node -e "for (const f of ['waypoints','route-marangu']) JSON.parse(require('fs').readFileSync('public/data/'+f+(f==='waypoints'?'.json':'.geojson'),'utf8')); console.log('data ok')"
```

| File | Content | Use |
|---|---|---|
| `public/data/route-marangu.geojson` (Appendix C) | GeoJSON `FeatureCollection` with one `LineString` of `[lon, lat]` points, Marangu Gate → Uhuru Peak, 33.9 km. First point is the gate `[37.517655, -3.243647]`, last is Uhuru Peak `[37.353999, -3.076408]`. Real trail from OpenStreetMap relation 8737292 (ODbL), simplified to a 5 m tolerance (476 points), which is below one screen pixel at the highest zoom used. | Fetched at runtime; the drawn line and the camera target come from it. |
| `public/data/waypoints.json` (Appendix B) | `{ waypoints: [{ id, name, lon, lat, ele, day, side_trip? }] }` for gate, Mandara, Maundi Crater, Horombo, Zebra Rocks, Kibo Hut, Gilman's Point, Stella Point, Uhuru Peak. Elevations in metres. Also as a table in §6.2. | Hut markers, side trips, stats in cards. |
| Appendix A | Working single-file prototype of the whole mechanic. | Port its logic into the module layout of §4. Do not ship it; its debug buttons and HUD must not exist in the real build. |

Appendix D explains how the route was derived and how to regenerate a full-resolution version. That
is optional; the simplified route in Appendix C is sufficient for this site.

## 3. Map stack (verified; do not substitute)

| Role | Source | Notes |
|---|---|---|
| Renderer | **MapLibre GL JS 6.15.0** (`npm i maplibre-gl@6.15.0`), plus its CSS `maplibre-gl/dist/maplibre-gl.css`. | Globe projection and 3D terrain work together in this version. Pin it exactly. |
| Satellite imagery | Raster tiles `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (note the `{z}/{y}/{x}` order), `tileSize: 256`, `maxzoom: 18`. | No key. Attribution string (must stay visible): `Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community`. Free for non-revenue use with attribution. |
| Terrain | `raster-dem` source with `url: "https://tiles.mapterhorn.com/tilejson.json"` (TileJSON; terrarium encoding, 512 px tiles). | No key. Attribution `© Mapterhorn` is injected automatically from the TileJSON. Fallback constant (only if Mapterhorn is down): tiles `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, `encoding: "terrarium"`, `tileSize: 256`, `maxzoom: 15`. |
| Route | `public/data/route-marangu.geojson`, extracted from Appendix C | Attribution `© OpenStreetMap contributors` (add to the attribution control via the geojson source's `attribution` property). |
| Photos | `https://picsum.photos/seed/<seed>/900/600` | Seeds listed in §6.3. |
| Fonts | Google Fonts `Bebas Neue` (display) and `Inter` (body) via a `<link>` in `index.html`. | System fallback: `Impact`/`system-ui`. |

Verified facts: the globe renders from zoom 1.6; MapLibre's `globe` projection switches to flat
Mercator by itself around zoom 11–12 (this happens during chapter 3 and looks fine); terrain
exaggeration 1.15 reads well; `line` layers drape correctly on terrain; `map.jumpTo()` every animation
frame is smooth on Apple silicon.

Two MapLibre traps to know in advance:
- **Text labels on the map need a `glyphs` URL** in the style, which we do not have. Do not use
  `symbol` layers with text. Use HTML markers (`new maplibregl.Marker({ element })`) for hut labels;
  MapLibre places HTML markers on the terrain surface automatically.
- **`map.queryTerrainElevation()` returns the exaggerated height.** Divide by the exaggeration (1.15)
  before displaying. It returns `null` until terrain tiles are loaded; fall back to interpolating the
  waypoint elevations by route fraction.

## 4. Tech stack and project layout

- **Vite + vanilla TypeScript** (`npm create vite@latest . -- --template vanilla-ts`), Node 20+.
  No UI framework, no scroll library, no GSAP. One page, one map, one scroll handler.
- `maplibre-gl@6.15.0` from npm, imported as a module (not from a CDN).
- Plain CSS in one file with custom properties (§7.1).
- Dev server: `npm run dev` on port 5173. The presentation runs from the dev server; no build step
  is required (but `npm run build` must also succeed).

```
index.html            map div, fixed UI layer, scroll track, font <link>s
src/
  main.ts             bootstraps map, loads data, starts scroll loop, builds UI
  map.ts              createMap(): MapLibre style from §5.1, returns the Map
  camera.ts           KEYFRAMES, cameraAt(p), lerpAngle
  route.ts            loadRoute(), cumulative distances, hutFractions, routeFraction(p), slice(f)
  scroll.ts           progress tracking, smoothing, requestAnimationFrame loop
  ui.ts               builds chapter cards/photos/progress bar from content; update(p) toggles them
  content.ts          single source of truth: chapters (windows, copy, photos, camera), waypoints import
  styles.css          tokens, layout, cards, hero, progress bar, CTA, starfield
public/data/          route-marangu.geojson, waypoints.json (extracted from Appendices C and B, see §2)
```

## 5. Core mechanic, step by step

### 5.1 Map creation

```ts
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const EMPTY = { type: 'FeatureCollection', features: [] } as const;

new maplibregl.Map({
  container: 'map',
  interactive: false,                 // scroll is the only input
  center: [25, 8], zoom: 1.6, pitch: 0, bearing: 0,
  maxPitch: 85, maxZoom: 17,
  attributionControl: { compact: false },
  style: {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      sat:   { type: 'raster', tiles: [ESRI], tileSize: 256, maxzoom: 18,
               attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community' },
      dem:   { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json' },
      route: { type: 'geojson', data: EMPTY, attribution: '© OpenStreetMap contributors' }, // drawn part
      side:  { type: 'geojson', data: EMPTY },                                              // dashed side trips
    },
    layers: [
      { id: 'sat', type: 'raster', source: 'sat' },
      { id: 'route-glow', type: 'line', source: 'route',
        paint: { 'line-color': '#8bc34a', 'line-width': 14, 'line-blur': 10, 'line-opacity': 0.45 } },
      { id: 'route', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#9ccc65', 'line-width': 5 } },
      { id: 'side', type: 'line', source: 'side',
        paint: { 'line-color': '#9ccc65', 'line-width': 3, 'line-dasharray': [1.5, 2] } },
    ],
    terrain: { source: 'dem', exaggeration: 1.15 },
    sky: {
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
      'sky-color': '#88b7ff', 'horizon-color': '#dfe9ff', 'fog-color': '#dfe9ff',
      'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.4, 'fog-ground-blend': 0.6,
    },
  },
});
```
The `#map` div is `position: fixed; inset: 0; pointer-events: none; background: #020308`. A CSS
starfield (§7.4) sits behind it. Keep the attribution control visible bottom-right at all times.

### 5.2 Page structure and progress

- `index.html` has: `#stars` (fixed, behind), `#map` (fixed), `#ui` (fixed, full-screen,
  `pointer-events: none`, all cards/hero/progress bar inside), and `#track`, an empty block with
  `height: 1600vh` that gives the page its scroll length. Nothing else scrolls.
- `progress = clamp(scrollY / (document.documentElement.scrollHeight - innerHeight), 0, 1)`.
  Guard against a zero denominator (return 0).

### 5.3 Chapter windows (authoritative; the prototype uses the same numbers)

| # | Chapter | Window `p` | Route mapping |
|---|---|---|---|
| 0 | Hero | 0.00 – 0.07 | — |
| 1 | The Great Rift | 0.07 – 0.16 | — |
| 2 | A volcano in three acts | 0.16 – 0.25 | — |
| 3 | Five worlds in one climb (tilt into 3D) | 0.25 – 0.34 | — |
| 4 | The Matours Marangu Expedition (trip overview) | 0.34 – 0.40 | camera arrives exactly at the gate at 0.40 |
| 5 | Day 1 · Gate → Mandara | 0.40 – 0.50 | line: gate → Mandara |
| 6 | Day 2 · Mandara → Horombo | 0.50 – 0.62 | line: Mandara → Horombo |
| 7 | Day 3 · Acclimatization | 0.62 – 0.70 | line holds at Horombo; dashed side trip to Zebra Rocks draws 0.62–0.66 |
| 8 | Day 4 · Horombo → Kibo Hut | 0.70 – 0.80 | line: Horombo → Kibo Hut |
| 9 | Day 5 · Summit night | 0.80 – 0.96 | line: Kibo Hut → Uhuru (Gilman's ≈ 0.92) |
| 10 | Day 6 · Descent & Book a climb | 0.96 – 1.00 | line complete; bearing slowly orbits |

`ROUTE_START = 0.40`, `ROUTE_END = 0.96`.

### 5.4 Smoothing (the only time-based motion allowed)

Keep `displayed`, which chases `progress`: each animation frame
`displayed += (progress - displayed) * 0.15`; stop the loop when `|progress - displayed| < 0.0003`
and restart it on the next `scroll` event. Everything in 5.5 is computed from `displayed`. This
removes trackpad stutter while nothing can move unless the user scrolled.

### 5.5 Per-frame update from `displayed` (call it `p` here)

1. **Route fraction, piecewise per day.** After loading the GeoJSON, compute cumulative distances
   along the line (equirectangular is fine: `dx = Δlon·cos(lat)`, `dy = Δlat`) and, for each hut,
   its fraction = cumulative distance at the nearest vertex ÷ total. Expected values with the Appendix C
   file (compute them at runtime anyway, do not hard-code): gate `0.000`, Mandara `0.235`, Horombo `0.579`,
   Kibo Hut `0.855`, Uhuru `1.000`. Then:

   ```
   SEGMENTS = [ [0.40, 0.50, gate, mandara], [0.50, 0.62, mandara, horombo],
                [0.62, 0.70, horombo, horombo], [0.70, 0.80, horombo, kibo], [0.80, 0.96, kibo, uhuru] ]
   routeFraction(p): 0 if p ≤ 0.40; 1 if p ≥ 0.96; otherwise linear inside the segment that contains p.
   ```
2. **Slice the line** at that fraction by cumulative distance, interpolating the last point so the
   tip moves continuously. `setData` on the `route` source every frame (cheap at 2,244 points).
3. **Camera.** `cam = cameraAt(p)` from the keyframes in §5.6 (smoothstep between neighbours,
   shortest-arc for bearing). **If `p ≥ ROUTE_START` and the sliced line is non-empty, replace
   `cam.center` with the last point of the sliced line.** Then `map.jumpTo(cam)`. Skip the call if
   any value is not finite. Before `ROUTE_START` the keyframe centres are used, and the keyframe at
   `0.40` is pinned to the exact gate coordinate so the hand-over is seamless.
4. **Side trips.** Two-point dashed lines from a hut to its side-trip waypoint, drawn by the same
   slicing idea: Mandara → Maundi Crater during 0.47–0.50 (draws out as Day 1 ends), Horombo → Zebra
   Rocks during 0.62–0.66 and held until 0.70. Outside those windows the `side` source is empty.
   The camera does **not** follow side trips; it stays on the main line's tip.
5. **Hiker dot**: a 14 px round HTML marker with a soft glow at the tip; visible from 0.40 to 1.
6. **Hut markers**: HTML markers (label pill with the hut name and elevation, small dot on the left)
   for gate, Mandara, Horombo, Kibo Hut, Gilman's Point, Uhuru Peak. Each becomes visible when
   `routeFraction(p) ≥` its own fraction and hides again when scrolled back. `pointer-events: none`.
7. **Cards and photos**: each chapter's card is visible inside its window; opacity ramps 0→1 over the
   first 10 % of the window and 1→0 over the last 10 %, with `translateY(24px → 0)` on the way in.
   Photos inside a chapter use sub-windows (listed in §6.1) so they pop in one after another, and
   disappear in reverse when scrolling up. Cards sit in the left or right third of the screen (§6.1)
   and never cover the centre where the tip is.
8. **Progress bar and altitude**: bottom bar fill = `p`; tick marks at the start of chapters 5–10
   labelled "Day 1" … "Day 6"; altitude readout = `queryTerrainElevation(tip) / 1.15` rounded to
   10 m, falling back to linear interpolation of waypoint elevations by fraction; shown from 0.40 on.
9. **Summit moment**: when `p` crosses 0.955–0.965 the full-width "SUMMIT DAY" headline (§6.1,
   chapter 9) fades in and stays until 0.985; a short radial vignette flash accompanies the fade-in.

### 5.6 Camera keyframes (authoritative)

`[p, center [lon, lat], zoom, pitch, bearing]`. From `0.40` on, `center` is ignored (tip is used).

```
[0.00, [25.0000,  8.0000],  1.6,  0,    0 ]   // Earth from space, Africa centred
[0.12, [37.3500, -3.0700],  4.5,  0,    0 ]   // East Africa
[0.22, [37.3500, -3.0700],  8.6,  0,    0 ]   // Kilimanjaro from above
[0.30, [37.4200, -3.1400], 10.2, 55,  -35 ]   // tilt into 3D
[0.40, [37.5176549, -3.2436469], 12.4, 60, -20 ]   // exactly at Marangu Gate
[0.50, tip, 12.9, 62,  -30 ]   // Mandara
[0.62, tip, 12.7, 62,  -50 ]   // Horombo
[0.70, tip, 13.2, 65,  -45 ]   // Day 3 hold
[0.80, tip, 12.9, 65,  -60 ]   // Kibo Hut
[0.92, tip, 13.6, 68,  -80 ]   // Gilman's Point
[0.96, tip, 14.6, 70, -120 ]   // Uhuru Peak
[1.00, tip, 14.6, 70, -105 ]   // slow orbit while the CTA shows
```
Interpolation: find the bracketing pair, `t = (p − p0)/(p1 − p0)`, `e = t²(3 − 2t)`; lerp centre,
zoom and pitch; lerp bearing along the shortest arc. Zoom interpolates linearly in zoom units.
The agent may fine-tune zoom/pitch/bearing during step 6 of §9, never the windows or the tip rule.

## 6. Content (content.ts) — final copy

Conventions: `side` is where the card sits. Stats strips use the format shown. Elevations come from
§6.2. Keep the copy as written; it is final for this version (facts are real, tour details are
intentionally invented).

### 6.1 Chapters

**0 · Hero** (0.00–0.07, centred, no card)
- Eyebrow: `MATOURS PRESENTS`
- Title: `Welcome to your new adventure`
- Subtitle: `Kilimanjaro, Tanzania · 6 days to the roof of Africa`
- Scroll hint at the bottom: a small downward chevron bouncing gently, text `Scroll to begin`.
- Fades out between 0.04 and 0.07.

**1 · The Great Rift** (0.07–0.16, side: left)
- Eyebrow: `WHERE WE ARE GOING`
- Title: `A mountain born of a continent tearing apart`
- Body: `Kilimanjaro rises alone from the plains of northern Tanzania, only 330 km south of the equator. It was built by the same forces that are slowly splitting East Africa along the Great Rift Valley, where magma found its way up through a fractured crust.`
- Fact card: `Highest free-standing mountain on Earth. No range around it, just savanna and then 5,895 metres of volcano.`

**2 · A volcano in three acts** (0.16–0.25, side: right)
- Eyebrow: `GEOLOGY`
- Title: `Three volcanoes, one mountain`
- Body: `Kilimanjaro is three volcanic cones fused together. Shira in the west collapsed long ago into a high plateau. Mawenzi in the east is a jagged ruin of 5,149 m. Kibo in the middle is the youngest and tallest, dormant rather than extinct: it last erupted around 150,000 to 200,000 years ago and still breathes sulphur in its crater.`
- Facts (two small cards): `"Uhuru" means freedom in Swahili. The summit was renamed in 1961 when Tanganyika became independent.` · `Kibo's glaciers have lost more than 80 % of their area since 1912.`

**3 · Five worlds in one climb** (0.25–0.34, side: left; photos pop in at 0.27, 0.29, 0.31)
- Eyebrow: `NATURE`
- Title: `From the equator to the Arctic in five days`
- Body: `Every thousand metres you climb, the world changes. Farms and coffee give way to dripping rainforest, then to moorland of giant groundsels and lobelias, then to a lunar alpine desert, and finally to ice and rock at the summit.`
- Zone list (compact): `Cultivation 800–1,800 m` · `Montane rainforest 1,800–2,800 m` · `Heath & moorland 2,800–4,000 m` · `Alpine desert 4,000–5,000 m` · `Arctic summit 5,000 m+`
- Photos: `kili-rainforest` "Montane rainforest, day 1" · `kili-groundsel` "Giant groundsels in the moorland" · `kili-glacier` "Summit glaciers at dawn"

**4 · The Matours Marangu Expedition** (0.34–0.40, side: right, wider card 520 px)
- Eyebrow: `THE TRIP`
- Title: `6 days on the Marangu Route`
- Body: `Marangu is the classic line up the mountain and the only route where you sleep in huts instead of tents. We add a full acclimatization day at Horombo, which is the single biggest factor in reaching the summit.`
- Detail grid (label → value):
  `Departures` → `14 Feb 2027 · 11 Sep 2027 · 9 Oct 2027`
  `Group size` → `4–12 climbers, 1 guide per 3 climbers`
  `Difficulty` → `Moderate. No technical climbing; altitude is the challenge.`
  `Included` → `Park fees, hut bookings, guides, porters, cook, all meals on the mountain, transfers from Moshi, emergency oxygen`
  `Not included` → `Flights, visa, tips, personal gear`
  `Price` → `from USD 2,450 per person`

**5 · Day 1 · Marangu Gate → Mandara Huts** (0.40–0.50, side: left; photos at 0.43, 0.46)
- Eyebrow: `DAY 1 · RAINFOREST`
- Title: `Into the forest`
- Stats: `1,860 m → 2,720 m · 8 km · 4–5 h`
- Body: `After registration at Marangu Gate the trail dives straight into montane rainforest. Blue monkeys and black-and-white colobus watch from the canopy. Before dinner we take the 15-minute side path to Maundi Crater for the first clear view of Kibo.`
- Photos: `kili-day1-forest` "The trail to Mandara" · `kili-colobus` "Colobus monkey, Marangu forest"

**6 · Day 2 · Mandara → Horombo Huts** (0.50–0.62, side: right; photos at 0.54, 0.58)
- Eyebrow: `DAY 2 · MOORLAND`
- Title: `Above the trees`
- Stats: `2,720 m → 3,720 m · 12 km · 5–7 h`
- Body: `The forest thins within an hour and opens onto rolling heath. Giant groundsels stand like sentries along the path and Mawenzi's spires appear on the right. Horombo is the busiest hut on the mountain, a small village at 3,720 m.`
- Photos: `kili-moorland` "Heath and moorland below Horombo" · `kili-horombo` "Horombo Huts"

**7 · Day 3 · Acclimatization at Horombo** (0.62–0.70, side: left; photo at 0.65)
- Eyebrow: `DAY 3 · CLIMB HIGH, SLEEP LOW`
- Title: `A day that buys the summit`
- Stats: `3,720 m → 4,042 m → 3,720 m · 7 km · 3–4 h`
- Body: `We walk up to Zebra Rocks, a striped lava wall at 4,042 m, and come back down to sleep at Horombo. It feels like a rest day. It is the most important day of the trip: this is where your blood learns to carry oxygen at altitude.`
- Photo: `kili-zebra-rocks` "Zebra Rocks"

**8 · Day 4 · Horombo → Kibo Hut** (0.70–0.80, side: right; photo at 0.75)
- Eyebrow: `DAY 4 · ALPINE DESERT`
- Title: `Across the Saddle`
- Stats: `3,720 m → 4,720 m · 10 km · 5–7 h`
- Body: `The last water point is at 4,130 m. Beyond it the Saddle opens up, a lunar plain between Mawenzi and Kibo where nothing grows. Kibo Hut sits at the foot of the final wall. Dinner is early and sleep comes at 18:00, because the night will be short.`
- Photo: `kili-saddle` "The Saddle, with Kibo ahead"

**9 · Day 5 · Summit night** (0.80–0.96, side: left; photos at 0.86, 0.93; SUMMIT DAY headline at 0.955–0.985)
- Eyebrow: `DAY 5 · SUMMIT`
- Title: `Midnight to the roof of Africa`
- Stats: `4,720 m → 5,895 m → 3,720 m · 6 km up, 20 km down · 12–15 h`
- Body: `We wake at 23:00 and start at midnight by headlamp. Six hours of scree switchbacks lead to Gilman's Point (5,685 m) at sunrise. Then along the crater rim past Stella Point (5,744 m) to the sign at Uhuru Peak, 5,895 m. After photos, the long descent back to Horombo.`
- Photos: `kili-sunrise-gilmans` "Sunrise at Gilman's Point" · `kili-uhuru-sign` "Uhuru Peak, 5,895 m"
- Summit headline (full width, centred): `SUMMIT DAY` with sub-line `Uhuru Peak · 5,895 m · the highest point in Africa`

**10 · Day 6 · Descent & Book a climb** (0.96–1.00, centred panel, appears from 0.975)
- Eyebrow: `DAY 6 · HOME`
- Title: `Down through the five worlds`
- Body: `Horombo to Marangu Gate in a morning, back through moorland and forest. At the gate you receive your summit certificate, and we drive to Moshi for a shower, a cold drink and a very long sleep.`
- CTA button: `Book a climb` → `mailto:hello@matours.example?subject=Kilimanjaro%20climb`
  (the only clickable element on the page).
- Footer line (small): `© Matours · Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community · Terrain © Mapterhorn · Route data © OpenStreetMap contributors · Photos are placeholders`

### 6.2 Waypoints (same data as Appendix B)

| id | name | lon | lat | ele (m) | day | role |
|---|---|---|---|---|---|---|
| gate | Marangu Gate | 37.5176549 | -3.2436469 | 1860 | 1 | hut marker, route start |
| mandara | Mandara Huts | 37.5133562 | -3.1816771 | 2720 | 1 | hut marker |
| maundi | Maundi Crater | 37.5193272 | -3.1769259 | 2772 | 1 | side trip from Mandara |
| horombo | Horombo Huts | 37.4392595 | -3.1400138 | 3720 | 2 | hut marker |
| zebra | Zebra Rocks | 37.4333444 | -3.1227795 | 4042 | 3 | side trip from Horombo |
| kibo | Kibo Hut | 37.3894245 | -3.0817675 | 4720 | 4 | hut marker |
| gilmans | Gilman's Point | 37.3683329 | -3.0744490 | 5685 | 5 | hut marker |
| stella | Stella Point | 37.3626212 | -3.0782335 | 5744 | 5 | (not marked; too close to Uhuru at this zoom) |
| uhuru | Uhuru Peak | 37.3539987 | -3.0764084 | 5895 | 5 | hut marker, route end |

### 6.3 Photos

All placeholders: `https://picsum.photos/seed/<seed>/900/600`, rendered 300×200 inside cards,
`loading="eager"` so all 11 are fetched at page load. Seeds: `kili-rainforest`, `kili-groundsel`,
`kili-glacier`, `kili-day1-forest`, `kili-colobus`, `kili-moorland`, `kili-horombo`,
`kili-zebra-rocks`, `kili-saddle`, `kili-sunrise-gilmans`, `kili-uhuru-sign`. Each photo shows its
caption under it in small text. Keep `{ seed, caption, at }` in `content.ts` so real photos can be
swapped in later by changing one URL.

## 7. Visual design

### 7.1 Tokens (CSS custom properties)

```
--bg: #020308;            --ink: #f4f7f2;        --muted: rgba(244,247,242,.72);
--accent: #9ccc65;        --accent-deep: #6f9e3a; --glass: rgba(8,12,16,.58);
--glass-border: rgba(255,255,255,.12);
--display: 'Bebas Neue', Impact, sans-serif;  --body: 'Inter', system-ui, sans-serif;
--radius: 14px;  --shadow: 0 20px 60px rgba(0,0,0,.45);
```

### 7.2 Layout rules

- `#ui` is a fixed full-screen layer, `pointer-events: none`; only the CTA button re-enables
  pointer events on itself.
- Cards: `max-width: 440px` (520 px for chapter 4), padding 28 px, `background: var(--glass)`,
  `backdrop-filter: blur(16px)`, 1 px `--glass-border`, `--radius`, `--shadow`. Left cards at
  `left: 6vw`, right cards at `right: 6vw`, vertically centred. Nothing in the middle third of the
  screen except the hero, the SUMMIT DAY headline and the Day 6 panel (which appear when the line
  tip is static or not yet drawn).
- Typography: eyebrow 12 px `--body` uppercase letter-spacing .18em in `--accent`; card title
  `--display` 44 px line-height .95; body `--body` 16 px / 1.55 in `--ink`; stats strip `--body`
  13 px in `--muted` with `·` separators; hero title `--display` clamp(72px, 9vw, 128px).
- Photos inside cards: 300×200, `--radius` 10 px, slide in from the card's outer edge (24 px) with
  fade over the first 4 % of progress after their `at` value and reverse on the way out.
- Progress bar: fixed bottom, 3 px tall full width, fill in `--accent`; six ticks with labels above
  them in 11 px `--muted`; the altitude readout sits above the bar on the right (`--display` 28 px,
  e.g. `3 720 m`).
- Hut markers: pill `background: var(--glass)`, 12 px text, name in `--ink`, elevation in `--muted`,
  an 8 px `--accent` dot on the left; anchor `left`, offset 10 px.
- Hiker dot: 14 px circle `--accent`, `box-shadow: 0 0 0 6px rgba(156,204,101,.25), 0 0 24px var(--accent)`.
- SUMMIT DAY: `--display` clamp(96px, 14vw, 220px), letter-spacing .04em, centred, with the
  sub-line in `--body` 18 px; a radial vignette `radial-gradient(transparent 40%, rgba(0,0,0,.6))`
  flashes to opacity 1 and back over the fade-in.
- CTA button: `--accent` background, `#0b1a05` text, `--display` 28 px, padding 18 px 44 px,
  pill radius, hover brightens 8 %. `pointer-events: auto`.

### 7.3 Motion rules

- Everything is scroll-scrubbed; CSS transitions are allowed only on opacity/transform for ≤ 150 ms
  as anti-flicker, never for choreography.
- Hero fades out 0.04–0.07; scroll hint bounces with a 1.6 s CSS keyframe (the one decorative loop).

### 7.4 Starfield

`#stars`: fixed full-screen, `background: var(--bg)` plus two layered `radial-gradient` star
patterns generated once in JS onto a `<canvas>` (≈ 400 white dots, radii 0.5–1.4 px, random opacity
.4–1). It is visible only when the globe does not fill the screen (p < 0.2); fade it out 0.15–0.22.

## 8. Behavioural checklist (definition of done)

All of these must be true in Chrome at 1920×1080 before the task is complete:

1. Fresh load shows Earth from space, Africa centred, hero text, scroll hint, starfield. No console errors.
2. Scrolling down zooms smoothly to East Africa, then to Kilimanjaro from above, then tilts into 3D.
3. At the end of the trip-overview chapter the camera is looking up the mountain from Marangu Gate and the first line segment starts drawing from exactly that point, with no jump.
4. From there to the summit, the tip of the thick line is at the centre of the screen on every frame. Scrolling fast, slow or backwards never leaves the tip off-centre.
5. The line follows the real route (it runs through Mandara, Horombo, Kibo Hut, then up to Gilman's and along the rim to Uhuru). The Day 3 chapter holds at Horombo with a dashed side trip to Zebra Rocks.
6. Hut labels appear as the tip reaches each hut and disappear when scrolling back past them.
7. Each chapter card appears inside its window and nowhere else; photos pop in sequentially inside the chapter and vanish in reverse on scroll-up; cards never cover the screen centre.
8. SUMMIT DAY headline appears when the line reaches Uhuru Peak; the Day 6 panel and the "Book a climb" button appear at the very end; the button opens a mail client.
9. Progress bar and altitude readout track the scroll; the altitude reads ≈ 1 860 m at the gate and ≈ 5 900 m at the summit.
10. Dragging, wheel-with-modifier, double-click, pinch and keyboard over the map change nothing except page scroll. No map controls other than attribution are present.
11. Scrolling the whole page to the end and back to the top leaves the page exactly as it was on load.
12. Attribution for Esri, Mapterhorn and OpenStreetMap is visible at all times.
13. `npm run build` succeeds with no TypeScript errors.

## 9. Build order (run it in the browser after every step)

1. Create the project folder, scaffold Vite + TS in it, install `maplibre-gl@6.15.0`, extract the two data files from the appendices (§2), add fonts and the `#stars / #map / #ui / #track` skeleton.
2. `map.ts` + `camera.ts` + `route.ts` + `scroll.ts`: reproduce the prototype (Appendix A) with the §5.3 windows and §5.6 keyframes. Check items 1–5 of §8.
3. `content.ts` + `ui.ts`: cards, photos, hero, Day 6 panel, CTA, from §6. Check item 7–8.
4. Hut markers, hiker dot, side trips, progress bar, altitude readout. Check items 6 and 9.
5. Visual polish per §7 (tokens, starfield, SUMMIT DAY moment, vignette).
6. Tuning pass: adjust only zoom/pitch/bearing of the §5.6 keyframes so the mountain stays well framed and cards never collide with the route tip; write the final values back to `content.ts`.
7. Final run of the full §8 checklist, including `npm run build`.

## 10. Known risks and mitigations

- **Blurry tiles during a fast scrub**: raster tiles load asynchronously. Scroll the page once end to end before presenting so the browser cache is warm. Keep keyframe zoom ≤ 14.6.
- **Globe → Mercator switch around zoom 11–12** happens during chapter 3. Keep pitch ≤ 60 until zoom ≥ 12 (the §5.6 keyframes already do).
- **Free tile servers can be down.** Keep the AWS terrain fallback (§3) behind a constant. If Esri imagery fails, `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg` (Sentinel-2 cloudless, lower resolution, attribution `Sentinel-2 cloudless by EOX IT Services GmbH`) is a drop-in replacement.
- **Marker drift with terrain**: HTML markers are re-projected by MapLibre each frame; if they visibly lag the line tip, update the hiker marker's `setLngLat` inside the same frame callback after `jumpTo`.
- **Licensing**: private local demo. Before any public or commercial use, revisit imagery licensing.

## 11. Out of scope

Mobile/touch, hover interactions, other pages, booking backend, real photos, i18n, SEO, hosting,
analytics, accessibility beyond keyboard scrolling, descent line on the map.

## 12. Sources used while planning

- MapLibre GL JS docs and examples: https://maplibre.org/maplibre-gl-js/docs/examples/
- Mapterhorn terrain tiles: https://mapterhorn.com/
- Esri World Imagery terms as summarised on the OSM wiki: https://wiki.openstreetmap.org/wiki/Esri
- AWS Terrain Tiles (fallback): https://registry.opendata.aws/terrain-tiles
- Marangu route itinerary reference: https://followalice.com/knowledge/marangu-route
- Route and waypoint geometry: OpenStreetMap relation 8737292 and the nodes listed in Appendix B.

---

## Appendix A — prototype (single HTML file, verbatim, working)

This file proves the entire mechanic with the final windows and keyframes. Port its logic into the
module layout of §4; do not ship the debug buttons or the HUD. To run it as-is for reference, save it
as `prototype/index.html`, extract Appendix C to `data/route-marangu.geojson` next to that folder
(it fetches `../data/route-marangu.geojson`), serve the parent folder with any static server
(`python3 -m http.server 8765`) and open `http://localhost:8765/prototype/index.html`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Matours prototype</title>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.css">
<style>
  html,body{margin:0;background:#020308;font-family:system-ui,sans-serif;color:#fff}
  #map{position:fixed;inset:0;background:#020308;pointer-events:none}
  #scroller{position:relative;height:1600vh;pointer-events:none}
  #hud{position:fixed;left:16px;bottom:16px;background:rgba(0,0,0,.55);padding:10px 14px;border-radius:8px;font-size:13px;z-index:5}
  #title{position:fixed;left:40px;top:40px;font-size:40px;font-weight:700;text-shadow:0 2px 12px #000;z-index:5;pointer-events:none}
  #bar{position:fixed;right:16px;top:16px;z-index:5;display:flex;gap:6px;flex-wrap:wrap;max-width:420px;justify-content:flex-end}
  #bar button{font:12px system-ui;padding:6px 8px;border:0;border-radius:6px;background:#8bc34a;color:#000;cursor:pointer}
</style>
</head>
<body>
<div id="map"></div>
<div id="title">Welcome to your new adventure</div>
<div id="bar"></div>
<div id="hud">scroll to scrub · progress <span id="p">0</span>% · zoom <span id="z"></span> · pitch <span id="pt"></span></div>
<div id="scroller"></div>
<script type="module">
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs';

const UHURU=[37.3539987,-3.0764084];
const map = new maplibregl.Map({
  container:'map', interactive:false, center:[25,8], zoom:1.6, pitch:0, bearing:0,
  maxPitch:85, maxZoom:17, attributionControl:{compact:false},
  style:{
    version:8,
    projection:{type:'globe'},
    sources:{
      sat:{type:'raster',tileSize:256,maxzoom:18,
        tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'},
      dem:{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json'},
      route:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
      full:{type:'geojson',data:'../data/route-marangu.geojson'}
    },
    layers:[
      {id:'sat',type:'raster',source:'sat'},
      {id:'full',type:'line',source:'full',paint:{'line-color':'#8bc34a','line-width':2,'line-opacity':0.25}},
      {id:'route',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8bc34a','line-width':5}}
    ],
    terrain:{source:'dem',exaggeration:1.15},
    sky:{'atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,5,1,7,0],
         'sky-color':'#88b7ff','horizon-color':'#dfe9ff','fog-color':'#dfe9ff','sky-horizon-blend':0.6,'horizon-fog-blend':0.4,'fog-ground-blend':0.6}
  }
});

// Final chapter windows (must match PLAN.md §6):
// 0 hero 0-.07 | 1 rift .07-.16 | 2 volcano .16-.25 | 3 five worlds .25-.34 | 4 trip overview .34-.40
// 5 day1 .40-.50 | 6 day2 .50-.62 | 7 day3 .62-.70 | 8 day4 .70-.80 | 9 day5 summit .80-.96 | 10 day6+CTA .96-1
const GATE=[37.5176549,-3.2436469];
const ROUTE_START=0.40;
// camera keyframes: [progress, center, zoom, pitch, bearing]. From ROUTE_START on, center is replaced by the line tip.
const KEY=[
  [0.00,[25,8],1.6,0,0],
  [0.12,[37.35,-3.07],4.5,0,0],
  [0.22,[37.35,-3.07],8.6,0,0],
  [0.30,[37.42,-3.14],10.2,55,-35],
  [ROUTE_START,GATE,12.4,60,-20], // camera arrives exactly at the gate
  [0.50,GATE,12.9,62,-30],   // end of day 1 (Mandara)
  [0.62,GATE,12.7,62,-50],   // end of day 2 (Horombo)
  [0.70,GATE,13.2,65,-45],   // day 3 hold at Horombo
  [0.80,GATE,12.9,65,-60],   // end of day 4 (Kibo Hut)
  [0.92,GATE,13.6,68,-80],   // Gilman's Point
  [0.96,GATE,14.6,70,-120],  // Uhuru Peak
  [1.00,GATE,14.6,70,-105]   // slow orbit while the CTA shows
];
// scroll window -> fraction of the route line, piecewise per day (fractions measured once the route loads)
const HUTS=[[37.5176549,-3.2436469],[37.5133562,-3.1816771],[37.4392595,-3.1400138],[37.3894245,-3.0817675],[37.3539987,-3.0764084]]; // gate, mandara, horombo, kibo, uhuru
let HF=[0,0.235,0.580,0.855,1];
const SEG=[[0.40,0.50,0,1],[0.50,0.62,1,2],[0.62,0.70,2,2],[0.70,0.80,2,3],[0.80,0.96,3,4]]; // [pStart,pEnd,hutFrom,hutTo]
function routeFraction(p){
  if(p<=SEG[0][0]) return 0;
  for(const [a,b,h0,h1] of SEG){ if(p<=b){ const t=(p-a)/(b-a); return lerp(HF[h0],HF[h1],t); } }
  return 1;
}
const lerp=(a,b,t)=>a+(b-a)*t;
function cam(p){
  let i=0; while(i<KEY.length-2 && p>KEY[i+1][0]) i++;
  const a=KEY[i], b=KEY[i+1], t=Math.min(1,Math.max(0,(p-a[0])/(b[0]-a[0])));
  const e=t*t*(3-2*t);
  return {center:[lerp(a[1][0],b[1][0],e),lerp(a[1][1],b[1][1],e)],zoom:lerp(a[2],b[2],e),pitch:lerp(a[3],b[3],e),bearing:lerp(a[4],b[4],e)};
}

// route scrub: line is drawn between ROUTE_START (gate) and 0.96 (summit)
let coords=[], cum=[0];
fetch('../data/route-marangu.geojson').then(r=>r.json()).then(gj=>{
  coords=gj.features[0].geometry.coordinates;
  for(let i=1;i<coords.length;i++){const [x1,y1]=coords[i-1],[x2,y2]=coords[i];cum.push(cum[i-1]+Math.hypot((x2-x1)*Math.cos(-3.1*Math.PI/180),y2-y1));}
  const total=cum[cum.length-1];
  HF=HUTS.map(h=>{let bi=0,bd=1e9;coords.forEach((c,i)=>{const d=Math.hypot(c[0]-h[0],c[1]-h[1]);if(d<bd){bd=d;bi=i;}});return cum[bi]/total;});
  console.log('hut fractions',HF.map(f=>f.toFixed(3)).join(' '));
  render();
});
function slice(f){
  if(!coords.length) return [];
  const target=f*cum[cum.length-1]; const out=[];
  for(let i=0;i<coords.length;i++){ if(cum[i]<=target) out.push(coords[i]); else { // interpolate last point
      const [x1,y1]=coords[i-1],[x2,y2]=coords[i]; const t=(target-cum[i-1])/(cum[i]-cum[i-1]); out.push([lerp(x1,x2,t),lerp(y1,y2,t)]); break; } }
  return out;
}
function render(){
  const range=document.documentElement.scrollHeight-innerHeight; const p=range>0?Math.min(1,window.scrollY/range):0;
  const c=cam(p); if(!isFinite(c.center[0])||!isFinite(c.zoom)) return;
  const f=routeFraction(p);
  const line=slice(f);
  if(p>=ROUTE_START && line.length) c.center=line[line.length-1];   // camera follows the tip of the drawn line
  map.jumpTo(c);
  map.getSource('route')?.setData({type:'FeatureCollection',features:line.length>1?[{type:'Feature',geometry:{type:'LineString',coordinates:line}}]:[]});
  document.getElementById('p').textContent=(p*100).toFixed(0);
  document.getElementById('z').textContent=c.zoom.toFixed(1); document.getElementById('pt').textContent=c.pitch.toFixed(0);
  document.getElementById('title').style.opacity=Math.max(0,1-p*8);
}
let ticking=false;
addEventListener('scroll',()=>{ if(!ticking){ requestAnimationFrame(()=>{render();ticking=false;}); ticking=true; }});
window.__map=map; window.__render=render; // debug hooks
map.on('load',()=>{ console.log('map load'); render();
  // debug buttons that jump the page scroll to each keyframe
  const bar=document.getElementById('bar');
  KEY.forEach((k,i)=>{const b=document.createElement('button');b.textContent='K'+i;b.onclick=()=>scrollTo(0,k[0]*(document.documentElement.scrollHeight-innerHeight));bar.appendChild(b);});
  window.__map=map;
});
map.on('error',e=>console.error('map error',e.error?.message||e));
</script>
</body>
</html>
```

## Appendix B — public/data/waypoints.json

```json waypoints.json
{
  "_source": "OpenStreetMap node coordinates (ODbL). Elevations in metres from OSM tags where present, otherwise commonly published values.",
  "waypoints": [
    {"id": "gate",     "name": "Marangu Gate",   "lon": 37.5176549, "lat": -3.2436469, "ele": 1860, "day": 1, "osm": "node/2142573962"},
    {"id": "mandara",  "name": "Mandara Huts",   "lon": 37.5133562, "lat": -3.1816771, "ele": 2720, "day": 1, "osm": "node/2459235292"},
    {"id": "maundi",   "name": "Maundi Crater",  "lon": 37.5193272, "lat": -3.1769259, "ele": 2772, "day": 1, "osm": "node/652426578", "side_trip": true},
    {"id": "horombo",  "name": "Horombo Huts",   "lon": 37.4392595, "lat": -3.1400138, "ele": 3720, "day": 2, "osm": "node/2125844166"},
    {"id": "zebra",    "name": "Zebra Rocks",    "lon": 37.4333444, "lat": -3.1227795, "ele": 4042, "day": 3, "osm": "node/652426716", "side_trip": true},
    {"id": "kibo",     "name": "Kibo Hut",       "lon": 37.3894245, "lat": -3.0817675, "ele": 4720, "day": 4, "osm": "node/11921028630"},
    {"id": "gilmans",  "name": "Gilman's Point", "lon": 37.3683329, "lat": -3.0744490, "ele": 5685, "day": 5, "osm": "node/652427765"},
    {"id": "stella",   "name": "Stella Point",   "lon": 37.3626212, "lat": -3.0782335, "ele": 5744, "day": 5, "osm": "node/1925292955"},
    {"id": "uhuru",    "name": "Uhuru Peak",     "lon": 37.3539987, "lat": -3.0764084, "ele": 5895, "day": 5, "osm": "node/32059197"}
  ]
}
```

## Appendix C — public/data/route-marangu.geojson

Real Marangu Route ascent line from OpenStreetMap (relation 8737292, © OpenStreetMap contributors,
ODbL), simplified with Douglas–Peucker at 5 m tolerance. Coordinates are `[lon, lat]`, six per row.

```json route-marangu.geojson
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "properties": {"name": "Marangu Route (ascent)", "source": "OpenStreetMap relation 8737292, ODbL; simplified to 5 m tolerance", "length_km": 33.7},
    "geometry": {"type": "LineString", "coordinates": [
      [37.517655,-3.243647],[37.51772,-3.24249],[37.51764,-3.2423],[37.51723,-3.24191],[37.51735,-3.24131],[37.51723,-3.24023],
      [37.51706,-3.2397],[37.51688,-3.23948],[37.51684,-3.23914],[37.51685,-3.23895],[37.51704,-3.23855],[37.51707,-3.23761],
      [37.51741,-3.23692],[37.51735,-3.23637],[37.51758,-3.2359],[37.51801,-3.23425],[37.51798,-3.2328],[37.51804,-3.23187],
      [37.51798,-3.23102],[37.51822,-3.23051],[37.51823,-3.23034],[37.51813,-3.22969],[37.51782,-3.22914],[37.5177,-3.22765],
      [37.51728,-3.22669],[37.51725,-3.22622],[37.51732,-3.22571],[37.51702,-3.22511],[37.51697,-3.22457],[37.51646,-3.22356],
      [37.51633,-3.2231],[37.51648,-3.22232],[37.51703,-3.22131],[37.51712,-3.22072],[37.51671,-3.21953],[37.51669,-3.21923],
      [37.51684,-3.21885],[37.51684,-3.21857],[37.51675,-3.21789],[37.51655,-3.21729],[37.51689,-3.21645],[37.51701,-3.21582],
      [37.51721,-3.21552],[37.51709,-3.215],[37.51725,-3.2146],[37.51727,-3.21415],[37.5176,-3.2137],[37.51765,-3.21313],
      [37.51787,-3.21273],[37.51794,-3.21265],[37.51828,-3.21261],[37.51858,-3.21249],[37.51882,-3.21199],[37.51958,-3.21152],
      [37.51976,-3.21128],[37.52,-3.21072],[37.52018,-3.21056],[37.52048,-3.21],[37.52087,-3.20992],[37.52108,-3.20968],
      [37.52131,-3.20967],[37.52101,-3.2096],[37.52052,-3.20873],[37.52003,-3.20818],[37.51992,-3.2079],[37.51993,-3.20753],
      [37.5197,-3.20724],[37.51951,-3.20624],[37.51932,-3.206],[37.51909,-3.20549],[37.51897,-3.20538],[37.51861,-3.20525],
      [37.51832,-3.20496],[37.51826,-3.20468],[37.51792,-3.20412],[37.51789,-3.20275],[37.51757,-3.20214],[37.51739,-3.20152],
      [37.5167,-3.20056],[37.51653,-3.20002],[37.51615,-3.1997],[37.51611,-3.19956],[37.51621,-3.19921],[37.5157,-3.19925],
      [37.51545,-3.19911],[37.51531,-3.19823],[37.51483,-3.19789],[37.5147,-3.19726],[37.51434,-3.19681],[37.51427,-3.19641],
      [37.51405,-3.1962],[37.51383,-3.19554],[37.51408,-3.19473],[37.51421,-3.19453],[37.51431,-3.19444],[37.51467,-3.19438],
      [37.51521,-3.19387],[37.51524,-3.19331],[37.51543,-3.193],[37.51549,-3.19237],[37.51568,-3.19225],[37.51577,-3.19206],
      [37.51575,-3.19162],[37.51588,-3.19141],[37.51629,-3.19129],[37.51647,-3.19081],[37.51621,-3.19007],[37.51597,-3.1878],
      [37.51548,-3.18762],[37.51495,-3.18719],[37.51475,-3.18692],[37.51429,-3.18658],[37.51391,-3.18601],[37.51347,-3.18423],
      [37.51362,-3.18388],[37.51364,-3.18345],[37.51384,-3.18304],[37.5139,-3.18246],[37.51388,-3.18237],[37.51369,-3.18229],
      [37.51346,-3.18194],[37.51338,-3.18161],[37.51339,-3.18102],[37.51371,-3.18058],[37.51402,-3.18049],[37.5143,-3.18028],
      [37.51472,-3.18012],[37.51608,-3.1799],[37.51634,-3.17976],[37.5166,-3.17946],[37.51709,-3.17839],[37.51712,-3.17811],
      [37.51701,-3.17779],[37.51652,-3.17717],[37.51637,-3.1765],[37.51519,-3.17617],[37.51498,-3.17624],[37.51471,-3.1762],
      [37.51395,-3.17653],[37.51315,-3.17733],[37.51301,-3.17738],[37.51252,-3.17725],[37.51221,-3.17698],[37.51198,-3.17689],
      [37.51124,-3.17695],[37.51074,-3.1768],[37.51042,-3.17684],[37.50994,-3.1767],[37.50953,-3.17684],[37.50918,-3.17672],
      [37.50814,-3.17601],[37.508,-3.17571],[37.50793,-3.1753],[37.50744,-3.17475],[37.50702,-3.17398],[37.50669,-3.17367],
      [37.50657,-3.17331],[37.50655,-3.17265],[37.50592,-3.1717],[37.50554,-3.1714],[37.50517,-3.17135],[37.50415,-3.17103],
      [37.50301,-3.17098],[37.50141,-3.17034],[37.50097,-3.16978],[37.50096,-3.16951],[37.50122,-3.16922],[37.50113,-3.16895],
      [37.50049,-3.16805],[37.50004,-3.16778],[37.49977,-3.16749],[37.49961,-3.16695],[37.49879,-3.16605],[37.49754,-3.16529],
      [37.49726,-3.16501],[37.49664,-3.1646],[37.49581,-3.16383],[37.49458,-3.16298],[37.49427,-3.16266],[37.49387,-3.16259],
      [37.49295,-3.16217],[37.49232,-3.16163],[37.49134,-3.16098],[37.49105,-3.16066],[37.4907,-3.15991],[37.49064,-3.15956],
      [37.49006,-3.15909],[37.48961,-3.15903],[37.48944,-3.15891],[37.48916,-3.15851],[37.48866,-3.15805],[37.48846,-3.15737],
      [37.48824,-3.15744],[37.48808,-3.15758],[37.48788,-3.15758],[37.4877,-3.15748],[37.48716,-3.15698],[37.4867,-3.1563],
      [37.48539,-3.15504],[37.48481,-3.15458],[37.48429,-3.15396],[37.48391,-3.15364],[37.48286,-3.15325],[37.48224,-3.15274],
      [37.48152,-3.15241],[37.47993,-3.15187],[37.47909,-3.15178],[37.47865,-3.15182],[37.47806,-3.15169],[37.47737,-3.15167],
      [37.47667,-3.15152],[37.47573,-3.15148],[37.47559,-3.15133],[37.47534,-3.15071],[37.47519,-3.14988],[37.47501,-3.14958],
      [37.47496,-3.14932],[37.47464,-3.14906],[37.47436,-3.14836],[37.47403,-3.14806],[37.47355,-3.14797],[37.4732,-3.14764],
      [37.47282,-3.14751],[37.47208,-3.14707],[37.47119,-3.14623],[37.4707,-3.14604],[37.4693,-3.14592],[37.46883,-3.14556],
      [37.46827,-3.14493],[37.46774,-3.1445],[37.46709,-3.1442],[37.46682,-3.14399],[37.46625,-3.14392],[37.46527,-3.14395],
      [37.46479,-3.14385],[37.46407,-3.14395],[37.46386,-3.14386],[37.46378,-3.1437],[37.46369,-3.14366],[37.46336,-3.14377],
      [37.46331,-3.14356],[37.46349,-3.14319],[37.4635,-3.14285],[37.46292,-3.14261],[37.46267,-3.14237],[37.46241,-3.14187],
      [37.46184,-3.14142],[37.46154,-3.14154],[37.46123,-3.14193],[37.46052,-3.14214],[37.45956,-3.14206],[37.45893,-3.14182],
      [37.45785,-3.14177],[37.45647,-3.14128],[37.45596,-3.14128],[37.45531,-3.14114],[37.45482,-3.14085],[37.45461,-3.14084],
      [37.45418,-3.14106],[37.45386,-3.1408],[37.45276,-3.14072],[37.45102,-3.1401],[37.44983,-3.13985],[37.4476,-3.13884],
      [37.44712,-3.13869],[37.4467,-3.13865],[37.44641,-3.13816],[37.44579,-3.1384],[37.44525,-3.13844],[37.44457,-3.13837],
      [37.44358,-3.13863],[37.44295,-3.13896],[37.44264,-3.13922],[37.44196,-3.13929],[37.44154,-3.13945],[37.44106,-3.13995],
      [37.44025,-3.13971],[37.43953,-3.13974],[37.43939,-3.13985],[37.43903,-3.13975],[37.43843,-3.1388],[37.4376,-3.13822],
      [37.4372,-3.13761],[37.4369,-3.13731],[37.43642,-3.1374],[37.43618,-3.13715],[37.43584,-3.13695],[37.43544,-3.13622],
      [37.43518,-3.13596],[37.43489,-3.1353],[37.43404,-3.13441],[37.43327,-3.13307],[37.43277,-3.13267],[37.43267,-3.13245],
      [37.43135,-3.13114],[37.43047,-3.1307],[37.42983,-3.12989],[37.42924,-3.12937],[37.42907,-3.12869],[37.42874,-3.12825],
      [37.42869,-3.12791],[37.42824,-3.1273],[37.4281,-3.1268],[37.428,-3.12623],[37.42818,-3.12598],[37.42821,-3.12579],
      [37.42805,-3.12533],[37.42802,-3.12388],[37.42794,-3.12342],[37.42733,-3.12234],[37.42715,-3.12184],[37.42675,-3.12143],
      [37.42639,-3.12028],[37.42606,-3.11961],[37.42522,-3.11856],[37.42487,-3.11799],[37.42464,-3.11783],[37.42422,-3.11784],
      [37.42383,-3.11713],[37.42333,-3.11659],[37.42273,-3.11568],[37.42142,-3.11447],[37.42025,-3.11246],[37.4201,-3.11207],
      [37.4199,-3.1119],[37.41967,-3.1114],[37.41866,-3.11007],[37.41439,-3.10618],[37.41383,-3.10563],[37.41257,-3.10394],
      [37.4117,-3.10325],[37.41102,-3.10282],[37.41053,-3.1024],[37.40947,-3.10116],[37.40902,-3.10021],[37.40887,-3.09939],
      [37.40896,-3.09823],[37.40931,-3.0966],[37.40925,-3.09576],[37.40906,-3.095],[37.40801,-3.09216],[37.40691,-3.08962],
      [37.40578,-3.08829],[37.40421,-3.08604],[37.40295,-3.08478],[37.40234,-3.08431],[37.40142,-3.08405],[37.39959,-3.08372],
      [37.39908,-3.08358],[37.3986,-3.08333],[37.39788,-3.08316],[37.39762,-3.08318],[37.39746,-3.08309],[37.39697,-3.08303],
      [37.39625,-3.08279],[37.39595,-3.08256],[37.39485,-3.08204],[37.39458,-3.08179],[37.39424,-3.08126],[37.39395,-3.08112],
      [37.39196,-3.08115],[37.39115,-3.08135],[37.39044,-3.08138],[37.39002,-3.08147],[37.38952,-3.08171],[37.38868,-3.08171],
      [37.38796,-3.08125],[37.38775,-3.08092],[37.38768,-3.08065],[37.38745,-3.08047],[37.38718,-3.08046],[37.38594,-3.07994],
      [37.38526,-3.07975],[37.38453,-3.07922],[37.38455,-3.07909],[37.38437,-3.07904],[37.38421,-3.0789],[37.38408,-3.0789],
      [37.38405,-3.07875],[37.38391,-3.07873],[37.38361,-3.07844],[37.38331,-3.07832],[37.38311,-3.07836],[37.38301,-3.07827],
      [37.38247,-3.07817],[37.38137,-3.07831],[37.38052,-3.07805],[37.38016,-3.07812],[37.38005,-3.07822],[37.37895,-3.07835],
      [37.37894,-3.07863],[37.37885,-3.07864],[37.37824,-3.07843],[37.37797,-3.07847],[37.37721,-3.07811],[37.37686,-3.07813],
      [37.37631,-3.07799],[37.3761,-3.078],[37.37593,-3.0778],[37.37564,-3.07769],[37.37557,-3.07758],[37.37543,-3.07761],
      [37.37535,-3.07743],[37.37521,-3.07743],[37.37497,-3.07711],[37.37495,-3.07695],[37.37473,-3.07684],[37.3744,-3.07646],
      [37.37418,-3.07654],[37.3741,-3.07641],[37.37401,-3.07645],[37.37384,-3.07636],[37.37365,-3.07596],[37.37342,-3.07609],
      [37.37334,-3.07605],[37.37322,-3.07618],[37.37308,-3.07605],[37.37301,-3.07613],[37.37293,-3.07602],[37.37283,-3.07611],
      [37.37271,-3.07577],[37.37242,-3.076],[37.37235,-3.07582],[37.37225,-3.07588],[37.3722,-3.07581],[37.37207,-3.07594],
      [37.37192,-3.07572],[37.37178,-3.07579],[37.37172,-3.07567],[37.37163,-3.07571],[37.37158,-3.07547],[37.37137,-3.07564],
      [37.3712,-3.07532],[37.37108,-3.07543],[37.37094,-3.07532],[37.37072,-3.07553],[37.37047,-3.07531],[37.37028,-3.0754],
      [37.37024,-3.07533],[37.37011,-3.07532],[37.3697,-3.0754],[37.36939,-3.07509],[37.36928,-3.07512],[37.3692,-3.07475],
      [37.36907,-3.0748],[37.36906,-3.07467],[37.36891,-3.07472],[37.36889,-3.07464],[37.36875,-3.07466],[37.36873,-3.0746],
      [37.36846,-3.07463],[37.36826,-3.07445],[37.36669,-3.07549],[37.36598,-3.07621],[37.3655,-3.07626],[37.36529,-3.07637],
      [37.36521,-3.07666],[37.36496,-3.07687],[37.36444,-3.07704],[37.36407,-3.07748],[37.36333,-3.07776],[37.3631,-3.07777],
      [37.36231,-3.07837],[37.36158,-3.07906],[37.35974,-3.07948],[37.35881,-3.07948],[37.35741,-3.07894],[37.35707,-3.07861],
      [37.35673,-3.0785],[37.35668,-3.07834],[37.35645,-3.07817],[37.35606,-3.07809],[37.35513,-3.07752],[37.3547,-3.07706],
      [37.3545,-3.07674],[37.353999,-3.076408]
    ]}
  }]
}
```

## Appendix D — how the route was built (optional, for regeneration only)

Not needed to build the site. Overpass API query (POST the `data` field to
`https://overpass-api.de/api/interpreter`; send a descriptive `User-Agent`, the server rejects
requests without one, and retry with back-off on 429/502):

```
[out:json][timeout:90];
relation(8737292);
out geom;
```

The relation's member ways are unordered; the script below chains them from the way end nearest
Marangu Gate towards Uhuru Peak and writes a single `LineString` (full resolution, ~2,240 points).

```python
import json, math, sys
d = json.load(open(sys.argv[1]))
rel = [e for e in d['elements'] if e['type']=='relation'][0]
ways = [m for m in rel['members'] if m['type']=='way' and m.get('geometry')]
print('ways in relation:', len(ways), 'tags:', rel.get('tags'))
GATE = (37.5176549, -3.2436469); PEAK = (37.3539987, -3.0764084)
def dist(a,b): return math.hypot((a[0]-b[0])*math.cos(math.radians(-3.1)), a[1]-b[1])
def pts(w): return [(g['lon'], g['lat']) for g in w['geometry']]
segs = [pts(w) for w in ways]
# start: segment endpoint nearest the gate
best = min(((dist(s[0],GATE),i,False),(dist(s[-1],GATE),i,True)) for i,s in enumerate(segs))
_,i,rev = min(best)
line = segs[i][::-1] if rev else segs[i]; used={i}
while True:
    end = line[-1]; cands=[]
    for j,s in enumerate(segs):
        if j in used: continue
        if dist(s[0],end) < 2e-4: cands.append((dist(s[-1],PEAK), j, False))
        elif dist(s[-1],end) < 2e-4: cands.append((dist(s[0],PEAK), j, True))
    if not cands: break
    _,j,rev = min(cands)
    s = segs[j][::-1] if rev else segs[j]
    line += s[1:]; used.add(j)
print('used', len(used), 'of', len(segs), '| points', len(line))
print('start', line[0], 'dist to gate km', round(dist(line[0],GATE)*111,2))
print('end  ', line[-1], 'dist to peak km', round(dist(line[-1],PEAK)*111,2))
unused = [j for j in range(len(segs)) if j not in used]
for j in unused: print('  unused seg', j, 'pts', len(segs[j]), 'from', segs[j][0], 'to', segs[j][-1])
# length
L=0
for a,b in zip(line, line[1:]): L+=dist(a,b)*111
print('length km', round(L,1))
gj = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"name":"Marangu Route (ascent)","source":"OpenStreetMap relation 8737292, ODbL","length_km":round(L,1)},"geometry":{"type":"LineString","coordinates":[[round(x,6),round(y,6)] for x,y in line]}}]}
json.dump(gj, open('route-marangu-full.geojson','w'))
```

Waypoint coordinates came from these OpenStreetMap nodes: gate 2142573962, Mandara 2459235292, Maundi
Crater 652426578, Horombo 2125844166, Zebra Rocks 652426716, Kibo Hut 11921028630, Gilman's Point
652427765, Stella Point 1925292955, Uhuru Peak 32059197.
