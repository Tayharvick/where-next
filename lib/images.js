// Location photography — hero, registry, and geographic fallbacks.
// Real town photos are resolved server-side via lib/imageSearch.js (Wikimedia Commons).

import { parseTownGeo } from "@/lib/geo";

export const HERO_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Downtown_Knoxville.jpg/1920px-Downtown_Knoxville.jpg";

/** Verified real landscape — used only until API/geo search resolves. */
export const US_FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Downtown_Knoxville.jpg/1920px-Downtown_Knoxville.jpg";

/** Optional pre-resolved town photos (must be verified HTTPS Wikimedia URLs). */
export const TOWN_IMAGES = {
  knoxville:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Downtown_Knoxville.jpg/1920px-Downtown_Knoxville.jpg",
};

/** Optional pre-resolved state photos — populated as verified; API search fills gaps. */
export const STATE_IMAGES = {};

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

/**
 * @param {{ id?: string, image?: string, sub?: string, name?: string }} town
 * @param {string} [stateAbbr]
 * @returns {string[]}
 */
export function getTownImageChain(town, stateAbbr) {
  const chain = [];
  const push = (url) => {
    if (isValidImageUrl(url) && !chain.includes(url.trim())) chain.push(url.trim());
  };

  const geo = parseTownGeo(town, stateAbbr);

  push(town.image);
  if (town.id) push(TOWN_IMAGES[town.id]);
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
 * @param {{ id?: string, image?: string, sub?: string, name?: string }} town
 * @param {string} failedUrl
 * @param {string} [stateAbbr]
 */
export function getTownImageFallback(town, failedUrl, stateAbbr) {
  const chain = getTownImageChain(town, stateAbbr);
  const idx = chain.indexOf(failedUrl);
  if (idx >= 0 && idx < chain.length - 1) return chain[idx + 1];
  return US_FALLBACK_IMAGE;
}

export const IMAGE_PROMPT_RULE =
  '"image" must be a direct HTTPS URL to a real photo of the town or a recognizable local landmark. Wikimedia Commons preferred. Never leave image empty.';
