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
const WIKI_FETCH_TIMEOUT_MS = 8000;
const WIKI_429_MAX_RETRIES = 2;
const WIKI_429_BACKOFF_MS = [2000, 4000];

/** @type {Map<string, string>} */
const cache = new Map();

let lastWikiAt = 0;
async function throttleWiki() {
  const wait = Math.max(0, 1100 - (Date.now() - lastWikiAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastWikiAt = Date.now();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Static fallback chain — no network. Registry → state/chain → US default.
 * @param {{ id?: string, name?: string, sub?: string, image?: string }} town
 * @param {string} [stateAbbr]
 */
export function pickStaticFallback(town, stateAbbr) {
  const registry = getRegistryImage(town, stateAbbr);
  if (registry && isValidImageUrl(registry) && isModernHeroPhoto(registry)) {
    return registry.trim();
  }

  const chain = getTownImageChain(town, stateAbbr);
  for (const url of chain) {
    if (isValidImageUrl(url) && isModernHeroPhoto(url)) return url.trim();
  }

  return US_FALLBACK_IMAGE;
}

async function wikiFetch(params) {
  if (process.env.SIMULATE_WIKI_429 === "1") {
    await throttleWiki();
    return null;
  }

  const url = `${WIKI_API}?${params}&format=json`;

  for (let attempt = 0; attempt <= WIKI_429_MAX_RETRIES; attempt++) {
    await throttleWiki();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WIKI_FETCH_TIMEOUT_MS);

      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        next: { revalidate: 86400 },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 429) {
        if (attempt < WIKI_429_MAX_RETRIES) {
          await sleep(WIKI_429_BACKOFF_MS[attempt] ?? 4000);
          continue;
        }
        return null;
      }

      if (!res.ok) return null;

      const text = await res.text();
      if (text.startsWith("You are making")) return null;

      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    } catch {
      if (attempt < WIKI_429_MAX_RETRIES) {
        await sleep(WIKI_429_BACKOFF_MS[attempt] ?? 4000);
        continue;
      }
      return null;
    }
  }

  return null;
}

/** @param {string} url */
export async function verifyImageLoads(url) {
  if (!isValidImageUrl(url)) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WIKI_FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": UA },
      signal: controller.signal,
    });
    clearTimeout(timer);
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
  try {
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

      const imageUrl = info.thumburl || info.url;
      const title = page.title || "";
      if (!isValidImageUrl(imageUrl)) continue;
      if (skipUrls.has(imageUrl.trim())) continue;
      if (!isModernHeroPhoto(imageUrl, title)) continue;
      if (await verifyImageLoads(imageUrl)) return imageUrl.trim();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Resolve a modern landscape photo: registry → search → state downtown → US fallback.
 * Never throws; always returns a usable URL via pickStaticFallback when network fails.
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
    try {
      if (!(await verifyImageLoads(url))) return null;
    } catch {
      return null;
    }
    cache.set(cacheKey, url);
    return url;
  };

  try {
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
    for (const chainUrl of imageChain) {
      if (chainUrl === US_FALLBACK_IMAGE) continue;
      const ok = await tryUrl(chainUrl);
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
  } catch {
    // Fall through to static fallback.
  }

  const staticFallback = pickStaticFallback(town, stateAbbr);
  cache.set(cacheKey, staticFallback);
  return staticFallback;
}

/**
 * Ensure every town in a research result has a verified real image URL.
 * Processes towns sequentially; never throws.
 * @param {Array<{ name?: string, sub?: string, image?: string }>} towns
 * @param {string} [stateAbbr]
 */
export async function enrichTownImages(towns, stateAbbr) {
  if (!Array.isArray(towns)) return towns;

  for (const town of towns) {
    try {
      const image = await resolveTownPhoto(town, stateAbbr);
      town.image = image || pickStaticFallback(town, stateAbbr);
    } catch {
      town.image = pickStaticFallback(town, stateAbbr);
    }
  }

  return towns;
}

/** True when URL is from Wikimedia (a real location archive). */
export function isRealLocationPhoto(url) {
  return typeof url === "string" && /wikimedia\.org/i.test(url);
}
