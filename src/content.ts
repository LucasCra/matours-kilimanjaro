// Single source of truth for the page: chapter windows, copy, photos, camera keyframes,
// the track timeline, markers and side trips. All windows are in scroll progress p ∈ [0, 1].
// Trip content follows the Karavaniers itinerary "Meru et les 3 sommets du Kilimandjaro".

export type LonLat = [number, number];

export interface Waypoint {
  id: string;
  name: string;
  lon: number;
  lat: number;
  ele: number | null;
  side_trip?: boolean;
}

export async function loadWaypoints(url = '/data/waypoints.json'): Promise<Waypoint[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`waypoints: HTTP ${res.status}`);
  return (await res.json()).waypoints as Waypoint[];
}

// Track timeline: [pStart, pEnd, leg id, stop at pStart, stop at pEnd]. Legs and stops come from
// public/data/track.geojson. Steps must follow the leg order of that file. Between two steps the
// line holds where the previous step ended. Before the first step nothing is drawn.
export type Step = [number, number, string, string, string];
export const TIMELINE: Step[] = [
  [0.232, 0.25, 'arrival', 'jro', 'arusha'], // days 1–2
  [0.258, 0.275, 'meru-in', 'arusha', 'momella'], // day 4 morning
  [0.275, 0.3, 'meru-up', 'momella', 'miriakamba'], // day 4
  [0.305, 0.325, 'meru-up', 'miriakamba', 'saddle'], // day 5
  [0.337, 0.357, 'meru-up', 'saddle', 'meru'], // day 6 up
  [0.37, 0.38, 'meru-down', 'meru', 'saddle'], // day 6 down
  [0.383, 0.402, 'meru-down', 'saddle', 'momella'], // day 7
  [0.408, 0.445, 'kili-in', 'momella', 'morum'], // days 7–8 by road
  [0.448, 0.46, 'kili-up', 'morum', 'shira'], // day 8
  [0.467, 0.5, 'kili-up', 'shira', 'moir'], // day 9
  [0.507, 0.565, 'kili-up', 'moir', 'thirdcave'], // day 10
  [0.572, 0.595, 'kili-up', 'thirdcave', 'school'], // day 11
  [0.602, 0.628, 'kili-up', 'school', 'gilmans'], // day 12
  [0.628, 0.645, 'kili-up', 'gilmans', 'crater'], // day 12
  [0.665, 0.676, 'kili-up', 'crater', 'uhuru'], // day 13 dawn
  [0.694, 0.735, 'kili-down', 'uhuru', 'mwekacamp'], // day 13 descent
  [0.742, 0.762, 'kili-down', 'mwekacamp', 'mwekagate'], // day 14
  [0.765, 0.785, 'kili-out', 'mwekagate', 'arusha'], // day 14 by road
  [0.79, 0.83, 'safari-in', 'arusha', 'seronera'], // day 15
  [0.868, 0.892, 'safari-ngoro', 'seronera', 'ngorongoro'], // day 17
  [0.915, 0.945, 'safari-out', 'ngorongoro', 'jro'], // day 18
];

// Dashed out-and-back side trips: drawn from `from` to `to` during [start, end], held until `hold`.
export const SIDE_TRIPS = [
  { from: 'saddle', to: 'littlemeru', start: 0.326, end: 0.334, hold: 0.405 },
  { from: 'crater', to: 'furtwangler', start: 0.648, end: 0.656, hold: 0.665 },
];

