// Location photography — hero, registry, and geographic fallbacks.
// Real town photos are resolved server-side via lib/imageSearch.js (Wikimedia Commons).

import { US } from "@/lib/data";
import { parseTownGeo } from "@/lib/geo";

/** Homepage hero — local asset only (public/images/home-hero.jpg). */
export const HERO_IMAGE = "/images/home-hero.jpg";

/** Static editorial image for homepage Featured Scout Report teaser. */
export const FEATURED_SCOUT_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Church_of_the_Cross_in_Bluffton%2C_SC.jpg/1920px-Church_of_the_Cross_in_Bluffton%2C_SC.jpg";

/** Generic non-city landscape — final fallback in every chain. */
export const US_FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Foggy_countryside_%28Unsplash%29.jpg/1920px-Foggy_countryside_%28Unsplash%29.jpg";

/** Optional pre-resolved town photos (must be verified HTTPS Wikimedia URLs). */
export const TOWN_IMAGES = {
  knoxville:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Downtown_Knoxville.jpg/1920px-Downtown_Knoxville.jpg",
  coolidge:
    "https://upload.wikimedia.org/wikipedia/commons/7/72/Main_Street_-15_Repurposing_%283406977882%29.jpg",
  johnsoncity:
    "https://upload.wikimedia.org/wikipedia/commons/c/c7/Market_from_Buffalo%2C_Johnson_City.jpg",
  wildwood:
    "https://upload.wikimedia.org/wikipedia/commons/5/58/Wildwood_gazebo01.jpg",
  tontitown:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/St._Joseph_Catholic_Church%2C_Tontitown%2C_AR.JPG/1920px-St._Joseph_Catholic_Church%2C_Tontitown%2C_AR.JPG",
  hoschton:
    "https://upload.wikimedia.org/wikipedia/commons/d/d0/74_White_St_Hoschton_Oct_2012.jpg",
};

/** Verified state landscape fallbacks (Wikimedia Commons) — no city downtowns. */
export const STATE_LANDSCAPE_IMAGES = {
  AR: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Dry_Arkansas_River.jpg/1920px-Dry_Arkansas_River.jpg",
  NV: "https://upload.wikimedia.org/wikipedia/commons/b/be/Nevada_desert.jpg",
  FL: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Everglades_national_park.jpg/1920px-Everglades_national_park.jpg",
  MT: "https://upload.wikimedia.org/wikipedia/commons/0/07/Mixed_grass_prairie_Fort_Smith_Montana.jpg",
  AL: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Scenery_and_Landscapes_-_Alabama_-_DPLA_-_0e65d5ff9383881187d08e0bfe38dd79.jpg/1920px-Scenery_and_Landscapes_-_Alabama_-_DPLA_-_0e65d5ff9383881187d08e0bfe38dd79.jpg",
  GA: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Chattahoochee_NF.jpg",
  TN: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Meadow_in_the_Smoky_Mountains_%2841923p%29.jpg/1920px-Meadow_in_the_Smoky_Mountains_%2841923p%29.jpg",
  AZ: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Sonoran_Desert_National_Monument_%2826095682523%29.jpg/1920px-Sonoran_Desert_National_Monument_%2826095682523%29.jpg",
};

/** @deprecated Use STATE_LANDSCAPE_IMAGES */
export const STATE_IMAGES = STATE_LANDSCAPE_IMAGES;

export const DEFAULT_TOWN_IMAGE = US_FALLBACK_IMAGE;

export const STAGE_IMAGES = {
  early: US_FALLBACK_IMAGE,
  heating: US_FALLBACK_IMAGE,
  late: US_FALLBACK_IMAGE,
};

