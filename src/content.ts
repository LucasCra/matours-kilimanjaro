// Single source of truth for the page: chapter windows, copy, photos, camera keyframes,
// route mapping and side trips. All windows are in scroll progress p ∈ [0, 1].

export type LonLat = [number, number];

export interface Waypoint {
  id: string;
  name: string;
  lon: number;
  lat: number;
  ele: number;
  day: number;
  side_trip?: boolean;
}

export async function loadWaypoints(url = '/data/waypoints.json'): Promise<Waypoint[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`waypoints: HTTP ${res.status}`);
  return (await res.json()).waypoints as Waypoint[];
}

export const GATE: LonLat = [37.5176549, -3.2436469];

export const ROUTE_START = 0.4;
export const ROUTE_END = 0.96;

// [pStart, pEnd, hut at pStart, hut at pEnd]: the drawn line goes from one hut to the next.
export const SEGMENTS: [number, number, string, string][] = [
  [0.4, 0.5, 'gate', 'mandara'],
  [0.5, 0.62, 'mandara', 'horombo'],
  [0.62, 0.7, 'horombo', 'horombo'],
  [0.7, 0.8, 'horombo', 'kibo'],
  [0.8, 0.96, 'kibo', 'uhuru'],
];

// Dashed out-and-back side trips: drawn from `from` to `to` during [start, end], held until `hold`.
export const SIDE_TRIPS = [
  { from: 'mandara', to: 'maundi', start: 0.47, end: 0.5, hold: 0.5 },
  { from: 'horombo', to: 'zebra', start: 0.62, end: 0.66, hold: 0.7 },
];

// Waypoints that get a label on the map once the line tip reaches them.
export const MARKED_HUTS = ['gate', 'mandara', 'horombo', 'kibo', 'gilmans', 'uhuru'];

// Waypoints used for the altitude fallback (interpolated by route fraction).
export const ALTITUDE_PROFILE = ['gate', 'mandara', 'horombo', 'kibo', 'gilmans', 'uhuru'];

// Camera keyframes: [p, center, zoom, pitch, bearing]. From ROUTE_START on the center is
// `null` because the camera is centred on the tip of the drawn line instead.
export type Keyframe = [number, LonLat | null, number, number, number];
export const KEYFRAMES: Keyframe[] = [
  [0.0, [25.0, 8.0], 1.6, 0, 0], // Earth from space, Africa centred
  [0.12, [37.35, -3.07], 4.5, 0, 0], // East Africa
  [0.22, [37.35, -3.07], 8.6, 0, 0], // Kilimanjaro from above
  [0.3, [37.42, -3.14], 10.2, 55, -35], // tilt into 3D
  [0.4, GATE, 12.4, 60, -20], // exactly at Marangu Gate
  [0.5, null, 12.9, 62, -30], // Mandara
  [0.62, null, 12.7, 62, -50], // Horombo
  [0.7, null, 13.2, 65, -45], // Day 3 hold
  [0.8, null, 12.9, 65, -60], // Kibo Hut
  [0.92, null, 13.6, 68, -80], // Gilman's Point
  [0.96, null, 14.6, 70, -120], // Uhuru Peak
  [1.0, null, 14.6, 70, -105], // slow orbit while the CTA shows
];

export interface Photo {
  seed: string;
  caption: string;
  at: number;
}

export const photoUrl = (seed: string) => `https://picsum.photos/seed/${seed}/900/600`;

export interface Chapter {
  id: string;
  from: number;
  to: number;
  side: 'left' | 'right';
  wide?: boolean;
  eyebrow: string;
  title: string;
  stats?: string;
  body: string;
  facts?: string[];
  zones?: string[];
  details?: [string, string][];
  photos?: Photo[];
}