// Map labels and when they show. Each window opens when the line tip reaches the place.
export const MARKERS: [string, [number, number][]][] = [
  ['jro', [[0.232, 0.275], [0.945, 1.01]]],
  ['arusha', [[0.25, 0.275], [0.785, 1.01]]],
  ['momella', [[0.275, 0.41]]],
  ['miriakamba', [[0.3, 0.41]]],
  ['saddle', [[0.325, 0.41]]],
  ['littlemeru', [[0.334, 0.41]]],
  ['meru', [[0.357, 0.41], [0.93, 1.01]]],
  ['londorosi', [[0.442, 0.467]]],
  ['morum', [[0.445, 0.5]]],
  ['shira', [[0.46, 0.785]]],
  ['moir', [[0.5, 0.785]]],
  ['thirdcave', [[0.565, 0.785]]],
  ['school', [[0.595, 0.785]]],
  ['gilmans', [[0.628, 0.785]]],
  ['crater', [[0.645, 0.785]]],
  ['uhuru', [[0.676, 0.785], [0.93, 1.01]]],
  ['mwekacamp', [[0.735, 0.785]]],
  ['mwekagate', [[0.762, 0.785]]],
  ['seronera', [[0.83, 1.01]]],
  ['ngorongoro', [[0.892, 1.01]]],
];