/** @param {unknown} url */
export function isValidImageUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" || !parsed.hostname) return false;
    if (/^(localhost|127\.0\.0\.1|example\.|.*\.invalid)$/i.test(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Normalize town id/name for registry lookup (case, spaces, trailing state). */
export function normalizeTownLookupKey(value) {
  if (typeof value !== "string") return "";
  let key = value.trim().toLowerCase();
  const abbrs = Object.keys(US).join("|");
  key = key.replace(new RegExp(`,?\\s*(${abbrs})\\s*$`, "i"), "");
  key = key.replace(/[^a-z0-9]/g, "");
  return key;
}

/**
 * @param {{ id?: string, name?: string, sub?: string }} town
 * @param {string} [stateAbbr]
 */
export function getRegistryImage(town, stateAbbr) {
  const geo = parseTownGeo(town, stateAbbr);
  const candidates = [
    town.id,
    town.name,
    town.name && geo.state ? `${town.name} ${geo.state}` : null,
    town.name && geo.stateName ? `${town.name} ${geo.stateName}` : null,
  ];

  for (const candidate of candidates) {
    const key = normalizeTownLookupKey(candidate);
    if (key && TOWN_IMAGES[key]) return TOWN_IMAGES[key];
  }
  return null;
}

/**
 * Ordered fallback chain: registry → town.image → state landscape → US default.
 * Preserves geographic priority — never re-sorts by scenic score alone.
 * @param {{ id?: string, image?: string, sub?: string, name?: string }} town
 * @param {string} [stateAbbr]
 * @returns {string[]}
 */
export function getTownImageChain(town, stateAbbr) {
  const geo = parseTownGeo(town, stateAbbr);
  const chain = [];
  const seen = new Set();

  const push = (url, title = "", options = {}) => {
    if (!isValidImageUrl(url) || !isModernHeroPhoto(url, title)) return;
    const trimmed = url.trim();
    const { tier } = classifyHeroRelevance(trimmed, title, town, stateAbbr, options);
    if (tier === 99 || seen.has(trimmed)) return;
    seen.add(trimmed);
    chain.push(trimmed);
  };

  push(getRegistryImage(town, stateAbbr), "", { isRegistry: true });

  if (isValidImageUrl(town.image)) {
    push(town.image.trim());
  }

  if (geo.state && STATE_LANDSCAPE_IMAGES[geo.state]) {
    push(STATE_LANDSCAPE_IMAGES[geo.state], "", { isStateLandscape: true });
  }

  push(US_FALLBACK_IMAGE, "", { isUsFallback: true });

  return chain.length ? chain : [US_FALLBACK_IMAGE];
}

/**
 * @param {{ id?: string, image?: string, sub?: string, name?: string }} town
 * @param {string} [stateAbbr]
 */
export function getTownImage(town, stateAbbr) {
  return getTownImageChain(town, stateAbbr)[0];
}

/**
 * Next URL in the chain after one or more failures.
 * @param {{ id?: string, image?: string, sub?: string, name?: string }} town
 * @param {string} [failedUrl]
 * @param {string} [stateAbbr]
 * @param {Set<string>|string[]} [failedSet]
 */
export function getTownImageFallback(town, failedUrl, stateAbbr, failedSet) {
  const chain = getTownImageChain(town, stateAbbr);
  const failed = new Set(failedSet || []);
  if (failedUrl) failed.add(failedUrl);
  for (const url of chain) {
    if (!failed.has(url)) return url;
  }
  return US_FALLBACK_IMAGE;
}

export const IMAGE_PROMPT_RULE =
  '"image" must be a direct HTTPS URL to a real photo of THAT specific town or a recognizable local landmark within it. Never use photos of other cities or generic downtown/main-street placeholders unrelated to the town. Wikimedia Commons preferred. Never use maps, county outlines, seals, logos, satellite imagery, infographics, or text-heavy graphics. Never leave image empty.';

function heroPhotoHaystack(url, title = "") {
  let decoded = "";
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  return `${url} ${decoded} ${title}`.toLowerCase();
}

/**
 * Rank hero candidates — higher = more "want to live here" (streetscape over civic buildings).
 * @returns {number}
 */
export function scoreTownHeroPhoto(url, title = "") {
  const hay = heroPhotoHaystack(url, title);
  let score = 50;

  const boosts = [
    [/main[_\s-]?street|mainstreet/, 42],
    [/downtown/, 38],
    [/historic[_\s-]?(district|square|downtown)/, 32],
    [/waterfront|riverfront|harbor|harbour|marina|lakefront|beachfront|boardwalk/, 36],
    [/\b(lake|river|bay|ocean|coast|shore)\b/, 22],
    [/mountain|mountains|ozark|alps|valley|scenic|panorama|overlook/, 28],
    [/neighborhood|streetscape|street[_\s-]?view|avenue|boulevard|promenade/, 24],
    [/town[_\s-]?square|city[_\s-]?square|public[_\s-]?square|gazebo/, 26],
    [/park(?!ing)/, 14],
    [/skyline|cityscape|urban[_\s-]?core/, 20],
    [/storefront|shopfront|commercial[_\s-]?district/, 18],
    [/waterfall|canyon|trail|forest|meadow/, 16],
  ];

  const penalties = [
    [/\b(church|cathedral|chapel|parish|basilica|steeple|synagogue|mosque|temple)\b/, 38],
    [/\b(courthouse|city[_\s-]?hall|capitol|municipal|government|county[_\s-]?building)\b/, 34],
    [/\b(school[_\s-]?building|high[_\s-]?school|elementary[_\s-]?school|university[_\s-]?hall)\b/, 18],
    [/\bcemetery|graveyard|tombstone|headstone\b/, 28],
    [/\b(post[_\s-]?office|fire[_\s-]?station|police[_\s-]?station|jail|prison)\b/, 22],
    [/\b(interior|inside|indoor|room|auditorium)\b/, 20],
  ];

  for (const [re, pts] of boosts) {
    if (re.test(hay)) score += pts;
  }
  for (const [re, pts] of penalties) {
    if (re.test(hay)) score -= pts;
  }

  return score;
}

/** Cities from old state-downtown URLs and other registry entries — reject when not the featured town. */
const LEGACY_DOWNTOWN_CITIES = [
  "fayetteville",
  "knoxville",
  "reno",
  "bozeman",
  "birmingham",
  "athens",
  "coolidge",
  "johnsoncity",
  "johnson city",
  "wildwood",
  "hoschton",
  "tontitown",
  "st augustine",
  "san marcos",
  "castillo",
  "bluffton",
  "galena",
];

/** Major metros — reject when the haystack names them but the featured town is different. */
const MAJOR_METRO_CITIES = [
  "atlanta",
  "chicago",
  "los angeles",
  "new york",
  "houston",
  "phoenix",
  "philadelphia",
  "san antonio",
  "san diego",
  "dallas",
  "austin",
  "jacksonville",
  "charlotte",
  "seattle",
  "denver",
  "nashville",
  "memphis",
  "miami",
  "orlando",
  "tampa",
  "las vegas",
  "portland",
  "boston",
  "detroit",
  "minneapolis",
  "montgomery",
  "mobile",
  "little rock",
  "bentonville",
  "chattanooga",
  "billings",
  "missoula",
  "helena",
  "kalispell",
  "savannah",
  "augusta",
  "macon",
  "tucson",
  "scottsdale",
  "flagstaff",
  "birmingham",
  "huntsville",
  "montgomery",
];

const LANDMARK_KEYWORDS = [
  /\b(church|cathedral|chapel|parish|basilica|steeple|synagogue|mosque|temple)\b/,
  /\b(courthouse|city[_\s-]?hall|capitol|municipal|government|county[_\s-]?building)\b/,
  /\bhistoric[_\s-]?(district|square|downtown|site|building|home|house)\b/,
  /\b(gazebo|monument|memorial|museum)\b/,
];

const SCENIC_KEYWORDS = [
  /\b(scenic|panorama|overlook|vista|view)\b/,
  /\b(waterfront|riverfront|harbor|harbour|marina|lakefront|beachfront|boardwalk)\b/,
  /\b(mountain|mountains|ozark|valley|meadow|forest|trail|canyon|waterfall)\b/,
  /\b(downtown|main[_\s-]?street|mainstreet|streetscape|neighborhood|town[_\s-]?square)\b/,
  /\b(park(?!ing)|garden|gardens|square|plaza)\b/,
];

const LANDSCAPE_KEYWORDS = [
  /\b(landscape|scenery|scenic)\b/,
  /\b(desert|prairie|everglades|river|mountain|meadow|forest|national[_\s-]?park)\b/,
  /\b(countryside|wilderness|wildlife|wetland|marsh|glade)\b/,
];

function normalizeGeoToken(value) {
  if (typeof value !== "string") return "";
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function townNameTokens(name) {
  if (typeof name !== "string") return [];
  return name
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
}

function haystackContainsToken(hay, token) {
  if (!token || token.length < 3) return false;
  return hay.includes(token);
}

function townMatchesHaystack(hay, townName) {
  const tokens = townNameTokens(townName);
  if (!tokens.length) return false;
  if (tokens.length === 1) return haystackContainsToken(hay, tokens[0]);
  return tokens.every((t) => haystackContainsToken(hay, t));
}

function isFeaturedTownToken(town, token) {
  const featured = new Set([
    normalizeTownLookupKey(town.id || ""),
    normalizeTownLookupKey(town.name || ""),
    ...townNameTokens(town.name || ""),
    ...townNameTokens(town.id || ""),
  ]);
  return featured.has(token.replace(/[^a-z0-9]/g, ""));
}

/**
 * Terms that indicate a photo is of a different place than the featured town.
 * @param {{ id?: string, name?: string }} town
 */
export function getForeignCityTerms(town) {
  const featuredKey = normalizeTownLookupKey(town.name || town.id || "");
  const terms = new Set();

  for (const key of Object.keys(TOWN_IMAGES)) {
    if (key !== featuredKey) terms.add(key);
  }

  for (const city of [...LEGACY_DOWNTOWN_CITIES, ...MAJOR_METRO_CITIES]) {
    terms.add(normalizeGeoToken(city));
  }

  for (const token of townNameTokens(town.name || "")) {
    terms.delete(token);
  }
  if (featuredKey) terms.delete(featuredKey);

  return [...terms].filter((t) => t.length >= 4);
}

/** @param {string} hay */
export function containsForeignCity(hay, town) {
  for (const term of getForeignCityTerms(town)) {
    if (haystackContainsToken(hay, term) && !isFeaturedTownToken(town, term)) {
      return true;
    }
  }
  return false;
}

/**
 * Geographic relevance tier for hero photo selection (lower = better).
 * @param {string} url
 * @param {string} [title]
 * @param {{ id?: string, name?: string, sub?: string }} town
 * @param {string} [stateAbbr]
 * @param {{ isRegistry?: boolean, isStateLandscape?: boolean, isUsFallback?: boolean }} [options]
 * @returns {{ tier: number }}
 */
export function classifyHeroRelevance(url, title = "", town, stateAbbr, options = {}) {
  if (!url || typeof url !== "string") return { tier: 99 };

  const trimmed = url.trim();
  const hay = heroPhotoHaystack(trimmed, title);
  const geo = parseTownGeo(town, stateAbbr);
  const townName = town.name || "";

  if (isGraphicHeroReject(trimmed, title)) return { tier: 99 };
  if (containsForeignCity(hay, town)) return { tier: 99 };

  const genericDowntown =
    /\bdowntown\b/.test(hay) || /\bmain[_\s-]?street\b/.test(hay) || /\bmainstreet\b/.test(hay);
  if (genericDowntown && !townMatchesHaystack(hay, townName)) {
    const countyToken = geo.county ? normalizeGeoToken(geo.county) : "";
    if (!countyToken || !haystackContainsToken(hay, countyToken)) {
      return { tier: 99 };
    }
  }

  if (options.isUsFallback || trimmed === US_FALLBACK_IMAGE) return { tier: 6 };

  const registryUrl = getRegistryImage(town, stateAbbr);
  if (options.isRegistry || (registryUrl && trimmed === registryUrl.trim())) {
    return { tier: 1 };
  }

  if (options.isStateLandscape || (geo.state && STATE_LANDSCAPE_IMAGES[geo.state] === trimmed)) {
    return { tier: 5 };
  }

  const townMatch = townMatchesHaystack(hay, townName);
  if (townMatch) {
    if (LANDMARK_KEYWORDS.some((re) => re.test(hay))) return { tier: 2 };
    if (SCENIC_KEYWORDS.some((re) => re.test(hay))) return { tier: 3 };
    return { tier: 1 };
  }

  const countyToken = geo.county ? normalizeGeoToken(geo.county) : "";
  if (countyToken && haystackContainsToken(hay, countyToken)) {
    return { tier: 4 };
  }

  const stateNameToken = geo.stateName ? normalizeGeoToken(geo.stateName) : "";
  const stateAbbrHay = geo.state ? geo.state.toLowerCase() : "";
  const stateInHay =
    (stateNameToken && haystackContainsToken(hay, stateNameToken)) ||
    (stateAbbrHay && new RegExp(`\\b${stateAbbrHay}\\b`).test(hay));

  if (stateInHay && LANDSCAPE_KEYWORDS.some((re) => re.test(hay))) {
    return { tier: 5 };
  }

  return { tier: 99 };
}

/** Pick the best hero photo — tier first, then scenic score, then search rank. */
export function pickBestHeroPhoto(candidates, town, stateAbbr) {
  const ranked = candidates
    .map((c) => {
      const tier =
        c.tier ??
        classifyHeroRelevance(c.url, c.title || "", town, stateAbbr, c.options).tier;
      return { ...c, tier };
    })
    .filter((c) => c?.url && c.tier !== 99 && isModernHeroPhoto(c.url, c.title || "", c.size))
    .sort((a, b) => {
      const tierDiff = a.tier - b.tier;
      if (tierDiff !== 0) return tierDiff;
      const scoreDiff =
        (b.score ?? scoreTownHeroPhoto(b.url, b.title)) -
        (a.score ?? scoreTownHeroPhoto(a.url, a.title));
      if (scoreDiff !== 0) return scoreDiff;
      return (a.rank ?? 99) - (b.rank ?? 99);
    });

  return ranked;
}

/** Reject maps, diagrams, logos, and other non-photographic hero candidates. */
export function isGraphicHeroReject(url, title = "") {
  if (!url || typeof url !== "string") return true;

  let decoded = "";
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  const hay = `${url} ${decoded} ${title}`;

  const blockPatterns = [
    /\.svg(?:$|[?#])/i,
    /image\/svg/i,
    /\bmap\b/i,
    /\bmaps\b/i,
    /\blocator\b/i,
    /\bboundary\b/i,
    /\bboundaries\b/i,
    /\boutline\b/i,
    /\bhighlighted\b/i,
    /incorporated.and.unincorporated/i,
    /unincorporated.areas/i,
    /senate_district/i,
    /congressional_district/i,
    /legislative_district/i,
    /gerrymand/i,
    /\btopographic\b/i,
    /\bsatellite\b/i,
    /\blandsat\b/i,
    /\baerial\b.*\b(map|imagery|survey)\b/i,
    /seal_of/i,
    /official_seal/i,
    /\b(city|county|state|town)_seal\b/i,
    /\bseal\b.*\b(city|county|state|town)\b/i,
    /\blogo\b/i,
    /\bwordmark\b/i,
    /coat_of_arms/i,
    /infographic/i,
    /\bchart\b/i,
    /\bdiagram\b/i,
    /\bschematic\b/i,
    /dot-map/i,
    /locator_map/i,
    /location_map/i,
    /blank_map/i,
    /flag_map/i,
    /pushpin/i,
    /openstreetmap/i,
    /route_shield/i,
    /highway_shield/i,
    /\bscreenshot\b/i,
    /population_pyramid/i,
    /\bcensus.*map\b/i,
    /\bpopulation.density\b/i,
    /\bdemographics\b/i,
    /\bstatistical\b/i,
    /_map\./i,
    /-map\./i,
    /\/map[_-]/i,
    /Map_of_/i,
    /Highlighted\.svg/i,
    /Highlight\.svg/i,
    /\.gif(?:$|[?#])/i,
    /PD-icon/i,
    /Pie_chart/i,
    /Bar_chart/i,
    /QR_code/i,
  ];

  return blockPatterns.some((re) => re.test(hay));
}

/** @param {{ width?: number, height?: number }} [size] */
export function isHeroResolutionOk(size) {
  if (!size) return true;
  const { width = 0, height = 0 } = size;
  if (!width && !height) return true;
  const minSide = Math.min(width || height, height || width);
  const maxSide = Math.max(width || height, height || width);
  if (minSide > 0 && minSide < 480) return false;
  if (maxSide > 0 && maxSide < 640) return false;
  return true;
}

/** Reject archival, vintage, or pre-~1980 hero candidates (URL + optional Commons title). */
export function isModernHeroPhoto(url, title = "", size) {
  if (!isValidImageUrl(url)) return false;
  if (isGraphicHeroReject(url, title)) return false;
  if (!isHeroResolutionOk(size)) return false;

  let decoded = "";
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  const hay = `${url} ${decoded} ${title}`;

  const blockPatterns = [
    /\bNARA\b/i,
    /\bHABS\b/i,
    /\bHAER\b/i,
    /Historic American/i,
    /Dorothea Lange/i,
    /Bureau of Agricultural/i,
    /cotton harvest/i,
    /migrant cotton/i,
    /Works Progress/i,
    /sepia/i,
    /black.?and.?white/i,
    /\bb&w\b/i,
    /\bmonochrome\b/i,
    /vintage/i,
    /archival/i,
    /documentary/i,
    /\bprotest\b/i,
    /\bparade\b/i,
    /- NARA -/i,
    /_NARA_/i,
    /\.tif(?:$|[?#])/i,
    /\b18[0-9]{2}\b/,
    /\bcirca\s+19[0-6]/i,
    /\b(19[0-6]\d|197[0-9])\b(?=.*(?:photo|photograph|image|jpg|jpeg|png|NARA|HABS|harvest|archive))/i,
  ];

  if (blockPatterns.some((re) => re.test(hay))) return false;

  const years = [];
  for (const match of hay.matchAll(/(?:^|[^0-9])((19|20)\d{2})/g)) {
    const year = Number(match[1]);
    if (year < 1900 || year > 2099) continue;
    const after = hay.slice(match.index + match[0].length, match.index + match[0].length + 2);
    if (/^px/i.test(after)) continue;
    years.push(year);
  }
  if (years.length && years.every((y) => y < 1980)) return false;

  return true;
}
