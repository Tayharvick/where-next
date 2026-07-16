// Server-side real photo resolution via Wikimedia Commons (free, no API key).
// Used by /api/images and /api/research to guarantee every town has a real photo.

import { geoImageQueries } from "@/lib/geo";
import {
  classifyHeroRelevance,
  getRegistryImage,
  getTownImageChain,
  isModernHeroPhoto,
  isValidImageUrl,
  pickBestHeroPhoto,
  scoreTownHeroPhoto,
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
 * Collect tier-scored Wikimedia photo candidates for a query (no network verify).
 * @param {string} query
 * @param {Set<string>} [skipUrls]
 * @param {{ id?: string, name?: string, sub?: string }} [town]
 * @param {string} [stateAbbr]
 */
export async function collectWikimediaCandidates(query, skipUrls = new Set(), town = {}, stateAbbr) {
  const candidates = [];

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
    if (!data) return candidates;
    const pages = data.query?.pages;
    if (!pages) return candidates;

    const sorted = Object.values(pages).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

    sorted.forEach((page, rank) => {
      const info = page.imageinfo?.[0];
      if (!info?.mime?.startsWith("image/")) return;
      if (info.mime === "image/svg+xml" || info.mime === "image/gif") return;

      const w = info.thumbwidth || info.width || 0;
      const h = info.thumbheight || info.height || 0;
      if (w && h && h > w * 1.05) return;

      const imageUrl = info.thumburl || info.url;
      const title = page.title || "";
      const size = { width: w, height: h };
      if (!isValidImageUrl(imageUrl)) return;
      if (skipUrls.has(imageUrl.trim())) return;
      if (!isModernHeroPhoto(imageUrl, title, size)) return;

      const url = imageUrl.trim();
      const { tier } = classifyHeroRelevance(url, title, town, stateAbbr);
      if (tier === 99) return;

      candidates.push({
        url,
        title,
        size,
        tier,
        score: scoreTownHeroPhoto(url, title),
        rank,
      });
    });
  } catch {
    return candidates;
  }

  return candidates;
}

/**
 * Search Wikimedia for the best geographically relevant town photo for a query.
 * @param {string} query
 * @param {Set<string>} [skipUrls]
 * @param {{ id?: string, name?: string, sub?: string }} [town]
 * @param {string} [stateAbbr]
 */
export async function searchWikimediaPhoto(query, skipUrls = new Set(), town = {}, stateAbbr) {
  const candidates = await collectWikimediaCandidates(query, skipUrls, town, stateAbbr);
  const ranked = pickBestHeroPhoto(candidates, town, stateAbbr);

  for (const item of ranked) {
    if (await verifyImageLoads(item.url)) return item.url;
  }

  return null;
}

function mergeCandidate(map, item) {
  const prev = map.get(item.url);
  if (
    !prev ||
    item.tier < prev.tier ||
    (item.tier === prev.tier &&
      (item.score > prev.score || (item.score === prev.score && item.rank < prev.rank)))
  ) {
    map.set(item.url, item);
  }
}

/**
 * Resolve a geographically accurate hero photo: registry → Wikimedia search → static chain.
 * Never throws; always returns a usable URL via pickStaticFallback when network fails.
 * @param {{ id?: string, name?: string, sub?: string, image?: string }} town
 * @param {string} [stateAbbr]
 * @param {string} [skipUrl] — skip this URL (already failed on client)
 */
export async function resolveTownPhoto(town, stateAbbr, skipUrl) {
  const cacheKey = `${town.id || town.name}:${stateAbbr || ""}:${skipUrl || ""}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const skip = new Set(skipUrl ? [skipUrl] : []);

  const tryUrl = async (url, title = "", size) => {
    if (!url || skip.has(url)) return null;
    if (!isModernHeroPhoto(url, title, size)) return null;
    try {
      if (!(await verifyImageLoads(url))) return null;
    } catch {
      return null;
    }
    cache.set(cacheKey, url);
    return url;
  };

  try {
    const byUrl = new Map();

    const registry = getRegistryImage(town, stateAbbr);
    if (registry) {
      mergeCandidate(byUrl, {
        url: registry.trim(),
        title: "",
        tier: 1,
        score: scoreTownHeroPhoto(registry),
        rank: 0,
        options: { isRegistry: true },
      });
    }

    if (isValidImageUrl(town.image)) {
      const url = town.image.trim();
      const { tier } = classifyHeroRelevance(url, "", town, stateAbbr);
      if (tier < 99) {
        mergeCandidate(byUrl, {
          url,
          title: "",
          tier,
          score: scoreTownHeroPhoto(url),
          rank: 1,
        });
      }
    }

    for (const query of geoImageQueries(town, stateAbbr)) {
      const batch = await collectWikimediaCandidates(query, skip, town, stateAbbr);
      for (const item of batch) mergeCandidate(byUrl, item);
    }

    const ranked = pickBestHeroPhoto([...byUrl.values()], town, stateAbbr);
    for (const item of ranked) {
      const ok = await tryUrl(item.url, item.title, item.size);
      if (ok) return ok;
    }

    for (const chainUrl of getTownImageChain(town, stateAbbr)) {
      const ok = await tryUrl(chainUrl);
      if (ok) return ok;
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