// Camera keyframes: [p, center, zoom, pitch, bearing]. 'tip' means the tip of the drawn line, so on
// trail legs the camera stays centred on it. Road legs and the safari use fixed centres instead.
export type Keyframe = [number, LonLat | 'tip', number, number, number];
export const KEYFRAMES: Keyframe[] = [
  [0.0, [25.0, 8.0], 1.6, 0, 0], // Earth from space, Africa centred
  [0.1, [36.4, -3.0], 5.6, 0, 0], // northern Tanzania
  [0.16, [37.05, -3.15], 9.0, 0, 0], // Meru and Kilimanjaro from above
  [0.22, [36.95, -3.33], 9.8, 45, -10], // tilt into 3D, both volcanoes ahead
  [0.232, [36.88, -3.42], 10.4, 50, -15], // Kilimanjaro Airport → Arusha
  [0.25, [36.688079, -3.369683], 11.2, 55, -10], // Arusha
  [0.258, 'tip', 11.2, 55, 10], // the road to Arusha National Park
  [0.275, 'tip', 12.6, 60, -95], // Momella Gate, facing Meru
  [0.3, 'tip', 12.8, 62, -105], // Miriakamba Hut
  [0.325, 'tip', 13.0, 62, -135], // Saddle Hut
  [0.337, 'tip', 13.1, 63, -140], // Little Meru side trip
  [0.357, 'tip', 13.4, 66, -150], // Meru summit
  [0.37, 'tip', 13.4, 66, 80], // turn to face Kilimanjaro at sunrise
  [0.38, 'tip', 13.0, 62, 70], // back at Saddle Hut
  [0.402, 'tip', 12.4, 60, 80], // Momella Gate
  [0.408, 'tip', 12.0, 55, 80],
  [0.422, [37.0, -3.12], 9.8, 40, 60], // over the road between the two mountains
  [0.44, [37.2, -2.99], 11.6, 55, 110], // Londorossi, west side of Kilimanjaro
  [0.448, 'tip', 12.6, 60, 125], // Shira trailhead, facing Kibo
  [0.46, 'tip', 12.8, 62, 117], // Shira Plateau
  [0.5, 'tip', 12.8, 62, 122], // Moir camp
  [0.535, 'tip', 12.6, 62, 165], // northern circuit
  [0.565, 'tip', 12.8, 62, 235], // Third Cave camp
  [0.595, 'tip', 13.0, 64, 255], // School Hut
  [0.628, 'tip', 13.6, 66, 260], // Gilman's Point
  [0.645, 'tip', 14.2, 68, 240], // Crater Camp
  [0.665, 'tip', 14.4, 68, 200],
  [0.676, 'tip', 14.6, 70, 150], // Uhuru Peak
  [0.694, 'tip', 14.6, 70, 110], // slow orbit while SUMMIT DAY shows
  [0.735, 'tip', 12.8, 64, 190], // Mweka Camp
  [0.762, 'tip', 12.4, 60, 200], // Mweka Gate
  [0.766, 'tip', 12.0, 55, 200],
  [0.785, [36.95, -3.3], 9.6, 40, -60], // Arusha, facing west
  [0.81, [35.75, -2.95], 8.6, 35, -70], // across the Rift to the Serengeti
  [0.83, [35.0, -2.55], 9.6, 45, -60],
  [0.85, [34.82, -2.45], 10.6, 55, -40], // Seronera, game drives
  [0.868, [34.82, -2.45], 10.6, 55, -10],
  [0.88, [35.2, -2.85], 9.4, 45, 60], // toward the Ngorongoro highlands
  [0.895, [35.58, -3.175], 11.0, 55, 100], // Ngorongoro Crater
  [0.912, [35.58, -3.175], 11.2, 58, 160], // orbit the crater
  [0.93, [36.3, -3.25], 9.2, 40, 120], // back east to Arusha
  [0.95, [36.3, -2.95], 8.85, 35, 0], // the whole trip, north up: Serengeti on the left, Kilimanjaro on the right
  [1.0, [36.3, -2.95], 8.85, 35, -5], // slow orbit while the CTA shows
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
  fadeOut: [0.03, 0.05] as const,
  eyebrow: 'MATOURS PRESENTS',
  title: 'Welcome to your new adventure',
  subtitle: 'Tanzania · Mount Meru and the 3 summits of Kilimanjaro · 19 days',
  hint: 'Scroll to begin',
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'tanzania',
    from: 0.05,
    to: 0.11,
    side: 'left',
    eyebrow: 'WHERE WE ARE GOING',
    title: 'The Africa of every dream',
    body: 'Savanna to the horizon, flat-topped acacias, baobabs and the great migrations. Northern Tanzania is all of it. Above its plains rise two volcanoes born of the Great Rift Valley: Mount Meru, and Kilimanjaro, the highest mountain in Africa.',
    facts: ['Two treks and a safari: Mount Meru, Kilimanjaro, the Serengeti and the Ngorongoro Crater.'],
  },
  {
    id: 'volcanoes',
    from: 0.11,
    to: 0.17,
    side: 'right',
    eyebrow: 'TWO VOLCANOES',
    title: 'Meru first, then the three summits',
    body: "Mount Meru, 4,565 m, is the fifth-highest mountain in Africa and our warm-up. Kilimanjaro is three volcanoes fused together: Shira in the west, Mawenzi in the east and Kibo in the middle, crowned by Uhuru Peak at 5,895 m. Our route circles the mountain by its little-visited north face before we climb into Kibo's crater.",
    facts: [
      'After ten days of trekking and acclimatization, the final climb to Uhuru takes less than two hours, from a camp inside the crater.',
      'Climate: 20–30 °C in the lowlands, 0–10 °C by day on the mountains, −15 to 0 °C at night.',
    ],
  },
  {
    id: 'trip',
    from: 0.17,
    to: 0.23,
    side: 'left',
    wide: true,
    eyebrow: 'THE TRIP',
    title: 'Meru and the 3 summits of Kilimanjaro',
    body: 'Nineteen days, Montréal to Montréal. A four-day trek on Meru, seven days on Kilimanjaro with a night in the crater at 5,700 m, and four days of safari in the Serengeti and the Ngorongoro, sleeping in private camps out on the savanna.',
    details: [
      ['Departures', '17 Jan – 4 Feb 2027 · 6–24 Feb 2027 (full) · 16 Jul – 3 Aug 2027'],
      ['Group size', 'Up to 12 travellers. On Kilimanjaro, a local crew of 55–60 and about 1 guide per 2–3 climbers.'],
      ['Effort', '4/5, demanding. Two non-technical high-altitude treks, 5–7 h a day with frequent 1,000 m climbs; summit days 11–12 h. You carry only a daypack.'],
      ['Comfort', '4/5, minimalist. Lodges in town, huts on Meru, tents on Kilimanjaro and on safari.'],
      [
        'Included',
        'Matours guide and local team (guides, cooks, porters), park fees and climbing permits, meals from day 3 to day 18, lodges, huts and tents, ground transport, luggage carried by vehicles and porters, group gear, carbon offset',
      ],
      ['Not included', 'International flights, tips, travel insurance, visa, vaccines, single room (CAD 500), personal gear'],
      ['Price', 'CAD 10,950 per person'],
    ],
  },
  {
    id: 'arusha',
    from: 0.23,
    to: 0.275,
    side: 'right',
    eyebrow: 'DAYS 1–3 · ARUSHA',
    title: 'Landing in the Rift Valley',
    stats: 'Overnight flight · lodge · rest day',
    body: 'An overnight flight lands us at Kilimanjaro International Airport, and we drive to Arusha in the Great Rift Valley, at the foot of Mount Meru. Day 3 is for shaking off the jet lag: the local market, a walk through a nature park to a waterfall, and lunch in the village.',
    photos: [
      { seed: 'tz-arusha-market', caption: 'The market in Arusha', at: 0.238 },
      { seed: 'tz-arusha-waterfall', caption: 'Waterfall walk near Arusha', at: 0.255 },
    ],
  },
  {
    id: 'day4',
    from: 0.275,
    to: 0.305,
    side: 'left',
    eyebrow: 'DAY 4 · MERU · FOREST',
    title: 'Into Arusha National Park',
    stats: '1,500 m → 2,500 m · under 7 km · +1,000 m · hut',
    body: 'We drive into Arusha National Park and set off from Momella Gate. The trail climbs about 1,000 m through montane forest to Miriakamba Hut, with the broken crater walls of Meru towering above.',
    photos: [{ seed: 'tz-meru-forest', caption: 'Montane forest above Momella', at: 0.282 }],
  },
  {
    id: 'day5',
    from: 0.305,
    to: 0.337,
    side: 'right',
    eyebrow: 'DAY 5 · MERU · ACCLIMATIZATION',
    title: 'Saddle Hut and Little Meru',
    stats: '2,500 m → 3,500 m · ~4 h · optional Little Meru 3,820 m, 1–2 h',
    body: 'About four hours of walking bring us to Saddle Hut at 3,500 m. In the afternoon, those who want can climb Little Meru, 3,820 m. One or two extra hours today make summit day easier.',
    photos: [{ seed: 'tz-meru-saddle', caption: 'Saddle Hut, 3,500 m', at: 0.312 }],
  },
  {
    id: 'day6',
    from: 0.337,
    to: 0.383,
    side: 'left',
    eyebrow: 'DAY 6 · MERU SUMMIT',
    title: 'Sunrise over Kilimanjaro',
    stats: '3,500 m → 4,565 m → 3,500 m · 8–10 h · +1,100 m',
    body: 'We leave before dawn for the long climb along the crater rim. On a clear morning the sun rises behind Kilimanjaro, 70 km to the east. After the summit we walk back down to Saddle Hut.',
    photos: [
      { seed: 'tz-meru-ridge', caption: 'The ash ridge to the summit', at: 0.343 },
      { seed: 'tz-meru-sunrise', caption: 'Kilimanjaro at sunrise, seen from Meru', at: 0.37 },
    ],
  },
  {
    id: 'day7',
    from: 0.383,
    to: 0.405,
    side: 'right',
    eyebrow: 'DAY 7 · BACK TO THE PLAINS',
    title: 'Down among the giraffes',
    stats: '3,500 m → 1,500 m · ~5 h · −2,000 m · lodge',
    body: 'A long descent to the foot of the mountain. Giraffes and antelopes graze near the trail, and sometimes elephants. We drive back to the lodge in Arusha for a free afternoon.',
    photos: [{ seed: 'tz-meru-giraffe', caption: 'Giraffes in Arusha National Park', at: 0.388 }],
  },
  {
    id: 'day8',
    from: 0.405,
    to: 0.467,
    side: 'left',
    eyebrow: 'DAY 8 · KILIMANJARO · SHIRA',
    title: 'To the quiet side of the mountain',
    stats: '~3 h by road · 3,400 m → 3,500 m · short hike · tent',
    body: 'About three hours on the road take us to Londorossi Gate for the park formalities. We start walking near 3,400 m with the Shira Needles on the horizon, and a short first hike brings us to camp on the Shira Plateau at 3,500 m.',
    photos: [{ seed: 'tz-kili-shira', caption: 'Camp on the Shira Plateau', at: 0.448 }],
  },
  {
    id: 'day9',
    from: 0.467,
    to: 0.507,
    side: 'right',
    eyebrow: 'DAY 9 · UNDER THE BLACK ROCKS',
    title: 'Up to 4,100 m',
    stats: '3,500 m → 4,100 m · tent',
    body: 'We leave the Shira Plateau and climb the flank of the mountain to camp at 4,100 m, beneath walls of black lava.',
    photos: [{ seed: 'tz-kili-lava', caption: 'Black lava walls above camp', at: 0.475 }],
  },
  {
    id: 'day10',
    from: 0.507,
    to: 0.572,
    side: 'left',
    eyebrow: 'DAY 10 · THE NORTHERN CIRCUIT',
    title: 'All the way round',
    stats: '4,100 m → ~4,200 m → 3,950 m · 8–11 h · tent',
    body: 'The longest day of the trek. We traverse the north face of Kilimanjaro at around 4,200 m, with Mawenzi rising ahead, and drop to camp at 3,950 m. Few climbers come this way: we have the trail almost to ourselves.',
    photos: [
      { seed: 'tz-kili-north', caption: 'The empty north face', at: 0.515 },
      { seed: 'tz-kili-mawenzi', caption: 'Mawenzi from the northern circuit', at: 0.54 },
    ],
  },
  {
    id: 'day11',
    from: 0.572,
    to: 0.602,
    side: 'right',
    eyebrow: 'DAY 11 · SCHOOL HUT',
    title: 'Short, steep, then rest',
    stats: '3,950 m → 4,700 m · short day · tent',
    body: 'A short, steep trail takes us up to 4,700 m. The afternoon is for resting and sorting gear for the crater.',
    photos: [{ seed: 'tz-kili-school', caption: 'School Hut camp, 4,700 m', at: 0.58 }],
  },
  {
    id: 'day12',
    from: 0.602,
    to: 0.665,
    side: 'left',
    eyebrow: 'DAY 12 · INTO THE CRATER',
    title: 'A night at 5,700 m',
    stats: '4,700 m → 5,700 m · 8–10 h · +1,100 m / −50 m · tent',
    body: "A very early start. We climb to the crater rim at Gilman's Point, then drop gently into Kibo's crater to Crater Camp at 5,700 m. In the afternoon we rest, or walk to the foot of the Furtwängler Glacier. Good acclimatization is what makes a night this high possible.",
    photos: [
      { seed: 'tz-kili-rim', caption: "The crater rim near Gilman's Point", at: 0.61 },
      { seed: 'tz-kili-furtwangler', caption: 'The Furtwängler Glacier', at: 0.648 },
    ],
  },
  {
    id: 'day13',
    from: 0.665,
    to: 0.742,
    side: 'right',
    eyebrow: 'DAY 13 · UHURU PEAK',
    title: 'Sunrise on the roof of Africa',
    stats: '5,700 m → 5,895 m → Mweka Camp · 8–9 h · +150 m / −2,600 m · tent',
    body: 'We set off in the cold before dawn and reach Uhuru Peak, 5,895 m, as the sun comes up: the highest point in Africa, under two hours from our tents. Then the long way down, past Stella Point and Barafu, to Mweka Camp.',
    photos: [
      { seed: 'tz-kili-uhuru', caption: 'Uhuru Peak at sunrise', at: 0.672 },
      { seed: 'tz-kili-descent', caption: 'Descending toward Mweka', at: 0.705 },
    ],
  },
  {
    id: 'day14',
    from: 0.742,
    to: 0.785,
    side: 'left',
    eyebrow: 'DAY 14 · END OF THE TREK',
    title: 'Back through the rainforest',
    stats: '3,100 m → 1,640 m · lodge in Arusha',
    body: 'The last descent runs through dense forest to Mweka Gate. Then the road back to Arusha, a hot shower and a free evening.',
    photos: [{ seed: 'tz-kili-mweka', caption: 'Rainforest below Mweka Camp', at: 0.75 }],
  },
  {
    id: 'serengeti',
    from: 0.785,
    to: 0.868,
    side: 'right',
    eyebrow: 'DAYS 15–17 · SERENGETI',
    title: 'Out onto the endless plains',
    stats: 'Game drives every day · private camp · safari tent',
    body: 'We drive west through Maasai grazing land and farmland, then out onto the plains of the Serengeti. Early starts, game drives, a siesta through the midday heat, and nights in a private camp in the heart of the park. The last night is spent near the Ngorongoro Crater.',
    photos: [
      { seed: 'tz-safari-plains', caption: 'The Serengeti plains', at: 0.795 },
      { seed: 'tz-safari-lions', caption: 'Lions at dusk', at: 0.82 },
      { seed: 'tz-safari-camp', caption: 'Private camp on the savanna', at: 0.845 },
    ],
  },
  {
    id: 'ngorongoro',
    from: 0.868,
    to: 0.945,
    side: 'left',
    eyebrow: 'DAY 18 · NGORONGORO',
    title: 'A world inside a crater',
    stats: 'Full day on the crater floor · ~20 km across · evening flight home',
    body: 'A full day on the floor of the Ngorongoro Crater, home to some 30,000 animals: lions, elephants, cheetahs, zebras, wildebeest and rhinos. In the afternoon we drive back to Arusha and on to the airport for the evening flight.',
    photos: [
      { seed: 'tz-safari-ngorongoro', caption: 'The Ngorongoro Crater floor', at: 0.885 },
      { seed: 'tz-safari-rhino', caption: 'Black rhino in the crater', at: 0.905 },
    ],
  },
];

