// Location photography — hero, registry, and geographic fallbacks.
// Real town photos are resolved server-side via lib/imageSearch.js (Wikimedia Commons).

import { US } from "@/lib/data";
import { parseTownGeo } from "@/lib/geo";

export const HERO_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Littleton_Main_Street.JPG/1920px-Littleton_Main_Street.JPG";

/** Verified real landscape — final fallback in every chain. */
export const US_FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Downtown_Knoxville.jpg/1920px-Downtown_Knoxville.jpg";

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
    "https://upload.wikimedia.org/wikipedia/commons/5/52/Tontitown_School_Building.JPG",
  hoschton:
    "https://upload.wikimedia.org/wikipedia/commons/d/d0/74_White_St_Hoschton_Oct_2012.jpg",
};

/** Verified regional/state fallbacks (Wikimedia Commons). */
export const STATE_IMAGES = {
  FL: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Castillo_de_San_Marcos_Fort_Panorama_1.jpg/1920px-Castillo_de_San_Marcos_Fort_Panorama_1.jpg",
  NV: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Downtown_Reno%2C_Nevada_%2818893298894%29.jpg/1920px-Downtown_Reno%2C_Nevada_%2818893298894%29.jpg",
  MT: "https://upload.wikimedia.org/wikipedia/commons/7/71/101_E_Main_-_Bozeman_Montana_-_2013-07-09.jpg",
  AL: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Birmingham%2C_Alabama_%282023%29.jpg/1920px-Birmingham%2C_Alabama_%282023%29.jpg",
  GA: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Athens%2C_Georgia_-_College_Avenue_and_Clayton_Street.jpg",
  TN: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Downtown_Knoxville.jpg/1920px-Downtown_Knoxville.jpg",
};

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
 * Ordered fallback chain: town.image → registry → state → default.
 * @param {{ id?: string, image?: string, sub?: string, name?: string }} town
 * @param {string} [stateAbbr]
 * @returns {string[]}
 */
export function getTownImageChain(town, stateAbbr) {
  const chain = [];
  const push = (url, title = "") => {
    if (isValidImageUrl(url) && isModernHeroPhoto(url, title) && !chain.includes(url.trim())) {
      chain.push(url.trim());
    }
  };

  const geo = parseTownGeo(town, stateAbbr);

  push(town.image);
  push(getRegistryImage(town, stateAbbr));
  if (geo.state) push(STATE_IMAGES[geo.state]);
  push(US_FALLBACK_IMAGE);

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
  '"image" must be a direct HTTPS URL to a real photo of the town or a recognizable local landmark. Wikimedia Commons preferred. Never leave image empty.';

/** Reject archival, vintage, or pre-~1980 hero candidates (URL + optional Commons title). */
export function isModernHeroPhoto(url, title = "") {
  if (!isValidImageUrl(url)) return false;

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

  const yearMatches = hay.match(/(?:^|[^0-9])((19|20)\d{2})(?:[^0-9]|$)/g);
  if (yearMatches) {
    const years = yearMatches
      .map((m) => Number(m.replace(/\D/g, "")))
      .filter((y) => y >= 1900 && y <= 2099);
    if (years.length && years.every((y) => y < 1980)) return false;
  }

  return true;
}
