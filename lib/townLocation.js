import fs from "fs/promises";
import path from "path";
import { parseTownGeo } from "@/lib/geo";
import { US } from "@/lib/data";
import { MAJOR_CITIES, cityContextTier } from "@/lib/majorCities";

const CACHE_DIR = path.join(process.cwd(), ".cache", "location");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const USER_AGENT = "WhereNext/1.0 (relocation scout; contact: hello@wherenext.app)";

const EARTH_RADIUS_MI = 3958.8;

/** @typedef {{ lat: number, lon: number, name: string, displayName?: string, boundary?: object|null, bbox?: number[] }} GeocodeResult */
/** @typedef {{ id: string, emoji: string, label: string, name: string, driveTime: string, distanceMi?: number }} NearbyItem */

export function haversineMi(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingLabel(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => ((r * 180) / Math.PI + 360) % 360;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const deg = toDeg(Math.atan2(y, x));
  const dirs = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return dirs[Math.round(deg / 45) % 8];
}

export function formatDistanceMi(mi) {
  if (mi < 1) return "under 1 mile";
  if (mi < 10) return `${Math.round(mi)} mile${Math.round(mi) === 1 ? "" : "s"}`;
  return `${Math.round(mi)} miles`;
}

export function estimateDriveTime(mi, urban = false) {
  const mph = urban ? 35 : 45;
  const mins = Math.max(5, Math.round((mi / mph) * 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function cacheKey(townId, stateAbbr) {
  const safe = (townId || "town").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const st = (stateAbbr || "xx").toLowerCase();
  return `${safe}_${st}_v3.json`;
}

async function readCache(key) {
  try {
    const file = path.join(CACHE_DIR, key);
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw);
    if (Date.now() - data.cachedAt > CACHE_TTL_MS) return null;
    return data.payload;
  } catch {
    return null;
  }
}

async function writeCache(key, payload) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CACHE_DIR, key),
      JSON.stringify({ cachedAt: Date.now(), payload }, null, 0),
      "utf8"
    );
  } catch {}
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    signal: opts.signal || AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** @returns {Promise<GeocodeResult|null>} */
export async function geocodeTown(town, stateAbbr) {
  const { name, state, stateName } = parseTownGeo(town, stateAbbr);
  if (!name) return null;

  const stLabel = stateName || (state ? US[state] : null) || "";
  const query = stLabel ? `${name}, ${stLabel}, USA` : `${name}, USA`;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");

  const results = await fetchJson(url.toString());
  const hit = results?.[0];
  if (!hit) return null;

  const lat = parseFloat(hit.lat);
  const lon = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  let boundary = null;
  if (hit.geojson && (hit.geojson.type === "Polygon" || hit.geojson.type === "MultiPolygon")) {
    boundary = hit.geojson;
  }

  const bbox = hit.boundingbox?.map(Number).filter(Number.isFinite);
  const displayName = hit.display_name?.split(",").slice(0, 3).join(", ") || name;

  return { lat, lon, name, displayName, boundary, bbox };
}

function nearestMajorCities(lat, lon, townName, limit = 3) {
  const seen = new Set();
  const ranked = [];

  for (const city of MAJOR_CITIES) {
    const key = `${city.name}|${city.st}`;
    if (seen.has(key)) continue;
    if (city.name.toLowerCase() === (townName || "").toLowerCase()) continue;

    const dist = haversineMi(lat, lon, city.lat, city.lon);
    if (dist < 3) continue;

    const tier = cityContextTier(city.name);
    const contextScore = dist + (tier === 3 ? 28 : tier === 2 ? 10 : 0);

    ranked.push({
      ...city,
      distanceMi: dist,
      bearing: bearingLabel(lat, lon, city.lat, city.lon),
      tier,
      contextScore,
    });
    seen.add(key);
  }

  ranked.sort((a, b) => a.contextScore - b.contextScore);
  return ranked.slice(0, limit);
}

