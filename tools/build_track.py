"""Builds public/data/track.geojson: every leg of the trip, in order.

Trail legs are routed through the OpenStreetMap path network (shortest path between the
camps listed in TRAILS). Drive legs come from the public OSRM demo router. Each feature
carries `kind` ("trail" | "drive") and `stops`: {waypoint id: fraction of the leg}.

Inputs (download once, see tools/README.md):
  <in>/meru_paths.json, <in>/kili_paths.json   Overpass `out geom` dumps of highway=path|footway|track|steps
  <in>/osrm/<leg>.json                         OSRM /route responses with overview=full&geometries=geojson
Usage: python3 tools/build_track.py <in-dir>   (run from the project root)
"""

import heapq
import json
import math
import os
import sys

IN = sys.argv[1]
WP = {
    w["id"]: (w["lon"], w["lat"])
    for w in json.load(open("public/data/waypoints.json"))["waypoints"]
}

# Trail legs: (id, paths file, stops, extra straight links missing from OSM).
# OSM has no path from Crater Camp up to Uhuru Peak, so that ~400 m climb is a straight link.
TRAILS = [
    ("meru-up", "meru_paths.json", ["momella", "miriakamba", "saddle", "meru"], []),
    ("meru-down", "meru_paths.json", ["meru", "saddle", "miriakamba", "momella"], []),
    (
        "kili-up",
        "kili_paths.json",
        ["morum", "shira", "moir", "thirdcave", "school", "gilmans", "crater", "uhuru"],
        [("crater", "uhuru")],
    ),
    (
        "kili-down",
        "kili_paths.json",
        ["uhuru", "stella", "barafu", "mwekacamp", "mwekagate"],
        [],
    ),
]
# Drive legs: (id, stops in OSRM waypoint order). Order of the whole trip is ORDER below.
DRIVES = {
    "arrival": ["jro", "arusha"],
    "meru-in": ["arusha", "momella"],
    "kili-in": ["momella", "arusha", "londorosi", "morum"],
    "kili-out": ["mwekagate", "arusha"],
    "safari-in": ["arusha", "seronera"],
    "safari-ngoro": ["seronera", "ngorongoro"],
    "safari-out": ["ngorongoro", "arusha", "jro"],
}
ORDER = [
    "arrival",
    "meru-in",
    "meru-up",
    "meru-down",
    "kili-in",
    "kili-up",
    "kili-down",
    "kili-out",
    "safari-in",
    "safari-ngoro",
    "safari-out",
]


def haversine(a, b):
    la1, la2 = math.radians(a[1]), math.radians(b[1])
    h = (
        math.sin((la2 - la1) / 2) ** 2
        + math.cos(la1) * math.cos(la2) * math.sin(math.radians(b[0] - a[0]) / 2) ** 2
    )
    return 2 * 6371000 * math.asin(math.sqrt(h))


def graph(path, anchor):
    pos, adj = {}, {}
    for e in json.load(open(path))["elements"]:
        if e["type"] != "way" or e.get("tags", {}).get("highway") not in (
            "path",
            "footway",
            "track",
            "steps",
            "unclassified",
        ):
            continue
        for n, p in zip(e["nodes"], e["geometry"]):
            pos[n] = (p["lon"], p["lat"])
        for a, b in zip(e["nodes"], e["nodes"][1:]):
            w = haversine(pos[a], pos[b])
            adj.setdefault(a, []).append((b, w))
            adj.setdefault(b, []).append((a, w))
    # Keep the connected component that reaches the anchor, so huts never snap onto isolated footways.
    seen, best = set(), []
    for s in adj:
        if s in seen:
            continue
        stack, comp = [s], [s]
        seen.add(s)
        while stack:
            for v, _ in adj[stack.pop()]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
                    comp.append(v)
        if any(haversine(pos[m], anchor) < 50 for m in comp) and len(comp) > len(best):
            best = comp
    keep = set(best)
    return pos, {n: [(v, w) for v, w in adj[n] if v in keep] for n in keep}