export const HERO = {
  fadeOut: [0.04, 0.07] as const,
  eyebrow: 'MATOURS PRESENTS',
  title: 'Welcome to your new adventure',
  subtitle: 'Kilimanjaro, Tanzania · 6 days to the roof of Africa',
  hint: 'Scroll to begin',
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'rift',
    from: 0.07,
    to: 0.16,
    side: 'left',
    eyebrow: 'WHERE WE ARE GOING',
    title: 'A mountain born of a continent tearing apart',
    body: 'Kilimanjaro rises alone from the plains of northern Tanzania, only 330 km south of the equator. It was built by the same forces that are slowly splitting East Africa along the Great Rift Valley, where magma found its way up through a fractured crust.',
    facts: [
      'Highest free-standing mountain on Earth. No range around it, just savanna and then 5,895 metres of volcano.',
    ],
  },
  {
    id: 'volcano',
    from: 0.16,
    to: 0.25,
    side: 'right',
    eyebrow: 'GEOLOGY',
    title: 'Three volcanoes, one mountain',
    body: 'Kilimanjaro is three volcanic cones fused together. Shira in the west collapsed long ago into a high plateau. Mawenzi in the east is a jagged ruin of 5,149 m. Kibo in the middle is the youngest and tallest, dormant rather than extinct: it last erupted around 150,000 to 200,000 years ago and still breathes sulphur in its crater.',
    facts: [
      '"Uhuru" means freedom in Swahili. The summit was renamed in 1961 when Tanganyika became independent.',
      "Kibo's glaciers have lost more than 80 % of their area since 1912.",
    ],
  },
  {
    id: 'worlds',
    from: 0.25,
    to: 0.34,
    side: 'left',
    eyebrow: 'NATURE',
    title: 'From the equator to the Arctic in five days',
    body: 'Every thousand metres you climb, the world changes. Farms and coffee give way to dripping rainforest, then to moorland of giant groundsels and lobelias, then to a lunar alpine desert, and finally to ice and rock at the summit.',
    zones: [
      'Cultivation 800–1,800 m',
      'Montane rainforest 1,800–2,800 m',
      'Heath & moorland 2,800–4,000 m',
      'Alpine desert 4,000–5,000 m',
      'Arctic summit 5,000 m+',
    ],
    photos: [
      { seed: 'kili-rainforest', caption: 'Montane rainforest, day 1', at: 0.24 },
      { seed: 'kili-groundsel', caption: 'Giant groundsels in the moorland', at: 0.27 },
      { seed: 'kili-glacier', caption: 'Summit glaciers at dawn', at: 0.296 },
    ],
  },
  {
    id: 'trip',
    from: 0.34,
    to: 0.4,
    side: 'right',
    wide: true,
    eyebrow: 'THE TRIP',
    title: '6 days on the Marangu Route',
    body: 'Marangu is the classic line up the mountain and the only route where you sleep in huts instead of tents. We add a full acclimatization day at Horombo, which is the single biggest factor in reaching the summit.',
    details: [
      ['Departures', '14 Feb 2027 · 11 Sep 2027 · 9 Oct 2027'],
      ['Group size', '4–12 climbers, 1 guide per 3 climbers'],
      ['Difficulty', 'Moderate. No technical climbing; altitude is the challenge.'],
      [
        'Included',
        'Park fees, hut bookings, guides, porters, cook, all meals on the mountain, transfers from Moshi, emergency oxygen',
      ],
      ['Not included', 'Flights, visa, tips, personal gear'],
      ['Price', 'from USD 2,450 per person'],
    ],
  },
  {
    id: 'day1',
    from: 0.4,
    to: 0.5,
    side: 'left',
    eyebrow: 'DAY 1 · RAINFOREST',
    title: 'Into the forest',
    stats: '1,860 m → 2,720 m · 8 km · 4–5 h',
    body: 'After registration at Marangu Gate the trail dives straight into montane rainforest. Blue monkeys and black-and-white colobus watch from the canopy. Before dinner we take the 15-minute side path to Maundi Crater for the first clear view of Kibo.',
    photos: [
      { seed: 'kili-day1-forest', caption: 'The trail to Mandara', at: 0.41 },
      { seed: 'kili-colobus', caption: 'Colobus monkey, Marangu forest', at: 0.44 },
    ],
  },
  {
    id: 'day2',
    from: 0.5,
    to: 0.62,
    side: 'right',
    eyebrow: 'DAY 2 · MOORLAND',
    title: 'Above the trees',
    stats: '2,720 m → 3,720 m · 12 km · 5–7 h',
    body: "The forest thins within an hour and opens onto rolling heath. Giant groundsels stand like sentries along the path and Mawenzi's spires appear on the right. Horombo is the busiest hut on the mountain, a small village at 3,720 m.",
    photos: [
      { seed: 'kili-moorland', caption: 'Heath and moorland below Horombo', at: 0.51 },
      { seed: 'kili-horombo', caption: 'Horombo Huts', at: 0.56 },
    ],
  },
  {
    id: 'day3',
    from: 0.62,
    to: 0.7,
    side: 'left',
    eyebrow: 'DAY 3 · CLIMB HIGH, SLEEP LOW',
    title: 'A day that buys the summit',
    stats: '3,720 m → 4,042 m → 3,720 m · 7 km · 3–4 h',
    body: 'We walk up to Zebra Rocks, a striped lava wall at 4,042 m, and come back down to sleep at Horombo. It feels like a rest day. It is the most important day of the trip: this is where your blood learns to carry oxygen at altitude.',
    photos: [{ seed: 'kili-zebra-rocks', caption: 'Zebra Rocks', at: 0.63 }],
  },
  {
    id: 'day4',
    from: 0.7,
    to: 0.8,
    side: 'right',
    eyebrow: 'DAY 4 · ALPINE DESERT',
    title: 'Across the Saddle',
    stats: '3,720 m → 4,720 m · 10 km · 5–7 h',
    body: 'The last water point is at 4,130 m. Beyond it the Saddle opens up, a lunar plain between Mawenzi and Kibo where nothing grows. Kibo Hut sits at the foot of the final wall. Dinner is early and sleep comes at 18:00, because the night will be short.',
    photos: [{ seed: 'kili-saddle', caption: 'The Saddle, with Kibo ahead', at: 0.71 }],
  },
  {
    id: 'day5',
    from: 0.8,
    to: 0.96,
    side: 'left',
    eyebrow: 'DAY 5 · SUMMIT',
    title: 'Midnight to the roof of Africa',
    stats: '4,720 m → 5,895 m → 3,720 m · 6 km up, 20 km down · 12–15 h',
    body: "We wake at 23:00 and start at midnight by headlamp. Six hours of scree switchbacks lead to Gilman's Point (5,685 m) at sunrise. Then along the crater rim past Stella Point (5,744 m) to the sign at Uhuru Peak, 5,895 m. After photos, the long descent back to Horombo.",
    photos: [
      { seed: 'kili-sunrise-gilmans', caption: "Sunrise at Gilman's Point", at: 0.81 },
      { seed: 'kili-uhuru-sign', caption: 'Uhuru Peak, 5,895 m', at: 0.885 },
    ],
  },
];

export const SUMMIT = {
  fadeIn: [0.955, 0.965] as const,
  fadeOut: [0.975, 0.985] as const,
  title: 'SUMMIT DAY',
  sub: 'Uhuru Peak · 5,895 m · the highest point in Africa',
};

export const DAY6 = {
  fadeIn: [0.978, 0.99] as const,
  eyebrow: 'DAY 6 · HOME',
  title: 'Down through the five worlds',
  body: 'Horombo to Marangu Gate in a morning, back through moorland and forest. At the gate you receive your summit certificate, and we drive to Moshi for a shower, a cold drink and a very long sleep.',
  cta: 'Book a climb',
  href: 'mailto:hello@matours.example?subject=Kilimanjaro%20climb',
  footer:
    '© Matours · Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community · Terrain © Mapterhorn · Route data © OpenStreetMap contributors · Photos are placeholders',
};

// Progress bar ticks at the start of chapters 5–10.
export const DAY_TICKS: [number, string][] = [
  [0.4, 'Day 1'],
  [0.5, 'Day 2'],
  [0.62, 'Day 3'],
  [0.7, 'Day 4'],
  [0.8, 'Day 5'],
  [0.96, 'Day 6'],
];

export const STARS_FADE = [0.15, 0.22] as const;