// Centred headline moments, shown while the line tip holds on a summit.
export const SUMMITS = [
  {
    fadeIn: [0.357, 0.36] as const,
    fadeOut: [0.367, 0.37] as const,
    title: 'MOUNT MERU',
    sub: '4,565 m · the fifth-highest summit in Africa',
  },
  {
    fadeIn: [0.676, 0.68] as const,
    fadeOut: [0.69, 0.694] as const,
    title: 'SUMMIT DAY',
    sub: 'Uhuru Peak · 5,895 m · the highest point in Africa',
  },
];

export const FINALE = {
  fadeIn: [0.95, 0.965] as const,
  eyebrow: 'DAY 19 · HOME',
  title: 'Two summits and a safari later',
  body: 'We land back home with Meru, Kilimanjaro, the Serengeti and the Ngorongoro behind us. Weather, roads or local events can change the plan; your guide always makes the call on the ground.',
  cta: 'Book this trip',
  href: 'mailto:hello@matours.example?subject=Meru%20and%20Kilimanjaro%20trip',
  footer:
    '© Matours · Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community · Terrain © Mapterhorn · Trails © OpenStreetMap contributors · Roads routed with OSRM · Photos are placeholders',
};

// Progress bar ticks.
export const DAY_TICKS: [number, string][] = [
  [0.23, 'Day 1'],
  [0.275, 'Day 4'],
  [0.337, 'Day 6'],
  [0.405, 'Day 8'],
  [0.507, 'Day 10'],
  [0.602, 'Day 12'],
  [0.665, 'Day 13'],
  [0.785, 'Day 15'],
  [0.868, 'Day 18'],
  [0.95, 'Day 19'],
];

export const STARS_FADE = [0.07, 0.11] as const;