def dijkstra(adj, s, t):
    dist, prev, pq = {s: 0}, {}, [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t:
            break
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if d + w < dist.get(v, 1e18):
                dist[v], prev[v] = d + w, u
                heapq.heappush(pq, (d + w, v))
    if t not in dist:
        raise SystemExit(f"no path {s} -> {t}")
    out = [t]
    while out[-1] != s:
        out.append(prev[out[-1]])
    return out[::-1]


def simplify(coords, keep, tol):
    """Douglas-Peucker in local metres; indices in `keep` always survive."""
    k = math.cos(math.radians(coords[0][1]))
    P = [(c[0] * 111320 * k, c[1] * 110540) for c in coords]
    out = set(keep) | {0, len(coords) - 1}

    def rec(i, j):
        stack = [(i, j)]
        while stack:
            i, j = stack.pop()
            if j <= i + 1:
                continue
            (x1, y1), (x2, y2) = P[i], P[j]
            L = math.hypot(x2 - x1, y2 - y1) or 1e-9
            d, m = max(
                (
                    abs((y2 - y1) * P[q][0] - (x2 - x1) * P[q][1] + x2 * y1 - y2 * x1)
                    / L,
                    q,
                )
                for q in range(i + 1, j)
            )
            if d > tol:
                out.add(m)
                stack += [(i, m), (m, j)]

    ks = sorted(out)
    for a, b in zip(ks, ks[1:]):
        rec(a, b)
    return sorted(out)


def feature(leg_id, kind, coords, marks, tol):
    idx = simplify(coords, marks.values(), tol)
    remap = {old: new for new, old in enumerate(idx)}
    c = [coords[i] for i in idx]
    cum = [0.0]
    for a, b in zip(c, c[1:]):
        cum.append(cum[-1] + haversine(a, b))
    stops = {s: round(cum[remap[i]] / cum[-1], 5) for s, i in marks.items()}
    print(
        f"{leg_id:13s} {kind:5s} {len(coords):5d} -> {len(c):4d} pts {cum[-1] / 1000:6.1f} km  {stops}"
    )
    return {
        "type": "Feature",
        "properties": {
            "id": leg_id,
            "kind": kind,
            "length_km": round(cum[-1] / 1000, 1),
            "stops": stops,
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[round(x, 6), round(y, 6)] for x, y in c],
        },
    }


feats = {}
graphs = {}
for leg_id, fname, stops, links in TRAILS:
    if fname not in graphs:
        graphs[fname] = graph(
            os.path.join(IN, fname),
            WP[stops[-1]] if "meru" not in leg_id else WP["momella"],
        )
    pos, adj = graphs[fname]
    snap = {s: min(adj, key=lambda n: haversine(pos[n], WP[s])) for s in stops}
    adj = {n: list(v) for n, v in adj.items()}
    for a, b in links:
        w = haversine(pos[snap[a]], pos[snap[b]])
        adj[snap[a]].append((snap[b], w))
        adj[snap[b]].append((snap[a], w))
    nodes, marks = [snap[stops[0]]], {stops[0]: 0}
    for a, b in zip(stops, stops[1:]):
        nodes += dijkstra(adj, snap[a], snap[b])[1:]
        marks[b] = len(nodes) - 1
    feats[leg_id] = feature(leg_id, "trail", [pos[n] for n in nodes], marks, 5)

for leg_id, stops in DRIVES.items():
    d = json.load(open(os.path.join(IN, "osrm", f"{leg_id}.json")))
    coords = [tuple(c) for c in d["routes"][0]["geometry"]["coordinates"]]
    marks, start = {}, 0
    for s, w in zip(
        stops, d["waypoints"]
    ):  # nearest vertex to each snapped waypoint, in order
        loc = tuple(w["location"])
        i = min(range(start, len(coords)), key=lambda q: haversine(coords[q], loc))
        marks[s], start = i, i
    marks[stops[0]], marks[stops[-1]] = 0, len(coords) - 1
    feats[leg_id] = feature(leg_id, "drive", coords, marks, 25)

json.dump(
    {
        "type": "FeatureCollection",
        "properties": {
            "source": "Trails: OpenStreetMap contributors (ODbL). Roads: OSRM over OpenStreetMap."
        },
        "features": [feats[i] for i in ORDER],
    },
    open("public/data/track.geojson", "w"),
    separators=(",", ":"),
)
print(
    "wrote public/data/track.geojson",
    os.path.getsize("public/data/track.geojson"),
    "bytes",
)
