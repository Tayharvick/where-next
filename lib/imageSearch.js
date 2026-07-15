// Server-side real photo resolution via Wikimedia Commons (free, no API key).
// Used by /api/images and /api/research to guarantee every town has a real photo.

import { US } from "@/lib/data";
import { geoImageQueries, parseTownGeo } from "@/lib/geo";
import {
  getRegistryImage,
  getTownImageChain,
  isModernHeroPhoto,
  isValidImageUrl,
  STATE_IMAGES,
  US_FALLBACK_IMAGE,
} from "@/lib/images";

const WIKI_API = "https://commons.wikimedia.org/w/api.php";
const UA = "WhereNext/1.0 (relocation scout; contact: local-dev)";

/** @type {Map<string, string>} */
const cache = new Map();

let lastWikiAt = 0;
async function throttleWiki() {
  const wait = Math.max(0, 1100 - (Date.now() - lastWikiAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastWikiAt = Date.now();
}

async function wikiFetch(params) {
  await throttleWiki();
  const url = `${WIKI_API}?${params}&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Wikimedia API ${res.status}`);
  const text = await res.text();
  if (text.startsWith("You are making")) return null;
  return JSON.parse(text);
}

/** @param {string} url */
export async function verifyImageLoads(url) {
  if (!isValidImageUrl(url)) return false;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": UA },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Search Wikimedia for modern, color town photos — skips archival / pre-1980 results.
 * @param {string} query
 * @param {Set<string>} [skipUrls]
 * @returns {Promise<string|null>}
 */
export async function searchWikimediaPhoto(query, skipUrls = new Set()) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "25",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1400",
  });

  const data = await wikiFetch(params.toString());
  if (!data) return null;
  const pages = data.query?.pages;
  if (!pages) return null;

  const sorted = Object.values(pages).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

  for (const page of sorted) {
    const info = page.imageinfo?.[0];
    if (!info?.mime?.startsWith("image/")) continue;

    const w = info.thumbwidth || info.width || 0;
    const h = info.thumbheight || info.height || 0;
    if (w && h && h > w * 1.05) continue;

    const url = info.thumburl || info.url;
    const title = page.title || "";
    if (!isValidImageUrl(url)) continue;
    if (skipUrls.has(url.trim())) continue;
    if (!isModernHeroPhoto(url, title)) continue;
    if (await verifyImageLoads(url)) return url.trim();
  }

  return null;
}

/**
 * Resolve a modern landscape photo: registry → search → state downtown → US fallback.
 * Never returns archival or pre-1980 photography.
 * @param {{ id?: string, name?: string, sub?: string, image?: string }} town
 * @param {string} [stateAbbr]
 * @param {string} [skipUrl] — skip this URL (already failed on client)
 */
export async function resolveTownPhoto(town, stateAbbr, skipUrl) {
  const cacheKey = `${town.id || town.name}:${stateAbbr || ""}:${skipUrl || ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const skip = new Set(skipUrl ? [skipUrl] : []);

  const tryUrl = async (url, title = "") => {
    if (!url || skip.has(url)) return null;
    if (!isModernHeroPhoto(url, title)) return null;
    if (!(await verifyImageLoads(url))) return null;
    cache.set(cacheKey, url);
    return url;
  };

  if (isValidImageUrl(town.image)) {
    const ok = await tryUrl(town.image.trim());
    if (ok) return ok;
  }

  const registry = getRegistryImage(town, stateAbbr);
  if (registry) {
    const ok = await tryUrl(registry);
    if (ok) return ok;
  }

  for (const query of geoImageQueries(town, stateAbbr)) {
    const found = await searchWikimediaPhoto(query, skip);
    if (found) {
      cache.set(cacheKey, found);
      return found;
    }
  }

  const imageChain = getTownImageChain(town, stateAbbr);
  for (const url of imageChain) {
    if (url === US_FALLBACK_IMAGE) continue;
    const ok = await tryUrl(url);
    if (ok) return ok;
  }

  const geo = parseTownGeo(town, stateAbbr);
  if (geo.state && STATE_IMAGES[geo.state]) {
    const ok = await tryUrl(STATE_IMAGES[geo.state]);
    if (ok) return ok;
  }

  const st = geo.stateName || (geo.state ? US[geo.state] : null);
  if (st) {
    const stateDowntown = await searchWikimediaPhoto(`${st} downtown main street`, skip);
    if (stateDowntown) {
      cache.set(cacheKey, stateDowntown);
      return stateDowntown;
    }
  }

  const fallback = await searchWikimediaPhoto("United States downtown main street", skip);
  if (fallback && isModernHeroPhoto(fallback)) {
    cache.set(cacheKey, fallback);
    return fallback;
  }

  if (isModernHeroPhoto(US_FALLBACK_IMAGE)) {
    cache.set(cacheKey, US_FALLBACK_IMAGE);
    return US_FALLBACK_IMAGE;
  }

  return null;
}

/**
 * Ensure every town in a research result has a verified real image URL.
 * @param {Array<{ name?: string, sub?: string, image?: string }>} towns
 * @param {string} [stateAbbr]
 * @param {(step: string, detail?: object) => void} [onLog]
 */
export async function enrichTownImages(towns, stateAbbr, onLog) {
  if (!Array.isArray(towns)) return towns;

  const log = (step, detail = {}) => onLog?.(step, detail);

  await Promise.all(
    towns.map(async (town, index) => {
      const townLabel = town.name || town.id || `town_${index}`;
      try {
        log("town_start", { town: townLabel, index });
        const image = await resolveTownPhoto(town, stateAbbr);
        if (image) town.image = image;
        log("town_complete", { town: townLabel, index, hasImage: Boolean(image) });
      } catch (err) {
        log("town_failed", {
          town: townLabel,
          index,
          errorMessage: err?.message,
          stack: err?.stack,
        });
        throw err;
      }
    })
  );

  return towns;
}

/** True when URL is from Wikimedia (a real location archive). */
export function isRealLocationPhoto(url) {
  return typeof url === "string" && /wikimedia\.org/i.test(url);
}