function pickSummaryAnchor(majorCities) {
  if (!majorCities?.length) return null;
  const primary = majorCities.find((c) => c.tier === 1);
  const regional = majorCities.find((c) => c.tier === 2);
  if (primary && primary.distanceMi <= 110) return primary;
  if (regional && regional.distanceMi <= 75) return regional;
  return majorCities[0];
}

function pickElementName(tags = {}, fallback = "Nearby") {
  return (
    tags.name ||
    tags["name:en"] ||
    tags.official_name ||
    tags.brand ||
    tags.operator ||
    tags["addr:street"] ||
    fallback
  );
}

function elementCenter(el) {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

async function runOverpass(query) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(28000),
      });
      const text = await res.text();
      if (!text.trim().startsWith("{")) continue;
      const data = JSON.parse(text);
      return data?.elements || [];
    } catch {
      continue;
    }
  }
  return [];
}

async function queryOverpass(lat, lon) {
  const poiQuery = `[out:json][timeout:20];
(
  node["aeroway"~"aerodrome|airport"](around:50000,${lat},${lon});
  node["amenity"="hospital"](around:30000,${lat},${lon});
  node["shop"~"supermarket|grocery|convenience"](around:20000,${lat},${lon});
  node["shop"="mall"](around:35000,${lat},${lon});
  node["amenity"="marketplace"](around:35000,${lat},${lon});
  node["amenity"="cafe"](around:10000,${lat},${lon});
  node["amenity"="restaurant"](around:10000,${lat},${lon});
  node["amenity"~"university|college"](around:45000,${lat},${lon});
);
out center tags;`;

  const geoQuery = `[out:json][timeout:25];
(
  node["leisure"~"park|nature_reserve|marina|golf_course|fishing|ski_resort"](around:45000,${lat},${lon});
  way["leisure"~"park|nature_reserve|ski_resort"](around:45000,${lat},${lon});
  relation["boundary"="national_park"](around:90000,${lat},${lon});
  node["natural"~"beach|water|bay|coastline|peak"](around:45000,${lat},${lon});
  way["natural"~"beach|water|bay"](around:45000,${lat},${lon});
  way["waterway"~"river|stream"](around:30000,${lat},${lon});
  way["highway"~"motorway|trunk"](around:40000,${lat},${lon});
);
out center tags geom;`;

  const [poi, geo] = await Promise.all([runOverpass(poiQuery), runOverpass(geoQuery)]);
  const seen = new Set();
  return [...poi, ...geo].filter((el) => {
    const key = `${el.type}:${el.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nearestByTag(elements, lat, lon, predicate) {
  let best = null;
  let bestDist = Infinity;
  for (const el of elements) {
    if (!predicate(el)) continue;
    const center = elementCenter(el);
    if (!center) continue;
    const dist = haversineMi(lat, lon, center.lat, center.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = { el, dist, center };
    }
  }
  return best;
}

function countNearby(elements, lat, lon, predicate, radiusMi = 8) {
  let count = 0;
  for (const el of elements) {
    if (!predicate(el)) continue;
    const center = elementCenter(el);
    if (!center) continue;
    if (haversineMi(lat, lon, center.lat, center.lon) <= radiusMi) count++;
  }
  return count;
}

/** @returns {NearbyItem[]} */
function buildNearbyCategories(lat, lon, elements, majorCities) {
  /** @type {NearbyItem[]} */
  const items = [];

  const add = (id, emoji, label, hit, urban = false, nameOverride) => {
    if (!hit) return;
    let name = nameOverride || pickElementName(hit.el.tags, "");
    if (!name || name === label) {
      if (id === "grocery") name = "Supermarket nearby";
      else if (id === "parks") name = "Local parks";
      else name = label;
    }
    items.push({
      id,
      emoji,
      label,
      name,
      driveTime: estimateDriveTime(hit.dist, urban),
      distanceMi: Math.round(hit.dist * 10) / 10,
    });
  };

  add(
    "airport",
    "✈️",
    "Nearest Airport",
    nearestByTag(elements, lat, lon, (el) => el.tags?.aeroway === "aerodrome" || el.tags?.aeroway === "airport")
  );

  add(
    "hospital",
    "🏥",
    "Hospital",
    nearestByTag(elements, lat, lon, (el) => el.tags?.amenity === "hospital")
  );

  add(
    "grocery",
    "🛒",
    "Grocery Store",
    nearestByTag(elements, lat, lon, (el) => /supermarket|grocery|convenience/.test(el.tags?.shop || ""))
  );

  add(
    "shopping",
    "🛍️",
    "Shopping",
    nearestByTag(
      elements,
      lat,
      lon,
      (el) => el.tags?.shop === "mall" || el.tags?.amenity === "marketplace"
    )
  );

  const cafeCount = countNearby(elements, lat, lon, (el) => el.tags?.amenity === "cafe", 5);
  if (cafeCount >= 2) {
    const cafe = nearestByTag(elements, lat, lon, (el) => el.tags?.amenity === "cafe");
    if (cafe) {
      items.push({
        id: "coffee",
        emoji: "☕",
        label: "Coffee Shops",
        name: cafeCount >= 5 ? `${cafeCount}+ within 5 mi` : pickElementName(cafe.el.tags, "Local cafes"),
        driveTime: estimateDriveTime(cafe.dist, true),
        distanceMi: Math.round(cafe.dist * 10) / 10,
      });
    }
  }

  const restaurantCount = countNearby(elements, lat, lon, (el) => el.tags?.amenity === "restaurant", 5);
  if (restaurantCount >= 3) {
    const rest = nearestByTag(elements, lat, lon, (el) => el.tags?.amenity === "restaurant");
    if (rest) {
      items.push({
        id: "restaurants",
        emoji: "🍽️",
        label: "Restaurants",
        name: restaurantCount >= 8 ? `${restaurantCount}+ within 5 mi` : pickElementName(rest.el.tags, "Local dining"),
        driveTime: estimateDriveTime(rest.dist, true),
        distanceMi: Math.round(rest.dist * 10) / 10,
      });
    }
  }

  add(
    "parks",
    "🌳",
    "Parks & Trails",
    nearestByTag(
      elements,
      lat,
      lon,
      (el) =>
        el.tags?.leisure === "park" ||
        el.tags?.leisure === "nature_reserve" ||
        el.tags?.boundary === "national_park"
    )
  );

  const beachHit = nearestByTag(
    elements,
    lat,
    lon,
    (el) => el.tags?.natural === "beach" || (el.tags?.natural === "water" && el.tags?.water === "lake")
  );
  const waterHit = nearestByTag(
    elements,
    lat,
    lon,
    (el) => /water|bay|coastline/.test(el.tags?.natural || "")
  );
  const lakeOrBeach = beachHit || (waterHit && waterHit.dist <= 25 ? waterHit : null);
  if (lakeOrBeach) {
    const isBeach = lakeOrBeach.el.tags?.natural === "beach";
    items.push({
      id: "beach",
      emoji: "🏖️",
      label: isBeach ? "Beaches or Lakes" : "Beaches or Lakes",
      name: pickElementName(lakeOrBeach.el.tags, isBeach ? "Coastal access" : "Water access"),
      driveTime: estimateDriveTime(lakeOrBeach.dist),
      distanceMi: Math.round(lakeOrBeach.dist * 10) / 10,
    });
  }

  add(
    "outdoor",
    "🎣",
    "Outdoor Recreation",
    nearestByTag(elements, lat, lon, (el) => /marina|golf_course|fishing/.test(el.tags?.leisure || ""))
  );

  add(
    "ski",
    "🎿",
    "Ski Areas",
    nearestByTag(elements, lat, lon, (el) => el.tags?.leisure === "ski_resort")
  );

  add(
    "college",
    "🎓",
    "Colleges & Universities",
    nearestByTag(elements, lat, lon, (el) => /university|college/.test(el.tags?.amenity || ""))
  );

  const major = majorCities?.[0];
  if (major && major.distanceMi <= 120) {
    items.push({
      id: "majorCity",
      emoji: "🏙️",
      label: "Nearest Major City",
      name: `${major.name}, ${major.st}`,
      driveTime: estimateDriveTime(major.distanceMi, major.distanceMi < 20),
      distanceMi: Math.round(major.distanceMi),
    });
  }

  return items;
}

function simplifyCoords(coords, maxPoints = 40) {
  if (!coords?.length) return [];
  if (coords.length <= maxPoints) return coords;
  const step = Math.ceil(coords.length / maxPoints);
  return coords.filter((_, i) => i % step === 0);
}

function wayToLatLngs(el) {
  if (el.geometry?.length) {
    return el.geometry.map((p) => [p.lat, p.lon]);
  }
  if (el.bounds) {
    const { minlat, minlon, maxlat, maxlon } = el.bounds;
    return [
      [minlat, minlon],
      [maxlat, maxlon],
    ];
  }
  return [];
}

/** @returns {{ lines: { type: string, coords: number[][], label?: string }[], points: { type: string, lat: number, lon: number, label?: string }[] }} */
function buildMapGeoLayers(lat, lon, elements) {
  /** @type {{ type: string, coords: number[][], label?: string }[]} */
  const lines = [];
  /** @type {{ type: string, lat: number, lon: number, label?: string }[]} */
  const points = [];
  const seen = new Set();

  for (const el of elements) {
    const tags = el.tags || {};
    const key = `${el.type}:${el.id}`;
    if (seen.has(key)) continue;

    if (/motorway|trunk/.test(tags.highway || "")) {
      const coords = simplifyCoords(wayToLatLngs(el), 35);
      if (coords.length >= 2) {
        lines.push({ type: "highway", coords });
        seen.add(key);
      }
      continue;
    }

    if (tags.waterway || tags.natural === "water" || tags.natural === "bay") {
      const coords = simplifyCoords(wayToLatLngs(el), 35);
      if (coords.length >= 2) {
        lines.push({ type: "water", coords, label: pickElementName(tags, "") });
        seen.add(key);
      }
      continue;
    }

    if (tags.boundary === "national_park" || tags.leisure === "nature_reserve" || tags.leisure === "park") {
      const coords = simplifyCoords(wayToLatLngs(el), 45);
      if (coords.length >= 3) {
        lines.push({ type: "park", coords, label: pickElementName(tags, "") });
        seen.add(key);
      } else {
        const center = elementCenter(el);
        if (center && haversineMi(lat, lon, center.lat, center.lon) <= 35) {
          points.push({ type: "park", lat: center.lat, lon: center.lon, label: pickElementName(tags, "") });
          seen.add(key);
        }
      }
    }
  }

  return {
    lines: lines.slice(0, 10),
    points: points.slice(0, 6),
  };
}

function buildLocationSummary(lat, lon, townName, elements, majorCities) {
  const beach = nearestByTag(elements, lat, lon, (el) => el.tags?.natural === "beach");
  if (beach && beach.dist <= 12) {
    return beach.dist <= 3 ? "On the coast" : `${formatDistanceMi(beach.dist)} from the coast`;
  }

  const bay = nearestByTag(
    elements,
    lat,
    lon,
    (el) => el.tags?.natural === "bay" || (el.tags?.natural === "water" && el.tags?.water === "bay")
  );
  if (bay && bay.dist <= 8) {
    const label = pickElementName(bay.el.tags, "the coast");
    if (/chesapeake/i.test(label)) return "Along the Chesapeake Bay";
    return /^the /i.test(label) ? `Along ${label}` : `Along the ${label}`;
  }

  const park = nearestByTag(
    elements,
    lat,
    lon,
    (el) => el.tags?.boundary === "national_park" || el.tags?.leisure === "nature_reserve"
  );
  if (park && park.dist <= 20) {
    const parkName = pickElementName(park.el.tags, "");
    const isNational = park.el.tags?.boundary === "national_park";
    const notable = isNational || /national|state park|forest|wilderness|seashore|monument/i.test(parkName);
    if (notable) {
      const label = parkName || "a national park";
      if (isNational && park.dist <= 2) return `Inside ${label}`;
      return `Near ${label}`;
    }
  }

  const peak = nearestByTag(elements, lat, lon, (el) => el.tags?.natural === "peak");
  if (peak && peak.dist <= 30) {
    const peakName = pickElementName(peak.el.tags, "");
    if (/blue ridge/i.test(peakName)) return "Nestled in the foothills of the Blue Ridge Mountains";
    if (/appalachian|ozark|rockies|sierra|cascade|smoky|mount|ridge|range|foothill|summit/i.test(peakName)) {
      const cleaned = peakName.replace(/\s+peak$/i, "");
      return `Nestled in the foothills of ${cleaned}`;
    }
  }

  if (lat >= 35 && lat <= 37.5 && lon >= -84.5 && lon <= -81) {
    return "Nestled in the foothills of the Blue Ridge Mountains";
  }

  const major = pickSummaryAnchor(majorCities);
  if (!major) return null;

  const drive = estimateDriveTime(major.distanceMi, major.distanceMi < 25);

  if (major.distanceMi <= 22) {
    return `${drive} outside ${major.name}`;
  }
  if (major.distanceMi <= 55) {
    if (major.tier === 2) return `${drive} from ${major.name}`;
    return `${drive} ${major.bearing} of ${major.name}`;
  }
  if (major.distanceMi <= 100) {
    return `${formatDistanceMi(major.distanceMi)} ${major.bearing} of ${major.name}`;
  }

  return `${formatDistanceMi(major.distanceMi)} from ${major.name}`;
}

/**
 * Resolve full location payload for a town.
 * @param {{ id?: string, name?: string, sub?: string }} town
 * @param {string} [stateAbbr]
 */
export async function resolveTownLocation(town, stateAbbr) {
  const key = cacheKey(town.id || town.name, stateAbbr);
  const cached = await readCache(key);
  if (cached) return cached;

  const geo = await geocodeTown(town, stateAbbr);
  if (!geo) {
    return { ok: false, error: "Could not locate this town" };
  }

  // Nominatim rate limit courtesy
  await new Promise((r) => setTimeout(r, 1100));

  const elements = await queryOverpass(geo.lat, geo.lon);
  const majorCities = nearestMajorCities(geo.lat, geo.lon, town.name, 3);
  const summary =
    buildLocationSummary(geo.lat, geo.lon, town.name, elements, majorCities) ||
    `${geo.displayName}`;

  const nearby = buildNearbyCategories(geo.lat, geo.lon, elements, majorCities);

  const mapCities = majorCities
    .filter((c) => c.tier <= 2 && c.distanceMi <= 100)
    .slice(0, 2)
    .map((c) => ({
      name: c.name,
      st: c.st,
      lat: c.lat,
      lon: c.lon,
      distanceMi: Math.round(c.distanceMi),
    }));

  const geoLayers = buildMapGeoLayers(geo.lat, geo.lon, elements);

  const payload = {
    ok: true,
    summary,
    coords: { lat: geo.lat, lon: geo.lon },
    boundary: geo.boundary,
    bbox: geo.bbox,
    nearbyCities: mapCities,
    geoLayers,
    nearby,
    townName: town.name,
    stateAbbr: stateAbbr || parseTownGeo(town, stateAbbr).state,
  };

  await writeCache(key, payload);
  return payload;
}
