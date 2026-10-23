# Rebuilding the track

`public/data/track.geojson` holds every leg of the trip in order. Trail legs (Meru, Kilimanjaro) are
routed through the OpenStreetMap path network. Drive legs (transfers and safari) come from the public
OSRM demo router. The site only needs the built file; this is for regenerating it.

1. Download the inputs into an empty folder, here `$IN`. Overpass rejects requests without a
   `User-Agent`, and retries with back-off help when it answers 429 or 504.

```bash
UA="matours-track-builder/1.0"
q() { curl -s -A "$UA" -X POST https://overpass-api.de/api/interpreter --data-urlencode "data=$1" -o "$2"; }
q '[out:json][timeout:120];way["highway"~"path|footway|track|steps|unclassified"](-3.32,36.68,-3.15,36.90);out geom;' "$IN/meru_paths.json"
q '[out:json][timeout:120];way["highway"~"path|footway|track|steps"](-3.30,37.10,-2.95,37.62);out geom;' "$IN/kili_paths.json"
```

2. Fetch one OSRM route per drive leg into `$IN/osrm/<leg>.json`, with coordinates taken from
   `public/data/waypoints.json` in the order listed in `DRIVES` inside `build_track.py`:

```bash
mkdir -p "$IN/osrm"
curl -s "https://router.project-osrm.org/route/v1/driving/37.07203,-3.428429;36.688079,-3.369683?overview=full&geometries=geojson" -o "$IN/osrm/arrival.json"
```

   The other legs are `meru-in`, `kili-in` (Momella → Arusha → Londorossi → Shira trailhead),
   `kili-out`, `safari-in`, `safari-ngoro` and `safari-out` (Ngorongoro → Arusha → airport).
   The Ngorongoro point is the crater centre, `35.58,-3.175`.

3. From the project root:

```bash
python3 -I tools/build_track.py "$IN"
```

The script prints each leg's length and the fraction of the leg at every stop. `src/content.ts`
refers to legs and stops by id in `TIMELINE`, so keep those ids stable.

Known approximations: OpenStreetMap has no path from Crater Camp up to Uhuru Peak, so that
~400 m climb is a straight link. The Karavaniers itinerary does not name the camps for days 9–11.
They are matched to Moir, Third Cave and School Hut on the Northern Circuit by the altitudes it gives.
