// Server-side real photo resolution via Wikimedia Commons (free, no API key).
// Used by /api/images and /api/research to guarantee every town has a real photo.

import { geoImageQueries } from "@/lib/geo";
import { isValidImageUrl } from "@/lib/images";

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
 * @param {string} query
 * @returns {Promise<string|null>}
 */
export async function searchWikimediaPhoto(query) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url|size|mime",
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
    if (!isValidImageUrl(url)) continue;
    if (await verifyImageLoads(url)) return url.trim();
  }

  return null;
}

/**
 * Resolve a real landscape photo: town → county → state → US fallback.
 * @param {{ id?: string, name?: string, sub?: string, image?: string }} town
 * @param {string} [stateAbbr]
 * @param {string} [skipUrl] — skip this URL (already failed on client)
 */
export async function resolveTownPhoto(town, stateAbbr, skipUrl) {
  const cacheKey = `${town.id || town.name}:${stateAbbr || ""}:${skipUrl || ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (isValidImageUrl(town.image) && town.image !== skipUrl) {
    if (await verifyImageLoads(town.image)) {
      cache.set(cacheKey, town.image.trim());
      return town.image.trim();
    }
  }

  for (const query of geoImageQueries(town, stateAbbr)) {
    const found = await searchWikimediaPhoto(query);
    if (found && found !== skipUrl) {
      cache.set(cacheKey, found);
      return found;
    }
  }

  const fallback = await searchWikimediaPhoto("United States town landscape");
  const result = fallback && fallback !== skipUrl ? fallback : null;
  if (result) cache.set(cacheKey, result);
  return result;
}

/**
 * Ensure every town in a research result has a verified real image URL.
 * @param {Array<{ name?: string, sub?: string, image?: string }>} towns
 * @param {string} [stateAbbr]
 */
export async function enrichTownImages(towns, stateAbbr) {
  if (!Array.isArray(towns)) return towns;

  await Promise.all(
    towns.map(async (town) => {
      const image = await resolveTownPhoto(town, stateAbbr);
      if (image) town.image = image;
    })
  );

  return towns;
}

/** True when URL is from Wikimedia (a real location archive). */
export function isRealLocationPhoto(url) {
  return typeof url === "string" && /wikimedia\.org/i.test(url);
}
